"""Tests for customer contract lookup utilities."""
from __future__ import annotations

import pandas as pd

from silson_rag.src import customer_db


def _sample_contract_df() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "NM": "박명숙",
                "HNGL_RELNM": "박명숙",
                "PLYNO": "LA2014001",
                "GDCD": "LA01069002",
                "INS_ST": "2014-05-01 00:00:00.0",
                "GDNM": "무배당 한화실손의료보험1404",
                "CVRNM": "질병입원실손",
            },
            {
                "NM": "박명숙",
                "HNGL_RELNM": "박명숙",
                "PLYNO": "LA2014001",
                "GDCD": "LA01069002",
                "INS_ST": "2014-05-01 00:00:00.0",
                "GDNM": "무배당 한화실손의료보험1404",
                "CVRNM": "질병통원실손",
            },
            {
                "NM": "박명숙",
                "HNGL_RELNM": "박명숙",
                "PLYNO": "LA2018002",
                "GDCD": "LA01383001",
                "INS_ST": "2018-03-21 00:00:00.0",
                "GDNM": "무배당 신의건강보험1701",
                "CVRNM": "뇌질환진단비",
            },
            {
                "NM": "김민경",
                "HNGL_RELNM": "김민경",
                "PLYNO": "LA2021001",
                "GDCD": "LA01449002",
                "INS_ST": "2021-08-03 00:00:00.0",
                "GDNM": "무배당 한화실손의료보험(갱신형)Ⅱ",
                "CVRNM": "상해입원실손",
            },
        ]
    )


def test_detect_customer_names(monkeypatch):
    monkeypatch.setattr(customer_db, "_load_contract_df", lambda: _sample_contract_df())
    customer_db._name_index.cache_clear()
    customer_db._product_index.cache_clear()

    assert customer_db.detect_customer_names("박명숙 고객 실손 자기부담금 알려줘") == ["박명숙"]


def test_lookup_customer_context_groups_contracts(monkeypatch):
    monkeypatch.setattr(customer_db, "_load_contract_df", lambda: _sample_contract_df())
    customer_db._name_index.cache_clear()
    customer_db._product_index.cache_clear()

    context = customer_db.lookup_customer_context("박명숙")

    assert context is not None
    assert context.customer_name == "박명숙"
    assert len(context.contracts) == 2
    assert len(context.silson_contracts) == 1
    assert context.silson_contracts[0].policy_no == "LA2014001"
    assert context.silson_contracts[0].generation == "2세대"
    assert context.silson_contracts[0].coverage_names == ["질병입원실손", "질병통원실손"]


def test_detect_policy_and_product_names(monkeypatch):
    monkeypatch.setattr(customer_db, "_load_contract_df", lambda: _sample_contract_df())
    customer_db._name_index.cache_clear()
    customer_db._product_index.cache_clear()

    assert customer_db.detect_policy_numbers("LA2014001 계약 실손 보상기준") == ["LA2014001"]
    assert customer_db.detect_product_names("무배당한화실손의료보험1404 자기부담금") == ["무배당 한화실손의료보험1404"]


def test_lookup_customer_context_with_policy_and_join_year(monkeypatch):
    monkeypatch.setattr(customer_db, "_load_contract_df", lambda: _sample_contract_df())
    customer_db._name_index.cache_clear()
    customer_db._product_index.cache_clear()

    context = customer_db.lookup_customer_context(policy_no="LA2014001", join_year=2014)

    assert context is not None
    assert context.customer_name == "박명숙"
    assert len(context.silson_contracts) == 1
    assert context.silson_contracts[0].product_name == "무배당 한화실손의료보험1404"
