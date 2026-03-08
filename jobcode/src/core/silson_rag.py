from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib import error, request

import numpy as np
import pandas as pd

from core.config import SETTINGS, SILSON_CLAUSES_CSV, SILSON_DOCS_DIR, SILSON_MANIFEST_CSV
from core.silson_common import (
    build_filters,
    detect_generation,
    detect_join_ym,
    detect_source_kind,
    tokenize,
)
from core.silson_followups import generate_followups

DEFAULT_BASE_URL = "https://api.openai.com/v1"
SEARCH_TEXT_FIELDS = (
    "clause_name",
    "coverage_name",
    "product_alias",
    "source_label",
    "keywords",
    "naturalized_qa",
    "clause_text_oneline",
    "search_text",
)
KEYWORD_COLUMN_WEIGHTS = (
    ("_clause_name_lc", 4.0),
    ("_coverage_name_lc", 3.0),
    ("_product_alias_lc", 2.5),
    ("_source_label_lc", 2.0),
    ("_keywords_lc", 1.5),
    ("_naturalized_qa_lc", 1.2),
    ("_clause_text_oneline_lc", 1.0),
)


@dataclass(frozen=True)
class SilsonSearchHit:
    doc_id: str
    source_kind: str
    source_label: str
    generation: str
    product_alias: str
    sales_period: str
    coverage_name: str
    clause_name: str
    clause_text_oneline: str
    source_file: str
    filename: str
    score: float
    document_excerpt: str


@dataclass(frozen=True)
class SilsonVectorStoreAnswer:
    answer: str
    hits: List[SilsonSearchHit]


def _clean_text(value: Any) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    return str(value).strip()


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


def _headers() -> Dict[str, str]:
    api_key = SETTINGS.openai_api_key.strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }


def _openai_post_json(path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    base_url = (SETTINGS.openai_base_url.strip() or DEFAULT_BASE_URL).rstrip("/")
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = request.Request(
        base_url + path,
        data=body,
        headers=_headers(),
        method="POST",
    )
    with request.urlopen(req, timeout=45) as response:
        return json.loads(response.read().decode("utf-8"))


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


@lru_cache(maxsize=1)
def _load_clause_df() -> pd.DataFrame:
    if not SILSON_CLAUSES_CSV.exists():
        raise FileNotFoundError(f"silson clauses CSV not found: {SILSON_CLAUSES_CSV}")
    df = pd.read_csv(SILSON_CLAUSES_CSV, encoding="utf-8-sig").fillna("")
    for column in SEARCH_TEXT_FIELDS:
        if column not in df.columns:
            df[column] = ""
    if "sales_start_ym" in df.columns:
        df["sales_start_ym"] = pd.to_numeric(df["sales_start_ym"], errors="coerce")
    if "sales_end_ym" in df.columns:
        df["sales_end_ym"] = pd.to_numeric(df["sales_end_ym"], errors="coerce")
    if "is_current" in df.columns:
        df["is_current"] = df["is_current"].astype(str).str.lower().eq("true")
    for column in SEARCH_TEXT_FIELDS:
        df[f"_{column}_lc"] = df[column].astype(str).str.lower()
    return df


@lru_cache(maxsize=1)
def _load_search_texts() -> tuple[str, ...]:
    df = _load_clause_df()
    return tuple(df["search_text"].fillna("").astype(str).tolist())


@lru_cache(maxsize=1)
def _load_manifest_rows() -> Dict[str, Dict[str, str]]:
    if not SILSON_MANIFEST_CSV.exists():
        return {}
    manifest = pd.read_csv(SILSON_MANIFEST_CSV, encoding="utf-8-sig").fillna("")
    rows: Dict[str, Dict[str, str]] = {}
    for row in manifest.to_dict(orient="records"):
        doc_id = _clean_text(row.get("doc_id"))
        if doc_id:
            rows[doc_id] = {str(k): _clean_text(v) for k, v in row.items()}
    return rows


@lru_cache(maxsize=1)
def _load_doc_texts() -> Dict[str, str]:
    texts: Dict[str, str] = {}
    if not SILSON_DOCS_DIR.exists():
        return texts
    for path in SILSON_DOCS_DIR.glob("*.md"):
        texts[path.stem] = path.read_text(encoding="utf-8")
    return texts


def _apply_metadata_filters(df: pd.DataFrame, question: str) -> pd.DataFrame:
    filtered = df

    generation = detect_generation(question)
    if generation:
        filtered = filtered[filtered["generation"] == generation]

    source_kind = detect_source_kind(question)
    if source_kind:
        filtered = filtered[filtered["source_kind"] == source_kind]

    join_ym = detect_join_ym(question)
    if join_ym:
        cond_start = filtered["sales_start_ym"].isna() | (filtered["sales_start_ym"] <= join_ym)
        cond_end = filtered["is_current"] | filtered["sales_end_ym"].isna() | (filtered["sales_end_ym"] >= join_ym)
        filtered = filtered[cond_start & cond_end]

    return filtered if not filtered.empty else df


def _unique_lower_tokens(tokens: List[str]) -> List[str]:
    normalized: List[str] = []
    seen = set()
    for token in tokens:
        token_lower = token.strip().lower()
        if token_lower and token_lower not in seen:
            seen.add(token_lower)
            normalized.append(token_lower)
    return normalized


def _score_keyword_candidates(df: pd.DataFrame, question: str, q_tokens: List[str]) -> Dict[int, float]:
    if df.empty:
        return {}

    scores = np.zeros(len(df), dtype=np.float32)
    tokens = _unique_lower_tokens(q_tokens)
    for token in tokens:
        for column, weight in KEYWORD_COLUMN_WEIGHTS:
            matches = df[column].str.contains(token, regex=False).to_numpy(dtype=np.float32)
            scores += matches * weight

    question_lower = question.strip().lower()
    if question_lower:
        scores += df["_search_text_lc"].str.contains(question_lower, regex=False).to_numpy(dtype=np.float32) * 2.0

    positive = scores > 0
    return {int(idx): float(score) for idx, score in zip(df.index[positive], scores[positive])}


def _looks_like_file_search_result(node: Any) -> bool:
    if not isinstance(node, dict):
        return False
    if isinstance(node.get("attributes"), dict):
        return True
    return any(key in node for key in ("filename", "score", "text", "excerpt"))


def _extract_file_search_results(node: Any) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    if isinstance(node, dict):
        raw_results = node.get("results")
        if isinstance(raw_results, list):
            candidate_results = [item for item in raw_results if _looks_like_file_search_result(item)]
            if candidate_results and "file_search" in _clean_text(node.get("type")).lower():
                results.extend(candidate_results)
        for value in node.values():
            results.extend(_extract_file_search_results(value))
    elif isinstance(node, list):
        for item in node:
            results.extend(_extract_file_search_results(item))
    return results


def _row_to_hit(row: pd.Series, score: float) -> SilsonSearchHit:
    manifest = _load_manifest_rows().get(_clean_text(row.get("doc_id")), {})
    doc_id = _clean_text(row.get("doc_id"))
    filename = _clean_text(manifest.get("filename")) or f"{doc_id}.md"
    doc_text = _load_doc_texts().get(doc_id, "")
    excerpt = doc_text[:900].strip()

    return SilsonSearchHit(
        doc_id=doc_id,
        source_kind=_clean_text(row.get("source_kind")),
        source_label=_clean_text(row.get("source_label")),
        generation=_clean_text(row.get("generation")),
        product_alias=_clean_text(row.get("product_alias")),
        sales_period=_clean_text(row.get("sales_period")),
        coverage_name=_clean_text(row.get("coverage_name")),
        clause_name=_clean_text(row.get("clause_name")),
        clause_text_oneline=_clean_text(row.get("clause_text_oneline")),
        source_file=_clean_text(row.get("source_file")),
        filename=filename,
        score=round(score, 4),
        document_excerpt=excerpt,
    )


_silson_embed_engine = None


def _get_silson_embed_engine():
    global _silson_embed_engine
    if _silson_embed_engine is None and SETTINGS.silson_use_embedding:
        from core.silson_embed_engine import SilsonEmbedEngine
        _silson_embed_engine = SilsonEmbedEngine(model_name=SETTINGS.embed_model_name)
    return _silson_embed_engine


def search_silson_local(question: str, topk: int = 5) -> List[SilsonSearchHit]:
    full_df = _load_clause_df()
    df = _apply_metadata_filters(full_df, question)

    # --- Query rewriting ---
    q_tokens = tokenize(question)
    rewrite_result = None
    if SETTINGS.silson_use_query_rewriting:
        from core.silson_query_rewriter import needs_rewriting, rewrite_query
        if needs_rewriting(question, q_tokens):
            rewrite_result = rewrite_query(question)
            if rewrite_result.rewrote and rewrite_result.keywords:
                q_tokens = rewrite_result.keywords
            # Apply LLM-inferred filters if regex missed them
            if rewrite_result.inferred_generation and detect_generation(question) is None:
                gen_filtered = df[df["generation"] == rewrite_result.inferred_generation]
                if not gen_filtered.empty:
                    df = gen_filtered
            if rewrite_result.inferred_source_kind and detect_source_kind(question) is None:
                sk_filtered = df[df["source_kind"] == rewrite_result.inferred_source_kind]
                if not sk_filtered.empty:
                    df = sk_filtered

    # --- Keyword scoring ---
    keyword_scores = _score_keyword_candidates(df, question, q_tokens)

    # --- Embedding scoring (hybrid) ---
    embed_scores: Dict[int, float] = {}
    embed_engine = _get_silson_embed_engine()
    if embed_engine and embed_engine.status.enabled and SETTINGS.silson_use_embedding:
        # Ensure index is built using the full dataframe's search_text
        embed_engine.ensure_index(_load_search_texts())

        embed_query = question
        if rewrite_result and rewrite_result.rewrote and rewrite_result.keywords:
            embed_query = " ".join(rewrite_result.keywords)

        raw_results = embed_engine.search(embed_query, topk=50)
        # Only keep results that are in the filtered df
        valid_indices = set(df.index)
        for doc_idx, raw_score, norm_score in raw_results:
            if doc_idx in valid_indices:
                embed_scores[doc_idx] = norm_score

    # --- Hybrid merge ---
    alpha = SETTINGS.silson_alpha_keyword
    all_indices = set(keyword_scores.keys()) | set(embed_scores.keys())

    if not all_indices:
        return []

    # Normalize keyword scores
    kw_vals = list(keyword_scores.values())
    if kw_vals:
        kw_max = max(kw_vals)
        kw_min = min(kw_vals)
        kw_range = kw_max - kw_min if kw_max > kw_min else 1.0
    else:
        kw_min, kw_range = 0.0, 1.0

    scored: List[tuple[float, int, pd.Series]] = []
    for idx in all_indices:
        row = df.loc[idx]
        kw_raw = keyword_scores.get(idx, 0.0)
        kw_norm = (kw_raw - kw_min) / kw_range if kw_range > 0 else 0.0
        em_norm = embed_scores.get(idx, 0.0)

        if embed_scores:
            hybrid = alpha * kw_norm + (1 - alpha) * em_norm
        else:
            hybrid = kw_norm

        scored.append((hybrid, idx, row))

    scored.sort(
        key=lambda item: (
            -item[0],
            _clean_text(item[2].get("generation")),
            _clean_text(item[2].get("product_alias")),
            _clean_text(item[2].get("clause_name")),
            item[1],
        )
    )

    hits: List[SilsonSearchHit] = []
    seen = set()
    for score, _, row in scored:
        dedupe_key = (
            _clean_text(row.get("doc_id")),
            _clean_text(row.get("coverage_name")),
            _clean_text(row.get("clause_name")),
        )
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        hits.append(_row_to_hit(row, score))
        if len(hits) >= max(1, topk):
            break
    return hits


def _result_to_hit(result: Dict[str, Any]) -> SilsonSearchHit:
    attrs = result.get("attributes", {}) if isinstance(result.get("attributes"), dict) else {}
    filename = _clean_text(result.get("filename"))
    doc_id = _clean_text(attrs.get("doc_id")) or filename.rsplit(".", 1)[0]
    excerpt = "\n".join(_extract_text_snippets(result))[:1200].strip()

    return SilsonSearchHit(
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


def search_silson_vector_store(question: str, topk: int = 5) -> List[SilsonSearchHit]:
    vector_store_id = SETTINGS.silson_vector_store_id.strip()
    if not vector_store_id:
        return []

    payload: Dict[str, Any] = {
        "query": question,
        "max_num_results": max(1, topk),
        "rewrite_query": True,
    }
    filters = build_filters(question)
    if filters:
        payload["filters"] = filters

    data = _openai_post_json(f"/vector_stores/{vector_store_id}/search", payload)
    raw_results = data.get("data")
    if not isinstance(raw_results, list):
        raw_results = data.get("results", [])
    hits: List[SilsonSearchHit] = []
    for result in raw_results if isinstance(raw_results, list) else []:
        if isinstance(result, dict):
            hits.append(_result_to_hit(result))
    return hits


def _hits_from_response_results(data: Dict[str, Any], topk: int) -> List[SilsonSearchHit]:
    raw_results = _extract_file_search_results(data)
    hits: List[SilsonSearchHit] = []
    seen = set()
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


def _source_labels(hits: List[SilsonSearchHit]) -> List[str]:
    labels: List[str] = []
    seen = set()
    for hit in hits:
        clause = hit.clause_name or hit.coverage_name or hit.source_label or "관련 기준"
        parts = [hit.generation, hit.product_alias, clause]
        label = " | ".join(part for part in parts if part)
        if label not in seen:
            seen.add(label)
            labels.append(label)
    return labels


def _build_context(hits: List[SilsonSearchHit]) -> str:
    chunks: List[str] = []
    for idx, hit in enumerate(hits, start=1):
        chunks.append(
            "\n".join(
                [
                    f"[문서 {idx}]",
                    f"- 문서ID: {hit.doc_id}",
                    f"- 문서유형: {hit.source_label}",
                    f"- 세대: {hit.generation}",
                    f"- 상품명: {hit.product_alias}",
                    f"- 판매시기: {hit.sales_period}",
                    f"- 담보/구분: {hit.coverage_name}",
                    f"- 조항명: {hit.clause_name}",
                    f"- 조항내용: {hit.clause_text_oneline}",
                ]
            )
        )
    return "\n\n".join(chunks)


def _fallback_answer(question: str, hits: List[SilsonSearchHit]) -> str:
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
                f"- {hit.generation} {hit.product_alias} | {hit.clause_name or hit.coverage_name}: {hit.clause_text_oneline or hit.document_excerpt[:120]}"
            )
        lines.append("")
        lines.append("추가로 함께 확인할 항목:")
        lines.extend(extra)
    lines.append("")
    lines.append("참고 문서: " + ", ".join(_source_labels(hits)))
    return "\n".join(lines)


def answer_silson_with_vector_store(question: str, topk: int = 5) -> SilsonVectorStoreAnswer:
    vector_store_id = SETTINGS.silson_vector_store_id.strip()
    if not vector_store_id or not SETTINGS.openai_api_key.strip():
        raise RuntimeError("vector store answer is not configured")

    tool: Dict[str, Any] = {
        "type": "file_search",
        "vector_store_ids": [vector_store_id],
        "max_num_results": max(1, topk),
    }
    filters = build_filters(question)
    if filters:
        tool["filters"] = filters

    payload = {
        "model": SETTINGS.silson_openai_model,
        "input": [
            {
                "role": "system",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            "당신은 실손의료비 약관 검색 도우미다. "
                            "반드시 검색된 문서에 근거해서만 한국어로 답변하고, "
                            "세대/판매시기/담보를 먼저 확인한 뒤 답하라. "
                            "질문이 애매하면 가능한 해석을 나눠 설명하라. "
                            "답변 마지막에는 참고한 세대, 상품명, 조항명을 짧게 적어라."
                        ),
                    }
                ],
            },
            {
                "role": "user",
                "content": [{"type": "input_text", "text": question}],
            },
        ],
        "tools": [tool],
        "include": ["file_search_call.results"],
    }

    data = _openai_post_json("/responses", payload)
    content = _extract_response_output_text(data)
    hits = _hits_from_response_results(data, topk=topk)
    if not hits:
        raise RuntimeError("responses API returned no file_search results")
    return SilsonVectorStoreAnswer(
        answer=content or _fallback_answer(question, hits),
        hits=hits,
    )


def generate_silson_answer_local(query: str, hits: List[SilsonSearchHit]) -> str:
    api_key = SETTINGS.openai_api_key.strip()
    if not api_key or not hits:
        return _fallback_answer(query, hits)

    system_prompt = (
        "당신은 실손의료비 약관 검색 도우미다. "
        "반드시 제공된 검색 결과에 근거해서만 한국어로 답변하라. "
        "세대, 가입시기, 담보/조항을 먼저 확인한 뒤 답하고, "
        "질문이 애매하면 가능한 해석을 분리해서 설명하라. "
        "모르면 모른다고 말하라. "
        "답변 마지막 줄에는 '참고:'로 시작해 세대, 상품명, 조항명을 짧게 적어라."
    )
    user_prompt = (
        f"질문:\n{query}\n\n"
        f"검색 결과:\n{_build_context(hits)}\n\n"
        "위 검색 결과만 근거로 답변해 주세요."
    )

    payload = {
        "model": SETTINGS.openai_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_completion_tokens": 700,
    }

    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    endpoint = (SETTINGS.openai_base_url.strip() or DEFAULT_BASE_URL).rstrip("/") + "/chat/completions"
    req = request.Request(endpoint, data=body, headers=_headers(), method="POST")

    try:
        with request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
        choices = data.get("choices")
        if isinstance(choices, list) and choices:
            message = choices[0].get("message", {})
            content = message.get("content")
            if isinstance(content, str) and content.strip():
                return content.strip()
        return _fallback_answer(query, hits)
    except (error.URLError, error.HTTPError, TimeoutError, json.JSONDecodeError, KeyError):
        return _fallback_answer(query, hits)


def silson_search_payload(query: str, topk: int = 5) -> Dict[str, Any]:
    filters = {
        "generation": detect_generation(query),
        "source_kind": detect_source_kind(query),
        "join_ym": detect_join_ym(query),
    }

    hits: List[SilsonSearchHit] = []
    answer = ""
    retrieval_mode = "silson_rag_clauses"
    llm_status = "disabled"

    if SETTINGS.silson_vector_store_id.strip() and SETTINGS.openai_api_key.strip():
        try:
            vector_store_result = answer_silson_with_vector_store(query, topk=topk)
            hits = vector_store_result.hits
            answer = vector_store_result.answer
            retrieval_mode = "openai_vector_store"
            llm_status = "responses_api"
        except Exception:
            hits = []
            answer = ""
            retrieval_mode = "openai_vector_store_fallback"
            llm_status = "fallback"

    if not hits:
        hits = search_silson_local(query, topk=topk)

    if not answer:
        answer = generate_silson_answer_local(query, hits)

    follow_ups = generate_followups(query, hits, filters)

    return {
        "query": query,
        "answer": answer,
        "sources": _source_labels(hits),
        "chunks": [
            {
                "doc_id": hit.doc_id,
                "source_kind": hit.source_kind,
                "source_label": hit.source_label,
                "generation": hit.generation,
                "product_alias": hit.product_alias,
                "sales_period": hit.sales_period,
                "coverage_name": hit.coverage_name,
                "clause_name": hit.clause_name,
                "clause_text_oneline": hit.clause_text_oneline,
                "source_file": hit.source_file,
                "filename": hit.filename,
                "score": hit.score,
                "document_excerpt": hit.document_excerpt,
            }
            for hit in hits
        ],
        "mode": {
            "retrieval": retrieval_mode,
            "llm_status": llm_status,
        },
        "filters": filters,
        "follow_ups": follow_ups,
    }


def is_silson_rag_ready() -> bool:
    return SILSON_CLAUSES_CSV.exists() and SILSON_DOCS_DIR.exists()


def is_silson_vector_store_configured() -> bool:
    return bool(SETTINGS.silson_vector_store_id.strip())


def silson_rag_paths() -> Dict[str, str]:
    return {
        "clauses_csv": str(SILSON_CLAUSES_CSV),
        "docs_dir": str(Path(SILSON_DOCS_DIR)),
        "manifest_csv": str(SILSON_MANIFEST_CSV),
        "vector_store_id": SETTINGS.silson_vector_store_id.strip(),
    }
