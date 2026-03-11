"""Agentic workflow for silson search."""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .customer_db import (
    detect_customer_names,
    detect_policy_numbers,
    detect_product_names,
    lookup_customer_context,
    lookup_customer_context_from_query,
    summarize_customer_context,
)
from .engine.filters import detect_filters, merge_filters
from .engine.followups import generate_followups
from .llm_answer import (
    _dedup_paragraphs,
    _source_labels,
    build_structured_answer,
    fallback_answer,
    generate_answer_local,
)
from .openai_client import openai_post_json
from .qa_store import is_qa_available, search_qa
from .types import CustomerContext, CustomerContract, FilterResult, QASearchHit, SearchHit, SearchResult

GENERATION_ENUM = ["1세대", "2세대", "3세대", "4세대", "기타실손"]
SOURCE_KIND_ENUM = ["coverage_criteria", "injury_exclusion", "disease_exclusion"]
MAX_TOOL_ROUNDS = 4

TOOL_DEFINITIONS: List[Dict[str, Any]] = [
    {
        "type": "function",
        "name": "search_qa_knowledge",
        "description": "전문가 Q&A 지식베이스에서 유사한 질문/답변을 검색한다. 실손 관련 질문이 있으면 약관 검색과 함께 호출한다.",
        "strict": True,
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "검색할 질문 텍스트",
                },
                "topk": {
                    "type": "integer",
                    "description": "반환할 결과 수 (기본 3)",
                },
            },
            "required": ["query", "topk"],
            "additionalProperties": False,
        },
    },
    {
        "type": "function",
        "name": "lookup_customer_contracts",
        "description": "고객명, 계약번호, 상품명, 가입연도로 실손 포함 계약 정보를 조회한다. 계약 맥락이 있으면 먼저 사용한다.",
        "strict": True,
        "parameters": {
            "type": "object",
            "properties": {
                "customer_name": {
                    "type": ["string", "null"],
                    "description": "질문에 나온 고객명",
                },
                "policy_no": {
                    "type": ["string", "null"],
                    "description": "질문에 나온 계약번호(예: LA2024...)",
                },
                "product_name": {
                    "type": ["string", "null"],
                    "description": "질문에 나온 상품명",
                },
                "join_year": {
                    "type": ["integer", "null"],
                    "description": "질문에서 특정된 가입연도(YYYY)",
                },
                "silson_only": {
                    "type": "boolean",
                    "description": "실손 계약만 우선 조회할지 여부",
                },
            },
            "required": ["customer_name", "policy_no", "product_name", "join_year", "silson_only"],
            "additionalProperties": False,
        },
    },
    {
        "type": "function",
        "name": "search_silson_evidence",
        "description": "실손 약관/조항 evidence를 검색한다. 최종 답변 전에 최소 1회 호출한다.",
        "strict": True,
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "원래 사용자 질문 또는 세대/보상유형이 반영된 검색 질의",
                },
                "generation": {
                    "type": ["string", "null"],
                    "enum": GENERATION_ENUM + [None],
                    "description": "세대가 확인되면 설정",
                },
                "source_kind": {
                    "type": ["string", "null"],
                    "enum": SOURCE_KIND_ENUM + [None],
                    "description": "보상기준 또는 면책 구분",
                },
                "join_ym": {
                    "type": ["integer", "null"],
                    "description": "가입 년월(YYYYMM)",
                },
                "topk": {
                    "type": "integer",
                    "description": "반환할 evidence 개수",
                },
            },
            "required": ["query", "generation", "source_kind", "join_ym", "topk"],
            "additionalProperties": False,
        },
    },
]

SYSTEM_PROMPT = (
    "당신은 실손의료비 상담 워크플로 에이전트다.\n"
    "반드시 도구 결과에 근거해서만 답변하라.\n"
    "규칙:\n"
    "1. 질문에 고객명, 계약번호, 상품명, 가입연도 등 계약 맥락이 있으면 lookup_customer_contracts를 먼저 호출한다.\n"
    "2. search_qa_knowledge로 전문가 Q&A를 검색하고, search_silson_evidence로 약관도 검색한다.\n"
    "3. 전문가 Q&A 결과가 있으면 우선 참고하되, 약관 조항과 교차 검증하라.\n"
    "4. 검색 결과가 없거나 고객 계약이 애매하면 추정하지 말고 부족한 정보를 짧게 설명한다.\n"
    "5. 최종 답변은 한국어로 작성하고, 반복 없이 간결하게 정리한다.\n"
    "6. 마지막 줄은 반드시 '참고:'로 시작하고 세대/상품명/조항명을 짧게 적는다.\n"
)


@dataclass
class WorkflowState:
    query: str
    topk: int
    candidate_customer_names: List[str] = field(default_factory=list)
    candidate_policy_numbers: List[str] = field(default_factory=list)
    candidate_product_names: List[str] = field(default_factory=list)
    question_filters: FilterResult = field(default_factory=FilterResult)
    resolved_filters: FilterResult = field(default_factory=FilterResult)
    customer_context: Optional[CustomerContext] = None
    selected_contract: Optional[CustomerContract] = None
    hits: List[SearchHit] = field(default_factory=list)
    qa_hits: List[QASearchHit] = field(default_factory=list)
    answer: str = ""
    retrieval_mode: str = "silson_rag_clauses"
    llm_status: str = "disabled"
    tools_used: List[str] = field(default_factory=list)


def _filter_dict(filters: FilterResult) -> Dict[str, Any]:
    return {
        "generation": filters.generation,
        "source_kind": filters.source_kind,
        "join_ym": filters.join_ym,
    }


def _serialize_hits(hits: List[SearchHit]) -> List[Dict[str, Any]]:
    return [
        {
            "doc_id": hit.doc_id,
            "source_kind": hit.source_kind,
            "source_label": hit.source_label,
            "generation": hit.generation,
            "product_alias": hit.product_alias,
            "sales_period": hit.sales_period,
            "coverage_name": hit.coverage_name,
            "clause_name": hit.clause_name,
            "clause_text_oneline": hit.clause_text_oneline,
            "source_file": hit.source_file,
            "filename": hit.filename,
            "score": hit.score,
            "document_excerpt": hit.document_excerpt,
        }
        for hit in hits
    ]


def _select_contract(context: Optional[CustomerContext], filters: FilterResult) -> Optional[CustomerContract]:
    if context is None:
        return None

    contracts = context.silson_contracts or context.contracts
    if not contracts:
        return None

    candidates = contracts
    if filters.generation:
        filtered = [contract for contract in candidates if contract.generation == filters.generation]
        if filtered:
            candidates = filtered
    if filters.join_ym:
        exact = [contract for contract in candidates if contract.join_ym == filters.join_ym]
        if exact:
            candidates = exact
        else:
            same_year = [
                contract
                for contract in candidates
                if contract.join_ym and contract.join_ym // 100 == filters.join_ym // 100
            ]
            if same_year:
                candidates = same_year

    return sorted(candidates, key=lambda item: (-(item.join_ym or 0), item.policy_no))[0]


def _contract_filters(contract: Optional[CustomerContract]) -> FilterResult:
    if contract is None:
        return FilterResult()
    return FilterResult(
        generation=contract.generation,
        join_ym=contract.join_ym,
    )


def _customer_context_note(state: WorkflowState) -> str:
    if state.customer_context is None or state.selected_contract is None:
        return ""
    if not state.candidate_customer_names and not state.candidate_policy_numbers:
        return ""

    contract = state.selected_contract
    subject = f"{state.customer_context.customer_name} 고객의"
    if state.candidate_policy_numbers:
        subject = f"계약 `{state.candidate_policy_numbers[0]}`의"
    note = f"고객 계약 확인: {subject} {contract.join_date[:10]} 가입 `{contract.product_name}`"
    if contract.generation:
        note += f" ({contract.generation})"
    if state.customer_context.silson_contracts and len(state.customer_context.silson_contracts) > 1:
        note += " 기준으로 우선 조회했습니다. 동일 고객의 실손 계약이 여러 건 있어 가장 가까운 계약을 사용했습니다."
    else:
        note += " 기준으로 조회했습니다."
    return note


def _with_customer_context(answer: str, state: WorkflowState) -> str:
    note = _customer_context_note(state)
    if not note:
        return answer
    if note in answer:
        return answer
    return f"{note}\n\n{answer}".strip()


def _ensure_reference_line(answer: str, state: WorkflowState) -> str:
    if "참고:" in answer or not state.hits:
        return answer
    refs = ", ".join(_source_labels(state.hits)[:3])
    if not refs:
        return answer
    return f"{answer}\n\n참고: {refs}".strip()


def _build_user_prompt(state: WorkflowState) -> str:
    filters = _filter_dict(state.question_filters)
    lines = [f"질문: {state.query}"]
    if state.candidate_customer_names:
        lines.append(f"질문에서 감지한 고객명 후보: {', '.join(state.candidate_customer_names)}")
    if state.candidate_policy_numbers:
        lines.append(f"질문에서 감지한 계약번호 후보: {', '.join(state.candidate_policy_numbers)}")
    if state.candidate_product_names:
        lines.append(f"질문에서 감지한 상품명 후보: {', '.join(state.candidate_product_names)}")
    lines.append(f"초기 필터: {json.dumps(filters, ensure_ascii=False)}")
    lines.append("도구 결과만 근거로 답변하라.")
    return "\n".join(lines)


def _extract_response_output_text(data: Dict[str, Any]) -> str:
    output_text = data.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    chunks: List[str] = []
    for item in data.get("output", []):
        if not isinstance(item, dict) or item.get("type") != "message":
            continue
        for content in item.get("content", []):
            if isinstance(content, dict) and isinstance(content.get("text"), str):
                chunks.append(content["text"].strip())
    return "\n".join(chunk for chunk in chunks if chunk).strip()


def _extract_function_calls(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    calls: List[Dict[str, Any]] = []
    for item in data.get("output", []):
        if isinstance(item, dict) and item.get("type") == "function_call":
            calls.append(item)
    return calls


def _execute_tool(name: str, arguments: Dict[str, Any], state: WorkflowState) -> Dict[str, Any]:
    if name == "search_qa_knowledge":
        query = str(arguments.get("query") or state.query)
        topk = int(arguments.get("topk") or 3)
        qa_hits = search_qa(query, topk=topk)
        state.qa_hits = qa_hits
        if "qa_search" not in state.tools_used:
            state.tools_used.append("qa_search")
        return {
            "qa_hits": [
                {
                    "chunk_id": h.chunk_id,
                    "type": h.chunk_type,
                    "question": h.question[:200],
                    "answer": h.answer[:500],
                    "score": round(h.score, 4),
                    "source": h.source,
                }
                for h in qa_hits
            ],
        }

    if name == "lookup_customer_contracts":
        customer_name = str(arguments.get("customer_name") or "").strip()
        policy_no = str(arguments.get("policy_no") or "").strip()
        product_name = str(arguments.get("product_name") or "").strip()
        join_year = arguments.get("join_year")
        silson_only = bool(arguments.get("silson_only", True))
        context = lookup_customer_context(
            customer_name,
            policy_no=policy_no,
            product_name=product_name,
            join_year=int(join_year) if join_year not in ("", None) else None,
            silson_only=silson_only,
        )
        state.customer_context = context
        state.selected_contract = _select_contract(context, state.resolved_filters)
        state.resolved_filters = merge_filters(state.resolved_filters, _contract_filters(state.selected_contract))
        if "db_query" not in state.tools_used:
            state.tools_used.append("db_query")
        return summarize_customer_context(context)

    if name == "search_silson_evidence":
        from .api import retrieve_hits

        tool_filters = FilterResult(
            generation=arguments.get("generation"),
            source_kind=arguments.get("source_kind"),
            join_ym=arguments.get("join_ym"),
        )
        merged_filters = merge_filters(tool_filters, state.resolved_filters)
        query = str(arguments.get("query") or state.query)
        topk = int(arguments.get("topk") or state.topk)
        hits, retrieval_mode, llm_status = retrieve_hits(query, topk=topk, filters=merged_filters)
        state.resolved_filters = merged_filters
        state.hits = hits
        state.retrieval_mode = retrieval_mode
        state.llm_status = llm_status
        marker = "vector_search" if retrieval_mode == "openai_vector_store" else "local_search"
        if marker not in state.tools_used:
            state.tools_used.append(marker)
        return {
            "filters": _filter_dict(merged_filters),
            "retrieval_mode": retrieval_mode,
            "hits": _serialize_hits(hits),
        }

    raise ValueError(f"unknown tool: {name}")


def _build_result(state: WorkflowState) -> SearchResult:
    follow_ups = generate_followups(state.query, state.hits, _filter_dict(state.resolved_filters))
    return SearchResult(
        query=state.query,
        answer=state.answer,
        sources=_source_labels(state.hits),
        chunks=_serialize_hits(state.hits),
        mode={
            "retrieval": state.retrieval_mode,
            "llm_status": state.llm_status,
            "workflow": "agentic",
            "tools_used": ",".join(state.tools_used),
        },
        filters=_filter_dict(state.resolved_filters),
        follow_ups=follow_ups,
        structured_answer=build_structured_answer(state.query, state.hits, state.answer),
    )


def _run_deterministic(state: WorkflowState) -> SearchResult:
    from .api import retrieve_hits

    state.customer_context = state.customer_context or lookup_customer_context_from_query(state.query)
    state.selected_contract = _select_contract(state.customer_context, state.question_filters)
    state.resolved_filters = merge_filters(state.question_filters, _contract_filters(state.selected_contract))

    if state.customer_context is not None and "db_query" not in state.tools_used:
        state.tools_used.append("db_query")

    state.hits, state.retrieval_mode, state.llm_status = retrieve_hits(
        state.query,
        topk=state.topk,
        filters=state.resolved_filters,
    )
    marker = "vector_search" if state.retrieval_mode == "openai_vector_store" else "local_search"
    if marker not in state.tools_used:
        state.tools_used.append(marker)

    # QA knowledge base search
    if not state.qa_hits and is_qa_available():
        state.qa_hits = search_qa(state.query, topk=3)
        if state.qa_hits and "qa_search" not in state.tools_used:
            state.tools_used.append("qa_search")

    answer = generate_answer_local(state.query, state.hits, qa_hits=state.qa_hits)
    if not answer:
        answer = fallback_answer(state.query, state.hits)
    state.answer = _ensure_reference_line(_with_customer_context(_dedup_paragraphs(answer), state), state)
    state.llm_status = "deterministic_fallback" if state.llm_status == "disabled" else state.llm_status
    return _build_result(state)


def run_silson_search_workflow(query: str, topk: int = 5) -> SearchResult:
    state = WorkflowState(
        query=query,
        topk=max(1, topk),
        candidate_customer_names=detect_customer_names(query),
        candidate_policy_numbers=detect_policy_numbers(query),
        candidate_product_names=detect_product_names(query),
        question_filters=detect_filters(query),
        resolved_filters=detect_filters(query),
    )

    from .config import CFG

    if not CFG.openai_api_key.strip():
        return _run_deterministic(state)

    try:
        response = openai_post_json(
            "/responses",
            {
                "model": CFG.silson_openai_model,
                "input": [
                    {
                        "role": "system",
                        "content": [{"type": "input_text", "text": SYSTEM_PROMPT}],
                    },
                    {
                        "role": "user",
                        "content": [{"type": "input_text", "text": _build_user_prompt(state)}],
                    },
                ],
                "tools": TOOL_DEFINITIONS,
            },
        )
        state.llm_status = "responses_api_tools"

        for _ in range(MAX_TOOL_ROUNDS):
            function_calls = _extract_function_calls(response)
            if not function_calls:
                state.answer = _extract_response_output_text(response)
                break

            tool_outputs: List[Dict[str, Any]] = []
            for call in function_calls:
                raw_arguments = call.get("arguments") or "{}"
                arguments = json.loads(raw_arguments)
                result = _execute_tool(str(call.get("name")), arguments, state)
                tool_outputs.append(
                    {
                        "type": "function_call_output",
                        "call_id": call.get("call_id"),
                        "output": json.dumps(result, ensure_ascii=False),
                    }
                )

            response = openai_post_json(
                "/responses",
                {
                    "model": CFG.silson_openai_model,
                    "previous_response_id": response.get("id"),
                    "input": tool_outputs,
                    "tools": TOOL_DEFINITIONS,
                },
            )

        if not state.hits:
            return _run_deterministic(state)

        if not state.answer:
            state.answer = generate_answer_local(state.query, state.hits, qa_hits=state.qa_hits)

        if not state.answer:
            state.answer = fallback_answer(state.query, state.hits)

        state.answer = _ensure_reference_line(_with_customer_context(_dedup_paragraphs(state.answer), state), state)
        return _build_result(state)
    except Exception:
        return _run_deterministic(state)
