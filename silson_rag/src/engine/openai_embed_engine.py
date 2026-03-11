"""Runtime OpenAI embedding search engine using FAISS / numpy fallback.

Loads pre-built embeddings + FAISS index from artifacts/qa_knowledge/.
Queries are embedded via OpenAI API at runtime.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import List, Tuple

import numpy as np

from ..config import CFG

try:
    import faiss
except Exception:
    faiss = None

# Module-level singleton
_instance: "OpenAIEmbedEngine | None" = None


class OpenAIEmbedEngine:
    """Semantic search engine backed by OpenAI embeddings + FAISS."""

    def __init__(self, embed_dir: Path | None = None) -> None:
        self.embed_dir = embed_dir or CFG.qa_knowledge_dir
        self.embeddings: np.ndarray | None = None
        self.index = None
        self.backend = "disabled"
        self._loaded = False

    def _load(self) -> None:
        if self._loaded:
            return
        self._loaded = True

        emb_path = self.embed_dir / "embeddings.npy"
        if not emb_path.exists():
            return

        self.embeddings = np.load(emb_path)

        index_path = self.embed_dir / "faiss.index"
        if faiss is not None and index_path.exists():
            self.index = faiss.read_index(str(index_path))
            self.backend = "openai_faiss"
        else:
            self.backend = "openai_numpy"

    def search(self, query: str, topk: int = 10) -> List[Tuple[int, float]]:
        """Return list of (chunk_index, score) sorted by descending similarity."""
        self._load()
        if self.embeddings is None:
            return []

        from ..openai_client import create_embeddings

        try:
            q_emb = np.array(create_embeddings([query]), dtype=np.float32)
            # Normalize
            norm = np.linalg.norm(q_emb, axis=1, keepdims=True)
            norm[norm == 0] = 1.0
            q_emb = q_emb / norm
        except Exception:
            return []

        if self.backend == "openai_faiss" and self.index is not None:
            k = min(topk, self.embeddings.shape[0])
            scores, indices = self.index.search(q_emb, k)
            return [(int(idx), float(score)) for idx, score in zip(indices[0], scores[0]) if idx >= 0]

        # numpy fallback
        scores_all = np.dot(self.embeddings, q_emb[0])
        top_indices = np.argsort(-scores_all)[:topk]
        return [(int(idx), float(scores_all[idx])) for idx in top_indices]

    @property
    def is_available(self) -> bool:
        self._load()
        return self.embeddings is not None


def get_openai_embed_engine() -> OpenAIEmbedEngine:
    """Get or create the singleton engine instance."""
    global _instance
    if _instance is None:
        _instance = OpenAIEmbedEngine()
    return _instance
