from __future__ import annotations

import csv
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

_JOBCODE_SRC = str(Path(__file__).resolve().parents[1] / "jobcode" / "src")
if _JOBCODE_SRC not in sys.path:
    sys.path.insert(0, _JOBCODE_SRC)

from core.silson_common import (  # noqa: E402
    build_filters,
    detect_generation,
    detect_join_ym,
    detect_source_kind,
)

from openai import OpenAI

CLIENT = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
BASE_DIR = Path(__file__).resolve().parent
CLAUSE_MANIFEST_PATH = BASE_DIR / "openai_upload_clause_manifest.csv"
DOCUMENT_MANIFEST_PATH = BASE_DIR / "openai_upload_manifest.csv"


def load_manifest(path: Path) -> List[Dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def resolve_manifest_path() -> Path:
    if CLAUSE_MANIFEST_PATH.exists():
        return CLAUSE_MANIFEST_PATH
    return DOCUMENT_MANIFEST_PATH


def upload_documents_to_vector_store(vector_store_name: str = "silsone-medical-expense-kb") -> str:
    manifest = load_manifest(resolve_manifest_path())
    vector_store = CLIENT.vector_stores.create(name=vector_store_name)

    file_items = []
    for row in manifest:
        file_path = row["path"]
        with open(file_path, "rb") as fp:
            uploaded = CLIENT.files.create(file=fp, purpose="assistants")

        attrs: Dict[str, Any] = {
            "doc_id": row["doc_id"],
            "source_kind": row["source_kind"],
            "source_label": row["source_label"],
            "generation": row["generation"],
            "variant_no": int(row["variant_no"]),
            "product_alias": row["product_alias"],
            "coverage_name": row["coverage_name"][:512],
            "is_current": row["is_current"].lower() == "true",
        }
        clause_name = (row.get("clause_name") or "").strip()
        if clause_name:
            attrs["clause_name"] = clause_name[:512]
        if row.get("sales_start_ym"):
            attrs["sales_start_ym"] = int(row["sales_start_ym"])
        if row.get("sales_end_ym"):
            attrs["sales_end_ym"] = int(row["sales_end_ym"])

        file_items.append({
            "file_id": uploaded.id,
            "attributes": attrs,
        })

    CLIENT.vector_stores.file_batches.create_and_poll(
        vector_store_id=vector_store.id,
        files=file_items,
    )
    return vector_store.id


def debug_search(vector_store_id: str, question: str, max_num_results: int = 5):
    filters = build_filters(question)
    result = CLIENT.vector_stores.search(
        vector_store_id=vector_store_id,
        query=question,
        max_num_results=max_num_results,
        rewrite_query=True,
        filters=filters,
    )
    return result


def answer_question(vector_store_id: str, question: str) -> str:
    filters = build_filters(question)
    tools: List[Dict[str, Any]] = [{
        "type": "file_search",
        "vector_store_ids": [vector_store_id],
        "max_num_results": 5,
    }]
    if filters:
        tools[0]["filters"] = filters

    response = CLIENT.responses.create(
        model="gpt-4.1",
        input=[
            {
                "role": "system",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            "당신은 실손의료비 약관 검색 도우미다. "
                            "반드시 검색된 문서에 근거해서만 한국어로 답변하고, "
                            "세대/판매시기/담보를 먼저 확인한 뒤 답하라. "
                            "질문이 애매하면 가능한 해석을 나눠 설명하라. "
                            "답변 마지막에 참고한 문서ID나 파일명을 짧게 적어라."
                        ),
                    }
                ],
            },
            {
                "role": "user",
                "content": [{"type": "input_text", "text": question}],
            },
        ],
        tools=tools,
        include=["file_search_call.results"],
    )
    return response.output_text


if __name__ == "__main__":
    # 1) 업로드
    # vs_id = upload_documents_to_vector_store()
    # print("VECTOR_STORE_ID=", vs_id)

    # 2) 디버그 검색
    # print(debug_search("vs_xxx", "2018년에 가입한 착한실손에서 병실료차액은 어떻게 되나요?"))

    # 3) 답변 생성
    # print(answer_question("vs_xxx", "2018년에 가입한 착한실손에서 병실료차액은 어떻게 되나요?"))
    pass
