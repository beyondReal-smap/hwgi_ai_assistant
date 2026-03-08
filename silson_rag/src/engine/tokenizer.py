"""Korean tokenizer for silson medical expense search.

Handles particle removal, stopword filtering, synonym expansion,
and compound word splitting.
"""
from __future__ import annotations

import re
from typing import List

COMMON_STOPWORDS = {
    "에서", "으로", "관련", "기준", "무엇", "인가요", "어떻게", "되나요",
    "처리", "대한", "해주세요", "알려줘", "알려주세요",
    "실손", "실손의료비", "실비", "실비보험", "보험", "의료비", "의료실비",
}

PARTICLE_RE = re.compile(r"(은|는|이|가|을|를|에|에서|과|와|도|만|요)$")

TERM_EQUIV = {
    "병실료차액": ["병실료차액", "병실차액", "상급병실차액", "상급병실"],
    "병실차액": ["병실료차액", "병실차액", "상급병실차액", "상급병실"],
    "상급병실차액": ["병실료차액", "병실차액", "상급병실차액", "상급병실"],
    "상급병실": ["병실료차액", "병실차액", "상급병실차액", "상급병실"],
    "공제금액": ["공제금액", "자기부담금", "본인부담금"],
    "자기부담금": ["공제금액", "자기부담금", "본인부담금"],
    "본인부담금": ["공제금액", "자기부담금", "본인부담금"],
    "건보미적용": ["건보미적용", "건강보험미적용", "건강보험 미적용", "비급여"],
    "비급여": ["건보미적용", "건강보험미적용", "비급여"],
    "면책": ["면책", "보상제외", "보상 제외", "보상하지 않음"],
    "보상제외": ["면책", "보상제외", "보상 제외", "보상하지 않음"],
    "라식": ["라식", "시력교정술", "굴절교정술"],
    "한방": ["한방", "한방치료", "한의원", "한의과"],
    "도수치료": ["도수치료", "추나요법", "체외충격파"],
    "추나요법": ["도수치료", "추나요법", "체외충격파"],
}

# Compound words that should be split into sub-tokens for better recall
COMPOUND_SPLITS = {
    "상급병실차액": ["상급", "병실", "차액"],
    "병실료차액": ["병실료", "차액", "병실"],
    "자기부담금": ["자기", "부담금"],
    "본인부담금": ["본인", "부담금"],
    "건강보험미적용": ["건강보험", "미적용"],
}


def _normalize_token(token: str) -> str:
    return PARTICLE_RE.sub("", token)


def tokenize(text: str) -> List[str]:
    """Tokenize Korean text with particle removal, stopword filtering,
    synonym expansion, and compound word splitting."""
    text = re.sub(r"[^0-9A-Za-z가-힣]+", " ", text)
    raw_tokens = [_normalize_token(t) for t in text.split()]
    tokens = [t for t in raw_tokens if len(t) >= 2 and t not in COMMON_STOPWORDS]
    if not tokens:
        tokens = [t for t in raw_tokens if len(t) >= 2]

    expanded: List[str] = []
    for token in tokens:
        expanded.append(token)
        # Synonym expansion
        for key, variants in TERM_EQUIV.items():
            if key in token or token in variants:
                expanded.extend(variants)
        # Compound word splitting
        for compound, parts in COMPOUND_SPLITS.items():
            if compound in token or token == compound:
                expanded.extend(parts)

    out: List[str] = []
    seen: set[str] = set()
    for token in expanded:
        if token and token not in seen:
            seen.add(token)
            out.append(token)
    return out
