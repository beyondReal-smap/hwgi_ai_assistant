from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Dict, List
from urllib import error, request


@dataclass
class LLMResult:
    top3_codes: List[str]
    reasons: Dict[str, str]
    cited_phrases: Dict[str, List[str]]
    mode: str


def _deterministic_mock(query: str, candidates: List[Dict], topn: int = 3) -> LLMResult:
    ordered = sorted(
        candidates,
        key=lambda x: (
            -float(x.get("final_score", 0.0)),
            hashlib.md5((query + x.get("job_code", "")).encode("utf-8")).hexdigest(),
        ),
    )
    picked = ordered[:topn]
    codes = [x["job_code"] for x in picked]
    reasons = {}
    cites = {}
    for c in picked:
        code = c["job_code"]
        reasons[code] = f"입력 설명과 직업명/설명 키워드 유사도가 높아 추천했습니다. 위험등급 {c.get('risk_grade','')}을 함께 고려했습니다."
        desc = c.get("description", "")
        cites[code] = [desc[:40]] if desc else []
    return LLMResult(top3_codes=codes, reasons=reasons, cited_phrases=cites, mode="mock")


_DEFAULT_BASE_URL = "https://api.openai.com/v1"


def rerank_with_llm(
    query: str,
    candidates: List[Dict],
    use_llm: bool,
    api_key: str,
    base_url: str,
    model: str,
    topk_llm: int,
) -> LLMResult:
    short = candidates[:topk_llm]
    effective_url = base_url.strip() or _DEFAULT_BASE_URL
    if not use_llm or not api_key:
        return _deterministic_mock(query, short)

    prompt = {
        "query": query,
        "candidates": [
            {
                "job_code": c["job_code"],
                "job_name": c["job_name"],
                "risk_grade": c["risk_grade"],
                "description": c["description"][:140],
                "final_score": c["final_score"],
            }
            for c in short
        ],
        "instruction": "Return strict JSON with fields: top3_codes (list of job_code strings), reasons (object mapping job_code to Korean explanation), cited_phrases (object mapping job_code to list of quoted phrases from description).",
    }

    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an insurance job-code reranker. "
                    "Given a job description query and candidate job codes, "
                    "select the top 3 best-matching job codes. "
                    "Output JSON only with keys: top3_codes, reasons, cited_phrases."
                ),
            },
            {"role": "user", "content": json.dumps(prompt, ensure_ascii=False)},
        ],
        "response_format": {"type": "json_object"},
    }

    body = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    endpoint = effective_url.rstrip("/") + "/chat/completions"
    req = request.Request(endpoint, data=body, headers=headers, method="POST")

    try:
        with request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        content = data["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        return LLMResult(
            top3_codes=parsed.get("top3_codes", []),
            reasons=parsed.get("reasons", {}),
            cited_phrases=parsed.get("cited_phrases", {}),
            mode="real",
        )
    except (error.URLError, error.HTTPError, TimeoutError, KeyError, json.JSONDecodeError):
        return _deterministic_mock(query, short)
