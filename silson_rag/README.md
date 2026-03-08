# 실손의료비 RAG 전처리 패키지

이 패키지는 원본 CSV 3개를 OpenAI 기반 검색/RAG에 맞게 재구성한 결과입니다.

## 생성 파일
- `실손의료비_search_ready_clauses.csv`: 조항 단위 long-format 데이터. 임베딩/재검색/디버깅에 적합
- `실손의료비_search_ready_documents.csv`: 문서 단위 데이터. 각 문서가 하나의 상품/세대/담보 기준
- `실손의료비_search_ready_documents.jsonl`: 문서 단위 JSONL. 자체 임베딩 파이프라인에 적합
- `openai_upload_manifest.csv`: 문서 단위 Markdown 업로드용 메타데이터 manifest
- `search_docs_md/*.md`: 문서 단위 Markdown. 사람이 훑어보기 좋고 로컬 미리보기에 적합
- `openai_upload_clause_manifest.csv`: 조항 단위 Markdown 업로드용 메타데이터 manifest
- `search_clause_docs_md/*.md`: OpenAI file_search 업로드 추천용 조항 단위 Markdown 문서들

## 왜 이렇게 바꿨는가
원본 CSV는 열이 상품/세대 단위로 펼쳐진 가로형 표라서, 그대로 업로드하면 다음 문제가 생깁니다.
1. 한 셀에 여러 문장이 섞여 있어 chunk 의미가 흐려짐
2. 세대/판매시기/담보/조항명이 분리되지 않아 질의 필터링이 어려움
3. 질문형 검색(예: "2018년에 가입한 착한실손에서 병실료차액은?")과 원본 표 구조가 맞지 않음

그래서 아래 방식으로 재구성했습니다.
- 열 기준 데이터를 문서 단위로 세로 정규화
- 조항별 clause row 생성
- 세대/상품명/판매시기/담보를 메타데이터화
- 검색 성능 향상을 위해 `naturalized_qa`, `keywords`, `search_text` 필드 추가
- OpenAI file_search에 잘 맞도록 문서 단위 / 조항 단위 Markdown 문서 생성

## file_search 권장 구조
`search_docs_md`는 한 파일 안에 여러 조항이 들어 있는 문서 단위 구조입니다. 사람이 검토하기에는 편하지만, vector store 검색에서는 맞는 문서를 찾고도 원하는 조항이 같은 chunk 안에 없을 수 있습니다.

그래서 실제 OpenAI file_search 업로드는 `search_clause_docs_md` + `openai_upload_clause_manifest.csv` 조합을 권장합니다.
- 파일 1개 = 조항 1개라서 검색 granularity가 더 세밀함
- `clause_name`까지 attributes로 들어가 결과 라벨링이 명확함
- `질문형 표현`, `검색어 확장`, `원문`이 같은 파일 안에 있어 query rewrite와 semantic match가 안정적임

조항 단위 문서는 아래 스크립트로 다시 만들 수 있습니다.
- `python jobcode/src/scripts/build_silson_clause_docs.py`

## 추천 사용 방식
1. `search_clause_docs_md/*.md`를 OpenAI File API로 업로드
2. Vector store에 파일을 연결하면서 `openai_upload_clause_manifest.csv`의 메타데이터를 attributes로 함께 저장
3. 질의 시 `responses.create(... tools=[{type:'file_search', ...}])` 또는 `vector_stores.search(...)` 사용
4. 가입시기/세대/문서유형이 보이면 attributes filter 적용

문서 단위 Markdown이 필요하면 기존 `openai_upload_manifest.csv`도 그대로 사용할 수 있습니다.

## 문서 수 / 조항 수
- 문서 수: 31
- 조항 수: 556
