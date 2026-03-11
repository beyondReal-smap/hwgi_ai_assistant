from silson_rag.src.llm_answer import build_structured_answer
from silson_rag.src.types import SearchHit


def test_build_structured_answer_falls_back_without_formatter():
    hits = [
        SearchHit(
            doc_id="doc-1",
            source_kind="coverage_criteria",
            source_label="담보별 보상기준",
            generation="4세대",
            product_alias="기본형",
            sales_period="202107~현재",
            coverage_name="치과 치료",
            clause_name="치과 치료 보상 기준",
            clause_text_oneline="급여 치료 여부와 치료 목적을 먼저 확인합니다.",
            source_file="doc-1.md",
            filename="doc-1.md",
            score=0.91,
            document_excerpt="급여 치료 여부와 치료 목적을 먼저 확인합니다.",
        )
    ]

    structured = build_structured_answer(
        "4세대 치과 치료 보상되나요?",
        hits,
        (
            "고객 계약 확인: 박명숙 고객의 2022-08-01 가입 `한화 실손의료비보험` (4세대) 기준으로 조회했습니다.\n\n"
            "치과 치료는 급여 여부와 치료 목적에 따라 보상 여부가 달라질 수 있습니다.\n"
            "- 급여 치료 여부를 먼저 확인해 주세요.\n"
            "- 미용 목적 치료는 보상이 제한될 수 있습니다.\n\n"
            "참고: 4세대 | 기본형 | 치과 치료 보상 기준"
        ),
    )

    assert structured.summary
    assert structured.summary.startswith(("✅", "⚠️"))
    assert "고객 계약 확인:" in structured.context_note
    assert structured.coverage_points
    assert structured.reference_note.startswith("참고:")
