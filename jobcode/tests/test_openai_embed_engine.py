from dataclasses import replace

from src.core import embed_engine
from src.core.schema import JobRecord


def test_embed_engine_prefers_openai_embeddings(monkeypatch, tmp_path):
    monkeypatch.setattr(
        embed_engine,
        "SETTINGS",
        replace(
            embed_engine.SETTINGS,
            embed_provider="openai",
            openai_api_key="test-key",
            openai_embed_model="text-embedding-3-small",
            openai_embed_dimensions=0,
        ),
    )
    monkeypatch.setattr(embed_engine, "OPENAI_EMBEDDINGS_PATH", tmp_path / "embeddings.npy")
    monkeypatch.setattr(embed_engine, "OPENAI_FAISS_INDEX_PATH", tmp_path / "faiss.index")
    monkeypatch.setattr(embed_engine, "OPENAI_EMBED_META_PATH", tmp_path / "meta.json")

    def fake_embeddings(texts, *, model, dimensions=None):
        assert model == "text-embedding-3-small"
        assert dimensions is None
        return [[1.0, 0.0] if "사과" in text else [0.0, 1.0] for text in texts]

    monkeypatch.setattr(embed_engine, "create_openai_embeddings", fake_embeddings)

    engine = embed_engine.EmbedEngine(
        records=[
            JobRecord(
                job_code="0",
                job_name="사과 분류 관리자",
                risk_grade="1",
                description="사과 관련 업무",
                search_text="사과 관련 업무",
            ),
            JobRecord(
                job_code="1",
                job_name="트럭 운전원",
                risk_grade="3",
                description="트럭 운전 업무",
                search_text="트럭 운전 업무",
            ),
        ],
        model_name="ignored",
        data_hash="jobcode-openai-test",
    )

    results = engine.search("사과", topk=2)

    assert engine.provider == "openai"
    assert engine.backend in {"openai_faiss", "openai_numpy"}
    assert results[0][0] == 0
