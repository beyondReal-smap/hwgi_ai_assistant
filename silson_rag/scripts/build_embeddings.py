"""Build local FAISS + BM25 artifacts for silson_rag.

Usage:
    python -m silson_rag.scripts.build_embeddings
"""
from __future__ import annotations

import sys
from pathlib import Path

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / ".env.local")
load_dotenv()

import pandas as pd

from silson_rag.src.config import CFG
from silson_rag.src.engine.embed_engine import EmbedEngine
from silson_rag.src.engine.keyword_scorer import FIELD_WEIGHTS, KeywordScorer
from silson_rag.src.engine.tokenizer import tokenize


def main() -> None:
    print(f"[build] Loading clauses from {CFG.clauses_csv}")
    if not CFG.clauses_csv.exists():
        print(f"[ERROR] CSV not found: {CFG.clauses_csv}")
        sys.exit(1)

    df = pd.read_csv(CFG.clauses_csv, encoding="utf-8-sig").fillna("")
    print(f"[build] Loaded {len(df)} clauses")

    # Build embed_text: "{generation} {product_alias} {coverage_name} {clause_name}: {clause_text_oneline}"
    if "embed_text" not in df.columns:
        print("[build] Generating embed_text column...")
        df["embed_text"] = df.apply(
            lambda r: f"{r.get('generation', '')} {r.get('product_alias', '')} "
                      f"{r.get('coverage_name', '')} {r.get('clause_name', '')}: "
                      f"{r.get('clause_text_oneline', '')}",
            axis=1,
        )

    texts = df["embed_text"].fillna("").astype(str).tolist()

    # Build embedding index
    print(f"[build] Building embedding index with model: {CFG.embed_model}")
    engine = EmbedEngine(model_name=CFG.embed_model)
    print(f"[build] Backend: {engine.backend} ({engine.status.reason})")
    engine.ensure_index(texts)
    print(f"[build] Embedding index built → {engine.embed_dir}")

    # Build BM25 scorer (verifies it works)
    search_texts = df["search_text"].fillna("").astype(str).tolist()
    field_texts = {}
    for field_name, _ in FIELD_WEIGHTS:
        if field_name in df.columns:
            field_texts[field_name] = df[field_name].fillna("").astype(str).tolist()
    scorer = KeywordScorer(search_texts, field_texts)
    test_tokens = tokenize("병실료차액")
    test_scores = scorer.score(test_tokens)
    print(f"[build] BM25 scorer ready — test query '병실료차액' matched {len(test_scores)} docs")

    print("[build] Done.")


if __name__ == "__main__":
    main()
