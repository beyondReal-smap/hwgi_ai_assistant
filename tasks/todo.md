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
