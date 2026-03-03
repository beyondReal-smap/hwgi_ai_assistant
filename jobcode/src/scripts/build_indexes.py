from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT / "src") not in sys.path:
    sys.path.insert(0, str(ROOT / "src"))

from core.bm25_engine import BM25Engine
from core.config import SETTINGS
from core.data_loader import dataframe_hash, load_jobs, to_records
from core.embed_engine import EmbedEngine
from core.text_norm import load_synonyms


def main() -> None:
    parser = argparse.ArgumentParser(description="Build BM25/Embedding indexes")
    parser.add_argument("--rebuild", action="store_true", help="Force rebuild cache")
    args = parser.parse_args()

    synonyms = load_synonyms(ROOT / "data" / "synonyms.json")
    df = load_jobs(synonyms=synonyms)
    records = to_records(df)

    bm25 = BM25Engine(records=records, synonyms=synonyms)
    if args.rebuild:
        bm25.rebuild_tokens()
    print("[OK] BM25 token cache ready")

    emb = EmbedEngine(records=records, model_name=SETTINGS.embed_model_name, data_hash=dataframe_hash(df))
    if emb.status.enabled:
        if args.rebuild:
            emb.rebuild()
        print("[OK] Embedding/FAISS ready")
    else:
        print(f"[WARN] Embedding disabled: {emb.status.reason}")


if __name__ == "__main__":
    main()
