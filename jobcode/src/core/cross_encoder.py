from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Sequence

import numpy as np

try:
    from sentence_transformers import CrossEncoder
except Exception:  # pragma: no cover
    CrossEncoder = None


@dataclass
class CrossEncoderStatus:
    enabled: bool
    reason: str


class CrossEncoderReranker:
    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        self.model = None
        if CrossEncoder is None:
            self.status = CrossEncoderStatus(False, "sentence-transformers cross-encoder unavailable")
            return
        try:
            self.model = CrossEncoder(model_name)
            self.status = CrossEncoderStatus(True, f"ok ({model_name})")
        except Exception as e:  # pragma: no cover
            self.status = CrossEncoderStatus(False, f"init failed: {e}")

    @staticmethod
    def _normalize(vals: Sequence[float]) -> np.ndarray:
        arr = np.array(vals, dtype=float)
        if arr.size == 0:
            return arr
        vmin, vmax = float(arr.min()), float(arr.max())
        if np.isclose(vmax - vmin, 0.0):
            return np.zeros_like(arr)
        return (arr - vmin) / (vmax - vmin)

    def rerank(self, query: str, candidates: List[Dict], topk: int = 30) -> List[Dict]:
        if not self.status.enabled or self.model is None:
            return candidates
        head = candidates[:topk]
        tail = candidates[topk:]

        pairs = [(query, f"{row['job_name']} {row['description']}") for row in head]
        ce_raw = self.model.predict(pairs)
        ce_norm = self._normalize(ce_raw)

        out: List[Dict] = []
        for row, raw, norm in zip(head, ce_raw, ce_norm):
            item = dict(row)
            item["ce_score"] = float(raw)
            item["ce_score_norm"] = float(norm)
            base = float(item.get("rerank_score", item.get("final_score", 0.0)))
            item["final_score"] = 0.7 * float(norm) + 0.3 * base
            out.append(item)

        out.sort(key=lambda x: x["final_score"], reverse=True)
        return out + tail
