"""LLM-based query rewriting for silson medical expense search.

Extracts structured keywords from natural-language questions to improve
keyword-based search. Falls back to rule-based tokenization on failure.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from typing import Dict, List, Optional
from urllib import error, request

from core.config import SETTINGS
from core.silson_common import tokenize

DEFAULT_BASE_URL = "https://api.openai.com/v1"


@dataclass
class RewrittenQuery:
    original: str
    keywords: List[str]
    inferred_generation: Optional[str] = None
    inferred_source_kind: Optional[str] = None
    rewrote: bool = False


def needs_rewriting(query: str, q_tokens: List[str]) -> bool:
    """Heuristic: skip rewriting for short, direct keyword queries."""
    # Very short queries that are already precise keywords
    if len(query.strip()) < 6 and not any(c in query for c in "?？"):
        return False
    # If tokenizer produced good tokens and no question markers, skip
    question_markers = {"?", "？", "나요", "인가요", "까요", "할까", "되나", "어떻게", "인지", "건가요"}
    has_question = any(m in query for m in question_markers)
    # Natural language question → rewrite
    if has_question:
        return True
    # Long query with many tokens likely benefits from rewriting
    if len(query) >= 15 and len(q_tokens) >= 3:
        return True
    return False


def _headers() -> Dict[str, str]:
    api_key = SETTINGS.openai_api_key.strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }


REWRITE_SYSTEM_PROMPT = """실손의료비 약관 검색을 위한 키워드 추출기입니다.
사용자 질문에서 검색에 필요한 핵심 키워드를 추출하세요.
반드시 JSON 형식으로만 답변하세요:
{"keywords":["키워드1","키워드2",...], "generation":"1세대"|"2세대"|"3세대"|"4세대"|"기타실손"|null, "source_kind":"coverage_criteria"|"injury_exclusion"|"disease_exclusion"|null}

규칙:
- keywords: 약관 검색에 유용한 핵심 단어만 추출 (조사/어미 제거)
- generation: 질문에서 세대가 언급된 경우만 설정
- source_kind: 보상기준/자기부담금/한도 → coverage_criteria, 상해면책 → injury_exclusion, 질병면책 → disease_exclusion
- 답변은 JSON만 출력하고 다른 텍스트는 포함하지 마세요"""


@lru_cache(maxsize=256)
def _rewrite_query_cached(query: str) -> tuple[tuple[str, ...], Optional[str], Optional[str], bool]:
    """Call LLM to extract keywords and cache repeated query rewrites."""
    api_key = SETTINGS.openai_api_key.strip()
    if not api_key:
        return tuple(tokenize(query)), None, None, False

    base_url = (SETTINGS.openai_base_url.strip() or DEFAULT_BASE_URL).rstrip("/")
    payload = {
        "model": SETTINGS.openai_model,
        "messages": [
            {"role": "system", "content": REWRITE_SYSTEM_PROMPT},
            {"role": "user", "content": query},
        ],
        "max_completion_tokens": 200,
        "response_format": {"type": "json_object"},
    }
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = request.Request(
        base_url + "/chat/completions",
        data=body,
        headers=_headers(),
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))

        choices = data.get("choices")
        if not isinstance(choices, list) or not choices:
            return tuple(tokenize(query)), None, None, False

        content = choices[0].get("message", {}).get("content", "")
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
    except (error.URLError, error.HTTPError, TimeoutError, json.JSONDecodeError, KeyError, Exception):
        return tuple(tokenize(query)), None, None, False


def rewrite_query(query: str) -> RewrittenQuery:
    """Return a copy of the cached rewrite result for the given query."""
    keywords, inferred_generation, inferred_source_kind, rewrote = _rewrite_query_cached(query)
    return RewrittenQuery(
        original=query,
        keywords=list(keywords),
        inferred_generation=inferred_generation,
        inferred_source_kind=inferred_source_kind,
        rewrote=rewrote,
    )
