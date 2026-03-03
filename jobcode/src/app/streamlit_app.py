from __future__ import annotations

import sys
from pathlib import Path
from typing import Dict, List

import pandas as pd
import streamlit as st

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT / "src") not in sys.path:
    sys.path.insert(0, str(ROOT / "src"))

from core.bm25_engine import BM25Engine
from core.config import SETTINGS
from core.cross_encoder import CrossEncoderReranker
from core.data_loader import dataframe_hash, load_jobs, to_records
from core.embed_engine import EmbedEngine
from core.evidence import highlight_text, select_evidence_sentences
from core.hybrid_ranker import merge_candidates
from core.text_norm import load_synonyms, normalize_text, tokenize


if hasattr(st, "cache_resource"):
    cache_resource = st.cache_resource
else:
    def cache_resource(**kwargs):
        kwargs.pop("show_spinner", None)
        return st.cache(allow_output_mutation=True)


def ui_toggle(label: str, value: bool) -> bool:
    if hasattr(st, "toggle"):
        return st.toggle(label, value=value)
    return st.checkbox(label, value=value)


def clear_build_engines_cache() -> None:
    if hasattr(build_engines, "clear"):
        build_engines.clear()
    elif hasattr(st, "legacy_caching"):
        st.legacy_caching.clear_cache()


def show_dataframe(df: pd.DataFrame) -> None:
    try:
        st.dataframe(df, use_container_width=True)
    except TypeError:
        st.dataframe(df)


def pick_highlight_keywords(query: str, description: str, evidence_hits: List[str]) -> List[str]:
    norm_desc = normalize_text(description)
    q_tokens = [t for t in tokenize(query) if len(t) >= 2]
    q_hits = [t for t in q_tokens if t in norm_desc]
    merged = sorted(set(evidence_hits + q_hits), key=len, reverse=True)
    return merged[:12]


def rerank_with_overlap(union_rows: List[Dict], query: str) -> List[Dict]:
    q_tokens = set(tokenize(query))
    if not q_tokens:
        return union_rows

    reranked: List[Dict] = []
    for row in union_rows:
        doc_tokens = set(tokenize(f"{row['job_name']} {row['description']}"))
        overlap = len(q_tokens.intersection(doc_tokens)) / max(len(q_tokens), 1)
        rerank_score = 0.75 * float(row["final_score"]) + 0.25 * overlap
        item = dict(row)
        item["overlap_score"] = overlap
        item["rerank_score"] = rerank_score
        reranked.append(item)

    reranked.sort(key=lambda x: x["rerank_score"], reverse=True)
    return reranked


@cache_resource(show_spinner=False)
def build_engines(rebuild: bool = False):
    synonyms = load_synonyms(Path(ROOT / "data" / "synonyms.json"))
    df = load_jobs(synonyms=synonyms)
    records = to_records(df)
    bm25 = BM25Engine(records=records, synonyms=synonyms)
    if rebuild:
        bm25.rebuild_tokens()

    emb = EmbedEngine(records=records, model_name=SETTINGS.embed_model_name, data_hash=dataframe_hash(df))
    if rebuild and emb.status.enabled:
        emb.rebuild()

    ce = CrossEncoderReranker(SETTINGS.cross_encoder_model_name)

    return df, records, bm25, emb, ce


def _build_candidate_rows(df: pd.DataFrame, merged) -> List[Dict]:
    rows = []
    for c in merged:
        idx = int(c.job_code)
        job = df.iloc[idx]
        rows.append(
            {
                "idx": idx,
                "job_code": job["job_code"],
                "job_name": job["job_name"],
                "risk_grade": job["risk_grade"],
                "description": job["description"],
                "bm25_score": c.bm25_score,
                "embed_score": c.embed_score,
                "bm25_score_norm": c.bm25_score_norm,
                "embed_score_norm": c.embed_score_norm,
                "final_score": c.final_score,
            }
        )
    return rows


def run_search(
    query: str,
    use_hybrid: bool,
    use_cross_encoder: bool,
    show_highlight: bool,
    score_threshold: float,
    alpha_bm25: float,
    topk_bm25: int,
    topk_embed: int,
    topk_result: int,
):
    df, _, bm25, emb, ce = build_engines(rebuild=False)

    bm25_hits = bm25.search(query, topk=topk_bm25)
    embed_hits = []
    hybrid_enabled = use_hybrid and emb.status.enabled
    if hybrid_enabled:
        embed_hits = emb.search(query, topk=topk_embed)

    merged = merge_candidates(
        bm25_hits=bm25_hits,
        embed_hits=embed_hits,
        alpha_bm25=alpha_bm25,
    )

    bm25_rows = _build_candidate_rows(df, merge_candidates(bm25_hits, [], alpha_bm25))
    embed_rows = _build_candidate_rows(df, merge_candidates([], embed_hits, alpha_bm25))
    union_rows = _build_candidate_rows(df, merged)
    union_rows = rerank_with_overlap(union_rows, query)
    ce_enabled = use_cross_encoder and ce.status.enabled
    if ce_enabled:
        union_rows = ce.rerank(query, union_rows, topk=min(topk_bm25, 50))

    mode = {
        "retrieval": "Hybrid(BM25+Embedding)" if hybrid_enabled else "BM25-only",
        "rerank": "cross-encoder" if ce_enabled else "rule-only",
        "embed_status": emb.status.reason,
        "ce_status": ce.status.reason,
    }
    print(
        f"[MODE] retrieval={mode['retrieval']} rerank={mode['rerank']} "
        f"embed_status={mode['embed_status']} ce_status={mode['ce_status']}"
    )

    topn = max(1, int(topk_result))
    top3 = union_rows[:topn]

    score_threshold = float(score_threshold)
    filtered_out_count = 0
    recs = []
    score_key = "final_score" if ce_enabled else "rerank_score"
    for row in top3:
        row_score = float(row.get(score_key, row.get("final_score", 0.0)))
        if row_score < score_threshold:
            filtered_out_count += 1
            continue
        evidence, hits = select_evidence_sentences(query, row["description"], max_sentences=2)
        highlight_keywords = pick_highlight_keywords(query, row["description"], hits)
        highlighted = highlight_text(row["description"], highlight_keywords) if show_highlight else row["description"]
        if ce_enabled:
            reason = "Cross-Encoder 재랭크와 하이브리드 점수를 함께 반영했습니다."
        else:
            reason = "규칙 기반: BM25/임베딩 점수와 키워드 중첩이 높습니다."
        recs.append(
            {
                "rank": len(recs) + 1,
                "job_code": row["job_code"],
                "job_name": row["job_name"],
                "risk_grade": row["risk_grade"],
                "final_score": row_score,
                "reason": reason,
                "evidence": evidence,
                "hits": highlight_keywords,
                "highlighted_description": highlighted,
                "raw_description": row["description"],
            }
        )

    return {
        "bm25_rows": bm25_rows,
        "embed_rows": embed_rows,
        "union_rows": union_rows,
        "recs": recs,
        "mode": mode,
        "score_threshold": score_threshold,
        "alpha_bm25": alpha_bm25,
        "topk_bm25": topk_bm25,
        "topk_embed": topk_embed,
        "topk_result": topn,
        "filtered_out_count": filtered_out_count,
        "prefilter_count": len(top3),
    }


def main() -> None:
    st.set_page_config(page_title="보험 직업코드 추천 데모", layout="wide")
    st.markdown(
        """
        <style>
          mark.kw-hit {
            background: #ffeb3b;
            color: #111;
            font-weight: 700;
            padding: 0 2px;
            border-radius: 3px;
          }
        </style>
        """,
        unsafe_allow_html=True,
    )

    st.title("보험업권 직업코드 추천 데모 (MVP)")
    st.caption("자연어 직업 설명을 입력하면 직업코드 Top3 추천 + 근거 문장을 제공합니다.")

    col_left, col_right = st.columns([1.05, 1.0])

    with col_left:
        st.subheader("입력 / 설정")
        default_query = "보험회사 지점에서 영업조직 운영 계획을 세우고 팀장 인력 관리를 담당하는 내근 관리자입니다."
        if "query" not in st.session_state:
            st.session_state.query = default_query
        if "alpha_bm25" not in st.session_state:
            st.session_state.alpha_bm25 = float(SETTINGS.alpha_bm25)
        if "topk_bm25" not in st.session_state:
            st.session_state.topk_bm25 = int(SETTINGS.topk_bm25)
        if "topk_embed" not in st.session_state:
            st.session_state.topk_embed = int(SETTINGS.topk_embed)
        if "topk_result" not in st.session_state:
            st.session_state.topk_result = 3

        query = st.text_area("고객 직업 설명", value=st.session_state.query, height=140)
        st.session_state.query = query

        if st.button("후보 검색 및 추천"):
            if not query.strip():
                st.warning("직업 설명을 입력해 주세요.")
            else:
                with st.spinner("검색 및 추천 수행 중..."):
                    if st.session_state.get("rebuild_pending", False):
                        clear_build_engines_cache()
                        build_engines(rebuild=True)
                        clear_build_engines_cache()
                        st.session_state.rebuild_pending = False
                    st.session_state.result = run_search(
                        query,
                        st.session_state.get("use_hybrid", SETTINGS.use_hybrid_default),
                        st.session_state.get("use_cross_encoder", SETTINGS.use_cross_encoder_default),
                        st.session_state.get("show_highlight", True),
                        st.session_state.get("score_threshold", float(SETTINGS.min_score_to_show)),
                        st.session_state.get("alpha_bm25", float(SETTINGS.alpha_bm25)),
                        int(st.session_state.get("topk_bm25", SETTINGS.topk_bm25)),
                        int(st.session_state.get("topk_embed", SETTINGS.topk_embed)),
                        int(st.session_state.get("topk_result", 3)),
                    )

        with st.expander("예시 입력", expanded=False):
            examples = {
                "보험 관리자": "보험회사 지점에서 영업조직 운영 계획을 세우고 팀장 인력 관리를 담당하는 내근 관리자입니다.",
                "5급 공무원(내근)": "시청에서 도시계획 정책 검토와 행정문서 결재를 담당하는 5급 이상 공무원이며 현장업무는 거의 없습니다.",
                "대출/추심 관리자": "대부업체에서 대출알선과 채권추심 부서 운영 및 관리 업무를 담당합니다.",
            }
            picked = st.selectbox("예시 선택", list(examples.keys()))
            if st.button("예시 적용"):
                st.session_state.query = examples[picked]
                st.experimental_rerun()

        with st.expander("고급 설정", expanded=False):
            st.session_state.use_hybrid = ui_toggle("하이브리드 사용(BM25+Embedding)", value=SETTINGS.use_hybrid_default)
            st.session_state.use_cross_encoder = ui_toggle(
                "Cross-Encoder 재랭크", value=SETTINGS.use_cross_encoder_default
            )
            st.session_state.show_highlight = ui_toggle("하이라이트 표시", value=True)
            st.session_state.score_threshold = st.slider(
                "최소 표시 점수",
                min_value=0.0,
                max_value=1.0,
                value=float(st.session_state.get("score_threshold", SETTINGS.min_score_to_show)),
                step=0.05,
            )
            st.session_state.alpha_bm25 = st.slider(
                "BM25 가중치(alpha)",
                min_value=0.0,
                max_value=1.0,
                value=float(st.session_state.get("alpha_bm25", SETTINGS.alpha_bm25)),
                step=0.05,
            )
            st.session_state.topk_bm25 = st.slider(
                "BM25 후보 수(TOPK)",
                min_value=20,
                max_value=300,
                value=int(st.session_state.get("topk_bm25", SETTINGS.topk_bm25)),
                step=10,
            )
            st.session_state.topk_embed = st.slider(
                "Embedding 후보 수(TOPK)",
                min_value=20,
                max_value=300,
                value=int(st.session_state.get("topk_embed", SETTINGS.topk_embed)),
                step=10,
            )
            st.session_state.topk_result = st.slider(
                "최종 추천 개수(TOPK)",
                min_value=1,
                max_value=10,
                value=int(st.session_state.get("topk_result", 3)),
                step=1,
            )
            st.session_state.rebuild_pending = st.checkbox("인덱스 강제 재빌드", value=False)

        result = st.session_state.get("result")
        if result:
            mode = result["mode"]
            st.info(
                f"현재 모드: {mode['retrieval']} | Rerank: {mode['rerank']} | "
                f"Embed: {mode['embed_status']} | CE: {mode['ce_status']}"
            )

            tabs = st.tabs(["BM25 후보", "Embedding 후보", "Union 후보(최종점수)"])
            with tabs[0]:
                show_dataframe(pd.DataFrame(result["bm25_rows"]).head(int(result.get("topk_bm25", SETTINGS.topk_bm25))))
            with tabs[1]:
                show_dataframe(pd.DataFrame(result["embed_rows"]).head(int(result.get("topk_embed", SETTINGS.topk_embed))))
            with tabs[2]:
                show_dataframe(pd.DataFrame(result["union_rows"]).head(30))

    with col_right:
        result = st.session_state.get("result")
        if not result or not result["recs"]:
            st.subheader("추천 Top3")
            st.write("추천 결과가 없습니다. 왼쪽에서 질의를 입력하고 실행해 주세요.")
            st.subheader("상세 뷰어")
            st.write("검색 결과가 없습니다. 왼쪽에서 질의를 입력하고 실행해 주세요.")
        else:
            st.subheader(f"추천 Top{int(result.get('topk_result', 3))}")
            st.caption(
                f"설명: alpha(BM25)={result['alpha_bm25']:.2f}, 임계치={result['score_threshold']:.2f}. "
                f"최종점수 임계치 미만 후보는 표시에서 제외합니다."
            )
            if result["filtered_out_count"] > 0:
                st.info(
                    f"상위 후보 {result['prefilter_count']}개 중 {result['filtered_out_count']}개가 점수 기준 미달로 제외되었습니다."
                )
            for rec in result["recs"]:
                st.markdown(
                    f"**Top{rec['rank']}** `{rec['job_code']}` {rec['job_name']} | 위험등급: `{rec['risk_grade']}` | 점수: `{rec['final_score']:.4f}`"
                )

            st.subheader("상세 뷰어")
            tabs = st.tabs([f"Top{i}" for i in range(1, len(result["recs"]) + 1)])
            for tab, rec in zip(tabs, result["recs"]):
                with tab:
                    st.markdown(f"### `{rec['job_code']}` {rec['job_name']}")
                    st.write(f"위험등급: `{rec['risk_grade']}`")
                    st.write(f"추천 이유: {rec['reason']}")
                    st.write("Evidence")
                    for sent in rec["evidence"]:
                        st.markdown(f"- {highlight_text(sent, rec['hits'])}", unsafe_allow_html=True)
                    st.write("키워드")
                    st.write(", ".join(rec["hits"]) if rec["hits"] else "(일치 키워드 없음)")
                    st.write("원문 설명")
                    st.markdown(rec["highlighted_description"], unsafe_allow_html=True)


if __name__ == "__main__":
    main()
