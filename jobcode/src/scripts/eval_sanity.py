from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT / "src") not in sys.path:
    sys.path.insert(0, str(ROOT / "src"))

from core.bm25_engine import BM25Engine
from core.config import SETTINGS
from core.data_loader import dataframe_hash, load_jobs, to_records
from core.embed_engine import EmbedEngine
from core.hybrid_ranker import merge_candidates
from core.text_norm import load_synonyms


def main() -> None:
    queries = [
        "사무실에서 엑셀 문서 작업 위주",
        "현장에서 금속 용접 작업",
        "오토바이로 음식 배달",
        "전화로 고객 응대하는 상담 업무",
        "건설 고소 작업과 중장비 주변 근무",
    ]

    synonyms = load_synonyms(ROOT / "data" / "synonyms.json")
    df = load_jobs(synonyms=synonyms)
    records = to_records(df)

    bm25 = BM25Engine(records=records, synonyms=synonyms)
    emb = EmbedEngine(records=records, model_name=SETTINGS.embed_model_name, data_hash=dataframe_hash(df))

    print(f"mode: {'Hybrid' if emb.status.enabled else 'BM25-only'}")
    for q in queries:
        bm = bm25.search(q, topk=10)
        em = emb.search(q, topk=10) if emb.status.enabled else []
        merged = merge_candidates(bm, em, alpha_bm25=SETTINGS.alpha_bm25)
        top = merged[:3]
        print(f"\nQ: {q}")
        for rank, c in enumerate(top, start=1):
            row = df.iloc[int(c.job_code)]
            print(f"  Top{rank}: {row['job_code']} {row['job_name']} ({row['risk_grade']}) score={c.final_score:.4f}")


if __name__ == "__main__":
    main()
