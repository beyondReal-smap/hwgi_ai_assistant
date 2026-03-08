"""Data types for silson_rag package."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class SearchHit:
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
class FilterResult:
    generation: Optional[str] = None
    source_kind: Optional[str] = None
    join_ym: Optional[int] = None


@dataclass
class SearchResult:
    query: str
    answer: str
    sources: List[str] = field(default_factory=list)
    chunks: List[Dict[str, Any]] = field(default_factory=list)
    mode: Dict[str, str] = field(default_factory=dict)
    filters: Dict[str, Any] = field(default_factory=dict)
    follow_ups: List[str] = field(default_factory=list)
