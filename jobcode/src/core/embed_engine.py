from __future__ import annotations

import json
import pickle
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import List, Sequence, Tuple

import numpy as np

from .config import EMBEDDINGS_PATH, EMBED_META_PATH, FAISS_INDEX_PATH
from .schema import JobRecord

try:
    import faiss
except Exception:  # pragma: no cover
    faiss = None

try:
    from sentence_transformers import SentenceTransformer
except Exception:  # pragma: no cover
    SentenceTransformer = None

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
except Exception:  # pragma: no cover
    TfidfVectorizer = None


@dataclass
class EmbedStatus:
    enabled: bool
    reason: str


class EmbedEngine:
    def __init__(
        self,
        records: Sequence[JobRecord],
        model_name: str,
        data_hash: str,
        embeddings_path: Path = EMBEDDINGS_PATH,
        faiss_index_path: Path = FAISS_INDEX_PATH,
        meta_path: Path = EMBED_META_PATH,
    ) -> None:
        self.records = list(records)
        self.model_name = model_name
        self.data_hash = data_hash
        self.embeddings_path = embeddings_path
        self.faiss_index_path = faiss_index_path
        self.meta_path = meta_path
        self.model = None
        self.index = None
        self.embeddings = None
        self.vectorizer = None
        self.tfidf_matrix = None
        self.backend = "disabled"
        self.tfidf_cache_path = self.embeddings_path.with_name("tfidf.pkl")

        if SentenceTransformer is not None:
            try:
                self.model = SentenceTransformer(model_name)
                self.backend = "st_faiss" if faiss is not None else "st_numpy"
                self.status = EmbedStatus(
                    True,
                    "sentence-transformers+faiss"
                    if self.backend == "st_faiss"
                    else "sentence-transformers+numpy",
                )
                self._load_or_build_st()
                return
            except Exception as e:  # pragma: no cover
                self.model = None
                st_reason = f"sentence-transformers init failed: {e}"
        else:
            st_reason = "sentence-transformers unavailable"

        if TfidfVectorizer is not None:
            self.backend = "tfidf"
            self.status = EmbedStatus(True, f"tfidf-fallback ({st_reason})")
            self._load_or_build_tfidf()
            return

        self.status = EmbedStatus(False, f"embedding disabled ({st_reason}; scikit-learn unavailable)")

    def _meta_matches(self) -> bool:
        if not self.meta_path.exists():
            return False
        try:
            with self.meta_path.open("r", encoding="utf-8") as f:
                meta = json.load(f)
            return (
                meta.get("model_name") == self.model_name
                and meta.get("data_hash") == self.data_hash
                and meta.get("backend") == self.backend
            )
        except Exception:
            return False

    def _encode_docs(self) -> np.ndarray:
        texts = [r.search_text for r in self.records]
        emb = self.model.encode(texts, normalize_embeddings=True, convert_to_numpy=True)
        return emb.astype(np.float32)

    def _build_faiss(self, embeddings: np.ndarray):
        dim = embeddings.shape[1]
        index = faiss.IndexFlatIP(dim)
        index.add(embeddings)
        return index

    def _load_or_build_st(self) -> None:
        has_cache = self._meta_matches() and self.embeddings_path.exists()
        if has_cache:
            self.embeddings = np.load(self.embeddings_path)
            if self.backend == "st_faiss" and self.faiss_index_path.exists():
                self.index = faiss.read_index(str(self.faiss_index_path))
            return

        self.rebuild()

    def _load_or_build_tfidf(self) -> None:
        if self._meta_matches() and self.tfidf_cache_path.exists():
            with self.tfidf_cache_path.open("rb") as f:
                payload = pickle.load(f)
            self.vectorizer = payload["vectorizer"]
            self.tfidf_matrix = payload["matrix"]
            return
        self.rebuild()

    def rebuild(self) -> None:
        if not self.status.enabled:
            return
        self.embeddings_path.parent.mkdir(parents=True, exist_ok=True)
        if self.backend in {"st_faiss", "st_numpy"}:
            embeddings = self._encode_docs()
            self.embeddings = embeddings
            np.save(self.embeddings_path, embeddings)
            if self.backend == "st_faiss":
                index = self._build_faiss(embeddings)
                self.index = index
                faiss.write_index(index, str(self.faiss_index_path))
        elif self.backend == "tfidf":
            texts = [r.search_text for r in self.records]
            self.vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), min_df=1)
            self.tfidf_matrix = self.vectorizer.fit_transform(texts)
            with self.tfidf_cache_path.open("wb") as f:
                pickle.dump({"vectorizer": self.vectorizer, "matrix": self.tfidf_matrix}, f)

        with self.meta_path.open("w", encoding="utf-8") as f:
            json.dump(
                {
                    "model_name": self.model_name,
                    "backend": self.backend,
                    "data_hash": self.data_hash,
                    "created_at": datetime.utcnow().isoformat() + "Z",
                },
                f,
                ensure_ascii=False,
                indent=2,
            )

    @staticmethod
    def normalize_scores(scores: Sequence[float]) -> np.ndarray:
        arr = np.array(scores, dtype=float)
        if arr.size == 0:
            return arr
        smin, smax = float(arr.min()), float(arr.max())
        if np.isclose(smax - smin, 0.0):
            return np.zeros_like(arr)
        return (arr - smin) / (smax - smin)

    def search(self, query: str, topk: int = 50) -> List[Tuple[int, float, float]]:
        if not self.status.enabled:
            return []

        if self.backend == "st_faiss" and self.model is not None and self.index is not None:
            q_emb = self.model.encode([query], normalize_embeddings=True, convert_to_numpy=True).astype(np.float32)
            scores, indices = self.index.search(q_emb, topk)
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
