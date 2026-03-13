- [x] Review current silson answer pipeline and identify stable response shape
- [x] Implement structured silson answer generation in backend without breaking existing answer field
- [x] Update frontend parser/rendering to present GPT-like summary, context, cautions, and follow-ups
- [x] Verify with lint/tests for touched paths and record review notes

## Review
- Added `structured_answer` to the silson backend response while keeping the legacy `answer` string for compatibility.
- Structured answers are derived from grounded search output and fall back deterministically when formatter output is unavailable.
- Frontend now renders multi-card silson responses: summary/context, coverage points, cautions, and checklist with follow-up chips on the final card.
- Verification:
  - `npm run test -- __tests__/silson-parser.test.ts __tests__/openai-service.test.ts`
  - `npx eslint components/MessageBubble.tsx lib/silson-parser.ts lib/silson-types.ts __tests__/silson-parser.test.ts`
  - `python3 -m py_compile jobcode/api_server.py silson_rag/src/*.py silson_rag/tests/test_llm_answer.py`
  - `python3` direct smoke call for `build_structured_answer(...)`
- Constraint:
  - `python3 -m pytest ...` could not run because `pytest` is not installed in this environment.
  - `npm run lint` is currently broken in this repo because the `next lint` script resolves `lint` as a directory under Next 16.

## OpenAI Embedding Search Upgrade
- [x] Add a reusable OpenAI embedding cache/index layer for server-side semantic retrieval.
- [x] Convert customer CSV search intents to semantic search over customer-related datasets with lexical fallback.
- [x] Switch jobcode embedding retrieval to OpenAI-backed vectors while keeping the existing response contract.
- [x] Add targeted tests for the new semantic search helpers and verify touched paths.

## Review
- Added a file-backed OpenAI embedding index for Next.js server routes, storing normalized vectors under `artifacts/openai-embeddings/` and reusing cached document embeddings across searches.
- Customer CSV search now uses semantic retrieval for `workplace_search`, `product_search`, and `coverage_search`, with lexical fallback when `OPENAI_API_KEY` is unavailable or embedding calls fail.
- Jobcode retrieval now prefers OpenAI embeddings via `text-embedding-3-small` by default when an API key is present, while preserving the existing FastAPI response schema and keeping sentence-transformers / TF-IDF fallbacks intact.
- Verification:
  - `npm run test -- __tests__/openai-service.test.ts __tests__/customer-semantic-search.test.ts __tests__/openai-embedding-index.test.ts`
  - `npx eslint app/api/query-csv/route.ts lib/csv-data.ts lib/customer-semantic-search.ts lib/openai-embedding-index.ts __tests__/customer-semantic-search.test.ts __tests__/openai-embedding-index.test.ts`
  - `npx tsc --noEmit`
  - Custom Python smoke check for `jobcode/src/core/embed_engine.py` with mocked OpenAI embeddings and `compile(...)` syntax validation
- Constraint:
  - `python3 -m pytest jobcode/tests/test_openai_embed_engine.py` could not run because `pytest` is not installed in this environment.
