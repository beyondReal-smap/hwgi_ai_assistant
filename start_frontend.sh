#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found. Install Node.js and npm first." >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  if [ -f package-lock.json ]; then
    echo "node_modules not found. Installing dependencies with npm ci..."
    npm ci
  else
    echo "node_modules not found. Installing dependencies with npm install..."
    npm install
  fi
fi

if [ -x "$SCRIPT_DIR/jobcode/.venv/bin/python" ]; then
  PYTHON_BIN="$SCRIPT_DIR/jobcode/.venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN=$(command -v python3)
else
  echo "python3 not found. Install Python 3 first." >&2
  exit 1
fi

if ! "$PYTHON_BIN" -c "import fastapi, uvicorn" >/dev/null 2>&1; then
  if [ -f "$SCRIPT_DIR/jobcode/requirements.txt" ]; then
    echo "FastAPI dependencies not found. Installing Python requirements..."
    "$PYTHON_BIN" -m pip install -r "$SCRIPT_DIR/jobcode/requirements.txt"
  else
    echo "jobcode/requirements.txt not found." >&2
    exit 1
  fi
fi

HOST=${HOST:-0.0.0.0}
PORT=${PORT:-3000}
API_HOST=${API_HOST:-0.0.0.0}
API_PORT=${API_PORT:-8000}
export JOBCODE_API_URL=${JOBCODE_API_URL:-http://localhost:${API_PORT}}

# Kill any existing processes on the target ports
for p in $PORT $API_PORT; do
  existing=$(lsof -ti :"$p" 2>/dev/null || true)
  if [ -n "$existing" ]; then
    echo "Killing existing process on port $p (pid $existing)..."
    echo "$existing" | xargs kill -9 2>/dev/null || true
    sleep 0.5
  fi
done

API_PID=""

cleanup() {
  status=$?
  trap - INT TERM EXIT

  if [ -n "$API_PID" ] && kill -0 "$API_PID" >/dev/null 2>&1; then
    echo
    echo "Stopping Silson FastAPI (pid $API_PID)..."
    kill "$API_PID" >/dev/null 2>&1 || true
    wait "$API_PID" 2>/dev/null || true
  fi

  exit "$status"
}

trap cleanup INT TERM EXIT

echo "Starting Silson FastAPI at ${JOBCODE_API_URL}"
(
  cd "$SCRIPT_DIR/jobcode"
  exec "$PYTHON_BIN" -m uvicorn api_server:app --reload --host "$API_HOST" --port "$API_PORT"
) &
API_PID=$!

sleep 2

if ! kill -0 "$API_PID" >/dev/null 2>&1; then
  echo "Silson FastAPI failed to start. Check the logs above." >&2
  exit 1
fi

echo "Starting frontend at http://localhost:${PORT}"
npm run dev -- --hostname "$HOST" --port "$PORT"
