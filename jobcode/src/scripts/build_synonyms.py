from __future__ import annotations

import csv
import json
import re
from pathlib import Path
from typing import Dict, Iterable, List

import sys

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT / "src") not in sys.path:
    sys.path.insert(0, str(ROOT / "src"))

from core.text_norm import normalize_text, tokenize

DATA_DIR = ROOT / "data"
JOB_CODE_TXT = DATA_DIR / "job_code.txt"
JOBS_CSV = DATA_DIR / "jobs.csv"
SYNONYMS_JSON = DATA_DIR / "synonyms.json"


def _split_terms(text: str) -> List[str]:
    if not text:
        return []
    text = re.sub(r"[()\\[\\]]", " ", text)
    parts = re.split(r"[,/·;:|]", text)
    out = []
    for p in parts:
        t = normalize_text(p)
        if len(t) >= 2:
            out.append(t)
    return out


def _dedup_keep_order(values: Iterable[str], limit: int) -> List[str]:
    seen = set()
    out = []
    for v in values:
        if v and v not in seen:
            out.append(v)
            seen.add(v)
            if len(out) >= limit:
                break
    return out


def _load_rows() -> List[Dict[str, str]]:
    if not JOB_CODE_TXT.exists():
        raise FileNotFoundError(f"missing file: {JOB_CODE_TXT}")
    with JOB_CODE_TXT.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter="\t")
        rows = [r for r in reader]
    return rows


def build_jobs_csv(rows: List[Dict[str, str]]) -> int:
    JOBS_CSV.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with JOBS_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["job_code", "job_name", "risk_grade", "description"],
        )
        writer.writeheader()
        for r in rows:
            job_code = (r.get("직업코드") or "").strip()
            job_name = (r.get("직업명") or "").strip()
            risk = (r.get("등급") or "").strip()
            desc = (r.get("직업기술서") or "").strip()
            if not (job_code and job_name and desc):
                continue
            writer.writerow(
                {
                    "job_code": job_code,
                    "job_name": job_name,
                    "risk_grade": risk,
                    "description": desc,
                }
            )
            count += 1
    return count


def build_synonyms(rows: List[Dict[str, str]]) -> Dict[str, List[str]]:
    by_job_name: Dict[str, List[str]] = {}

    for r in rows:
        job_name = normalize_text((r.get("직업명") or "").strip())
        if not job_name:
            continue

        terms = []
        terms.extend(_split_terms(r.get("직업명") or ""))
        terms.extend(_split_terms(r.get("예시") or ""))
        terms.extend(tokenize(r.get("직업명") or ""))
        terms = [t for t in terms if t and t != job_name and 2 <= len(t) <= 20]
        by_job_name[job_name] = _dedup_keep_order(terms, limit=24)

    return {k: v for k, v in by_job_name.items() if v}


def main() -> None:
    rows = _load_rows()
    job_count = build_jobs_csv(rows)
    synonyms = build_synonyms(rows)

    with SYNONYMS_JSON.open("w", encoding="utf-8") as f:
        json.dump(synonyms, f, ensure_ascii=False, indent=2)

    print(f"[OK] jobs.csv rows: {job_count}")
    print(f"[OK] synonyms keys: {len(synonyms)}")
    print(f"[OK] wrote: {JOBS_CSV}")
    print(f"[OK] wrote: {SYNONYMS_JSON}")


if __name__ == "__main__":
    main()
