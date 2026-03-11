"""QA knowledge base search module.

Loads pre-built QA chunks and searches via OpenAI embeddings.
Returns QASearchHit results combining expert Q&A pairs and reference chunks.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import List

from .config import CFG
from .engine.openai_embed_engine import get_openai_embed_engine
from .types import QASearchHit

# Module-level cache
_chunks: list[dict] | None = None


def _load_chunks() -> list[dict]:
    global _chunks
    if _chunks is not None:
        return _chunks

    chunks_path = CFG.qa_knowledge_dir / "all_chunks.json"
    if not chunks_path.exists():
        _chunks = []
        return _chunks

    with chunks_path.open("r", encoding="utf-8") as f:
        _chunks = json.load(f)
    return _chunks


def search_qa(query: str, topk: int = 5) -> List[QASearchHit]:
    """Search QA knowledge base and return top-k hits."""
    if not CFG.use_qa_knowledge:
        return []

    engine = get_openai_embed_engine()
    if not engine.is_available:
        return []

    if not CFG.openai_api_key.strip():
        return []

    chunks = _load_chunks()
    if not chunks:
        return []

    results = engine.search(query, topk=topk)
    hits: List[QASearchHit] = []
    for idx, score in results:
        if idx < 0 or idx >= len(chunks):
            continue
        chunk = chunks[idx]
        hits.append(QASearchHit(
            chunk_id=chunk["id"],
            chunk_type=chunk["type"],
            question=chunk.get("question", ""),
            answer=chunk.get("answer", ""),
            score=score,
            source=chunk.get("source", ""),
        ))

    return hits


def is_qa_available() -> bool:
    """Check if QA knowledge base is ready."""
    if not CFG.use_qa_knowledge:
        return False
    engine = get_openai_embed_engine()
    return engine.is_available
