from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Dict, List, Sequence, Set

DEFAULT_STOPWORDS: Set[str] = {
    "의",
    "를",
    "을",
    "이",
    "가",
    "은",
    "는",
    "에",
    "에서",
    "및",
    "또는",
    "그리고",
    "the",
    "a",
    "an",
    "to",
    "for",
    "with",
    "in",
    "on",
    "등",
    "수",
    "것",
    "관련",
    "통해",
    "대해",
    "위해",
    "직무",
    "업무",
    "수행",
    "종사",
    "관리",
    "관리자",
    "제외",
    "포함",
    "경우",
    "해당",
    "주로",
    "기반",
    "중심",
    "말한다",
    "한다",
    "있다",
    "없다",
    "또한",
}


def normalize_text(text: str) -> str:
    text = (text or "").lower()
    text = re.sub(r"[^0-9a-zA-Z가-힣\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def tokenize(text: str, stopwords: Set[str] | None = None, min_len: int = 2) -> List[str]:
    stop = stopwords if stopwords is not None else DEFAULT_STOPWORDS
    norm = normalize_text(text)
    return [tok for tok in norm.split(" ") if len(tok) >= min_len and tok not in stop]


def load_synonyms(path: Path) -> Dict[str, List[str]]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    cleaned: Dict[str, List[str]] = {}
    for k, v in data.items():
        key = normalize_text(k)
        vals = [normalize_text(x) for x in v if normalize_text(x)]
        if key and vals:
            cleaned[key] = sorted(set(vals))
    return cleaned


def expand_query_tokens(tokens: Sequence[str], synonyms: Dict[str, List[str]]) -> List[str]:
    out = list(tokens)
    seen = set(out)
    max_extra_per_token = 3
    for tok in tokens:
        added = 0
        for extra in synonyms.get(tok, []):
            extra_toks = tokenize(extra)
            if len(extra_toks) != 1:
                continue
            one = extra_toks[0]
            if one and one not in seen and one not in DEFAULT_STOPWORDS:
                out.append(one)
                seen.add(one)
                added += 1
                if added >= max_extra_per_token:
                    break
    return out


def sentence_split(text: str) -> List[str]:
    parts = re.split(r"[\n\r\.]+", text or "")
    return [p.strip() for p in parts if p.strip()]
