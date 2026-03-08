#!/usr/bin/env bash
# Build all silson_rag artifacts (embeddings + optional vector store upload)
set -euo pipefail

cd "$(dirname "$0")/../.."

echo "=== Step 1: Build local embeddings ==="
python -m silson_rag.scripts.build_embeddings

if [ "${UPLOAD_VECTOR_STORE:-0}" = "1" ]; then
    echo ""
    echo "=== Step 2: Upload to OpenAI Vector Store ==="
    python -m silson_rag.scripts.upload_vector_store
else
    echo ""
    echo "=== Skipping vector store upload (set UPLOAD_VECTOR_STORE=1 to enable) ==="
fi

echo ""
echo "=== Done ==="
