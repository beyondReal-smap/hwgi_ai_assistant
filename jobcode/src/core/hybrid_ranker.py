from __future__ import annotations

from typing import Dict, List, Sequence, Tuple

from .schema import CandidateScore


def merge_candidates(
    bm25_hits: Sequence[Tuple[int, float, float]],
    embed_hits: Sequence[Tuple[int, float, float]],
    alpha_bm25: float = 0.7,
) -> List[CandidateScore]:
    merged: Dict[int, CandidateScore] = {}

    for idx, raw, norm in bm25_hits:
        item = merged.setdefault(idx, CandidateScore(job_code=str(idx)))
        item.bm25_score = raw
        item.bm25_score_norm = norm

    for idx, raw, norm in embed_hits:
        item = merged.setdefault(idx, CandidateScore(job_code=str(idx)))
        item.embed_score = raw
        item.embed_score_norm = norm

    for item in merged.values():
        item.final_score = alpha_bm25 * item.bm25_score_norm + (1.0 - alpha_bm25) * item.embed_score_norm

    return sorted(merged.values(), key=lambda x: x.final_score, reverse=True)
