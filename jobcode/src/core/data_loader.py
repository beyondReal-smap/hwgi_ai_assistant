from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Dict, List

import pandas as pd

from .config import JOBS_CSV, JOB_CODE_TXT, SYNONYMS_JSON
from .schema import JobRecord
from .text_norm import normalize_text

REQUIRED_COLUMNS = ["job_code", "job_name", "risk_grade", "description"]


SAMPLE_ROWS = [
    ("J001", "일반 사무직", "저", "문서 작성과 전산 입력 중심의 실내 근무. 현장 작업과 위험 기계 사용이 거의 없음."),
    ("J002", "회계 사무원", "저", "세무 자료 정리와 결산 보조 업무를 수행. 장시간 앉아서 컴퓨터 작업."),
    ("J003", "고객센터 상담원", "저", "전화 상담과 민원 응대 중심. 물리적 위험은 낮으나 감정노동이 있음."),
    ("J004", "보험 설계사", "중", "고객 방문 상담과 외근이 잦음. 운전 및 대면 영업 활동이 포함됨."),
    ("J005", "간호조무사", "중", "병원에서 환자 보조와 기본 처치 지원. 감염 노출 가능성이 있음."),
    ("J006", "요양보호사", "중", "환자 이동 보조와 일상생활 케어. 근골격계 부담이 발생할 수 있음."),
    ("J007", "학원 강사", "저", "강의와 학습 지도 중심. 일반적으로 실내 근무이며 장시간 발성 사용."),
    ("J008", "초등학교 교사", "저", "수업 및 생활지도 수행. 활동량은 있으나 산업재해 위험은 낮음."),
    ("J009", "음식점 조리사", "중", "조리기구와 화기 사용. 화상과 미끄럼 위험이 존재."),
    ("J010", "카페 바리스타", "중", "음료 제조와 고객 응대. 뜨거운 장비 및 반복 동작 사용."),
    ("J011", "택배 상하차", "고", "무거운 화물 이동과 야외 작업 빈번. 근골격계 및 사고 위험 높음."),
    ("J012", "건설 현장 근로자", "고", "고소 작업과 중장비 주변 작업 수행. 낙상 및 충돌 위험이 큼."),
    ("J013", "용접공", "고", "금속 절단 및 용접 작업 수행. 화상, 유해가스, 화재 위험 존재."),
    ("J014", "전기 설비 기사", "고", "전기 배선 점검과 유지보수. 감전 및 추락 위험이 있음."),
    ("J015", "배달 라이더", "고", "오토바이 운행으로 음식 배달 수행. 교통사고 위험이 매우 높음."),
    ("J016", "화물차 운전기사", "중", "장거리 운전과 화물 운반 업무. 교통사고 및 피로 누적 위험."),
    ("J017", "생산직 기계 오퍼레이터", "중", "생산 라인 기계 조작과 점검. 끼임 및 소음 노출 위험."),
    ("J018", "미용사", "중", "고객 시술과 장시간 서서 근무. 화학약품 노출 가능."),
    ("J019", "소방관", "고", "화재 진압과 구조 활동. 고열, 연기, 낙하물 위험이 큼."),
    ("J020", "경비원", "저", "건물 순찰 및 출입 통제 업무. 기본적인 안전관리 중심."),
    ("J021", "데이터 분석가", "저", "데이터 모델링과 리포트 작성. 주로 컴퓨터 기반 사무 업무."),
    ("J022", "웹 개발자", "저", "소프트웨어 개발과 시스템 유지보수. 물리적 위험은 낮음."),
    ("J023", "지게차 운전원", "고", "물류창고에서 지게차 운행. 충돌 및 전도 사고 위험."),
    ("J024", "간판 설치 기사", "고", "고소 작업차를 이용해 간판 설치. 추락과 장비사고 위험."),
    ("J025", "농업 종사자", "중", "야외 농작업과 농기계 사용. 기상 및 장비 관련 위험 존재."),
]


def _ensure_synonyms_file(path: Path) -> None:
    if path.exists():
        return
    default = {
        "사무": ["사무직", "오피스", "내근"],
        "용접": ["용접공", "금속가공"],
        "배달": ["라이더", "퀵서비스", "오토바이"],
        "건설": ["현장", "건축", "토목"],
        "운전": ["드라이버", "기사"],
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(default, f, ensure_ascii=False, indent=2)


def ensure_sample_jobs_csv(path: Path = JOBS_CSV) -> None:
    if path.exists():
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    df = pd.DataFrame(SAMPLE_ROWS, columns=REQUIRED_COLUMNS)
    df.to_csv(path, index=False, encoding="utf-8-sig")


def _load_from_job_code_txt(path: Path) -> pd.DataFrame:
    src = pd.read_csv(path, sep="\t", dtype=str, encoding="utf-8")
    src.columns = [str(c).strip() for c in src.columns]
    required_src = ["직업코드", "직업명", "등급", "직업기술서"]
    missing = [c for c in required_src if c not in src.columns]
    if missing:
        raise ValueError(f"job_code.txt missing columns: {missing}")

    examples_col = src["예시"] if "예시" in src.columns else ""
    out = pd.DataFrame(
        {
            "job_code": src["직업코드"].fillna("").astype(str).str.strip(),
            "job_name": src["직업명"].fillna("").astype(str).str.strip(),
            "risk_grade": src["등급"].fillna("").astype(str).str.strip(),
            "description": src["직업기술서"].fillna("").astype(str).str.strip(),
            "examples": examples_col if isinstance(examples_col, str) else examples_col.fillna("").astype(str).str.strip(),
        }
    )
    out = out[(out["job_code"] != "") & (out["job_name"] != "") & (out["description"] != "")]
    out = out.drop_duplicates(subset=["job_code"], keep="first").reset_index(drop=True)
    return out


def load_jobs(path: Path = JOBS_CSV, synonyms: Dict[str, List[str]] | None = None) -> pd.DataFrame:
    if JOB_CODE_TXT.exists():
        df = _load_from_job_code_txt(JOB_CODE_TXT)
        df.to_csv(path, index=False, encoding="utf-8-sig")
    else:
        ensure_sample_jobs_csv(path)
        df = pd.read_csv(path)

    _ensure_synonyms_file(SYNONYMS_JSON)
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"jobs.csv missing columns: {missing}")

    for c in REQUIRED_COLUMNS:
        df[c] = df[c].fillna("").astype(str).str.strip()

    synonyms = synonyms or {}

    def build_search_text(row: pd.Series) -> str:
        extras = synonyms.get(normalize_text(row["job_name"]), [])
        extra_text = " ".join(extras)
        examples_text = str(row.get("examples", "")).strip()
        return f"{row['job_name']} {row['description']} {examples_text} {extra_text}".strip()

    df["search_text"] = df.apply(build_search_text, axis=1)
    return df


def to_records(df: pd.DataFrame) -> List[JobRecord]:
    return [
        JobRecord(
            job_code=r["job_code"],
            job_name=r["job_name"],
            risk_grade=r["risk_grade"],
            description=r["description"],
            search_text=r["search_text"],
        )
        for _, r in df.iterrows()
    ]


def dataframe_hash(df: pd.DataFrame) -> str:
    payload = df[["job_code", "job_name", "risk_grade", "description", "search_text"]].to_csv(index=False)
    return hashlib.md5(payload.encode("utf-8")).hexdigest()
