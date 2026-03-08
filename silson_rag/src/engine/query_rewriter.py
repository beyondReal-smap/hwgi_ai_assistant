"""LLM-based query rewriting for improved search quality.

Extracts structured keywords from natural-language questions.
Merges LLM keywords with original tokens (union, not replacement).
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from typing import List, Optional

from ..openai_client import chat_completion
from .tokenizer import tokenize

REWRITE_SYSTEM_PROMPT = """실손의료비 약관 검색을 위한 키워드 추출기입니다.
사용자 질문에서 검색에 필요한 핵심 키워드를 추출하세요.
반드시 JSON 형식으로만 답변하세요:
{"keywords":["키워드1","키워드2",...], "generation":"1세대"|"2세대"|"3세대"|"4세대"|"기타실손"|null, "source_kind":"coverage_criteria"|"injury_exclusion"|"disease_exclusion"|null}

규칙:
- keywords: 약관 검색에 유용한 핵심 단어만 추출 (조사/어미 제거)
- generation: 질문에서 세대가 언급된 경우만 설정
- source_kind: 보상기준/자기부담금/한도 → coverage_criteria, 상해면책 → injury_exclusion, 질병면책 → disease_exclusion
- 답변은 JSON만 출력하고 다른 텍스트는 포함하지 마세요"""


@dataclass
class RewrittenQuery:
    original: str
    keywords: List[str]
    inferred_generation: Optional[str] = None
    inferred_source_kind: Optional[str] = None
    rewrote: bool = False


def needs_rewriting(query: str, q_tokens: List[str]) -> bool:
    """Heuristic: skip rewriting for short, direct keyword queries."""
    if len(query.strip()) < 6 and not any(c in query for c in "?？"):
        return False
    question_markers = {"?", "？", "나요", "인가요", "까요", "할까", "되나", "어떻게", "인지", "건가요"}
    has_question = any(m in query for m in question_markers)
    if has_question:
        return True
    if len(query) >= 15 and len(q_tokens) >= 3:
        return True
    return False


@lru_cache(maxsize=256)
def _rewrite_cached(query: str) -> tuple[tuple[str, ...], Optional[str], Optional[str], bool]:
    """Call LLM to extract keywords. Results are cached."""
    content = chat_completion(
        messages=[
            {"role": "system", "content": REWRITE_SYSTEM_PROMPT},
            {"role": "user", "content": query},
        ],
        max_tokens=200,
        timeout=10,
        response_format={"type": "json_object"},
    )
    if content is None:
        return tuple(tokenize(query)), None, None, False

    try:
        parsed = json.loads(content)
        keywords = parsed.get("keywords", [])
        if not isinstance(keywords, list) or not keywords:
            return tuple(tokenize(query)), None, None, False
        return (
            tuple(str(k) for k in keywords if k),
            parsed.get("generation"),
            parsed.get("source_kind"),
            True,
        )
    except (json.JSONDecodeError, KeyError):
        return tuple(tokenize(query)), None, None, False


def rewrite_query(query: str) -> RewrittenQuery:
    """Rewrite query using LLM keyword extraction."""
    keywords, gen, sk, rewrote = _rewrite_cached(query)
    return RewrittenQuery(
        original=query,
        keywords=list(keywords),
        inferred_generation=gen,
        inferred_source_kind=sk,
        rewrote=rewrote,
    )


def merge_tokens(original_tokens: List[str], rewritten: RewrittenQuery) -> List[str]:
    """Merge original tokens with LLM-extracted keywords (union, not replacement)."""
    if not rewritten.rewrote or not rewritten.keywords:
        return original_tokens

    seen: set[str] = set()
    merged: List[str] = []
    for t in original_tokens + rewritten.keywords:
        if t and t not in seen:
            seen.add(t)
            merged.append(t)
    return merged
