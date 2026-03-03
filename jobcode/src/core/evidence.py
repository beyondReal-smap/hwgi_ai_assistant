from __future__ import annotations

import re
from typing import List, Sequence, Tuple

from .text_norm import sentence_split, tokenize


def select_evidence_sentences(query: str, description: str, max_sentences: int = 2) -> Tuple[List[str], List[str]]:
    q_tokens = tokenize(query)
    qset = set(q_tokens)
    sents = sentence_split(description)
    scored = []
    for sent in sents:
        stoks = tokenize(sent)
        overlap = sorted(qset.intersection(stoks))
        scored.append((len(overlap), sent, overlap))

    scored.sort(key=lambda x: x[0], reverse=True)
    selected = [s for score, s, _ in scored[:max_sentences] if score > 0]

    hit_tokens = []
    for _, _, overlaps in scored[:max_sentences]:
        hit_tokens.extend(overlaps)

    if not selected and sents:
        selected = sents[:1]

    return selected, sorted(set(hit_tokens))


def highlight_text(text: str, keywords: Sequence[str]) -> str:
    html = text
    unique = sorted({k for k in keywords if k}, key=len, reverse=True)
    for kw in unique:
        pattern = re.compile(re.escape(kw), re.IGNORECASE)
        html = pattern.sub(lambda m: f"<mark class='kw-hit'>{m.group(0)}</mark>", html)
    return html
