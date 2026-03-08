from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

_JOBCODE_SRC = str(Path(__file__).resolve().parents[1] / "jobcode" / "src")
if _JOBCODE_SRC not in sys.path:
    sys.path.insert(0, _JOBCODE_SRC)

from core.silson_common import (  # noqa: E402
    detect_generation,
    detect_join_ym,
    tokenize,
)

DATA_PATH = './실손의료비_search_ready_clauses.csv'


def search(question: str, top_k: int = 10):
    df = pd.read_csv(DATA_PATH)
    generation = detect_generation(question)
    if generation:
        df = df[df['generation'] == generation]
    join_ym = detect_join_ym(question)
    if join_ym:
        cond_start = df['sales_start_ym'].isna() | (df['sales_start_ym'] <= join_ym)
        cond_end = df['is_current'].astype(str).str.lower().eq('true') | df['sales_end_ym'].isna() | (df['sales_end_ym'] >= join_ym)
        df = df[cond_start & cond_end]

    q_tokens = tokenize(question)
    def score(row):
        text = f"{row['clause_name']} {row['coverage_name']} {row['product_alias']} {row['source_label']} {row['keywords']} {row['clause_text_oneline']}"
        text_low = str(text).lower()
        s = 0
        for tok in q_tokens:
            if tok.lower() in text_low:
                s += 1
        return s

    df = df.copy()
    df['score'] = df.apply(score, axis=1)
    df = df[df['score'] > 0].sort_values(['score'], ascending=False)
    cols = ['score', 'source_label', 'generation', 'product_alias', 'coverage_name', 'clause_name', 'clause_text_oneline', 'doc_id']
    return df[cols].head(top_k)


if __name__ == '__main__':
    question = ' '.join(sys.argv[1:]).strip()
    if not question:
        print('usage: python local_preview_search.py "2018년에 가입한 착한실손에서 병실료차액은?"')
        raise SystemExit(1)
    result = search(question)
    if result.empty:
        print('No result')
    else:
        print(result.to_string(index=False))
