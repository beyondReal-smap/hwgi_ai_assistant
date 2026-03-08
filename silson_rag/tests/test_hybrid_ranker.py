"""Tests for hybrid score merger."""
from silson_rag.src.engine.hybrid_ranker import merge_scores


class TestMergeScores:
    def test_keyword_only(self):
        kw = {0: 10.0, 1: 5.0, 2: 3.0}
        result = merge_scores(kw, {}, alpha=0.6)
        assert len(result) == 3
        # Should be sorted descending
        assert result[0][0] == 0
        assert result[1][0] == 1
        assert result[2][0] == 2

    def test_hybrid_merge(self):
        kw = {0: 10.0, 1: 5.0}
        emb = {1: 0.9, 2: 0.7}
        result = merge_scores(kw, emb, alpha=0.6)
        # All 3 indices should appear
        result_indices = {idx for idx, _ in result}
        assert result_indices == {0, 1, 2}

    def test_empty_scores(self):
        result = merge_scores({}, {})
        assert result == []

    def test_descending_order(self):
        kw = {0: 10.0, 1: 8.0, 2: 6.0}
        emb = {0: 0.3, 1: 0.6, 2: 0.9}
        result = merge_scores(kw, emb, alpha=0.5)
        scores = [s for _, s in result]
        assert scores == sorted(scores, reverse=True)
