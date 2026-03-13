from __future__ import annotations

import json
import pickle
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import List, Sequence, Tuple

import numpy as np

from .config import (
    EMBEDDINGS_PATH,
    EMBED_META_PATH,
    FAISS_INDEX_PATH,
    OPENAI_EMBED_DIR,
    SETTINGS,
)
from .openai_embeddings import create_openai_embeddings
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


OPENAI_EMBEDDINGS_PATH = OPENAI_EMBED_DIR / "embeddings.npy"
OPENAI_FAISS_INDEX_PATH = OPENAI_EMBED_DIR / "faiss.index"
OPENAI_EMBED_META_PATH = OPENAI_EMBED_DIR / "meta.json"
OPENAI_BATCH_SIZE = 64


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
        self.data_hash = data_hash
        self.requested_model_name = model_name
        self.model_name = model_name
        self.embeddings_path = embeddings_path
        self.faiss_index_path = faiss_index_path
        self.meta_path = meta_path
        self.tfidf_cache_path = self.embeddings_path.with_name("tfidf.pkl")
        self.model = None
        self.index = None
        self.embeddings = None
        self.vectorizer = None
        self.tfidf_matrix = None
        self.backend = "disabled"
        self.provider = "disabled"
        self.openai_dimensions = SETTINGS.openai_embed_dimensions or None

        openai_reason = self._try_openai_backend()
        if self.status.enabled:
            return

        st_reason = self._try_sentence_transformers_backend()
        if self.status.enabled:
            return

        if TfidfVectorizer is not None:
            self.provider = "tfidf"
            self.backend = "tfidf"
            self.status = EmbedStatus(True, f"tfidf-fallback ({openai_reason}; {st_reason})")
            self._load_or_build_tfidf()
            return

        self.status = EmbedStatus(False, f"embedding disabled ({openai_reason}; {st_reason}; scikit-learn unavailable)")

    def _try_openai_backend(self) -> str:
        preferred_provider = SETTINGS.embed_provider
        openai_enabled = preferred_provider in {"openai", "auto"} and bool(SETTINGS.openai_api_key.strip())
        if not openai_enabled:
            self.status = EmbedStatus(False, "OpenAI embeddings unavailable")
            return "OpenAI embeddings unavailable"

        self.provider = "openai"
        self.model_name = SETTINGS.openai_embed_model
        self.embeddings_path = OPENAI_EMBEDDINGS_PATH
        self.faiss_index_path = OPENAI_FAISS_INDEX_PATH
        self.meta_path = OPENAI_EMBED_META_PATH
        self.tfidf_cache_path = self.embeddings_path.with_name("tfidf.pkl")
        self.backend = "openai_faiss" if faiss is not None else "openai_numpy"
        self.status = EmbedStatus(
            True,
            "openai+faiss" if self.backend == "openai_faiss" else "openai+numpy",
        )

        try:
            self._load_or_build_openai()
            return self.status.reason
        except Exception as exc:  # pragma: no cover
            self.provider = "disabled"
            self.backend = "disabled"
            self.embeddings = None
            self.index = None
            self.status = EmbedStatus(False, f"OpenAI embeddings failed: {exc}")
            return self.status.reason

    def _try_sentence_transformers_backend(self) -> str:
        self.model_name = self.requested_model_name
        self.embeddings_path = EMBEDDINGS_PATH
        self.faiss_index_path = FAISS_INDEX_PATH
        self.meta_path = EMBED_META_PATH
        self.tfidf_cache_path = self.embeddings_path.with_name("tfidf.pkl")
        self.provider = "sentence_transformers"

        if SentenceTransformer is None:
            self.status = EmbedStatus(False, "sentence-transformers unavailable")
            return self.status.reason

        try:
            self.model = SentenceTransformer(self.model_name)
            self.backend = "st_faiss" if faiss is not None else "st_numpy"
            self.status = EmbedStatus(
                True,
                "sentence-transformers+faiss"
                if self.backend == "st_faiss"
                else "sentence-transformers+numpy",
            )
            self._load_or_build_st()
            return self.status.reason
        except Exception as exc:  # pragma: no cover
            self.model = None
            self.backend = "disabled"
            self.status = EmbedStatus(False, f"sentence-transformers init failed: {exc}")
            return self.status.reason

    def _meta_dimensions(self) -> int | None:
        return self.openai_dimensions if self.provider == "openai" else None

    def _meta_matches(self) -> bool:
        if not self.meta_path.exists():
            return False
        try:
            with self.meta_path.open("r", encoding="utf-8") as file:
                meta = json.load(file)
            return (
                meta.get("model_name") == self.model_name
                and meta.get("data_hash") == self.data_hash
                and meta.get("backend") == self.backend
                and meta.get("provider") == self.provider
                and meta.get("dimensions") == self._meta_dimensions()
            )
        except Exception:
            return False

    @staticmethod
    def _normalize_embeddings(embeddings: np.ndarray) -> np.ndarray:
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return (embeddings / norms).astype(np.float32)

    def _encode_docs_st(self) -> np.ndarray:
        texts = [record.search_text for record in self.records]
        embeddings = self.model.encode(texts, normalize_embeddings=True, convert_to_numpy=True)
        return embeddings.astype(np.float32)

    def _encode_docs_openai(self) -> np.ndarray:
        texts = [record.search_text for record in self.records]
        vectors: List[List[float]] = []
        for start in range(0, len(texts), OPENAI_BATCH_SIZE):
            batch = texts[start:start + OPENAI_BATCH_SIZE]
            vectors.extend(
                create_openai_embeddings(
                    batch,
                    model=self.model_name,
                    dimensions=self.openai_dimensions,
                )
            )
        raw = np.array(vectors, dtype=np.float32)
        return self._normalize_embeddings(raw)

    def _encode_query_openai(self, query: str) -> np.ndarray:
        vector = create_openai_embeddings(
            [query],
            model=self.model_name,
            dimensions=self.openai_dimensions,
        )[0]
        raw = np.array([vector], dtype=np.float32)
        return self._normalize_embeddings(raw)

    def _build_faiss(self, embeddings: np.ndarray):
        dimension = embeddings.shape[1]
        index = faiss.IndexFlatIP(dimension)
        index.add(embeddings)
        return index

    def _load_or_build_openai(self) -> None:
        has_cache = self._meta_matches() and self.embeddings_path.exists()
        if has_cache:
            self.embeddings = np.load(self.embeddings_path)
            if self.backend == "openai_faiss" and self.faiss_index_path.exists():
                self.index = faiss.read_index(str(self.faiss_index_path))
            return
        self.rebuild()

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
            with self.tfidf_cache_path.open("rb") as file:
                payload = pickle.load(file)
            self.vectorizer = payload["vectorizer"]
            self.tfidf_matrix = payload["matrix"]
            return
        self.rebuild()

    def rebuild(self) -> None:
        if not self.status.enabled:
            return

        self.embeddings_path.parent.mkdir(parents=True, exist_ok=True)
        if self.backend in {"openai_faiss", "openai_numpy"}:
            embeddings = self._encode_docs_openai()
            self.embeddings = embeddings
            np.save(self.embeddings_path, embeddings)
            if self.backend == "openai_faiss":
                index = self._build_faiss(embeddings)
                self.index = index
                faiss.write_index(index, str(self.faiss_index_path))
        elif self.backend in {"st_faiss", "st_numpy"}:
            embeddings = self._encode_docs_st()
            self.embeddings = embeddings
            np.save(self.embeddings_path, embeddings)
            if self.backend == "st_faiss":
                index = self._build_faiss(embeddings)
                self.index = index
                faiss.write_index(index, str(self.faiss_index_path))
        elif self.backend == "tfidf":
            texts = [record.search_text for record in self.records]
            self.vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), min_df=1)
            self.tfidf_matrix = self.vectorizer.fit_transform(texts)
            with self.tfidf_cache_path.open("wb") as file:
                pickle.dump({"vectorizer": self.vectorizer, "matrix": self.tfidf_matrix}, file)

        with self.meta_path.open("w", encoding="utf-8") as file:
            json.dump(
                {
                    "model_name": self.model_name,
                    "backend": self.backend,
                    "provider": self.provider,
                    "data_hash": self.data_hash,
                    "dimensions": self._meta_dimensions(),
                    "created_at": datetime.utcnow().isoformat() + "Z",
                },
                file,
                ensure_ascii=False,
                indent=2,
            )

    @staticmethod
    def normalize_scores(scores: Sequence[float]) -> np.ndarray:
        array = np.array(scores, dtype=float)
        if array.size == 0:
            return array
        score_min, score_max = float(array.min()), float(array.max())
        if np.isclose(score_max - score_min, 0.0):
            return np.zeros_like(array)
        return (array - score_min) / (score_max - score_min)

    def search(self, query: str, topk: int = 50) -> List[Tuple[int, float, float]]:
        if not self.status.enabled:
            return []

        if self.backend == "openai_faiss" and self.index is not None:
            query_embedding = self._encode_query_openai(query)
            scores, indices = self.index.search(query_embedding, topk)
            raw = scores[0].astype(float)
            idxs = indices[0].astype(int)
        elif self.backend == "openai_numpy" and self.embeddings is not None:
            query_embedding = self._encode_query_openai(query)
            raw_all = np.dot(self.embeddings, query_embedding[0]).astype(float)
            idxs = np.argsort(-raw_all)[:topk]
            raw = raw_all[idxs]
        elif self.backend == "st_faiss" and self.model is not None and self.index is not None:
            query_embedding = self.model.encode([query], normalize_embeddings=True, convert_to_numpy=True).astype(np.float32)
            scores, indices = self.index.search(query_embedding, topk)
            raw = scores[0].astype(float)
            idxs = indices[0].astype(int)
        elif self.backend == "st_numpy" and self.model is not None and self.embeddings is not None:
            query_embedding = self.model.encode([query], normalize_embeddings=True, convert_to_numpy=True).astype(np.float32)
            raw_all = np.dot(self.embeddings, query_embedding[0]).astype(float)
            idxs = np.argsort(-raw_all)[:topk]
            raw = raw_all[idxs]
        elif self.backend == "tfidf" and self.vectorizer is not None and self.tfidf_matrix is not None:
            query_vector = self.vectorizer.transform([query])
            raw_all = (self.tfidf_matrix @ query_vector.T).toarray().ravel().astype(float)
            idxs = np.argsort(-raw_all)[:topk]
            raw = raw_all[idxs]
        else:
            return []

        norm = self.normalize_scores(raw)
        return [(int(index), float(score), float(score_norm)) for index, score, score_norm in zip(idxs, raw, norm) if int(index) >= 0]
