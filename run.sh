#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

HOST="${HOST:-0.0.0.0}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
OPEN_BROWSER="${OPEN_BROWSER:-1}"

cleanup() {
  if [[ -n "${FRONTEND_PID:-}" ]] && kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
    kill "$FRONTEND_PID" >/dev/null 2>&1 || true
    wait "$FRONTEND_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

find_available_port() {
  local start_port="$1"
  HOST="$HOST" node - "$start_port" <<'NODE'
const net = require("node:net");

const startPort = Number(process.argv[2]);
const host = process.env.HOST || "0.0.0.0";

function canListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen({ host, port }, () => {
      server.close(() => resolve(true));
    });
  });
}

(async () => {
  for (let port = startPort; port < startPort + 50; port += 1) {
    if (await canListen(port)) {
      console.log(port);
      return;
    }
  }
  process.exit(1);
})();
NODE
}

wait_until_ready() {
  local url="$1"
  local attempts=60

  for _ in $(seq 1 "$attempts"); do
    URL="$url" node - <<'NODE' >/dev/null 2>&1 && return 0
const url = process.env.URL;
fetch(url).then((response) => {
  process.exit(response.ok ? 0 : 1);
}).catch(() => process.exit(1));
NODE
    sleep 0.5
  done

  echo "Timed out waiting for CityLine at $url" >&2
  exit 1
}

open_browser() {
  local url="$1"

  if [[ "$OPEN_BROWSER" != "1" ]]; then
    return 0
  fi

  if command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  else
    echo "Open this URL in your browser: $url"
  fi
}

require_command node
require_command npm

if [[ ! -d node_modules ]]; then
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
fi

# Next.js (Turbopack) keeps a per-project dev lock. If a dev server is already
# running for this repo, re-use it instead of trying to start a second one.
LOCK_FILE=".next/dev/lock"
if [[ -f "$LOCK_FILE" ]]; then
  EXISTING_APP_URL="$(LOCK_FILE="$LOCK_FILE" node - <<'NODE'
const fs = require("node:fs");
try {
  const lock = JSON.parse(fs.readFileSync(process.env.LOCK_FILE, "utf8"));
  const pid = Number(lock?.pid);
  if (!Number.isFinite(pid) || pid <= 0) process.exit(0);
  try {
    process.kill(pid, 0);
  } catch {
    process.exit(0);
  }
  const url = typeof lock?.appUrl === "string" ? lock.appUrl : "";
  if (url) process.stdout.write(url);
} catch {}
NODE
)"

  if [[ -n "${EXISTING_APP_URL:-}" ]]; then
    EXISTING_PID="$(LOCK_FILE="$LOCK_FILE" node - <<'NODE'
const fs = require("node:fs");
try {
  const lock = JSON.parse(fs.readFileSync(process.env.LOCK_FILE, "utf8"));
  const pid = Number(lock?.pid);
  if (Number.isFinite(pid) && pid > 0) process.stdout.write(String(pid));
} catch {}
NODE
)"

    echo "CityLine dev server is already running:"
    echo "$EXISTING_APP_URL"
    if [[ -n "${EXISTING_PID:-}" ]]; then
      echo "Tip: stop it with: kill ${EXISTING_PID}"
    fi
    open_browser "$EXISTING_APP_URL"
    exit 0
  fi

  # Stale lock (server died): remove it so `next dev` can start cleanly.
  rm -f "$LOCK_FILE" >/dev/null 2>&1 || true
fi

FRONTEND_PORT="$(find_available_port "$FRONTEND_PORT")"
LOCAL_URL="http://localhost:${FRONTEND_PORT}/"
NETWORK_URL="http://${HOST}:${FRONTEND_PORT}/"

echo "Starting CityLine"
echo "Frontend: $LOCAL_URL"
echo "Host: $HOST"
echo "Reserved backend port: $BACKEND_PORT"
echo

npm run dev -- --port "$FRONTEND_PORT" &
FRONTEND_PID="$!"

wait_until_ready "$LOCAL_URL"
open_browser "$LOCAL_URL"

echo
echo "CityLine is running at $LOCAL_URL"
echo "Press Ctrl+C to stop."

wait "$FRONTEND_PID"
