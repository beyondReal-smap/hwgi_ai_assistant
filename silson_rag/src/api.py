"""Search orchestrator — main entry point for silson_rag package.

Usage:
    from silson_rag.src.api import search, is_ready
    result = search("착한실손 병실료차액", topk=5)
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

from .config import CFG
from .engine.embed_engine import EmbedEngine
from .engine.filters import (
    apply_df_filters,
    build_openai_filters,
    detect_filters,
    detect_generation,
    detect_source_kind,
)
from .engine.followups import generate_followups
from .engine.hybrid_ranker import merge_scores
from .engine.keyword_scorer import FIELD_WEIGHTS, KeywordScorer
from .engine.query_rewriter import merge_tokens, needs_rewriting, rewrite_query
from .engine.tokenizer import tokenize
from .llm_answer import (
    _source_labels,
    answer_with_vector_store,
    fallback_answer,
    generate_answer_local,
)
from .types import FilterResult, SearchHit, SearchResult

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


def _clean_text(value: Any) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    return str(value).strip()


@lru_cache(maxsize=1)
def _load_clause_df() -> pd.DataFrame:
    if not CFG.clauses_csv.exists():
        raise FileNotFoundError(f"silson clauses CSV not found: {CFG.clauses_csv}")
    df = pd.read_csv(CFG.clauses_csv, encoding="utf-8-sig").fillna("")
    for column in SEARCH_TEXT_FIELDS:
        if column not in df.columns:
            df[column] = ""
    if "sales_start_ym" in df.columns:
        df["sales_start_ym"] = pd.to_numeric(df["sales_start_ym"], errors="coerce")
    if "sales_end_ym" in df.columns:
        df["sales_end_ym"] = pd.to_numeric(df["sales_end_ym"], errors="coerce")
    if "is_current" in df.columns:
        df["is_current"] = df["is_current"].astype(str).str.lower().eq("true")
    return df


@lru_cache(maxsize=1)
def _load_search_texts() -> tuple[str, ...]:
    df = _load_clause_df()
    return tuple(df["search_text"].fillna("").astype(str).tolist())


@lru_cache(maxsize=1)
def _load_doc_texts() -> Dict[str, str]:
    texts: Dict[str, str] = {}
    if not CFG.clause_docs_dir.exists():
        return texts
    for path in CFG.clause_docs_dir.glob("*.md"):
        texts[path.stem] = path.read_text(encoding="utf-8")
    return texts


@lru_cache(maxsize=1)
def _load_manifest_rows() -> Dict[str, Dict[str, str]]:
    if not CFG.manifest_csv.exists():
        return {}
    manifest = pd.read_csv(CFG.manifest_csv, encoding="utf-8-sig").fillna("")
    rows: Dict[str, Dict[str, str]] = {}
    for row in manifest.to_dict(orient="records"):
        doc_id = _clean_text(row.get("doc_id"))
        if doc_id:
            rows[doc_id] = {str(k): _clean_text(v) for k, v in row.items()}
    return rows


# ---------------------------------------------------------------------------
# Singleton engines
# ---------------------------------------------------------------------------
_keyword_scorer: Optional[KeywordScorer] = None
_embed_engine: Optional[EmbedEngine] = None


def _get_keyword_scorer() -> KeywordScorer:
    global _keyword_scorer
    if _keyword_scorer is None:
        df = _load_clause_df()
        corpus = df["search_text"].fillna("").astype(str).tolist()
        field_texts = {}
        for field_name, _ in FIELD_WEIGHTS:
            if field_name in df.columns:
                field_texts[field_name] = df[field_name].fillna("").astype(str).tolist()
        _keyword_scorer = KeywordScorer(corpus, field_texts)
    return _keyword_scorer


def _get_embed_engine() -> Optional[EmbedEngine]:
    global _embed_engine
    if _embed_engine is None and CFG.use_embedding:
        _embed_engine = EmbedEngine()
    return _embed_engine


# ---------------------------------------------------------------------------
# Row → SearchHit conversion
# ---------------------------------------------------------------------------

def _row_to_hit(row: pd.Series, score: float) -> SearchHit:
    manifest = _load_manifest_rows().get(_clean_text(row.get("doc_id")), {})
    doc_id = _clean_text(row.get("doc_id"))
    filename = _clean_text(manifest.get("filename")) or f"{doc_id}.md"
    doc_text = _load_doc_texts().get(doc_id, "")
    excerpt = doc_text[:900].strip()

    return SearchHit(
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


# ---------------------------------------------------------------------------
# Local search
# ---------------------------------------------------------------------------

def search_local(query: str, topk: int = 5) -> List[SearchHit]:
    """Hybrid BM25 + embedding local search."""
    full_df = _load_clause_df()
    filters = detect_filters(query)
    df = apply_df_filters(full_df, filters)

    # Query rewriting
    q_tokens = tokenize(query)
    rewrite_result = None
    if CFG.use_query_rewriting:
        if needs_rewriting(query, q_tokens):
            rewrite_result = rewrite_query(query)
            q_tokens = merge_tokens(q_tokens, rewrite_result)

            # Apply LLM-inferred filters if regex missed them
            if rewrite_result.inferred_generation and detect_generation(query) is None:
                gen_filtered = df[df["generation"] == rewrite_result.inferred_generation]
                if not gen_filtered.empty:
                    df = gen_filtered
            if rewrite_result.inferred_source_kind and detect_source_kind(query) is None:
                sk_filtered = df[df["source_kind"] == rewrite_result.inferred_source_kind]
                if not sk_filtered.empty:
                    df = sk_filtered

    valid_indices = set(df.index)

    # Keyword scoring (BM25)
    keyword_scores = _get_keyword_scorer().score(q_tokens, valid_indices)

    # Embedding scoring
    embed_scores: Dict[int, float] = {}
    embed_engine = _get_embed_engine()
    if embed_engine and embed_engine.status.enabled:
        embed_engine.ensure_index(_load_search_texts())
        embed_query = query
        if rewrite_result and rewrite_result.rewrote and rewrite_result.keywords:
            embed_query = " ".join(rewrite_result.keywords)
        embed_scores = embed_engine.search_filtered(embed_query, valid_indices, topk=50)

    # Hybrid merge
    scored = merge_scores(keyword_scores, embed_scores, alpha=CFG.alpha_keyword)
    if not scored:
        return []

    # Deduplicate and build hits
    hits: List[SearchHit] = []
    seen: set[tuple] = set()
    for idx, score in scored:
        row = df.loc[idx]
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


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def search(query: str, topk: int = 5) -> SearchResult:
    """Main search entry point with 3-tier answer generation."""
    filters = detect_filters(query)
    filter_dict = {
        "generation": filters.generation,
        "source_kind": filters.source_kind,
        "join_ym": filters.join_ym,
    }

    hits: List[SearchHit] = []
    answer = ""
    retrieval_mode = "silson_rag_clauses"
    llm_status = "disabled"

    # Tier 1: Vector Store
    if CFG.vector_store_id.strip() and CFG.openai_api_key.strip():
        try:
            openai_filters = build_openai_filters(filters)
            answer, hits = answer_with_vector_store(query, openai_filters, topk=topk)
            retrieval_mode = "openai_vector_store"
            llm_status = "responses_api"
        except Exception:
            hits = []
            answer = ""
            retrieval_mode = "openai_vector_store_fallback"
            llm_status = "fallback"

    # Tier 2/3: Local search + LLM or rule-based answer
    if not hits:
        hits = search_local(query, topk=topk)

    if not answer:
        answer = generate_answer_local(query, hits)

    follow_ups = generate_followups(query, hits, filters)

    return SearchResult(
        query=query,
        answer=answer,
        sources=_source_labels(hits),
        chunks=[
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
        mode={
            "retrieval": retrieval_mode,
            "llm_status": llm_status,
        },
        filters=filter_dict,
        follow_ups=follow_ups,
    )


def is_ready() -> bool:
    """Check if silson RAG assets are available."""
    return CFG.clauses_csv.exists() and CFG.clause_docs_dir.exists()


def is_vector_store_configured() -> bool:
    return bool(CFG.vector_store_id.strip())


def rag_paths() -> Dict[str, str]:
    return {
        "clauses_csv": str(CFG.clauses_csv),
        "docs_dir": str(CFG.clause_docs_dir),
        "manifest_csv": str(CFG.manifest_csv),
        "vector_store_id": CFG.vector_store_id.strip(),
    }
