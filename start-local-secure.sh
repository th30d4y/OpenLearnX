#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
MONGO_DBPATH="${HOME}/mongodata"
MONGO_LOG="/tmp/openlearnx_mongod.log"
BACKEND_LOG="/tmp/openlearnx_backend.log"
FRONTEND_LOG="/tmp/openlearnx_frontend.log"
FRONTEND_PID_FILE="/tmp/openlearnx_frontend.pid"
# Honour VENV_DIR, else use the first venv found (the docs create ./venv).
VENV_PYTHON=""
if [[ -n "${VENV_DIR:-}" && ! -x "${VENV_DIR}/bin/python3" ]]; then
  echo "ERROR: VENV_DIR=${VENV_DIR} has no executable bin/python3"; exit 1
fi
for d in "${VENV_DIR:-}" "${ROOT_DIR}/venv" "${ROOT_DIR}/.venv" "${ROOT_DIR}/venv_openlearnx"; do
  if [[ -n "$d" && -x "$d/bin/python3" ]]; then VENV_PYTHON="$d/bin/python3"; break; fi
done

cd "$ROOT_DIR"

echo "[1/8] Checking prerequisites"
command -v mongod >/dev/null 2>&1 || { echo "ERROR: mongod not found"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "ERROR: pnpm not found"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "ERROR: docker not found"; exit 1; }
[[ -n "$VENV_PYTHON" ]] || { echo "ERROR: Python venv not found (tried venv, .venv, venv_openlearnx; set VENV_DIR)"; exit 1; }

ensure_docker_access() {
  if docker info >/dev/null 2>&1; then
    return 0
  fi

  echo "[Docker] Current user cannot access Docker. Attempting automatic fix..."

  if ! sudo -n true >/dev/null 2>&1; then
    echo "[Docker] sudo authentication required once to configure Docker access."
    sudo -v
  fi

  sudo systemctl enable --now docker

  if ! getent group docker >/dev/null 2>&1; then
    sudo groupadd docker
  fi

  sudo usermod -aG docker "$USER"
  sudo chgrp docker /var/run/docker.sock || true
  sudo chmod 660 /var/run/docker.sock || true

  if docker info >/dev/null 2>&1; then
    return 0
  fi

  echo "[Docker] Group refresh required. Testing with sg docker context..."
  if sg docker -c 'docker info >/dev/null 2>&1'; then
    return 0
  fi

  echo "ERROR: Docker access is still unavailable after auto-fix."
  echo "Run: newgrp docker  (or log out/in) and rerun this script."
  exit 1
}

run_backend() {
  if docker info >/dev/null 2>&1; then
    nohup "$VENV_PYTHON" backend/main.py >"$BACKEND_LOG" 2>&1 &
    sleep 1
    pgrep -f "python3 .*backend/main.py" | head -n1 || true
    return 0
  fi

  # Start backend in docker group context when group refresh has not propagated.
  sg docker -c "nohup '$VENV_PYTHON' '$ROOT_DIR/backend/main.py' >'$BACKEND_LOG' 2>&1 &"
  sleep 1
  pgrep -f "python3 .*backend/main.py" | head -n1 || true
}

echo "[2/8] Ensuring Docker access"
ensure_docker_access

echo "[3/8] Stopping old local processes"
pkill -f "mongod.*--dbpath ${MONGO_DBPATH}" 2>/dev/null || true
pkill -f "python3 .*backend/main.py" 2>/dev/null || true
pkill -f "pnpm dev" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

echo "[4/8] Starting MongoDB"
mkdir -p "$MONGO_DBPATH"
if pgrep -f "mongod.*--dbpath ${MONGO_DBPATH}" >/dev/null 2>&1; then
  echo "MongoDB already running for ${MONGO_DBPATH}; reusing existing process"
else
  set +e
  mongod --dbpath "$MONGO_DBPATH" --bind_ip 127.0.0.1 --port 27017 --logpath "$MONGO_LOG" --fork >/tmp/openlearnx_mongod_fork.out 2>&1
  mongo_start_code=$?
  set -e
  if [[ $mongo_start_code -ne 0 ]]; then
    echo "WARNING: mongod --fork returned ${mongo_start_code}. Checking if service is still running..."
  fi
fi
MONGO_PID="$(pgrep -f "mongod.*--dbpath ${MONGO_DBPATH}" | head -n1 || true)"
if [[ -z "$MONGO_PID" ]]; then
  echo "ERROR: MongoDB did not start. Check logs: ${MONGO_LOG} and /tmp/openlearnx_mongod_fork.out"
  exit 1
fi
echo "Mongo PID: ${MONGO_PID:-N/A}"

echo "[5/8] Starting backend"
BACKEND_PID="$(run_backend)"
if [[ -z "$BACKEND_PID" ]]; then
  echo "ERROR: Backend did not start. Check log: $BACKEND_LOG"
  exit 1
fi
echo "Backend PID: ${BACKEND_PID:-N/A}"

echo "[6/8] Starting frontend"
(
  cd frontend
  nohup pnpm dev >"$FRONTEND_LOG" 2>&1 &
  echo "$!" >"$FRONTEND_PID_FILE"
)
FRONTEND_PID="$(cat "$FRONTEND_PID_FILE")"
echo "Frontend PID: ${FRONTEND_PID:-N/A}"

echo "[7/8] Waiting for services"
backend_code="$(curl -sS -o /tmp/openlearnx_backend_health_body.txt -w "%{http_code}" --retry 30 --retry-all-errors --retry-connrefused --retry-delay 1 http://127.0.0.1:5000/api/health || true)"
frontend_code="$(curl -sS -o /tmp/openlearnx_frontend_body.txt -w "%{http_code}" --retry 30 --retry-all-errors --retry-connrefused --retry-delay 1 http://127.0.0.1:3000 || true)"

echo "[8/8] Verifying secure compiler execution"
compiler_code="$(curl -sS -o /tmp/openlearnx_compiler_smoke.json -w "%{http_code}" -X POST http://127.0.0.1:5000/api/compiler/execute -H "Content-Type: application/json" -d '{"language":"python","code":"print(\"ok\")"}' || true)"

echo ""
echo "RESULT"
echo "  Mongo PID:      ${MONGO_PID:-N/A}"
echo "  Backend PID:    ${BACKEND_PID:-N/A}"
echo "  Frontend PID:   ${FRONTEND_PID:-N/A}"
echo "  Backend health: ${backend_code:-000}  (http://127.0.0.1:5000/api/health)"
echo "  Frontend health:${frontend_code:-000}  (http://127.0.0.1:3000)"
echo "  Compiler smoke: ${compiler_code:-000}  (/api/compiler/execute)"

echo ""
echo "Logs:"
echo "  MongoDB:  $MONGO_LOG"
echo "  Backend:  $BACKEND_LOG"
echo "  Frontend: $FRONTEND_LOG"
