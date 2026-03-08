from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

COMMON_STOPWORDS = {
    "에서", "으로", "관련", "기준", "무엇", "인가요", "어떻게", "되나요",
    "처리", "대한", "해주세요", "알려줘", "알려주세요",
    "실손", "실손의료비", "실비", "실비보험", "보험", "의료비", "의료실비",
}
PARTICLE_RE = re.compile(r"(은|는|이|가|을|를|에|에서|과|와|도|만|요)$")
JOIN_YM_RE = re.compile(r"(20\d{2})(?:[.\- ]?(\d{1,2}))?\s*년?")

TERM_EQUIV = {
    "병실료차액": ["병실료차액", "병실차액", "상급병실차액", "상급병실"],
    "병실차액": ["병실료차액", "병실차액", "상급병실차액", "상급병실"],
    "공제금액": ["공제금액", "자기부담금", "본인부담금"],
    "자기부담금": ["공제금액", "자기부담금", "본인부담금"],
    "본인부담금": ["공제금액", "자기부담금", "본인부담금"],
    "건보미적용": ["건보미적용", "건강보험미적용", "건강보험 미적용", "비급여"],
    "면책": ["면책", "보상제외", "보상 제외", "보상하지 않음"],
    "라식": ["라식", "시력교정술", "굴절교정술"],
    "한방": ["한방", "한방치료", "한의원", "한의과"],
}

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


def _normalize_token(token: str) -> str:
    return PARTICLE_RE.sub("", token)


def tokenize(text: str) -> List[str]:
    text = re.sub(r"[^0-9A-Za-z가-힣]+", " ", text)
    raw_tokens = [_normalize_token(t) for t in text.split()]
    tokens = [t for t in raw_tokens if len(t) >= 2 and t not in COMMON_STOPWORDS]
    if not tokens:
        tokens = [t for t in raw_tokens if len(t) >= 2]
    expanded: List[str] = []
    for token in tokens:
        expanded.append(token)
        for key, variants in TERM_EQUIV.items():
            if key in token or token in variants:
                expanded.extend(variants)
    out: List[str] = []
    seen = set()
    for token in expanded:
        if token and token not in seen:
            seen.add(token)
            out.append(token)
    return out


def detect_generation(question: str) -> Optional[str]:
    for generation, aliases in GENERATION_ALIASES.items():
        if any(alias in question for alias in aliases):
            return generation
    return None


def detect_source_kind(question: str) -> Optional[str]:
    if any(alias in question for alias in SOURCE_KIND_ALIASES["injury_exclusion"]):
        return "injury_exclusion"
    if any(alias in question for alias in SOURCE_KIND_ALIASES["disease_exclusion"]):
        return "disease_exclusion"
    if any(alias in question for alias in SOURCE_KIND_ALIASES["coverage_criteria"]):
        return "coverage_criteria"
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


def build_filters(question: str) -> Optional[Dict[str, Any]]:
    filters: List[Dict[str, Any]] = []
    generation = detect_generation(question)
    if generation:
        filters.append({"type": "eq", "key": "generation", "value": generation})
    source_kind = detect_source_kind(question)
    if source_kind:
        filters.append({"type": "eq", "key": "source_kind", "value": source_kind})
    join_ym = detect_join_ym(question)
    if join_ym:
        filters.append({
            "type": "and",
            "filters": [
                {"type": "lte", "key": "sales_start_ym", "value": join_ym},
                {
                    "type": "or",
                    "filters": [
                        {"type": "gte", "key": "sales_end_ym", "value": join_ym},
                        {"type": "eq", "key": "is_current", "value": True},
                    ],
                },
            ],
        })
    if not filters:
        return None
    if len(filters) == 1:
        return filters[0]
    return {"type": "and", "filters": filters}
