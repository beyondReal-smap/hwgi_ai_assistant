"""Independent configuration for silson_rag package.

All settings are loaded from environment variables — no dependency on jobcode.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip() in {"1", "true", "True", "yes", "on"}


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except ValueError:
        return default


PACKAGE_ROOT = Path(__file__).resolve().parent.parent  # silson_rag/


@dataclass(frozen=True)
class SilsonConfig:
    clauses_csv: Path = PACKAGE_ROOT / "실손의료비_search_ready_clauses.csv"
    clause_docs_dir: Path = PACKAGE_ROOT / "search_clause_docs_md"
    manifest_csv: Path = PACKAGE_ROOT / "openai_upload_clause_manifest.csv"
    artifact_dir: Path = PACKAGE_ROOT / "artifacts"

    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_base_url: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    silson_openai_model: str = os.getenv("SILSON_OPENAI_MODEL", "gpt-4.1-mini")
    vector_store_id: str = os.getenv("SILSON_VECTOR_STORE_ID", "")

    embed_model: str = os.getenv(
        "SILSON_EMBED_MODEL",
        "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    )
    alpha_keyword: float = _env_float("SILSON_ALPHA_KEYWORD", 0.6)
    use_embedding: bool = _env_bool("SILSON_USE_EMBEDDING", True)
    use_query_rewriting: bool = _env_bool("SILSON_USE_QUERY_REWRITING", True)


CFG = SilsonConfig()
