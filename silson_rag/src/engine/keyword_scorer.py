"""BM25-based keyword search scorer.

Replaces the naive str.contains() approach with BM25Okapi for proper
term-frequency scoring, plus field-specific weight bonuses.
"""
from __future__ import annotations

from typing import Dict, List, Sequence

import numpy as np

from .tokenizer import tokenize

try:
    from rank_bm25 import BM25Okapi
except ImportError:
    BM25Okapi = None

# Column weights for field-specific bonus scoring
FIELD_WEIGHTS = (
    ("clause_name", 4.0),
    ("coverage_name", 3.0),
    ("product_alias", 2.5),
    ("source_label", 2.0),
    ("keywords", 1.5),
    ("naturalized_qa", 1.2),
)


class KeywordScorer:
    """BM25-based keyword scorer with field-weight bonuses."""

    def __init__(self, corpus_texts: Sequence[str], field_texts: dict[str, Sequence[str]] | None = None) -> None:
        """
        Args:
            corpus_texts: search_text for each clause (main BM25 corpus)
            field_texts: {field_name: [text_per_clause]} for bonus scoring
        """
        self._tokenized_corpus = [tokenize(t) for t in corpus_texts]
        self._field_texts_lower: dict[str, list[str]] = {}
        if field_texts:
            for name, texts in field_texts.items():
                self._field_texts_lower[name] = [str(t).lower() for t in texts]

        if BM25Okapi is not None and self._tokenized_corpus:
            self._bm25 = BM25Okapi(self._tokenized_corpus)
        else:
            self._bm25 = None

    def score(self, query_tokens: List[str], valid_indices: set[int] | None = None) -> Dict[int, float]:
        """Return {doc_index: score} for documents matching the query tokens.

        Args:
            query_tokens: pre-tokenized query
            valid_indices: if set, only score these indices (post-filter)
        """
        if not query_tokens:
            return {}

        n = len(self._tokenized_corpus)

        if self._bm25 is not None:
            raw_scores = self._bm25.get_scores(query_tokens)
        else:
            # Fallback: simple token overlap counting
            raw_scores = np.zeros(n, dtype=np.float32)
            token_set = set(t.lower() for t in query_tokens)
            for i, doc_tokens in enumerate(self._tokenized_corpus):
                overlap = sum(1 for t in doc_tokens if t.lower() in token_set)
                raw_scores[i] = overlap

        # Add field weight bonuses
        tokens_lower = [t.lower() for t in query_tokens]
        bonus = np.zeros(n, dtype=np.float32)
        for field_name, weight in FIELD_WEIGHTS:
            field_values = self._field_texts_lower.get(field_name)
            if field_values is None:
                continue
            for token in tokens_lower:
                for i, val in enumerate(field_values):
                    if token in val:
                        bonus[i] += weight

        combined = raw_scores + bonus

        # Filter to valid indices and positive scores
        results: Dict[int, float] = {}
        for i in range(n):
            if valid_indices is not None and i not in valid_indices:
                continue
            if combined[i] > 0:
                results[i] = float(combined[i])
        return results
