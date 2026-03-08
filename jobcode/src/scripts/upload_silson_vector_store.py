from __future__ import annotations

import argparse
import csv
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parents[2]
PROJECT_ROOT = ROOT.parent
if str(ROOT / "src") not in sys.path:
    sys.path.insert(0, str(ROOT / "src"))

from dotenv import load_dotenv

load_dotenv(PROJECT_ROOT / ".env.local")
load_dotenv(ROOT / ".env")

try:
    from openai import OpenAI
except ImportError as exc:  # pragma: no cover - setup helper only
    raise SystemExit("openai package is not installed. Run `pip install -r jobcode/requirements.txt`.") from exc

from core.config import (
    SILSON_CLAUSE_DOCS_DIR,
    SILSON_CLAUSE_MANIFEST_CSV,
    SILSON_DOCS_DIR,
    SILSON_MANIFEST_CSV,
)


def load_manifest(path: Path) -> List[Dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as file:
        return list(csv.DictReader(file))


def default_manifest_path() -> Path:
    if SILSON_CLAUSE_MANIFEST_CSV.exists():
        return SILSON_CLAUSE_MANIFEST_CSV
    return SILSON_MANIFEST_CSV


def resolve_markdown_path(row: Dict[str, str]) -> Path:
    filename = (row.get("filename") or "").strip()
    if filename:
        for docs_dir in (SILSON_CLAUSE_DOCS_DIR, SILSON_DOCS_DIR):
            path = docs_dir / filename
            if path.exists():
                return path

    raw_path = (row.get("path") or "").strip()
    if raw_path:
        path = Path(raw_path)
        if path.exists():
            return path
        for docs_dir in (SILSON_CLAUSE_DOCS_DIR, SILSON_DOCS_DIR):
            fallback = docs_dir / path.name
            if fallback.exists():
                return fallback

    raise FileNotFoundError(f"Could not resolve markdown file for doc_id={row.get('doc_id')}")


def build_attributes(row: Dict[str, str]) -> Dict[str, Any]:
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
        attrs["sales_start_ym"] = int(float(row["sales_start_ym"]))
    if row.get("sales_end_ym"):
        attrs["sales_end_ym"] = int(float(row["sales_end_ym"]))
    return attrs


def upload_documents(vector_store_name: str, manifest_path: Path | None = None) -> str:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("OPENAI_API_KEY is not configured.")

    client = OpenAI(api_key=api_key)
    selected_manifest = manifest_path or default_manifest_path()
    manifest = load_manifest(selected_manifest)
    vector_store = client.vector_stores.create(name=vector_store_name)

    file_items = []
    for row in manifest:
        file_path = resolve_markdown_path(row)
        with file_path.open("rb") as file:
            uploaded = client.files.create(file=file, purpose="assistants")

        file_items.append(
            {
                "file_id": uploaded.id,
                "attributes": build_attributes(row),
            }
        )
        print(f"uploaded: {file_path.name} -> {uploaded.id}")

    batch = client.vector_stores.file_batches.create_and_poll(
        vector_store_id=vector_store.id,
        files=file_items,
    )

    print(f"vector_store_id={vector_store.id}")
    print(f"file_batch_status={batch.status}")
    print(f"manifest_path={selected_manifest}")
    print(f"set env: SILSON_VECTOR_STORE_ID={vector_store.id}")
    return vector_store.id


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload silson markdown docs into an OpenAI vector store.")
    parser.add_argument(
        "--name",
        default="silson-medical-expense-kb",
        help="Vector store display name",
    )
    parser.add_argument(
        "--manifest",
        help="Optional manifest CSV path. Defaults to clause-level manifest when available.",
    )
    args = parser.parse_args()
    upload_documents(args.name, Path(args.manifest) if args.manifest else None)


if __name__ == "__main__":
    main()
