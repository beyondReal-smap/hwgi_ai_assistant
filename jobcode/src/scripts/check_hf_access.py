from __future__ import annotations

import argparse
import json
import os
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path


def check_url(url: str, timeout: int) -> dict:
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return {
                "ok": True,
                "status": getattr(resp, "status", None),
                "url": url,
                "reason": "reachable",
            }
    except urllib.error.URLError as e:
        return {"ok": False, "url": url, "reason": str(e)}
    except ssl.SSLError as e:
        return {"ok": False, "url": url, "reason": f"ssl_error: {e}"}
    except Exception as e:  # pragma: no cover
        return {"ok": False, "url": url, "reason": f"unexpected: {e}"}


def check_hf_download(repo_id: str, timeout: int, out_dir: Path) -> dict:
    try:
        from huggingface_hub import hf_hub_download
    except Exception as e:
        return {
            "ok": False,
            "repo_id": repo_id,
            "reason": f"huggingface_hub_missing: {e}",
        }

    try:
        path = hf_hub_download(
            repo_id=repo_id,
            filename="config.json",
            cache_dir=str(out_dir),
            token=False,
            etag_timeout=timeout,
        )
        return {"ok": True, "repo_id": repo_id, "reason": "download_ok", "path": path}
    except Exception as e:
        return {"ok": False, "repo_id": repo_id, "reason": str(e)}


def main() -> int:
    parser = argparse.ArgumentParser(description="Check Hugging Face connectivity/download")
    parser.add_argument(
        "--repo-id",
        default="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        help="Hugging Face model repo id",
    )
    parser.add_argument("--timeout", type=int, default=15, help="HTTP timeout seconds")
    parser.add_argument("--cert", default="", help="Path to CA bundle file (optional)")
    parser.add_argument(
        "--out-dir",
        default="artifacts/embed/hf_cache_test",
        help="Cache directory for test download",
    )
    args = parser.parse_args()

    if args.cert:
        os.environ["REQUESTS_CA_BUNDLE"] = args.cert
        os.environ["SSL_CERT_FILE"] = args.cert
        os.environ["CURL_CA_BUNDLE"] = args.cert

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    results = {
        "checks": [
            check_url("https://huggingface.co", args.timeout),
            check_url("https://huggingface.co/api/models", args.timeout),
            check_hf_download(args.repo_id, args.timeout, out_dir),
        ]
    }

    print(json.dumps(results, ensure_ascii=False, indent=2))

    if all(item.get("ok") for item in results["checks"]):
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
