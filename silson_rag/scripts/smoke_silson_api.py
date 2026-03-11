"""Smoke test the /api/silson-search FastAPI endpoint with real queries.

Usage:
    python3 silson_rag/scripts/smoke_silson_api.py
    SILSON_SMOKE_DISABLE_OPENAI=0 python3 silson_rag/scripts/smoke_silson_api.py
"""
from __future__ import annotations

import os
import sys
from dataclasses import replace
from pathlib import Path

from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parents[2]
JOBCODE_ROOT = PROJECT_ROOT / "jobcode"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(JOBCODE_ROOT) not in sys.path:
    sys.path.insert(0, str(JOBCODE_ROOT))

import api_server as api_server
import silson_rag.src.api as silson_api
import silson_rag.src.config as silson_config
import silson_rag.src.llm_answer as silson_llm_answer


QUERIES = [
    "치과 치료는 실손에서 보상돼?",
    "김민경 고객 2016년 가입 실손 자기부담금 알려줘",
    "LA20164774744000 계약 실손 보상기준 알려줘",
    "무배당 한화실손의료보험1404 자기부담금 알려줘",
]


def disable_openai() -> None:
    cfg = replace(
        silson_config.CFG,
        openai_api_key="",
        vector_store_id="",
        use_embedding=False,
        use_query_rewriting=False,
    )
    silson_config.CFG = cfg
    silson_api.CFG = cfg
    silson_llm_answer.CFG = cfg


def main() -> None:
    if os.getenv("SILSON_SMOKE_DISABLE_OPENAI", "1") != "0":
        disable_openai()

    client = TestClient(api_server.app)
    for query in QUERIES:
        response = client.post("/api/silson-search", json={"query": query, "topk": 5})
        payload = response.json()
        print("=" * 80)
        print("QUERY:", query)
        print("STATUS:", response.status_code)
        print("MODE:", payload.get("mode"))
        print("FILTERS:", payload.get("filters"))
        print("SOURCES:", payload.get("sources", [])[:3])
        answer = payload.get("answer", "")
        print("ANSWER:", answer[:400].replace("\n", " "))


if __name__ == "__main__":
    main()
