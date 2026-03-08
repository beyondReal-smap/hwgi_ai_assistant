"""Adaptive hybrid score merger for keyword + embedding results."""
from __future__ import annotations

from typing import Dict, List, Tuple


def _min_max_normalize(scores: Dict[int, float]) -> Dict[int, float]:
    if not scores:
        return {}
    vals = list(scores.values())
    smin, smax = min(vals), max(vals)
    rng = smax - smin if smax > smin else 1.0
    return {k: (v - smin) / rng for k, v in scores.items()}


def merge_scores(
    keyword_scores: Dict[int, float],
    embed_scores: Dict[int, float],
    alpha: float = 0.6,
) -> List[Tuple[int, float]]:
    """Merge keyword and embedding scores with adaptive alpha.

    Args:
        keyword_scores: {doc_index: raw_keyword_score}
        embed_scores: {doc_index: normalized_embedding_score}
        alpha: base weight for keyword scores (1-alpha for embedding)

    Returns:
        Sorted list of (doc_index, hybrid_score) descending by score.
    """
    all_indices = set(keyword_scores.keys()) | set(embed_scores.keys())
    if not all_indices:
        return []

    kw_norm = _min_max_normalize(keyword_scores)

    # Adaptive alpha: if embedding scores are much stronger, shift weight toward embedding
    if embed_scores and keyword_scores:
        kw_avg = sum(kw_norm.values()) / len(kw_norm) if kw_norm else 0.0
        em_avg = sum(embed_scores.values()) / len(embed_scores) if embed_scores else 0.0
        if em_avg > kw_avg * 1.5 and em_avg > 0.3:
            alpha = max(0.3, alpha - 0.15)

    scored: List[Tuple[int, float]] = []
    for idx in all_indices:
        kw_val = kw_norm.get(idx, 0.0)
        em_val = embed_scores.get(idx, 0.0)

        if embed_scores:
            hybrid = alpha * kw_val + (1 - alpha) * em_val
        else:
            hybrid = kw_val

        scored.append((idx, hybrid))

    scored.sort(key=lambda x: -x[1])
    return scored
