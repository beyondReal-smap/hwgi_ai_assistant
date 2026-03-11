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


@dataclass(frozen=True)
class CustomerContract:
    customer_name: str
    insured_name: str
    policy_no: str
    product_code: str
    product_name: str
    join_date: str
    join_ym: Optional[int]
    generation: Optional[str]
    is_silson: bool
    coverage_names: List[str] = field(default_factory=list)


@dataclass(frozen=True)
class CustomerContext:
    customer_name: str
    matched_names: List[str] = field(default_factory=list)
    contracts: List[CustomerContract] = field(default_factory=list)
    silson_contracts: List[CustomerContract] = field(default_factory=list)


@dataclass
class SearchResult:
    query: str
    answer: str
    sources: List[str] = field(default_factory=list)
    chunks: List[Dict[str, Any]] = field(default_factory=list)
    mode: Dict[str, str] = field(default_factory=dict)
    filters: Dict[str, Any] = field(default_factory=dict)
    follow_ups: List[str] = field(default_factory=list)
    structured_answer: Optional["StructuredAnswer"] = None


@dataclass(frozen=True)
class QASearchHit:
    chunk_id: str
    chunk_type: str  # "qa_pair" | "reference"
    question: str
    answer: str
    score: float
    source: str = ""


@dataclass
class StructuredAnswer:
    summary: str = ""
    context_note: str = ""
    answer: str = ""
    coverage_points: List[str] = field(default_factory=list)
    cautions: List[str] = field(default_factory=list)
    checkpoints: List[str] = field(default_factory=list)
    reference_note: str = ""
