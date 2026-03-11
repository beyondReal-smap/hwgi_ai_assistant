"""Build OpenAI embeddings + FAISS index from all_chunks.json.

Requires: OPENAI_API_KEY env var.

Output files (in artifacts/qa_knowledge/):
  - embeddings.npy  : numpy array of shape (N, 1536)
  - faiss.index     : FAISS IndexFlatIP for cosine similarity search
  - meta.json       : metadata for cache invalidation
"""
from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

PACKAGE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PACKAGE_ROOT.parent))

from silson_rag.src.config import CFG
from silson_rag.src.openai_client import create_embeddings

BATCH_SIZE = 256  # OpenAI supports up to 2048 inputs per call


def main() -> None:
    out_dir = CFG.qa_knowledge_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    chunks_path = out_dir / "all_chunks.json"
    if not chunks_path.exists():
        print(f"ERROR: {chunks_path} not found. Run build_qa_knowledge_base.py first.")
        sys.exit(1)

    with chunks_path.open("r", encoding="utf-8") as f:
        all_chunks = json.load(f)

    texts = [chunk["embed_text"] for chunk in all_chunks]
    total = len(texts)
    print(f"Embedding {total} chunks with {CFG.openai_embed_model}...")

    all_embeddings: list[list[float]] = []
    for i in range(0, total, BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        print(f"  Batch {i // BATCH_SIZE + 1}: {len(batch)} texts...")
        embeddings = create_embeddings(batch, model=CFG.openai_embed_model)
        all_embeddings.extend(embeddings)
        if i + BATCH_SIZE < total:
            time.sleep(0.5)  # rate limit courtesy

    emb_array = np.array(all_embeddings, dtype=np.float32)
    # L2 normalize for cosine similarity via inner product
    norms = np.linalg.norm(emb_array, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    emb_array = emb_array / norms

    print(f"  Embedding shape: {emb_array.shape}")

    # Save embeddings
    emb_path = out_dir / "embeddings.npy"
    np.save(emb_path, emb_array)
    print(f"  Saved → {emb_path}")

    # Build FAISS index
    try:
        import faiss

        dim = emb_array.shape[1]
        index = faiss.IndexFlatIP(dim)
        index.add(emb_array)
        index_path = out_dir / "faiss.index"
        faiss.write_index(index, str(index_path))
        print(f"  FAISS index saved → {index_path}")
        backend = "openai_faiss"
    except ImportError:
        print("  [WARN] faiss not installed, will use numpy fallback at runtime")
        backend = "openai_numpy"

    # Save metadata
    meta = {
        "model_name": CFG.openai_embed_model,
        "backend": backend,
        "chunk_count": total,
        "dim": int(emb_array.shape[1]),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    meta_path = out_dir / "meta.json"
    with meta_path.open("w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    print(f"  Metadata saved → {meta_path}")
    print("Done.")


if __name__ == "__main__":
    main()
