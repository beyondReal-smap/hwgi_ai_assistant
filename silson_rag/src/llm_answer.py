"""3-tier answer generation for silson search.

1st: OpenAI Vector Store (Responses API + file_search)
2nd: Local search results + Chat Completions API
3rd: Rule-based answer from top hits
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

from .config import CFG
from .openai_client import chat_completion, openai_post_json
from .types import QASearchHit, SearchHit, StructuredAnswer

SYSTEM_PROMPT = (
    "당신은 실손의료비 약관 검색 도우미다.\n"
    "반드시 검색된 문서에 근거해서만 한국어로 답변하라.\n"
    "세대/판매시기/담보를 먼저 확인한 뒤 답하라.\n"
    "FP가 고객에게 바로 설명할 수 있게 결론부터 말하고 필요한 맥락만 덧붙여라.\n"
    "질문이 애매하면 가능한 해석을 나눠 설명하라.\n"
    "\n"
    "## 유사 Q&A 전문가 답변 활용\n"
    "- [전문가 Q&A] 섹션이 있으면, 해당 전문가 답변을 우선 참고하라.\n"
    "- 전문가 답변과 약관 조항이 일치하면 전문가 답변 내용을 기반으로 답하라.\n"
    "- 전문가 답변이 약관과 충돌하면 약관을 우선하되, 전문가 견해도 언급하라.\n"
    "\n"
    "## 답변 형식 규칙 (반드시 지킬 것)\n"
    "- 같은 제목, 소제목, 문단, 문장을 절대 반복하지 마라. 모든 내용은 한 번만 언급하라.\n"
    "- 여러 문서가 같은 내용을 담고 있더라도 중복 없이 한 번만 정리하라.\n"
    "- 비교나 정리가 필요할 때는 마크다운 표를 사용하라. 표 형식: | 구분 | 내용 |\\n|------|------|\\n| 값 | 값 |\n"
    "- 글머리 기호(-, •)나 번호 목록(1., 2.)으로 간결하게 정리하라.\n"
    "- 이모지(✅, 🔎 등)를 사용하지 마라.\n"
    "- 답변 마지막 줄에 '참고:'로 시작해 세대, 상품명, 조항명을 짧게 적어라.\n"
)

STRUCTURED_SYSTEM_PROMPT = (
    "당신은 실손의료비 검색 답변을 FP 상담용 카드 포맷으로 정리하는 AI다.\n"
    "반드시 제공된 질문, 현재 답변, 검색 근거만 사용하고 추정하지 마라.\n"
    "같은 내용을 여러 필드에 반복하지 마라.\n"
    "JSON으로만 응답하라.\n"
    "필드 규칙:\n"
    "- summary: 한 줄 결론. 문장 앞에 ✅ 또는 ⚠️ 중 하나를 붙여라.\n"
    "- context_note: 고객 계약/세대/가입시기 등 적용 맥락 1문장. 없으면 빈 문자열.\n"
    "- answer: FP가 고객에게 설명하듯 2~4문장으로 자연스럽게 정리.\n"
    "- coverage_points: 보상 또는 해석 포인트 2~4개 문자열 배열.\n"
    "- cautions: 면책/제한/유의사항 1~3개 문자열 배열.\n"
    "- checkpoints: 추가 확인사항 1~3개 문자열 배열.\n"
    "- reference_note: 반드시 '참고:'로 시작하는 한 줄. 없으면 빈 문자열.\n"
)


def _strip_code_fences(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?\s*", "", stripped, flags=re.IGNORECASE)
        stripped = re.sub(r"\s*```$", "", stripped)
    return stripped.strip()


def _extract_json_payload(text: str) -> Dict[str, Any]:
    stripped = _strip_code_fences(text)
    start = stripped.find("{")
    end = stripped.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("JSON payload not found")
    return json.loads(stripped[start:end + 1])


def _clean_text(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).replace("\r", "").strip()
    return re.sub(r"\s+", " ", text).strip()


def _clean_list(values: Any, limit: int) -> List[str]:
    items = values if isinstance(values, list) else []
    cleaned: List[str] = []
    seen: set[str] = set()
    for value in items:
        text = _clean_text(value)
        text = re.sub(r"^(?:[-•]|\d+[.)])\s*", "", text)
        if not text or text in seen:
            continue
        seen.add(text)
        cleaned.append(text)
        if len(cleaned) >= limit:
            break
    return cleaned


def _first_sentence(text: str, limit: int = 72) -> str:
    candidate = _clean_text(text)
    if not candidate:
        return ""
    parts = re.split(r"(?<=[.!?])\s+|(?<=다)\s+|(?<=요)\s+", candidate, maxsplit=1)
    sentence = parts[0].strip() if parts else candidate
    if len(sentence) <= limit:
        return sentence
    return sentence[: limit - 1].rstrip() + "…"


def _normalize_heading(line: str) -> str:
    return re.sub(r"^[#\s①②③④⑤⑥⑦⑧⑨⑩\d.()\-•✅⚠️📌🔎]+", "", line).replace(":", "").replace("：", "").strip()


def _split_answer(answer: str) -> tuple[str, str, str]:
    context_note = ""
    reference_note = ""
    body_lines: List[str] = []

    for raw_line in answer.replace("\r", "").split("\n"):
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith("고객 계약 확인:") and not context_note:
            context_note = line
            continue
        if line.startswith("참고:"):
            reference_note = line
            continue
        body_lines.append(line)

    return context_note, reference_note, "\n".join(body_lines).strip()


def _classify_list_item(item: str) -> str:
    caution_keywords = ("주의", "면책", "제외", "불가", "안됨", "제한", "단,", "단 ", "예외", "자기부담")
    checkpoint_keywords = ("확인", "필요", "조회", "검토", "증빙", "영수증", "진단서", "가입", "세대", "특약", "계약")

    if any(keyword in item for keyword in caution_keywords):
        return "cautions"
    if any(keyword in item for keyword in checkpoint_keywords):
        return "checkpoints"
    return "coverage_points"


def _fallback_checkpoints(query: str, hits: List[SearchHit]) -> List[str]:
    items: List[str] = []
    generations = {hit.generation for hit in hits if hit.generation}
    if len(generations) != 1:
        items.append("고객의 실손 세대와 가입시기를 먼저 확인해 주세요.")
    if any(keyword in query for keyword in ("치과", "비급여", "급여", "주사", "도수", "한방", "라식")):
        items.append("치료 목적과 급여/비급여 구분을 함께 확인해 주세요.")
    if hits:
        first = hits[0]
        coverage = first.coverage_name or first.clause_name
        if coverage:
            items.append(f"{coverage} 관련 담보 문구와 세부 기준을 다시 확인해 주세요.")
    return _clean_list(items, limit=3)


def _build_reference_note(reference_note: str, hits: List[SearchHit]) -> str:
    cleaned = _clean_text(reference_note)
    if cleaned:
        return cleaned if cleaned.startswith("참고:") else f"참고: {cleaned}"
    refs = ", ".join(_source_labels(hits)[:3])
    return f"참고: {refs}" if refs else ""


def _fallback_structured_answer(query: str, hits: List[SearchHit], answer: str) -> StructuredAnswer:
    context_note, reference_note, body = _split_answer(answer)
    paragraphs: List[str] = []
    coverage_points: List[str] = []
    cautions: List[str] = []
    checkpoints: List[str] = []
    active_bucket: Optional[str] = None

    for raw_line in body.split("\n"):
        line = raw_line.strip()
        if not line:
            continue

        heading = _normalize_heading(line)
        if heading and len(heading) <= 16:
            if any(token in heading for token in ("주의", "면책")):
                active_bucket = "cautions"
                continue
            if any(token in heading for token in ("확인", "체크", "준비", "다음")):
                active_bucket = "checkpoints"
                continue
            if any(token in heading for token in ("핵심", "답변", "보상", "포인트", "설명", "기준")):
                active_bucket = "coverage_points"
                continue

        bullet_match = re.match(r"^(?:[-•]|\d+[.)])\s*(.+)$", line)
        if bullet_match:
            item = _clean_text(bullet_match.group(1))
            bucket = active_bucket or _classify_list_item(item)
            if bucket == "cautions":
                cautions.append(item)
            elif bucket == "checkpoints":
                checkpoints.append(item)
            else:
                coverage_points.append(item)
            continue

        paragraphs.append(line)

    answer_text = " ".join(paragraphs[:3]).strip()
    if not answer_text:
        answer_text = _clean_text(answer)

    if not coverage_points:
        coverage_points = _clean_list([
            hit.clause_text_oneline or hit.document_excerpt[:120]
            for hit in hits[:3]
            if (hit.clause_text_oneline or hit.document_excerpt)
        ], limit=3)

    if not coverage_points and answer_text:
        coverage_points = _clean_list([answer_text], limit=2)

    checkpoints = _clean_list(checkpoints, limit=3) or _fallback_checkpoints(query, hits)
    cautions = _clean_list(cautions, limit=3)
    summary_seed = answer_text or (coverage_points[0] if coverage_points else query)
    summary = _first_sentence(summary_seed)
    if summary and not summary.startswith(("✅", "⚠️")):
        summary = f"{'⚠️' if cautions else '✅'} {summary}"

    return StructuredAnswer(
        summary=summary,
        context_note=context_note,
        answer=answer_text,
        coverage_points=_clean_list(coverage_points, limit=4),
        cautions=cautions,
        checkpoints=checkpoints,
        reference_note=_build_reference_note(reference_note, hits),
    )


def _formatter_context(hits: List[SearchHit]) -> str:
    lines: List[str] = []
    for idx, hit in enumerate(hits[:4], start=1):
        topic = hit.clause_name or hit.coverage_name or hit.source_label
        snippet = _clean_text(hit.clause_text_oneline or hit.document_excerpt[:140])
        lines.append(
            f"{idx}. 세대={hit.generation or '-'} | 상품={hit.product_alias or '-'} | 조항={topic or '-'} | 근거={snippet}"
        )
    return "\n".join(lines)


def _merge_structured_answers(primary: StructuredAnswer, fallback: StructuredAnswer) -> StructuredAnswer:
    summary = primary.summary or fallback.summary
    cautions = primary.cautions or fallback.cautions
    if summary and not summary.startswith(("✅", "⚠️")):
        summary = f"{'⚠️' if cautions else '✅'} {summary}"

    return StructuredAnswer(
        summary=summary,
        context_note=primary.context_note or fallback.context_note,
        answer=primary.answer or fallback.answer,
        coverage_points=primary.coverage_points or fallback.coverage_points,
        cautions=cautions,
        checkpoints=primary.checkpoints or fallback.checkpoints,
        reference_note=primary.reference_note or fallback.reference_note,
    )


def build_structured_answer(query: str, hits: List[SearchHit], answer: str) -> StructuredAnswer:
    fallback = _fallback_structured_answer(query, hits, answer)
    if not CFG.openai_api_key.strip() or not answer.strip():
        return fallback

    context_note, reference_note, body = _split_answer(answer)
    prompt = (
        f"[질문]\n{query}\n\n"
        f"[현재 답변]\n{body or answer}\n\n"
        f"[적용 맥락]\n{context_note or '없음'}\n\n"
        f"[검색 근거]\n{_formatter_context(hits) or '없음'}\n\n"
        f"[참고 라벨]\n{', '.join(_source_labels(hits)[:5]) or '없음'}"
    )

    content = chat_completion(
        messages=[
            {"role": "system", "content": STRUCTURED_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        model=CFG.silson_openai_model,
        max_tokens=450,
        timeout=20,
        response_format={"type": "json_object"},
    )

    if not content:
        return fallback

    try:
        payload = _extract_json_payload(content)
        structured = StructuredAnswer(
            summary=_clean_text(payload.get("summary")),
            context_note=_clean_text(payload.get("context_note")) or context_note,
            answer=_clean_text(payload.get("answer")),
            coverage_points=_clean_list(payload.get("coverage_points"), limit=4),
            cautions=_clean_list(payload.get("cautions"), limit=3),
            checkpoints=_clean_list(payload.get("checkpoints"), limit=3),
            reference_note=_build_reference_note(
                _clean_text(payload.get("reference_note")) or reference_note,
                hits,
            ),
        )
        return _merge_structured_answers(structured, fallback)
    except (ValueError, json.JSONDecodeError, TypeError):
        return fallback


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


def _build_qa_context(qa_hits: List[QASearchHit]) -> str:
    """Format QA search hits as context for the LLM prompt."""
    if not qa_hits:
        return ""
    chunks: List[str] = []
    for idx, hit in enumerate(qa_hits[:3], start=1):
        if hit.chunk_type == "qa_pair":
            chunks.append(
                f"[전문가 Q&A {idx}]\n"
                f"- 질문: {hit.question[:200]}\n"
                f"- 전문가 답변: {hit.answer[:500]}"
            )
        else:
            chunks.append(
                f"[참고 자료 {idx}]\n"
                f"- 출처: {hit.source}\n"
                f"- 내용: {hit.answer[:500]}"
            )
    return "\n\n".join(chunks)


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


def generate_answer_local(
    query: str,
    hits: List[SearchHit],
    qa_hits: List[QASearchHit] | None = None,
) -> str:
    """Generate answer via Chat Completions API (tier 2)."""
    if not CFG.openai_api_key.strip() or not hits:
        return fallback_answer(query, hits)

    qa_context = _build_qa_context(qa_hits or [])
    clause_context = _build_context(hits)

    prompt_parts = [f"질문:\n{query}"]
    if qa_context:
        prompt_parts.append(f"\n전문가 Q&A 참고자료:\n{qa_context}")
    prompt_parts.append(f"\n약관 검색 결과:\n{clause_context}")
    prompt_parts.append("\n위 검색 결과와 전문가 Q&A를 근거로 답변해 주세요." if qa_context else "\n위 검색 결과만 근거로 답변해 주세요.")

    user_prompt = "\n".join(prompt_parts)

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


def _collect_hits_from_results(raw_results: List[Dict[str, Any]], topk: int) -> List[SearchHit]:
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
    return hits


def search_vector_store_hits(
    query: str,
    openai_filters: Optional[Dict[str, Any]],
    topk: int = 5,
) -> List[SearchHit]:
    """Run file_search and return raw hits without relying on the model answer text."""
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
                "content": [{
                    "type": "input_text",
                    "text": "실손의료비 약관 검색 결과만 찾고, 검색된 문서 범위 안에서만 판단하라.",
                }],
            },
            {
                "role": "user",
                "content": [{"type": "input_text", "text": query}],
            },
        ],
        "tools": [tool],
        "include": ["output[*].file_search_call.search_results"],
    }

    data = openai_post_json("/responses", payload)
    raw_results = _extract_file_search_results(data)
    hits = _collect_hits_from_results(raw_results, topk=topk)
    if not hits:
        raise RuntimeError("responses API returned no file_search results")
    return hits


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

    raw_results = _extract_file_search_results(data)
    hits = _collect_hits_from_results(raw_results, topk=topk)

    if not hits:
        raise RuntimeError("responses API returned no file_search results")

    answer = _dedup_paragraphs(content) if content else fallback_answer(query, hits)
    return answer, hits
