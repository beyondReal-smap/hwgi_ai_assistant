from src.core.text_norm import expand_query_tokens, normalize_text, tokenize


def test_normalize_text_basic():
    assert normalize_text("Hello, 보험!!  설계사") == "hello 보험 설계사"


def test_tokenize_removes_short_and_stopwords():
    toks = tokenize("사무 에서 문서 를 작성")
    assert "에서" not in toks
    assert "를" not in toks


def test_expand_query_tokens_adds_only():
    expanded = expand_query_tokens(["배달"], {"배달": ["오토바이", "라이더"]})
    assert "배달" in expanded
    assert "오토바이" in expanded
