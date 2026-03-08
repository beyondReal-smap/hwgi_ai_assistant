"""Upload clause markdown files to OpenAI Vector Store.

Usage:
    python -m silson_rag.scripts.upload_vector_store
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from urllib import error, request

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / ".env.local")
load_dotenv()

import pandas as pd

from silson_rag.src.config import CFG


def _headers() -> dict[str, str]:
    api_key = CFG.openai_api_key.strip()
    if not api_key:
        print("[ERROR] OPENAI_API_KEY not set")
        sys.exit(1)
    return {
        "Authorization": f"Bearer {api_key}",
    }


def _api_post(url: str, data: bytes | None = None, headers: dict | None = None, method: str = "POST"):
    hdrs = headers or {}
    req = request.Request(url, data=data, headers=hdrs, method=method)
    with request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> None:
    manifest_csv = CFG.manifest_csv
    docs_dir = CFG.clause_docs_dir

    if not manifest_csv.exists():
        print(f"[ERROR] Manifest not found: {manifest_csv}")
        sys.exit(1)

    manifest = pd.read_csv(manifest_csv, encoding="utf-8-sig").fillna("")
    print(f"[upload] Loaded {len(manifest)} entries from manifest")

    headers = _headers()
    base_url = (CFG.openai_base_url.strip() or "https://api.openai.com/v1").rstrip("/")

    # Step 1: Upload files
    file_ids = []
    for idx, row in manifest.iterrows():
        filename = row.get("filename", "")
        if not filename:
            continue
        filepath = docs_dir / filename
        if not filepath.exists():
            print(f"  [skip] {filename} — file not found")
            continue

        content = filepath.read_bytes()

        # Multipart upload
        boundary = f"----WebKitFormBoundary{int(time.time() * 1000)}"
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="purpose"\r\n\r\nassistants\r\n'
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
            f"Content-Type: text/markdown\r\n\r\n"
        ).encode("utf-8") + content + f"\r\n--{boundary}--\r\n".encode("utf-8")

        upload_headers = {
            **headers,
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        }
        try:
            result = _api_post(f"{base_url}/files", data=body, headers=upload_headers)
            file_id = result.get("id")
            if file_id:
                file_ids.append(file_id)
                if (idx + 1) % 50 == 0:
                    print(f"  [upload] {idx + 1}/{len(manifest)} files uploaded...")
        except (error.URLError, error.HTTPError) as e:
            print(f"  [error] {filename}: {e}")
            continue

    print(f"[upload] {len(file_ids)} files uploaded")

    if not file_ids:
        print("[ERROR] No files uploaded")
        sys.exit(1)

    # Step 2: Create vector store
    create_headers = {**headers, "Content-Type": "application/json"}
    create_payload = json.dumps({
        "name": "silson_rag_clauses",
        "file_ids": file_ids[:500],  # API limit per batch
    }, ensure_ascii=False).encode("utf-8")

    result = _api_post(f"{base_url}/vector_stores", data=create_payload, headers=create_headers)
    vs_id = result.get("id")
    print(f"\n[SUCCESS] Vector Store created: {vs_id}")
    print(f"\nAdd to .env.local:")
    print(f"  SILSON_VECTOR_STORE_ID={vs_id}")

    # Upload remaining files in batches if > 500
    if len(file_ids) > 500:
        for batch_start in range(500, len(file_ids), 500):
            batch = file_ids[batch_start:batch_start + 500]
            batch_payload = json.dumps({
                "file_ids": batch,
            }, ensure_ascii=False).encode("utf-8")
            _api_post(f"{base_url}/vector_stores/{vs_id}/file_batches", data=batch_payload, headers=create_headers)
            print(f"  [batch] Added {len(batch)} more files")


if __name__ == "__main__":
    main()
