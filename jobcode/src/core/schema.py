from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class JobRecord:
    job_code: str
    job_name: str
    risk_grade: str
    description: str
    search_text: str


@dataclass
class CandidateScore:
    job_code: str
    bm25_score: float = 0.0
    embed_score: float = 0.0
    bm25_score_norm: float = 0.0
    embed_score_norm: float = 0.0
    final_score: float = 0.0


@dataclass
class Recommendation:
    rank: int
    job_code: str
    job_name: str
    risk_grade: str
    final_score: float
    reason: str
    evidence_sentences: List[str] = field(default_factory=list)
    highlighted_description_html: str = ""
    keyword_hits: List[str] = field(default_factory=list)


@dataclass
class SearchResult:
    bm25_candidates: List[CandidateScore]
    embed_candidates: List[CandidateScore]
    union_candidates: List[CandidateScore]
    recommendations: List[Recommendation]
    mode: Dict[str, str]
