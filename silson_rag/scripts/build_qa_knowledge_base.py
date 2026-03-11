"""Extract silson-related Q&A pairs from 장기보상인보험_QA.csv and build knowledge base chunks.

Output files (in artifacts/qa_knowledge/):
  - qa_pairs.json       : matched question-answer pairs
  - reference_chunks.json : cell-level chunks from reference CSVs
  - all_chunks.json     : unified chunk list for embedding
"""
from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parent.parent  # silson_rag/
PROJECT_ROOT = PACKAGE_ROOT.parent
RAG_DIR = PROJECT_ROOT / "RAG"
OUT_DIR = PACKAGE_ROOT / "artifacts" / "qa_knowledge"

SILSON_KEYWORDS = ["실손", "실비", "의료비", "실손의료비"]

# Reference CSVs to chunk
REFERENCE_CSVS = [
    "실손의료비_담보별보상기준.csv",
    "실손의료비_질병(면책사항).csv",
    "실손의료비_상해(면책사항).csv",
]


def _strip_html(text: str) -> str:
    """Remove HTML tags and decode common entities."""
    text = re.sub(r"<[^>]+>", " ", text)
    text = text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    return re.sub(r"\s+", " ", text).strip()


def _extract_answer_body(content: str) -> str:
    """Extract the answer portion from [RE] content, removing '원본글:' section."""
    # Try splitting on '답변글' marker
    if "답변글" in content:
        parts = content.split("답변글", 1)
        body = parts[1]
    elif "원본글" in content:
        # Sometimes answer follows after a separator
        parts = re.split(r"-{10,}", content)
        body = parts[-1] if len(parts) > 1 else content
    else:
        body = content

    # Clean separators and leading punctuation
    body = re.sub(r"^[\s:：\-]+", "", body)
    return _strip_html(body).strip()


def _has_silson_keyword(text: str) -> bool:
    return any(kw in text for kw in SILSON_KEYWORDS)


def extract_qa_pairs(csv_path: Path) -> list[dict]:
    """Read QA CSV and extract silson-related Q&A pairs."""
    with csv_path.open("r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader)
        rows = list(reader)

    # Build title→content map for questions (non-[RE] rows)
    questions: dict[str, str] = {}
    answers: list[tuple[str, str, str]] = []  # (original_title, answer_title, answer_content)

    for row in rows:
        if len(row) < 2:
            continue
        title, content = row[0].strip(), row[1].strip()
        if not title or not content:
            continue

        if title.startswith("[RE]"):
            # Extract original question title
            original_title = re.sub(r"^\[RE\]\s*", "", title).strip()
            answers.append((original_title, title, content))
        elif not title.startswith("[필독]") and not title.startswith("[공지"):
            questions[title] = content

    # Match Q&A pairs and filter for silson
    qa_pairs = []
    seen_titles = set()
    for original_title, answer_title, answer_content in answers:
        question_content = questions.get(original_title, "")
        question_text = _strip_html(question_content) if question_content else original_title
        answer_text = _extract_answer_body(answer_content)

        if not answer_text or len(answer_text) < 20:
            continue

        combined = original_title + " " + question_text + " " + answer_text
        if not _has_silson_keyword(combined):
            continue

        if original_title in seen_titles:
            continue
        seen_titles.add(original_title)

        qa_pairs.append({
            "id": f"qa_{len(qa_pairs):04d}",
            "question_title": original_title,
            "question": question_text[:500],
            "answer": answer_text[:2000],
        })

    return qa_pairs


def extract_reference_chunks(rag_dir: Path) -> list[dict]:
    """Extract cell-level chunks from reference CSVs."""
    chunks = []
    for csv_name in REFERENCE_CSVS:
        csv_path = rag_dir / csv_name
        if not csv_path.exists():
            print(f"  [SKIP] {csv_name} not found")
            continue

        source_label = csv_name.replace(".csv", "")
        with csv_path.open("r", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            rows = list(reader)

        for r, row in enumerate(rows):
            for c, cell in enumerate(row):
                text = _strip_html(cell).strip()
                if len(text) < 20:
                    continue
                chunks.append({
                    "id": f"ref_{source_label}_{r}_{c}",
                    "source": source_label,
                    "row": r,
                    "col": c,
                    "text": text[:2000],
                })

    return chunks


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    qa_csv = RAG_DIR / "장기보상인보험_QA.csv"

    if not qa_csv.exists():
        print(f"ERROR: {qa_csv} not found")
        sys.exit(1)

    # 1. Extract Q&A pairs
    print("Extracting Q&A pairs...")
    qa_pairs = extract_qa_pairs(qa_csv)
    print(f"  Found {len(qa_pairs)} silson Q&A pairs")

    qa_pairs_path = OUT_DIR / "qa_pairs.json"
    with qa_pairs_path.open("w", encoding="utf-8") as f:
        json.dump(qa_pairs, f, ensure_ascii=False, indent=2)
    print(f"  Saved → {qa_pairs_path}")

    # 2. Extract reference chunks
    print("Extracting reference chunks...")
    ref_chunks = extract_reference_chunks(RAG_DIR)
    print(f"  Found {len(ref_chunks)} reference chunks")

    ref_path = OUT_DIR / "reference_chunks.json"
    with ref_path.open("w", encoding="utf-8") as f:
        json.dump(ref_chunks, f, ensure_ascii=False, indent=2)
    print(f"  Saved → {ref_path}")

    # 3. Build unified chunk list for embedding
    all_chunks = []

    for pair in qa_pairs:
        all_chunks.append({
            "id": pair["id"],
            "type": "qa_pair",
            "embed_text": pair["question"],  # embed the question
            "question": pair["question"],
            "answer": pair["answer"],
            "source": f"QA: {pair['question_title']}",
        })

    for chunk in ref_chunks:
        all_chunks.append({
            "id": chunk["id"],
            "type": "reference",
            "embed_text": chunk["text"],
            "question": "",
            "answer": chunk["text"],
            "source": chunk["source"],
        })

    all_path = OUT_DIR / "all_chunks.json"
    with all_path.open("w", encoding="utf-8") as f:
        json.dump(all_chunks, f, ensure_ascii=False, indent=2)
    print(f"  Unified chunks: {len(all_chunks)}")
    print(f"  Saved → {all_path}")
    print("Done.")


if __name__ == "__main__":
    main()
