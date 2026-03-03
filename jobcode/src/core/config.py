from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
ARTIFACT_DIR = PROJECT_ROOT / "artifacts"
BM25_DIR = ARTIFACT_DIR / "bm25"
EMBED_DIR = ARTIFACT_DIR / "embed"

JOBS_CSV = DATA_DIR / "jobs.csv"
JOB_CODE_TXT = DATA_DIR / "job_code.txt"
SYNONYMS_JSON = DATA_DIR / "synonyms.json"
TOKEN_CACHE_PATH = BM25_DIR / "tokenized_docs.json"
EMBEDDINGS_PATH = EMBED_DIR / "embeddings.npy"
FAISS_INDEX_PATH = EMBED_DIR / "faiss.index"
EMBED_META_PATH = EMBED_DIR / "meta.json"


for _p in (DATA_DIR, BM25_DIR, EMBED_DIR):
    _p.mkdir(parents=True, exist_ok=True)


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip() in {"1", "true", "True", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    use_hybrid_default: bool = _env_bool("USE_HYBRID", True)
    use_cross_encoder_default: bool = _env_bool("USE_CROSS_ENCODER", True)
    use_llm_default: bool = _env_bool("USE_LLM", False)
    use_query_expansion: bool = _env_bool("USE_QUERY_EXPANSION", False)
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_base_url: str = os.getenv("OPENAI_BASE_URL", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    embed_model_name: str = os.getenv("EMBED_MODEL_NAME", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
    cross_encoder_model_name: str = os.getenv(
        "CROSS_ENCODER_MODEL_NAME", "cross-encoder/ms-marco-MiniLM-L-6-v2"
    )
    alpha_bm25: float = _env_float("ALPHA_BM25", 0.3)
    min_score_to_show: float = _env_float("MIN_SCORE_TO_SHOW", 0.3)
    topk_bm25: int = _env_int("TOPK_BM25", 120)
    topk_embed: int = _env_int("TOPK_EMBED", 120)
    topk_llm: int = _env_int("TOPK_LLM", 10)


SETTINGS = Settings()
