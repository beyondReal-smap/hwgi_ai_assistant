from __future__ import annotations

import argparse
import csv
import re
import sys
from pathlib import Path
from typing import Dict, Iterable, List

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT / "src") not in sys.path:
    sys.path.insert(0, str(ROOT / "src"))

from core.config import SILSON_CLAUSE_DOCS_DIR, SILSON_CLAUSE_MANIFEST_CSV, SILSON_CLAUSES_CSV
from core.silson_common import TERM_EQUIV


def _clean(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and pd.isna(value):
        return ""
    return str(value).strip()


def _split_keywords(value: str) -> List[str]:
    parts = re.split(r"[,|]", value)
    out: List[str] = []
    seen = set()
    for part in parts:
        token = re.sub(r"\s+", " ", part).strip()
        if token and token not in seen:
            seen.add(token)
            out.append(token)
    return out


def _normalize_alias_key(value: str) -> str:
    return re.sub(r"[^0-9A-Za-z가-힣]+", "", value).lower()


def _append_unique(values: Iterable[str], out: List[str], seen: set) -> None:
    for value in values:
        token = re.sub(r"\s+", " ", value).strip()
        if token and token not in seen:
            seen.add(token)
            out.append(token)


def _expand_aliases(*values: str) -> List[str]:
    aliases: List[str] = []
    seen: set = set()

    for value in values:
        text = _clean(value)
        if not text or text == "-":
            continue

        raw_variants = [
            text,
            text.replace(" ", ""),
            re.sub(r"[|/]+", " ", text),
            re.sub(r"[()]+", " ", text),
            re.sub(r"[∙•]", " ", text),
        ]
        _append_unique(raw_variants, aliases, seen)

        split_parts = re.split(r"[|/,]+", text)
        _append_unique(split_parts, aliases, seen)

        normalized_text = _normalize_alias_key(text)
        for key, variants in TERM_EQUIV.items():
            normalized_variants = {_normalize_alias_key(key), *(_normalize_alias_key(variant) for variant in variants)}
            if normalized_text in normalized_variants:
                _append_unique(variants, aliases, seen)

    return aliases


def _build_search_prompts(row: Dict[str, str], aliases: List[str]) -> List[str]:
    generation = _clean(row["generation"])
    product_alias = _clean(row["product_alias"])
    coverage_name = _clean(row["coverage_name"])
    clause_name = _clean(row["clause_name"])
    source_label = _clean(row["source_label"])
    naturalized_qa = _clean(row["naturalized_qa"])

    prompts: List[str] = []
    seen: set = set()

    base_prompts = [
        naturalized_qa,
        f"Q. {generation} {product_alias} {coverage_name}에서 {clause_name} 기준은 무엇인가요?",
        f"Q. {source_label}에서 {clause_name}은 어떻게 처리되나요?",
        f"Q. {generation} 실손 {coverage_name} {clause_name}",
    ]
    _append_unique(base_prompts, prompts, seen)

    for alias in aliases[:6]:
        _append_unique(
            [
                f"Q. {generation} 실손에서 {alias} 기준은 무엇인가요?",
                f"Q. {product_alias} {alias}",
            ],
            prompts,
            seen,
        )

    return prompts


def _render_raw_text(raw_text: str) -> List[str]:
    text = _clean(raw_text)
    if not text:
        return ["- 해당없음"]

    lines = [line.strip() for line in text.replace("\r", "\n").splitlines() if line.strip()]
    if not lines:
        return [f"- {text}"]

    rendered: List[str] = []
    for line in lines:
        if line.startswith("- "):
            rendered.append(line)
        else:
            rendered.append(f"- {line}")
    return rendered


def build_clause_markdown(row: Dict[str, str], clause_doc_id: str, search_aliases: List[str], prompts: List[str]) -> str:
    doc_id = _clean(row["doc_id"])
    source_label = _clean(row["source_label"])
    generation = _clean(row["generation"])
    product_alias = _clean(row["product_alias"])
    coverage_name = _clean(row["coverage_name"])
    clause_name = _clean(row["clause_name"])
    sales_period = _clean(row["sales_period"])
    source_kind = _clean(row["source_kind"])
    summary = _clean(row["clause_text_oneline"]) or _clean(row["clause_text_raw"]) or "해당없음"
    keywords = _split_keywords(_clean(row["keywords"]))
    search_text = _clean(row["search_text"])

    lines = [
        f"# {source_label} | {generation} | {product_alias} | {coverage_name} | {clause_name}",
        "",
        "## 검색 메타데이터",
        "",
        f"- 검색ID: {clause_doc_id}",
        f"- 상위문서ID: {doc_id}",
        f"- 문서유형: {source_label}",
        f"- source_kind: {source_kind}",
        f"- 세대: {generation}",
        f"- 상품명: {product_alias}",
        f"- 판매시기: {sales_period}",
        f"- 담보/구분: {coverage_name}",
        f"- 조항명: {clause_name}",
    ]

    if search_aliases:
        lines.append(f"- 검색별칭: {', '.join(search_aliases[:20])}")
    if keywords:
        lines.append(f"- 대표키워드: {', '.join(keywords[:20])}")

    lines.extend(
        [
            "",
            "## 핵심 답변",
            "",
            summary,
            "",
            "## 질문형 표현",
            "",
        ]
    )
    lines.extend(f"- {prompt}" for prompt in prompts)

    lines.extend(
        [
            "",
            "## 검색어 확장",
            "",
            f"- 검색텍스트: {search_text}",
            "",
            "## 원문",
            "",
        ]
    )
    lines.extend(_render_raw_text(_clean(row["clause_text_raw"]) or summary))
    lines.append("")
    return "\n".join(lines)


def build_manifest_rows(df: pd.DataFrame, docs_dir: Path) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    order = df.groupby("doc_id", sort=False).cumcount() + 1

    for (_, row), clause_no in zip(df.iterrows(), order):
        row_dict = {str(column): _clean(row[column]) for column in df.columns}
        filename = f"{row_dict['doc_id']}__clause_{int(clause_no):03d}.md"
        clause_doc_id = filename[:-3]
        search_aliases = _expand_aliases(
            row_dict["clause_name"],
            row_dict["coverage_name"],
            row_dict["product_alias"],
            row_dict["source_label"],
        )
        prompts = _build_search_prompts(row_dict, search_aliases)
        content = build_clause_markdown(row_dict, clause_doc_id, search_aliases, prompts)
        output_path = docs_dir / filename
        output_path.write_text(content, encoding="utf-8")

        rows.append(
            {
                "clause_doc_id": clause_doc_id,
                "doc_id": row_dict["doc_id"],
                "path": str(output_path),
                "filename": filename,
                "source_kind": row_dict["source_kind"],
                "source_label": row_dict["source_label"],
                "generation": row_dict["generation"],
                "variant_no": row_dict["variant_no"],
                "product_alias": row_dict["product_alias"],
                "sales_period": row_dict["sales_period"],
                "sales_start_ym": row_dict["sales_start_ym"],
                "sales_end_ym": row_dict["sales_end_ym"],
                "is_current": row_dict["is_current"],
                "coverage_name": row_dict["coverage_name"],
                "clause_name": row_dict["clause_name"],
            }
        )

    return rows


def write_manifest(rows: List[Dict[str, str]], path: Path) -> None:
    fieldnames = [
        "clause_doc_id",
        "doc_id",
        "path",
        "filename",
        "source_kind",
        "source_label",
        "generation",
        "variant_no",
        "product_alias",
        "sales_period",
        "sales_start_ym",
        "sales_end_ym",
        "is_current",
        "coverage_name",
        "clause_name",
    ]
    with path.open("w", newline="", encoding="utf-8-sig") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build clause-level silson markdown docs for OpenAI file search.")
    parser.add_argument(
        "--docs-dir",
        default=str(SILSON_CLAUSE_DOCS_DIR),
        help="Output directory for clause markdown files",
    )
    parser.add_argument(
        "--manifest",
        default=str(SILSON_CLAUSE_MANIFEST_CSV),
        help="Output manifest CSV path",
    )
    args = parser.parse_args()

    docs_dir = Path(args.docs_dir)
    manifest_path = Path(args.manifest)
    docs_dir.mkdir(parents=True, exist_ok=True)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(SILSON_CLAUSES_CSV, encoding="utf-8-sig").fillna("")
    rows = build_manifest_rows(df, docs_dir)
    write_manifest(rows, manifest_path)

    print(f"clause_docs={len(rows)}")
    print(f"docs_dir={docs_dir}")
    print(f"manifest={manifest_path}")


if __name__ == "__main__":
    main()
