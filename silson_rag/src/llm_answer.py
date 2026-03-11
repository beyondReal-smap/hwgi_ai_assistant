"""3-tier answer generation for silson search.

1st: OpenAI Vector Store (Responses API + file_search)
2nd: Local search results + Chat Completions API
3rd: Rule-based answer from top hits
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from .config import CFG
from .openai_client import chat_completion, openai_post_json
from .types import SearchHit

SYSTEM_PROMPT = (
    "당신은 실손의료비 약관 검색 도우미다.\n"
    "반드시 검색된 문서에 근거해서만 한국어로 답변하라.\n"
    "세대/판매시기/담보를 먼저 확인한 뒤 답하라.\n"
    "질문이 애매하면 가능한 해석을 나눠 설명하라.\n"
    "\n"
    "## 답변 형식 규칙 (반드시 지킬 것)\n"
    "- 같은 제목, 소제목, 문단, 문장을 절대 반복하지 마라. 모든 내용은 한 번만 언급하라.\n"
    "- 여러 문서가 같은 내용을 담고 있더라도 중복 없이 한 번만 정리하라.\n"
    "- 비교나 정리가 필요할 때는 마크다운 표를 사용하라. 표 형식: | 구분 | 내용 |\\n|------|------|\\n| 값 | 값 |\n"
    "- 글머리 기호(-, •)나 번호 목록(1., 2.)으로 간결하게 정리하라.\n"
    "- 이모지(✅, 🔎 등)를 사용하지 마라.\n"
    "- 답변 마지막 줄에 '참고:'로 시작해 세대, 상품명, 조항명을 짧게 적어라.\n"
)


def _source_labels(hits: List[SearchHit]) -> List[str]:
    labels: List[str] = []
    seen: set[str] = set()
    for hit in hits:
        clause = hit.clause_name or hit.coverage_name or hit.source_label or "관련 기준"
        parts = [hit.generation, hit.product_alias, clause]
        label = " | ".join(part for part in parts if part)
        if label not in seen:
            seen.add(label)
            labels.append(label)
    return labels


def _dedup_paragraphs(text: str) -> str:
    """Remove duplicate paragraphs from LLM answer text."""
    lines = text.split("\n")
    result: List[str] = []
    seen: set[str] = set()
    for line in lines:
        stripped = line.strip()
        if not stripped:
            result.append(line)
            continue
        # Normalize for comparison: remove whitespace, punctuation differences
        norm = stripped.replace(" ", "").replace("\u3000", "")
        if len(norm) > 10 and norm in seen:
            continue
        if len(norm) > 10:
            seen.add(norm)
        result.append(line)
    return "\n".join(result)


def _build_context(hits: List[SearchHit]) -> str:
    chunks: List[str] = []
    for idx, hit in enumerate(hits, start=1):
        chunks.append(
            "\n".join([
                f"[문서 {idx}]",
                f"- 문서ID: {hit.doc_id}",
                f"- 문서유형: {hit.source_label}",
                f"- 세대: {hit.generation}",
                f"- 상품명: {hit.product_alias}",
                f"- 판매시기: {hit.sales_period}",
                f"- 담보/구분: {hit.coverage_name}",
                f"- 조항명: {hit.clause_name}",
                f"- 조항내용: {hit.clause_text_oneline}",
            ])
        )
    return "\n\n".join(chunks)


def fallback_answer(query: str, hits: List[SearchHit]) -> str:
    """Rule-based answer from top hits (tier 3)."""
    if not hits:
        return "관련 기준을 찾지 못했습니다. 세대, 가입시기, 담보명 또는 면책/보상 키워드를 조금 더 구체적으로 입력해 주세요."

    first = hits[0]
    clause = first.clause_name or first.coverage_name or first.source_label
    lines = [
        f"질문과 가장 가까운 기준은 `{first.generation} / {first.product_alias} / {first.coverage_name}`의 `{clause}`입니다.",
        first.clause_text_oneline or first.document_excerpt[:220],
    ]
    if len(hits) > 1:
        extra = []
        for hit in hits[1:3]:
            extra.append(
                f"- {hit.generation} {hit.product_alias} | {hit.clause_name or hit.coverage_name}: "
                f"{hit.clause_text_oneline or hit.document_excerpt[:120]}"
            )
        lines.append("")
        lines.append("추가로 함께 확인할 항목:")
        lines.extend(extra)
    lines.append("")
    lines.append("참고 문서: " + ", ".join(_source_labels(hits)))
    return "\n".join(lines)


def generate_answer_local(query: str, hits: List[SearchHit]) -> str:
    """Generate answer via Chat Completions API (tier 2)."""
    if not CFG.openai_api_key.strip() or not hits:
        return fallback_answer(query, hits)

    user_prompt = (
        f"질문:\n{query}\n\n"
        f"검색 결과:\n{_build_context(hits)}\n\n"
        "위 검색 결과만 근거로 답변해 주세요."
    )

    content = chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        model=CFG.openai_model,
        max_tokens=700,
        timeout=30,
    )
    if content:
        return _dedup_paragraphs(content)
    return fallback_answer(query, hits)


# ---------------------------------------------------------------------------
# Vector Store answer (tier 1)
# ---------------------------------------------------------------------------

def _extract_response_output_text(data: Dict[str, Any]) -> str:
    output_text = data.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    outputs = data.get("output")
    if isinstance(outputs, list):
        chunks: List[str] = []
        for item in outputs:
            if not isinstance(item, dict):
                continue
            content = item.get("content")
            if isinstance(content, list):
                for part in content:
                    if isinstance(part, dict) and isinstance(part.get("text"), str):
                        chunks.append(part["text"])
        merged = "\n".join(chunk.strip() for chunk in chunks if chunk.strip()).strip()
        if merged:
            return merged
    return ""


def _extract_text_snippets(node: Any) -> List[str]:
    snippets: List[str] = []
    if isinstance(node, dict):
        text = node.get("text")
        if isinstance(text, str) and text.strip():
            snippets.append(text.strip())
        excerpt = node.get("excerpt")
        if isinstance(excerpt, str) and excerpt.strip():
            snippets.append(excerpt.strip())
        content = node.get("content")
        if isinstance(content, list):
            for item in content:
                snippets.extend(_extract_text_snippets(item))
        for key in ("results", "data", "output", "annotations"):
            if key in node:
                snippets.extend(_extract_text_snippets(node.get(key)))
    elif isinstance(node, list):
        for item in node:
            snippets.extend(_extract_text_snippets(item))
    return snippets


def _extract_file_search_results(node: Any) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    if isinstance(node, dict):
        raw_results = node.get("results")
        if isinstance(raw_results, list):
            candidates = [item for item in raw_results if isinstance(item, dict) and (
                isinstance(item.get("attributes"), dict) or
                any(k in item for k in ("filename", "score", "text", "excerpt"))
            )]
            node_type = str(node.get("type", "")).lower()
            if candidates and "file_search" in node_type:
                results.extend(candidates)
        for value in node.values():
            results.extend(_extract_file_search_results(value))
    elif isinstance(node, list):
        for item in node:
            results.extend(_extract_file_search_results(item))
    return results


def _safe_int(value: Any) -> Optional[int]:
    try:
        if value in ("", None):
            return None
        return int(float(str(value)))
    except (TypeError, ValueError):
        return None


def _safe_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() == "true"


def _sales_period_from_attrs(attrs: Dict[str, Any]) -> str:
    start = _safe_int(attrs.get("sales_start_ym"))
    end = _safe_int(attrs.get("sales_end_ym"))
    is_current = _safe_bool(attrs.get("is_current"))
    if start and end:
        return f"{start}~{end}"
    if start and is_current:
        return f"{start}~현재"
    if start:
        return f"{start}~"
    if end:
        return f"~{end}"
    return ""


def _clean_text(value: Any) -> str:
    if value is None or (isinstance(value, float) and value != value):  # NaN check
        return ""
    return str(value).strip()


def _result_to_hit(result: Dict[str, Any]) -> SearchHit:
    attrs = result.get("attributes", {}) if isinstance(result.get("attributes"), dict) else {}
    filename = _clean_text(result.get("filename"))
    doc_id = _clean_text(attrs.get("doc_id")) or filename.rsplit(".", 1)[0]
    excerpt = "\n".join(_extract_text_snippets(result))[:1200].strip()

    return SearchHit(
        doc_id=doc_id,
        source_kind=_clean_text(attrs.get("source_kind")),
        source_label=_clean_text(attrs.get("source_label")),
        generation=_clean_text(attrs.get("generation")),
        product_alias=_clean_text(attrs.get("product_alias")),
        sales_period=_sales_period_from_attrs(attrs),
        coverage_name=_clean_text(attrs.get("coverage_name")),
        clause_name=_clean_text(attrs.get("clause_name")),
        clause_text_oneline=excerpt[:300].replace("\n", " ").strip(),
        source_file=filename,
        filename=filename,
        score=float(result.get("score", 0.0) or 0.0),
        document_excerpt=excerpt,
    )


def answer_with_vector_store(
    query: str,
    openai_filters: Optional[Dict[str, Any]],
    topk: int = 5,
) -> tuple[str, List[SearchHit]]:
    """Tier 1: Use Responses API with file_search tool.

    Returns (answer_text, hits). Raises on failure.
    """
    vector_store_id = CFG.vector_store_id.strip()
    if not vector_store_id or not CFG.openai_api_key.strip():
        raise RuntimeError("vector store not configured")

    tool: Dict[str, Any] = {
        "type": "file_search",
        "vector_store_ids": [vector_store_id],
        "max_num_results": max(1, topk),
    }
    if openai_filters:
        tool["filters"] = openai_filters

    payload = {
        "model": CFG.silson_openai_model,
        "input": [
            {
                "role": "system",
                "content": [{"type": "input_text", "text": SYSTEM_PROMPT}],
            },
            {
                "role": "user",
                "content": [{"type": "input_text", "text": query}],
            },
        ],
        "tools": [tool],
        "include": ["file_search_call.results"],
    }

    data = openai_post_json("/responses", payload)
    content = _extract_response_output_text(data)

    # Extract hits from file_search results
    raw_results = _extract_file_search_results(data)
    hits: List[SearchHit] = []
    seen: set[tuple] = set()
    for result in raw_results:
        hit = _result_to_hit(result)
        dedupe_key = (hit.doc_id, hit.filename, hit.coverage_name, hit.clause_text_oneline)
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        hits.append(hit)
        if len(hits) >= max(1, topk):
            break

    if not hits:
        raise RuntimeError("responses API returned no file_search results")

    answer = _dedup_paragraphs(content) if content else fallback_answer(query, hits)
    return answer, hits
