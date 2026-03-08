"""Embedding-based semantic search engine for silson clauses.

Mirrors the pattern in embed_engine.py but works directly on a DataFrame.
Falls back to TF-IDF when sentence-transformers is unavailable.
"""
from __future__ import annotations

import json
import pickle
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import List, Sequence, Tuple

import numpy as np

from .config import ARTIFACT_DIR

SILSON_EMBED_DIR = ARTIFACT_DIR / "silson_embed"

try:
    import faiss
except Exception:
    faiss = None

try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
except Exception:
    TfidfVectorizer = None


@dataclass
class SilsonEmbedStatus:
    enabled: bool
    reason: str


class SilsonEmbedEngine:
    def __init__(
        self,
        model_name: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        embed_dir: Path = SILSON_EMBED_DIR,
    ) -> None:
        self.model_name = model_name
        self.embed_dir = embed_dir
        self.embeddings_path = embed_dir / "embeddings.npy"
        self.faiss_index_path = embed_dir / "faiss.index"
        self.meta_path = embed_dir / "meta.json"
        self.tfidf_cache_path = embed_dir / "tfidf.pkl"

        self.model = None
        self.index = None
        self.embeddings: np.ndarray | None = None
        self.vectorizer = None
        self.tfidf_matrix = None
        self.backend = "disabled"
        self._doc_count = 0

        if SentenceTransformer is not None:
            try:
                self.model = SentenceTransformer(model_name)
                self.backend = "st_faiss" if faiss is not None else "st_numpy"
                self.status = SilsonEmbedStatus(
                    True,
                    "sentence-transformers+faiss" if self.backend == "st_faiss" else "sentence-transformers+numpy",
                )
                return
            except Exception as e:
                self.model = None
                st_reason = f"sentence-transformers init failed: {e}"
        else:
            st_reason = "sentence-transformers unavailable"

        if TfidfVectorizer is not None:
            self.backend = "tfidf"
            self.status = SilsonEmbedStatus(True, f"tfidf-fallback ({st_reason})")
            return

        self.status = SilsonEmbedStatus(False, f"embedding disabled ({st_reason}; scikit-learn unavailable)")

    def _meta_matches(self, doc_count: int) -> bool:
        if not self.meta_path.exists():
            return False
        try:
            with self.meta_path.open("r", encoding="utf-8") as f:
                meta = json.load(f)
            return (
                meta.get("model_name") == self.model_name
                and meta.get("backend") == self.backend
                and meta.get("doc_count") == doc_count
            )
        except Exception:
            return False

    def _save_meta(self, doc_count: int) -> None:
        self.embed_dir.mkdir(parents=True, exist_ok=True)
        with self.meta_path.open("w", encoding="utf-8") as f:
            json.dump(
                {
                    "model_name": self.model_name,
                    "backend": self.backend,
                    "doc_count": doc_count,
                    "created_at": datetime.utcnow().isoformat() + "Z",
                },
                f,
                ensure_ascii=False,
                indent=2,
            )

    def ensure_index(self, texts: Sequence[str]) -> None:
        """Build or load cached index for the given texts."""
        doc_count = len(texts)
        if self._doc_count == doc_count and (self.embeddings is not None or self.tfidf_matrix is not None):
            return  # already built in this session

        if not self.status.enabled:
            return

        self.embed_dir.mkdir(parents=True, exist_ok=True)

        if self.backend in ("st_faiss", "st_numpy"):
            if self._meta_matches(doc_count) and self.embeddings_path.exists():
                self.embeddings = np.load(self.embeddings_path)
                if self.backend == "st_faiss" and self.faiss_index_path.exists():
                    self.index = faiss.read_index(str(self.faiss_index_path))
                self._doc_count = doc_count
                return
            self._build_st(texts, doc_count)
        elif self.backend == "tfidf":
            if self._meta_matches(doc_count) and self.tfidf_cache_path.exists():
                with self.tfidf_cache_path.open("rb") as f:
                    payload = pickle.load(f)
                self.vectorizer = payload["vectorizer"]
                self.tfidf_matrix = payload["matrix"]
                self._doc_count = doc_count
                return
            self._build_tfidf(texts, doc_count)

    def _build_st(self, texts: Sequence[str], doc_count: int) -> None:
        emb = self.model.encode(list(texts), normalize_embeddings=True, convert_to_numpy=True).astype(np.float32)
        self.embeddings = emb
        np.save(self.embeddings_path, emb)

        if self.backend == "st_faiss":
            dim = emb.shape[1]
            idx = faiss.IndexFlatIP(dim)
            idx.add(emb)
            self.index = idx
            faiss.write_index(idx, str(self.faiss_index_path))

        self._save_meta(doc_count)
        self._doc_count = doc_count

    def _build_tfidf(self, texts: Sequence[str], doc_count: int) -> None:
        self.vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), min_df=1)
        self.tfidf_matrix = self.vectorizer.fit_transform(list(texts))
        with self.tfidf_cache_path.open("wb") as f:
            pickle.dump({"vectorizer": self.vectorizer, "matrix": self.tfidf_matrix}, f)
        self._save_meta(doc_count)
        self._doc_count = doc_count

    @staticmethod
    def normalize_scores(scores: Sequence[float]) -> np.ndarray:
        arr = np.array(scores, dtype=float)
        if arr.size == 0:
            return arr
        smin, smax = float(arr.min()), float(arr.max())
        if np.isclose(smax - smin, 0.0):
            return np.zeros_like(arr)
        return (arr - smin) / (smax - smin)

    def search(self, query: str, topk: int = 30) -> List[Tuple[int, float, float]]:
        """Return list of (doc_index, raw_score, normalized_score)."""
        if not self.status.enabled:
            return []

        if self.backend == "st_faiss" and self.model is not None and self.index is not None:
            q_emb = self.model.encode([query], normalize_embeddings=True, convert_to_numpy=True).astype(np.float32)
            scores, indices = self.index.search(q_emb, min(topk, self._doc_count))
            raw = scores[0].astype(float)
            idxs = indices[0].astype(int)
        elif self.backend == "st_numpy" and self.model is not None and self.embeddings is not None:
            q_emb = self.model.encode([query], normalize_embeddings=True, convert_to_numpy=True).astype(np.float32)
            raw_all = np.dot(self.embeddings, q_emb[0]).astype(float)
            idxs = np.argsort(-raw_all)[:topk]
            raw = raw_all[idxs]
        elif self.backend == "tfidf" and self.vectorizer is not None and self.tfidf_matrix is not None:
            q_vec = self.vectorizer.transform([query])
            raw_all = (self.tfidf_matrix @ q_vec.T).toarray().ravel().astype(float)
            idxs = np.argsort(-raw_all)[:topk]
            raw = raw_all[idxs]
        else:
            return []

        norm = self.normalize_scores(raw)
        return [(int(i), float(s), float(n)) for i, s, n in zip(idxs, raw, norm) if int(i) >= 0]
