from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

import numpy as np

from .config import SETTINGS
from .config import TOKEN_CACHE_PATH
from .schema import JobRecord
from .text_norm import expand_query_tokens, tokenize

try:
    from rank_bm25 import BM25Okapi
except Exception:  # pragma: no cover - optional failure
    BM25Okapi = None


class BM25Engine:
    def __init__(
        self,
        records: Sequence[JobRecord],
        token_cache_path: Path = TOKEN_CACHE_PATH,
        synonyms: Dict[str, List[str]] | None = None,
    ) -> None:
        self.records = list(records)
        self.token_cache_path = token_cache_path
        self.synonyms = synonyms or {}
        self.tokenized_docs = self._load_or_build_tokens()
        self._use_rank_bm25 = BM25Okapi is not None
        self.bm25 = BM25Okapi(self.tokenized_docs) if self._use_rank_bm25 else None

    def _load_or_build_tokens(self) -> List[List[str]]:
        if self.token_cache_path.exists():
            with self.token_cache_path.open("r", encoding="utf-8") as f:
                return json.load(f)

        tokenized = [tokenize(r.search_text) for r in self.records]
        self.token_cache_path.parent.mkdir(parents=True, exist_ok=True)
        with self.token_cache_path.open("w", encoding="utf-8") as f:
            json.dump(tokenized, f, ensure_ascii=False)
        return tokenized

    def rebuild_tokens(self) -> None:
        tokenized = [tokenize(r.search_text) for r in self.records]
        self.token_cache_path.parent.mkdir(parents=True, exist_ok=True)
        with self.token_cache_path.open("w", encoding="utf-8") as f:
            json.dump(tokenized, f, ensure_ascii=False)
        self.tokenized_docs = tokenized
        self.bm25 = BM25Okapi(tokenized) if self._use_rank_bm25 else None

    @staticmethod
    def normalize_scores(scores: Sequence[float]) -> np.ndarray:
        arr = np.array(scores, dtype=float)
        if arr.size == 0:
            return arr
        smin, smax = float(arr.min()), float(arr.max())
        if np.isclose(smax - smin, 0.0):
            return np.zeros_like(arr)
        return (arr - smin) / (smax - smin)

    def _fallback_score(self, query_tokens: List[str]) -> np.ndarray:
        qset = set(query_tokens)
        vals = []
        for doc in self.tokenized_docs:
            overlap = len(qset.intersection(doc))
            vals.append(float(overlap) / max(len(doc), 1))
        return np.array(vals, dtype=float)

    def search(self, query: str, topk: int = 50) -> List[Tuple[int, float, float]]:
        q_tokens = tokenize(query)
        if SETTINGS.use_query_expansion:
            q_tokens = expand_query_tokens(q_tokens, self.synonyms)
        if self.bm25 is not None:
            raw = np.array(self.bm25.get_scores(q_tokens), dtype=float)
        else:
            raw = self._fallback_score(q_tokens)

        norm = self.normalize_scores(raw)
        order = np.argsort(-raw)[:topk]
        return [(int(idx), float(raw[idx]), float(norm[idx])) for idx in order]
