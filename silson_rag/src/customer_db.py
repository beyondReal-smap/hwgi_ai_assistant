"""Local customer/contract lookup helpers for silson workflow."""
from __future__ import annotations

import re
from functools import lru_cache
from typing import Dict, List, Optional

import pandas as pd

from .config import CFG
from .engine.filters import detect_join_ym
from .engine.filters import infer_generation_from_join_ym
from .types import CustomerContext, CustomerContract

SILSON_PRODUCT_RE = re.compile(r"(실손|실비)")
NAME_TOKEN_RE = re.compile(r"[가-힣A-Za-z]{2,12}")
POLICY_NO_RE = re.compile(r"\bLA\d{8,16}\b")


def _clean_text(value: object) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    return str(value).strip()


def _parse_join_ym(join_date: str) -> Optional[int]:
    if not join_date:
        return None
    try:
        return int(join_date[:4]) * 100 + int(join_date[5:7])
    except (TypeError, ValueError):
        return None


@lru_cache(maxsize=1)
def _load_contract_df() -> pd.DataFrame:
    if not CFG.customer_contracts_csv.exists():
        return pd.DataFrame()
    return pd.read_csv(CFG.customer_contracts_csv, encoding="utf-8-sig").fillna("")


@lru_cache(maxsize=1)
def _name_index() -> set[str]:
    df = _load_contract_df()
    if df.empty:
        return set()
    names = set(df["NM"].astype(str).str.strip())
    if "HNGL_RELNM" in df.columns:
        names.update(df["HNGL_RELNM"].astype(str).str.strip())
    return {name for name in names if len(name) >= 2}


def _normalize_product_text(text: str) -> str:
    return re.sub(r"[\s()Ⅱ\-_/]", "", text).lower()


@lru_cache(maxsize=1)
def _product_index() -> Dict[str, str]:
    df = _load_contract_df()
    if df.empty:
        return {}

    products: Dict[str, str] = {}
    for value in df["GDNM"].astype(str).tolist():
        cleaned = value.strip()
        normalized = _normalize_product_text(cleaned)
        if cleaned and normalized and normalized not in products:
            products[normalized] = cleaned
    return products


def detect_customer_names(query: str) -> List[str]:
    candidates: List[str] = []
    seen: set[str] = set()
    names = _name_index()
    for token in NAME_TOKEN_RE.findall(query):
        if token in names and token not in seen:
            seen.add(token)
            candidates.append(token)
    return candidates


def detect_policy_numbers(query: str) -> List[str]:
    seen: set[str] = set()
    values: List[str] = []
    for match in POLICY_NO_RE.findall(query.upper()):
        if match not in seen:
            seen.add(match)
            values.append(match)
    return values


def detect_product_names(query: str) -> List[str]:
    normalized_query = _normalize_product_text(query)
    if not normalized_query:
        return []

    matches: List[str] = []
    for normalized_product, product_name in _product_index().items():
        if normalized_product and normalized_product in normalized_query:
            matches.append(product_name)

    matches.sort(key=len, reverse=True)
    unique: List[str] = []
    seen: set[str] = set()
    for match in matches:
        if match not in seen:
            seen.add(match)
            unique.append(match)
    return unique[:5]


def _build_contracts(rows: pd.DataFrame) -> List[CustomerContract]:
    contracts: List[CustomerContract] = []
    if rows.empty:
        return contracts

    grouped = rows.groupby("PLYNO", sort=False)
    for _, group in grouped:
        first = group.iloc[0]
        join_date = _clean_text(first.get("INS_ST"))
        join_ym = _parse_join_ym(join_date)
        product_name = _clean_text(first.get("GDNM"))
        is_silson = bool(SILSON_PRODUCT_RE.search(product_name))
        coverage_names = []
        seen_coverages: set[str] = set()
        for coverage in group["CVRNM"].astype(str).tolist():
            cleaned = coverage.strip()
            if cleaned and cleaned not in seen_coverages:
                seen_coverages.add(cleaned)
                coverage_names.append(cleaned)

        contracts.append(
            CustomerContract(
                customer_name=_clean_text(first.get("NM")),
                insured_name=_clean_text(first.get("HNGL_RELNM")),
                policy_no=_clean_text(first.get("PLYNO")),
                product_code=_clean_text(first.get("GDCD")),
                product_name=product_name,
                join_date=join_date,
                join_ym=join_ym,
                generation=infer_generation_from_join_ym(join_ym) if join_ym else None,
                is_silson=is_silson,
                coverage_names=coverage_names[:10],
            )
        )

    contracts.sort(
        key=lambda item: (
            0 if item.is_silson else 1,
            -(item.join_ym or 0),
            item.policy_no,
        )
    )
    return contracts


def lookup_customer_context(
    customer_name: str = "",
    *,
    policy_no: str = "",
    product_name: str = "",
    join_year: Optional[int] = None,
    silson_only: bool = False,
) -> Optional[CustomerContext]:
    df = _load_contract_df()
    if df.empty:
        return None

    customer_name = customer_name.strip()
    policy_no = policy_no.strip().upper()
    product_name = product_name.strip()

    matched = df
    if customer_name:
        matched = matched[(matched["NM"] == customer_name) | (matched["HNGL_RELNM"] == customer_name)]
    if policy_no:
        matched = matched[matched["PLYNO"].astype(str).str.upper() == policy_no]
    if product_name:
        matched = matched[matched["GDNM"].astype(str) == product_name]
    if join_year:
        matched = matched[matched["INS_ST"].astype(str).str.startswith(str(join_year))]
    if matched.empty:
        return None

    contracts = _build_contracts(matched)
    silson_contracts = [contract for contract in contracts if contract.is_silson]
    if silson_only and not silson_contracts:
        return None

    matched_names: List[str] = []
    for value in pd.concat([matched["NM"], matched["HNGL_RELNM"]]).astype(str).tolist():
        cleaned = value.strip()
        if cleaned and cleaned not in matched_names:
            matched_names.append(cleaned)

    resolved_name = customer_name
    if not resolved_name:
        resolved_name = _clean_text(matched.iloc[0].get("NM")) or _clean_text(matched.iloc[0].get("HNGL_RELNM"))
    if not resolved_name:
        resolved_name = policy_no or product_name or "고객"

    return CustomerContext(
        customer_name=resolved_name,
        matched_names=matched_names,
        contracts=silson_contracts if silson_only else contracts,
        silson_contracts=silson_contracts,
    )


def lookup_customer_context_from_query(query: str) -> Optional[CustomerContext]:
    names = detect_customer_names(query)
    policies = detect_policy_numbers(query)
    products = detect_product_names(query)
    join_ym = detect_join_ym(query)
    join_year = join_ym // 100 if join_ym else None

    if names:
        for name in names:
            context = lookup_customer_context(
                name,
                policy_no=policies[0] if policies else "",
                product_name=products[0] if products else "",
                join_year=join_year,
            )
            if context is not None:
                return context

    if policies:
        context = lookup_customer_context(
            policy_no=policies[0],
            product_name=products[0] if products else "",
            join_year=join_year,
        )
        if context is not None:
            return context

    if products:
        context = lookup_customer_context(
            product_name=products[0],
            join_year=join_year,
            silson_only=True,
        )
        if context is not None:
            return context
    return None


def summarize_customer_context(context: Optional[CustomerContext]) -> Dict[str, object]:
    if context is None:
        return {"found": False}

    contracts = context.silson_contracts or context.contracts
    return {
        "found": True,
        "customer_name": context.customer_name,
        "matched_names": context.matched_names,
        "silson_contract_count": len(context.silson_contracts),
        "contracts": [
            {
                "customer_name": contract.customer_name,
                "insured_name": contract.insured_name,
                "policy_no": contract.policy_no,
                "product_code": contract.product_code,
                "product_name": contract.product_name,
                "join_date": contract.join_date,
                "join_ym": contract.join_ym,
                "generation": contract.generation,
                "is_silson": contract.is_silson,
                "coverage_names": contract.coverage_names,
            }
            for contract in contracts[:5]
        ],
    }
