"""Tests for silson workflow orchestration."""
from __future__ import annotations

from types import SimpleNamespace

from silson_rag.src import config, workflow
from silson_rag.src.types import CustomerContext, CustomerContract, SearchHit


def test_workflow_uses_customer_contract_filters(monkeypatch):
    captured: dict[str, object] = {}

    context = CustomerContext(
        customer_name="박명숙",
        matched_names=["박명숙"],
        contracts=[
            CustomerContract(
                customer_name="박명숙",
                insured_name="박명숙",
                policy_no="LA2014001",
                product_code="LA01069002",
                product_name="무배당 한화실손의료보험1404",
                join_date="2014-05-01 00:00:00.0",
                join_ym=201405,
                generation="2세대",
                is_silson=True,
                coverage_names=["질병입원실손"],
            )
        ],
        silson_contracts=[
            CustomerContract(
                customer_name="박명숙",
                insured_name="박명숙",
                policy_no="LA2014001",
                product_code="LA01069002",
                product_name="무배당 한화실손의료보험1404",
                join_date="2014-05-01 00:00:00.0",
                join_ym=201405,
                generation="2세대",
                is_silson=True,
                coverage_names=["질병입원실손"],
            )
        ],
    )

    def fake_retrieve_hits(query: str, topk: int, filters):
        captured["query"] = query
        captured["filters"] = filters
        return (
            [
                SearchHit(
                    doc_id="doc-1",
                    source_kind="coverage_criteria",
                    source_label="담보별보상기준",
                    generation="2세대",
                    product_alias="한화실손의료보험1404",
                    sales_period="201405~",
                    coverage_name="질병입원실손",
                    clause_name="자기부담금",
                    clause_text_oneline="질병입원실손 자기부담금은 약관 기준을 따른다.",
                    source_file="doc-1.md",
                    filename="doc-1.md",
                    score=0.91,
                    document_excerpt="질병입원실손 자기부담금은 약관 기준을 따른다.",
                )
            ],
            "silson_rag_clauses",
            "disabled",
        )

    monkeypatch.setattr(config, "CFG", SimpleNamespace(openai_api_key=""))
    monkeypatch.setattr(workflow, "lookup_customer_context_from_query", lambda query: context)
    monkeypatch.setattr(workflow, "generate_answer_local", lambda query, hits: "보상 안내입니다.")
    monkeypatch.setattr("silson_rag.src.api.retrieve_hits", fake_retrieve_hits)

    result = workflow.run_silson_search_workflow("박명숙 고객 실손 자기부담금 알려줘", topk=3)

    filters = captured["filters"]
    assert filters.generation == "2세대"
    assert filters.join_ym == 201405
    assert result.filters["generation"] == "2세대"
    assert result.filters["join_ym"] == 201405
    assert "고객 계약 확인:" in result.answer
    assert result.mode["tools_used"] == "db_query,local_search"
