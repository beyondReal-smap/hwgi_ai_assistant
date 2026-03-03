from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path
from typing import List, Tuple

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT / "src") not in sys.path:
    sys.path.insert(0, str(ROOT / "src"))

from core.bm25_engine import BM25Engine
from core.config import SETTINGS
from core.data_loader import dataframe_hash, load_jobs, to_records
from core.embed_engine import EmbedEngine
from core.hybrid_ranker import merge_candidates
from core.text_norm import load_synonyms


def load_eval_pairs(path: Path) -> List[Tuple[str, str]]:
    pairs: List[Tuple[str, str]] = []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            query = (row.get("query") or "").strip()
            answer = (row.get("answer_code") or "").strip()
            if query and answer:
                pairs.append((query, answer))
    return pairs


def calc_metrics(pairs: List[Tuple[str, str]], rank_lists: List[List[str]]) -> Tuple[float, float, float]:
    hit1 = 0
    hit3 = 0
    mrr = 0.0
    total = max(len(pairs), 1)
    for (_, ans), ranked in zip(pairs, rank_lists):
        if ranked and ranked[0] == ans:
            hit1 += 1
        if ans in ranked[:3]:
            hit3 += 1
        if ans in ranked:
            mrr += 1.0 / (ranked.index(ans) + 1)
    return hit1 / total, hit3 / total, mrr / total


def main() -> None:
    parser = argparse.ArgumentParser(description="Tune alpha for BM25+Embedding hybrid ranking")
    parser.add_argument("--eval-csv", default=str(ROOT / "data" / "eval_queries.csv"))
    parser.add_argument("--alpha-start", type=float, default=0.0)
    parser.add_argument("--alpha-end", type=float, default=1.0)
    parser.add_argument("--alpha-step", type=float, default=0.05)
    parser.add_argument("--topk", type=int, default=30)
    args = parser.parse_args()

    eval_path = Path(args.eval_csv)
    pairs = load_eval_pairs(eval_path)
    if not pairs:
        raise ValueError(f"no eval rows in {eval_path}")

    synonyms = load_synonyms(ROOT / "data" / "synonyms.json")
    df = load_jobs(synonyms=synonyms)
    records = to_records(df)

    bm25 = BM25Engine(records=records, synonyms=synonyms)
    emb = EmbedEngine(records=records, model_name=SETTINGS.embed_model_name, data_hash=dataframe_hash(df))

    print(f"[mode] embed_status={emb.status.reason}")
    print(f"[eval] samples={len(pairs)}")

    code_by_idx = {i: c for i, c in enumerate(df["job_code"].tolist())}

    best = None
    alpha = args.alpha_start
    while alpha <= args.alpha_end + 1e-9:
        rank_lists: List[List[str]] = []
        for q, _ in pairs:
            bm_hits = bm25.search(q, topk=max(args.topk, SETTINGS.topk_bm25))
            em_hits = emb.search(q, topk=max(args.topk, SETTINGS.topk_embed)) if emb.status.enabled else []
            merged = merge_candidates(bm_hits, em_hits, alpha_bm25=alpha)
            top = merged[: args.topk]
            rank_lists.append([code_by_idx[int(c.job_code)] for c in top])

        h1, h3, mrr = calc_metrics(pairs, rank_lists)
        print(f"alpha={alpha:.2f}  hit@1={h1:.3f}  hit@3={h3:.3f}  mrr={mrr:.3f}")
        score = (h1, h3, mrr)
        if best is None or score > best[1]:
            best = (alpha, score)
        alpha += args.alpha_step

    assert best is not None
    print(
        f"[best] alpha={best[0]:.2f}  hit@1={best[1][0]:.3f}  hit@3={best[1][1]:.3f}  mrr={best[1][2]:.3f}"
    )


if __name__ == "__main__":
    main()
