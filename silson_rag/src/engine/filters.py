"""Metadata detection and filtering for silson clauses.

Detects generation, source_kind, and join date from queries,
then builds DataFrame masks and OpenAI filter dicts.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

import pandas as pd

from ..types import FilterResult

JOIN_YM_RE = re.compile(r"(20\d{2})(?:년?\s*[.\- ]?\s*(\d{1,2})월?|년)")

GENERATION_ALIASES = {
    "1세대": ["1세대", "구실손", "초기 실손"],
    "2세대": ["2세대", "표준화 실손", "개정실손", "신신계약"],
    "3세대": ["3세대", "착한실손"],
    "4세대": ["4세대", "4세대실손"],
    "기타실손": ["기타실손", "유병자실손", "유병력자 실손", "노후실손"],
}

SOURCE_KIND_ALIASES = {
    "injury_exclusion": ["상해 면책", "상해면책", "상해 면책사항", "상해 보상 제외"],
    "disease_exclusion": ["질병 면책", "질병면책", "질병 면책사항", "질병 보상 제외"],
    "coverage_criteria": ["보상기준", "보상비율", "자기부담금", "공제금액", "한도", "비급여", "급여"],
}

# join_ym ranges for each generation (sales_start_ym ~ sales_end_ym)
GENERATION_SALES_RANGES = {
    "1세대": (None, 200907),
    "2세대": (200908, 201703),
    "3세대": (201704, 202106),
    "4세대": (202107, None),
}


def detect_generation(question: str) -> Optional[str]:
    for generation, aliases in GENERATION_ALIASES.items():
        if any(alias in question for alias in aliases):
            return generation
    return None


def detect_source_kind(question: str) -> Optional[str]:
    for kind, aliases in SOURCE_KIND_ALIASES.items():
        if any(alias in question for alias in aliases):
            return kind
    return None


def detect_join_ym(question: str) -> Optional[int]:
    match = JOIN_YM_RE.search(question)
    if not match:
        return None
    year = int(match.group(1))
    month = int(match.group(2)) if match.group(2) else 1
    if not (1 <= month <= 12):
        month = 1
    return year * 100 + month


def infer_generation_from_join_ym(join_ym: int) -> Optional[str]:
    """Infer generation from join date based on sales period overlap."""
    for gen, (start, end) in GENERATION_SALES_RANGES.items():
        if start is not None and join_ym < start:
            continue
        if end is not None and join_ym > end:
            continue
        return gen
    return None


def detect_filters(question: str) -> FilterResult:
    generation = detect_generation(question)
    source_kind = detect_source_kind(question)
    join_ym = detect_join_ym(question)

    # Infer generation from join date if not explicitly stated
    if generation is None and join_ym is not None:
        generation = infer_generation_from_join_ym(join_ym)

    return FilterResult(
        generation=generation,
        source_kind=source_kind,
        join_ym=join_ym,
    )


def merge_filters(primary: FilterResult, secondary: Optional[FilterResult] = None) -> FilterResult:
    """Merge two FilterResult values, preferring non-empty values from primary."""
    secondary = secondary or FilterResult()
    return FilterResult(
        generation=primary.generation or secondary.generation,
        source_kind=primary.source_kind or secondary.source_kind,
        join_ym=primary.join_ym or secondary.join_ym,
    )


def apply_df_filters(df: pd.DataFrame, filters: FilterResult, *, fallback_to_full: bool = True) -> pd.DataFrame:
    """Apply metadata filters to DataFrame."""
    filtered = df

    if filters.generation:
        filtered = filtered[filtered["generation"] == filters.generation]

    if filters.source_kind:
        filtered = filtered[filtered["source_kind"] == filters.source_kind]

    if filters.join_ym:
        cond_start = filtered["sales_start_ym"].isna() | (filtered["sales_start_ym"] <= filters.join_ym)
        cond_end = filtered["is_current"] | filtered["sales_end_ym"].isna() | (filtered["sales_end_ym"] >= filters.join_ym)
        filtered = filtered[cond_start & cond_end]

    return filtered if not filtered.empty or not fallback_to_full else df


def build_openai_filters(filters: FilterResult) -> Optional[Dict[str, Any]]:
    """Build OpenAI Vector Store filter dict from FilterResult."""
    parts: List[Dict[str, Any]] = []

    if filters.generation:
        parts.append({"type": "eq", "key": "generation", "value": filters.generation})

    if filters.source_kind:
        parts.append({"type": "eq", "key": "source_kind", "value": filters.source_kind})

    if filters.join_ym:
        parts.append({
            "type": "and",
            "filters": [
                {"type": "lte", "key": "sales_start_ym", "value": filters.join_ym},
                {
                    "type": "or",
                    "filters": [
                        {"type": "gte", "key": "sales_end_ym", "value": filters.join_ym},
                        {"type": "eq", "key": "is_current", "value": True},
                    ],
                },
            ],
        })

    if not parts:
        return None
    if len(parts) == 1:
        return parts[0]
    return {"type": "and", "filters": parts}
