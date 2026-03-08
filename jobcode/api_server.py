"""FastAPI server wrapping the jobcode search engine.

Run from the jobcode/ directory:
    uvicorn api_server:app --reload --port 8000
"""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parent
if str(ROOT / "src") not in sys.path:
    sys.path.insert(0, str(ROOT / "src"))

# Ensure the project root is on sys.path so silson_rag package is importable
PROJECT_ROOT = ROOT.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Load API keys from the parent Next.js .env.local (shared OPENAI_API_KEY)
from dotenv import load_dotenv
load_dotenv(ROOT.parent / ".env.local")
load_dotenv()  # local jobcode/.env overrides if it exists

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from core.bm25_engine import BM25Engine
from core.config import (
    SETTINGS,
)
from core.cross_encoder import CrossEncoderReranker
from core.data_loader import dataframe_hash, load_jobs, to_records
from core.embed_engine import EmbedEngine
from core.evidence import highlight_text, select_evidence_sentences
from core.hybrid_ranker import merge_candidates
from core.llm_client import rerank_with_llm
from silson_rag.src.api import (
    is_ready as is_silson_rag_ready,
    is_vector_store_configured as is_silson_vector_store_configured,
    rag_paths as silson_rag_paths,
    search as silson_search,
)
from core.text_norm import load_synonyms, normalize_text, tokenize

# ---------------------------------------------------------------------------
# Singleton engines — built once at startup
# ---------------------------------------------------------------------------
_engines: Dict[str, Any] = {}


def get_engines():
    if not _engines:
        synonyms = load_synonyms(ROOT / "data" / "synonyms.json")
        df = load_jobs(synonyms=synonyms)
        records = to_records(df)
        bm25 = BM25Engine(records=records, synonyms=synonyms)
        emb = EmbedEngine(
            records=records,
            model_name=SETTINGS.embed_model_name,
            data_hash=dataframe_hash(df),
        )
        ce = CrossEncoderReranker(SETTINGS.cross_encoder_model_name)
        _engines["df"] = df
        _engines["records"] = records
        _engines["bm25"] = bm25
        _engines["emb"] = emb
        _engines["ce"] = ce
    return _engines["df"], _engines["records"], _engines["bm25"], _engines["emb"], _engines["ce"]


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class SearchRequest(BaseModel):
    query: str
    use_hybrid: bool = Field(default_factory=lambda: SETTINGS.use_hybrid_default)
    use_cross_encoder: bool = Field(default_factory=lambda: SETTINGS.use_cross_encoder_default)
    use_llm: bool = Field(default_factory=lambda: SETTINGS.use_llm_default)
    show_highlight: bool = True
    score_threshold: float = Field(default_factory=lambda: float(SETTINGS.min_score_to_show))
    alpha_bm25: float = Field(default_factory=lambda: float(SETTINGS.alpha_bm25))
    topk_bm25: int = Field(default_factory=lambda: int(SETTINGS.topk_bm25))
    topk_embed: int = Field(default_factory=lambda: int(SETTINGS.topk_embed))
    topk_result: int = 3


class SearchResponse(BaseModel):
    recs: List[Dict[str, Any]]
    mode: Dict[str, str]
    score_threshold: float
    filtered_out_count: int
    prefilter_count: int


class SilsonSearchRequest(BaseModel):
    query: str
    topk: int = 5


class SilsonSearchResponse(BaseModel):
    query: str
    answer: str
    sources: List[str]
    chunks: List[Dict[str, Any]]
    mode: Dict[str, str]
    filters: Dict[str, Any]
    follow_ups: List[str] = []


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

# Generic Korean words that appear in almost every job description.
# These pass the BM25 stopword filter but are too vague to show as "match keywords".
_DISPLAY_STOPWORDS = {
    # Generic verb/participle forms
    "담당하는", "담당하고", "담당하며", "담당",
    "기획하는", "지휘하는", "조정하는", "수행하는", "운영하는",
    "하는", "하고", "하며", "하여", "하기", "하거나",
    "있으며", "있는", "되는", "되며", "되고",
    "한다", "된다", "이다", "이며", "이고",
    "포함된다", "말한다", "한다", "한다",
    # Generic management/activity words (ubiquitous in job descriptions)
    "기획", "운영", "지휘", "조정", "계획", "수립",
    "담당", "활동", "업무를", "일을", "계획을", "인력을",
    "세우고", "관련된", "관련한",
}


def _pick_highlight_keywords(query: str, description: str, evidence_hits: List[str]) -> List[str]:
    norm_desc = normalize_text(description)
    q_tokens = [t for t in tokenize(query) if len(t) >= 2]
    q_hits = [t for t in q_tokens if t in norm_desc and t not in _DISPLAY_STOPWORDS]
    clean_evidence = [h for h in evidence_hits if h not in _DISPLAY_STOPWORDS]
    merged = sorted(set(clean_evidence + q_hits), key=len, reverse=True)
    return merged[:12]


def _rerank_with_overlap(union_rows: List[Dict], query: str) -> List[Dict]:
    q_tokens = set(tokenize(query))
    if not q_tokens:
        return union_rows
    reranked: List[Dict] = []
    for row in union_rows:
        doc_tokens = set(tokenize(f"{row['job_name']} {row['description']}"))
        overlap = len(q_tokens.intersection(doc_tokens)) / max(len(q_tokens), 1)
        rerank_score = SETTINGS.rerank_weight_score * float(row["final_score"]) + SETTINGS.rerank_weight_overlap * overlap
        item = dict(row)
        item["overlap_score"] = overlap
        item["rerank_score"] = rerank_score
        reranked.append(item)
    reranked.sort(key=lambda x: x["rerank_score"], reverse=True)
    return reranked


def _build_candidate_rows(df, merged) -> List[Dict]:
    rows = []
    for c in merged:
        idx = int(c.job_code)
        job = df.iloc[idx]
        rows.append(
            {
                "idx": idx,
                "job_code": job["job_code"],
                "job_name": job["job_name"],
                "risk_grade": job["risk_grade"],
                "description": job["description"],
                "bm25_score": c.bm25_score,
                "embed_score": c.embed_score,
                "bm25_score_norm": c.bm25_score_norm,
                "embed_score_norm": c.embed_score_norm,
                "final_score": c.final_score,
            }
        )
    return rows


def _retrieve_candidates(req: SearchRequest) -> tuple[list[dict], dict[str, str], bool, bool]:
    """Run BM25 + embedding retrieval, merge, and overlap rerank.

    Returns (union_rows, mode_partial, hybrid_enabled, ce_enabled).
    """
    df, _, bm25, emb, ce = get_engines()

    bm25_hits = bm25.search(req.query, topk=req.topk_bm25)
    embed_hits: list = []
    hybrid_enabled = req.use_hybrid and emb.status.enabled
    if hybrid_enabled:
        embed_hits = emb.search(req.query, topk=req.topk_embed)

    merged = merge_candidates(
        bm25_hits=bm25_hits,
        embed_hits=embed_hits,
        alpha_bm25=req.alpha_bm25,
    )

    union_rows = _build_candidate_rows(df, merged)
    union_rows = _rerank_with_overlap(union_rows, req.query)

    ce_enabled = req.use_cross_encoder and ce.status.enabled

    mode: dict[str, str] = {
        "retrieval": "Hybrid(BM25+Embedding)" if hybrid_enabled else "BM25-only",
        "embed_status": emb.status.reason,
        "ce_status": ce.status.reason,
    }

    return union_rows, mode, hybrid_enabled, ce_enabled


def _rerank_candidates(
    req: SearchRequest, union_rows: list[dict], ce_enabled: bool
) -> tuple[list[dict], dict[str, str], bool, Any]:
    """Apply cross-encoder and LLM reranking.

    Returns (reranked_rows, mode_updates, llm_active, llm_result).
    """
    _, _, _, _, ce = get_engines()

    if ce_enabled:
        union_rows = ce.rerank(req.query, union_rows, topk=min(req.topk_bm25, 50))

    llm_result = rerank_with_llm(
        query=req.query,
        candidates=union_rows,
        use_llm=req.use_llm,
        api_key=SETTINGS.openai_api_key,
        base_url=SETTINGS.openai_base_url,
        model=SETTINGS.openai_model,
        topk_llm=int(SETTINGS.topk_llm),
    )
    llm_active = req.use_llm and llm_result.mode == "real"

    mode_updates: dict[str, str] = {
        "rerank": "cross-encoder" if ce_enabled else "rule-only",
        "llm_status": llm_result.mode if req.use_llm else "disabled",
    }

    return union_rows, mode_updates, llm_active, llm_result


def _build_response(
    req: SearchRequest,
    union_rows: list[dict],
    mode: dict[str, str],
    ce_enabled: bool,
    llm_active: bool,
    llm_result: Any,
) -> dict[str, Any]:
    """Select top rows, apply score threshold, build final response with evidence and highlighting."""

    # --- Build top_rows: LLM-ordered if active, else score-ordered ---
    topn = max(1, int(req.topk_result))
    if llm_active and llm_result.top3_codes:
        rows_by_code = {row["job_code"]: row for row in union_rows}
        top_rows = [rows_by_code[code] for code in llm_result.top3_codes if code in rows_by_code]
        # Fill remaining slots if LLM returned fewer than topn
        seen = {r["job_code"] for r in top_rows}
        for row in union_rows:
            if len(top_rows) >= topn:
                break
            if row["job_code"] not in seen:
                top_rows.append(row)
        top_rows = top_rows[:topn]
    else:
        top_rows = union_rows[:topn]

    # --- Build recs ---
    score_threshold = float(req.score_threshold)
    filtered_out_count = 0
    recs = []
    score_key = "final_score" if ce_enabled else "rerank_score"

    for row in top_rows:
        row_score = float(row.get(score_key, row.get("final_score", 0.0)))
        if row_score < score_threshold:
            filtered_out_count += 1
            continue

        code = row["job_code"]
        evidence, hits = select_evidence_sentences(req.query, row["description"], max_sentences=2)
        highlight_keywords = _pick_highlight_keywords(req.query, row["description"], hits)
        highlighted = (
            highlight_text(row["description"], highlight_keywords)
            if req.show_highlight
            else row["description"]
        )

        # Use LLM reason/cited_phrases if available, else rule-based
        if llm_active and code in llm_result.reasons:
            reason = llm_result.reasons[code]
            cited_phrases = llm_result.cited_phrases.get(code, [])
        else:
            reason = (
                "Cross-Encoder 재랭크와 하이브리드 점수를 함께 반영했습니다."
                if ce_enabled
                else "규칙 기반: BM25/임베딩 점수와 키워드 중첩이 높습니다."
            )
            cited_phrases = []

        recs.append(
            {
                "rank": len(recs) + 1,
                "job_code": code,
                "job_name": row["job_name"],
                "risk_grade": row["risk_grade"],
                "final_score": row_score,
                "reason": reason,
                "evidence": evidence,
                "cited_phrases": cited_phrases,
                "hits": highlight_keywords,
                "highlighted_description": highlighted,
                "raw_description": row["description"],
            }
        )

    return {
        "recs": recs,
        "mode": mode,
        "score_threshold": score_threshold,
        "filtered_out_count": filtered_out_count,
        "prefilter_count": len(top_rows),
    }


def run_search(req: SearchRequest) -> Dict[str, Any]:
    union_rows, mode, hybrid_enabled, ce_enabled = _retrieve_candidates(req)
    union_rows, mode_updates, llm_active, llm_result = _rerank_candidates(req, union_rows, ce_enabled)
    mode.update(mode_updates)
    return _build_response(req, union_rows, mode, ce_enabled, llm_active, llm_result)


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="Jobcode Search API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Avoid slow model downloads at startup; jobcode engines load lazily on demand."""
    preload = os.getenv("PRELOAD_JOBCODE_ENGINES", "").strip() in {"1", "true", "True", "yes", "on"}
    print(f"[api_server] LLM API key present: {bool(SETTINGS.openai_api_key)}")
    print(f"[api_server] Silson RAG ready: {is_silson_rag_ready()}")
    print(f"[api_server] Silson vector store configured: {is_silson_vector_store_configured()}")
    if preload:
        try:
            await asyncio.to_thread(get_engines)
            print("[api_server] Jobcode engines loaded successfully.")
        except Exception as exc:
            print(f"[api_server] Jobcode engine load failed: {exc}")
    else:
        print("[api_server] Jobcode engine preload skipped. Engines will load on first /api/search request.")


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "engines_loaded": bool(_engines),
        "llm_ready": bool(SETTINGS.openai_api_key),
        "silson_ready": is_silson_rag_ready(),
        "silson_vector_store_configured": is_silson_vector_store_configured(),
        "silson_paths": silson_rag_paths(),
    }


@app.post("/api/search", response_model=SearchResponse)
async def search(req: SearchRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="query must not be empty")
    try:
        result = await asyncio.to_thread(run_search, req)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/silson-search", response_model=SilsonSearchResponse)
async def silson_search_endpoint(req: SilsonSearchRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="query must not be empty")
    if not is_silson_rag_ready():
        raise HTTPException(status_code=503, detail="silson RAG assets are not ready")
    try:
        result = await asyncio.to_thread(silson_search, req.query, req.topk)
        return {
            "query": result.query,
            "answer": result.answer,
            "sources": result.sources,
            "chunks": result.chunks,
            "mode": result.mode,
            "filters": result.filters,
            "follow_ups": result.follow_ups,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
