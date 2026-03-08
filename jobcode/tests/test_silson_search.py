import json
from dataclasses import replace

import pandas as pd

from src.core.config import SETTINGS
from src.core import silson_query_rewriter as query_rewriter
from src.core import silson_rag


class _FakeHttpResponse:
    def __init__(self, payload):
        self.payload = payload

    def read(self):
        return json.dumps(self.payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


def _build_search_df(rows, index=None):
    df = pd.DataFrame(rows, index=index)
    for column in silson_rag.SEARCH_TEXT_FIELDS:
        if column not in df.columns:
            df[column] = ""
        df[f"_{column}_lc"] = df[column].astype(str).str.lower()
    return df


def test_score_keyword_candidates_prioritizes_stronger_field_matches():
    df = _build_search_df(
        [
            {
                "clause_name": "도수치료 보상기준",
                "coverage_name": "도수치료",
                "keywords": "도수치료, 보상기준",
                "naturalized_qa": "",
                "clause_text_oneline": "도수치료는 연간 한도 내 보상합니다.",
                "search_text": "도수치료 보상기준 연간 한도",
            },
            {
                "clause_name": "통원 치료",
                "coverage_name": "통원 치료",
                "keywords": "도수치료",
                "naturalized_qa": "",
                "clause_text_oneline": "일반 통원 치료 관련 기준입니다.",
                "search_text": "일반 통원 치료",
            },
        ],
        index=[101, 202],
    )

    scores = silson_rag._score_keyword_candidates(df, "도수치료 보상 기준", ["도수치료", "보상"])

    assert scores[101] > scores[202]
    assert scores[101] > 0


def test_answer_silson_with_vector_store_uses_included_file_search_results(monkeypatch):
    monkeypatch.setattr(
        silson_rag,
        "SETTINGS",
        replace(
            SETTINGS,
            openai_api_key="test-key",
            silson_vector_store_id="vs_test",
            silson_openai_model="gpt-4.1-mini",
        ),
    )

    def fake_post_json(path, payload):
        assert path == "/responses"
        assert payload["include"] == ["file_search_call.results"]
        return {
            "output_text": "치과 치료는 약관 조건에 따라 보상됩니다.",
            "output": [
                {
                    "type": "file_search_call",
                    "results": [
                        {
                            "filename": "coverage_criteria__4세대__02.md",
                            "score": 0.91,
                            "attributes": {
                                "doc_id": "coverage_criteria__4세대__02",
                                "source_kind": "coverage_criteria",
                                "source_label": "담보별 보상기준",
                                "generation": "4세대",
                                "product_alias": "4세대 실손의료비",
                                "coverage_name": "치과 치료",
                                "clause_name": "보상기준",
                                "sales_start_ym": 202107,
                                "is_current": True,
                            },
                            "content": [
                                {"type": "output_text", "text": "치과 치료는 급여 항목 중심으로 보상됩니다."}
                            ],
                        }
                    ],
                }
            ],
        }

    monkeypatch.setattr(silson_rag, "_openai_post_json", fake_post_json)

    result = silson_rag.answer_silson_with_vector_store("치과 치료는 실손에서 보상돼?", topk=3)

    assert result.answer == "치과 치료는 약관 조건에 따라 보상됩니다."
    assert len(result.hits) == 1
    assert result.hits[0].doc_id == "coverage_criteria__4세대__02"
    assert result.hits[0].generation == "4세대"
    assert result.hits[0].clause_name == "보상기준"


def test_result_to_hit_reads_clause_name_from_file_search_attributes():
    hit = silson_rag._result_to_hit(
        {
            "filename": "coverage_criteria__4세대__02__clause_007.md",
            "score": 0.88,
            "attributes": {
                "doc_id": "coverage_criteria__4세대__02",
                "source_kind": "coverage_criteria",
                "source_label": "담보별 보상기준",
                "generation": "4세대",
                "product_alias": "4세대실손",
                "coverage_name": "특약형(상해∙질병 비급여형)",
                "clause_name": "병실차액",
                "sales_start_ym": 202107,
                "is_current": True,
            },
            "content": [
                {"type": "output_text", "text": "병실료차액은 50%이며 1일 최대 10만원 한도입니다."}
            ],
        }
    )

    assert hit.doc_id == "coverage_criteria__4세대__02"
    assert hit.clause_name == "병실차액"
    assert hit.coverage_name == "특약형(상해∙질병 비급여형)"


def test_rewrite_query_caches_duplicate_requests(monkeypatch):
    monkeypatch.setattr(
        query_rewriter,
        "SETTINGS",
        replace(
            SETTINGS,
            openai_api_key="test-key",
            openai_base_url="https://example.com/v1",
            openai_model="gpt-4o-mini",
        ),
    )
    query_rewriter._rewrite_query_cached.cache_clear()

    calls = {"count": 0}

    def fake_urlopen(req, timeout):
        calls["count"] += 1
        return _FakeHttpResponse(
            {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "keywords": ["치과", "보상"],
                                    "generation": "4세대",
                                    "source_kind": "coverage_criteria",
                                },
                                ensure_ascii=False,
                            )
                        }
                    }
                ]
            }
        )

    monkeypatch.setattr(query_rewriter.request, "urlopen", fake_urlopen)

    first = query_rewriter.rewrite_query("치과 치료는 실손에서 보상돼?")
    second = query_rewriter.rewrite_query("치과 치료는 실손에서 보상돼?")

    assert calls["count"] == 1
    assert first.keywords == ["치과", "보상"]
    assert second.keywords == ["치과", "보상"]
    query_rewriter._rewrite_query_cached.cache_clear()
