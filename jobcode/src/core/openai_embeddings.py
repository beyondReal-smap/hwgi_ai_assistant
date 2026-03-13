from __future__ import annotations

import json
from typing import Any, Dict, List
from urllib import request

from .config import SETTINGS

DEFAULT_BASE_URL = "https://api.openai.com/v1"


def _headers() -> Dict[str, str]:
    api_key = SETTINGS.openai_api_key.strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }


def _post_json(path: str, payload: Dict[str, Any], *, timeout: int = 60) -> Dict[str, Any]:
    base_url = (SETTINGS.openai_base_url.strip() or DEFAULT_BASE_URL).rstrip("/")
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = request.Request(
        base_url + path,
        data=body,
        headers=_headers(),
        method="POST",
    )
    with request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def create_openai_embeddings(
    texts: List[str],
    *,
    model: str,
    dimensions: int | None = None,
    timeout: int = 90,
) -> List[List[float]]:
    payload: Dict[str, Any] = {
        "model": model,
        "input": texts,
    }
    if dimensions:
        payload["dimensions"] = dimensions

    data = _post_json("/embeddings", payload, timeout=timeout)
    items = data.get("data", [])
    items.sort(key=lambda item: item.get("index", 0))
    return [item["embedding"] for item in items]
