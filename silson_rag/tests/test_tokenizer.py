"""Tests for silson_rag tokenizer."""
from silson_rag.src.engine.tokenizer import tokenize


class TestTokenize:
    def test_particle_removal(self):
        tokens = tokenize("병실료차액은")
        assert "병실료차액" in tokens

    def test_stopword_filtering(self):
        tokens = tokenize("실손의료비 보험 관련 기준은 무엇인가요")
        # Stopwords should be removed
        assert "실손의료비" not in tokens
        assert "보험" not in tokens

    def test_synonym_expansion(self):
        tokens = tokenize("자기부담금")
        assert "공제금액" in tokens
        assert "본인부담금" in tokens

    def test_compound_splitting(self):
        tokens = tokenize("상급병실차액")
        assert "상급" in tokens
        assert "병실" in tokens
        assert "차액" in tokens

    def test_short_tokens_filtered(self):
        tokens = tokenize("a b cd ef 가 나다")
        # Single chars should be filtered
        assert "a" not in tokens
        assert "가" not in tokens

    def test_empty_input(self):
        assert tokenize("") == []
        assert tokenize("   ") == []

    def test_mixed_content(self):
        tokens = tokenize("3세대 질병면책 정신질환")
        assert "3세대" in tokens
        assert "정신질환" in tokens
