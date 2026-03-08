"""Shared OpenAI API client — unified HTTP helper for the silson_rag package."""
from __future__ import annotations

import json
from typing import Any, Dict
from urllib import error, request

from .config import CFG

DEFAULT_BASE_URL = "https://api.openai.com/v1"


def _headers() -> Dict[str, str]:
    api_key = CFG.openai_api_key.strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }


def openai_post_json(path: str, payload: Dict[str, Any], *, timeout: int = 45) -> Dict[str, Any]:
    """POST to OpenAI REST API and return parsed JSON response."""
    base_url = (CFG.openai_base_url.strip() or DEFAULT_BASE_URL).rstrip("/")
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = request.Request(
        base_url + path,
        data=body,
        headers=_headers(),
        method="POST",
    )
    with request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def chat_completion(
    messages: list[Dict[str, str]],
    *,
    model: str | None = None,
    max_tokens: int = 700,
    timeout: int = 30,
    response_format: Dict[str, str] | None = None,
) -> str | None:
    """Call Chat Completions API and return the assistant content string (or None on failure)."""
    payload: Dict[str, Any] = {
        "model": model or CFG.openai_model,
        "messages": messages,
        "max_completion_tokens": max_tokens,
    }
    if response_format:
        payload["response_format"] = response_format
    try:
        data = openai_post_json("/chat/completions", payload, timeout=timeout)
        choices = data.get("choices")
        if isinstance(choices, list) and choices:
            content = choices[0].get("message", {}).get("content")
            if isinstance(content, str) and content.strip():
                return content.strip()
    except (error.URLError, error.HTTPError, TimeoutError, json.JSONDecodeError, KeyError):
        pass
    return None
