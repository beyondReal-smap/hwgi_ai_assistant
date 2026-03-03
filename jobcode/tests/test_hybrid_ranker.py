from src.core.hybrid_ranker import merge_candidates


def test_merge_candidates_union_and_score():
    bm25 = [(0, 3.0, 1.0), (1, 2.0, 0.5)]
    embed = [(1, 0.9, 1.0), (2, 0.8, 0.8)]
    merged = merge_candidates(bm25, embed, alpha_bm25=0.7)

    assert len(merged) == 3
    top = merged[0]
    assert top.job_code in {"0", "1"}
    assert 0.0 <= top.final_score <= 1.0
