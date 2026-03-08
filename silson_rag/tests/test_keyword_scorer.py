"""Tests for BM25 keyword scorer."""
from silson_rag.src.engine.keyword_scorer import KeywordScorer
from silson_rag.src.engine.tokenizer import tokenize


class TestKeywordScorer:
    def setup_method(self):
        self.corpus = [
            "1세대 구계약 일반상해의료비 가입한도 보상기준",
            "3세대 착한실손 병실료차액 상급병실 보상기준",
            "4세대 질병의료비 면책사항 정신질환 보상제외",
            "2세대 표준화 실손 공제금액 자기부담금 기준",
        ]
        self.field_texts = {
            "clause_name": ["가입한도", "병실료차액", "면책사항", "자기부담금"],
            "coverage_name": ["일반상해의료비", "상급병실", "질병의료비", "통원의료비"],
        }
        self.scorer = KeywordScorer(self.corpus, self.field_texts)

    def test_basic_scoring(self):
        tokens = tokenize("병실료차액")
        scores = self.scorer.score(tokens)
        assert len(scores) > 0
        # Index 1 should score highest (contains 병실료차액)
        assert 1 in scores
        assert scores[1] == max(scores.values())

    def test_field_weight_bonus(self):
        tokens = tokenize("자기부담금")
        scores = self.scorer.score(tokens)
        # Index 3 has 자기부담금 in both corpus and clause_name -> high score
        assert 3 in scores

    def test_valid_indices_filter(self):
        tokens = tokenize("병실료차액")
        scores = self.scorer.score(tokens, valid_indices={0, 2})
        # Index 1 should be excluded
        assert 1 not in scores

    def test_empty_query(self):
        scores = self.scorer.score([])
        assert scores == {}
