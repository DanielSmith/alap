#!/usr/bin/env bash
#
# Smoke test for Alap server examples.
#
# Usage:
#   ./smoke-test.sh express-sqlite     # Dockerfile-only server
#   ./smoke-test.sh fastapi-postgres   # docker-compose server
#   ./smoke-test.sh all                # test all 11 servers
#
# Podman:
#   DOCKER=podman ./smoke-test.sh all
#
# Each test: build → start → CRUD + search + cherry-pick + query → stop → report
#
# Disk usage warning:
#   Building all 11 servers pulls base images for Node, Python, PHP, Go, Rust,
#   Ruby, Java, and Bun. A full "all" run can consume 15–25 GB of container storage.
#   Run `podman system prune -f` or `docker system prune -f` after testing
#   to reclaim disk space.
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ---------- helpers (must be defined before use) ----------

red()   { printf '\033[0;31m%s\033[0m' "$1"; }
green() { printf '\033[0;32m%s\033[0m' "$1"; }
bold()  { printf '\033[1m%s\033[0m' "$1"; }

# ---------- container runtime ----------

# Detect a running container runtime (not just installed — the daemon must be live)
detect_runtime() {
  local has_docker=false has_podman=false

  if command -v docker > /dev/null 2>&1 \
     && docker info 2>&1 | grep -q 'Server Version'; then
    has_docker=true
  fi

  if command -v podman > /dev/null 2>&1 \
     && podman info 2>&1 | grep -q 'host'; then
    has_podman=true
  fi

  if $has_docker && $has_podman; then
    echo "  Both Docker and Podman are running — using Podman." >&2
    echo "  Override with: DOCKER=docker $0 $*" >&2
    echo "podman"
  elif $has_docker; then
    echo "docker"
  elif $has_podman; then
    echo "podman"
  else
    echo ""
  fi
}

if [ -n "${DOCKER:-}" ]; then
  # Honour explicit DOCKER=podman / DOCKER=docker from env
  if ! command -v "$DOCKER" > /dev/null 2>&1; then
    echo "$(red "Error: DOCKER=${DOCKER} but ${DOCKER} is not installed")"
    exit 1
  fi
  if ! $DOCKER info > /dev/null 2>&1; then
    echo "$(red "Error: ${DOCKER} is installed but the daemon is not running")"
    exit 1
  fi
else
  DOCKER=$(detect_runtime)
  if [ -z "$DOCKER" ]; then
    red "Neither Docker nor Podman is running."
    echo ""
    echo "  Install one of:"
    echo "    Docker Desktop: https://www.docker.com/products/docker-desktop"
    echo "    Podman:         https://podman.io/docs/installation"
    exit 1
  fi
fi

# Compose command: prefer built-in "podman compose" over podman-compose wrapper
if [ "$DOCKER" = "podman" ]; then
  if podman compose version > /dev/null 2>&1; then
    COMPOSE="podman compose"
  elif command -v podman-compose > /dev/null 2>&1; then
    COMPOSE="podman-compose"
  else
    COMPOSE="podman compose"
  fi
else
  COMPOSE="docker compose"
fi
PASS=0
FAIL=0
ERRORS=""
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Servers that use docker-compose (need external DB)
COMPOSE_SERVERS="fastapi-postgres"

# All servers in order
ALL_SERVERS="express-sqlite hono-sqlite bun-sqlite flask-sqlite django-sqlite laravel-sqlite gin-sqlite axum-sqlite sinatra-sqlite java-spring fastapi-postgres"

assert_status() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" -eq "$expected" ]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    ERRORS="${ERRORS}\n  ✗ ${label}: expected ${expected}, got ${actual}"
  fi
}

# Activity-aware wait: keeps going while the container is busy,
# bails early if idle too long, hard cap at MAX_WAIT.
#
#   wait_for_server PORT CONTAINER [MAX_WAIT] [IDLE_LIMIT]
#
# Defaults: 600s max (10 min), 300s idle limit (5 min of <1% CPU).
# Prints progress every 30s with elapsed time and activity status.

wait_for_server() {
  local port="$1" container="$2"
  local max_wait="${3:-600}" idle_limit="${4:-300}"
  local elapsed=0 idle_seconds=0

  while [ $elapsed -lt "$max_wait" ]; do
    # Try the endpoint
    if curl -s -o /dev/null -w '' "http://localhost:${port}/configs" 2>/dev/null; then
      return 0
    fi

    # Check if the container is still running and get CPU usage
    local cpu_raw
    cpu_raw=$($DOCKER stats --no-stream --format '{{.CPUPerc}}' "$container" 2>/dev/null)

    if [ -z "$cpu_raw" ]; then
      # Container doesn't exist or already exited
      echo "  $(red 'Container not running') — check the log file above"
      return 1
    fi

    # Parse CPU% (e.g. "12.34%") — idle if < 1%
    local is_idle
    is_idle=$(echo "$cpu_raw" | awk -F'%' '{ print ($1 < 1.0) ? 1 : 0 }')

    if [ "$is_idle" = "1" ]; then
      idle_seconds=$((idle_seconds + 2))
    else
      idle_seconds=0
    fi

    if [ $idle_seconds -ge "$idle_limit" ]; then
      echo "  $(red 'IDLE') — no CPU activity for ${idle_limit}s, container appears stuck"
      return 1
    fi

    # Progress every 30s
    if [ $((elapsed % 30)) -eq 0 ] && [ $elapsed -gt 0 ]; then
      local status="active (${cpu_raw})"
      [ $idle_seconds -gt 0 ] && status="idle ${idle_seconds}s"
      echo "  ... ${elapsed}s elapsed, ${status}"
    fi

    sleep 2
    elapsed=$((elapsed + 2))
  done

  return 1
}

# ---------- test suite ----------

run_tests() {
  local port="$1" name="$2"
  local base="http://localhost:${port}"
  local status

  # 1. GET /configs — should return 200
  status=$(curl -s -o /dev/null -w '%{http_code}' "${base}/configs")
  assert_status "${name}: GET /configs" 200 "$status"

  # 2. PUT /configs/smoke-test — should return 204
  status=$(curl -s -o /dev/null -w '%{http_code}' -X PUT \
    -H 'Content-Type: application/json' \
    -d '{"allLinks":{"test1":{"label":"Smoke Test","url":"https://example.com","tags":["smoke"]}}}' \
    "${base}/configs/smoke-test")
  assert_status "${name}: PUT /configs/smoke-test" 204 "$status"

  # 3. GET /configs/smoke-test — should return 200
  status=$(curl -s -o /dev/null -w '%{http_code}' "${base}/configs/smoke-test")
  assert_status "${name}: GET /configs/smoke-test" 200 "$status"

  # 4. GET /configs — should include smoke-test
  local list
  list=$(curl -s "${base}/configs")
  if echo "$list" | grep -q '"smoke-test"'; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    ERRORS="${ERRORS}\n  ✗ ${name}: GET /configs missing \"smoke-test\" in list"
  fi

  # 5. GET /search?tag=smoke — should return 200 with results
  status=$(curl -s -o /dev/null -w '%{http_code}' "${base}/search?tag=smoke")
  assert_status "${name}: GET /search?tag=smoke" 200 "$status"

  # 6. GET /configs/nonexistent — should return 404
  status=$(curl -s -o /dev/null -w '%{http_code}' "${base}/configs/nonexistent-$(date +%s)")
  assert_status "${name}: GET /configs/nonexistent" 404 "$status"

  # 7. DELETE /configs/smoke-test — should return 204
  status=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "${base}/configs/smoke-test")
  assert_status "${name}: DELETE /configs/smoke-test" 204 "$status"

  # 8. GET /configs/smoke-test after delete — should return 404
  status=$(curl -s -o /dev/null -w '%{http_code}' "${base}/configs/smoke-test")
  assert_status "${name}: GET after DELETE" 404 "$status"

  # 9. POST /cherry-pick — should return 200
  status=$(curl -s -o /dev/null -w '%{http_code}' -X POST \
    -H 'Content-Type: application/json' \
    -d '{"source":"demo","expression":".car"}' \
    "${base}/cherry-pick")
  assert_status "${name}: POST /cherry-pick" 200 "$status"

  # 10. POST /query — should return 200
  status=$(curl -s -o /dev/null -w '%{http_code}' -X POST \
    -H 'Content-Type: application/json' \
    -d '{"expression":".car"}' \
    "${base}/query")
  assert_status "${name}: POST /query" 200 "$status"
}

# ---------- server lifecycle ----------

is_compose() {
  echo "$COMPOSE_SERVERS" | grep -qw "$1"
}

start_server() {
  local name="$1"
  local dir="${SCRIPT_DIR}/${name}"

  # Clean up any leftover container from a previous run
  $DOCKER rm -f "alap-smoke-${name}" > /dev/null 2>&1 || true

  # Servers that need servers/ as build context (shared/ dependency)
  local NEEDS_PARENT="flask-sqlite django-sqlite fastapi-postgres"
  # Servers that need repo root as build context (multi-stage lib build, parser crates)
  local NEEDS_REPO_ROOT="express-sqlite hono-sqlite bun-sqlite gin-sqlite axum-sqlite sinatra-sqlite java-spring"

  if is_compose "$name"; then
    if echo "$NEEDS_PARENT" | grep -qw "$name"; then
      (cd "$SCRIPT_DIR" && $COMPOSE -f "${name}/docker-compose.yml" up -d --build) 2>&1
    else
      (cd "$dir" && $COMPOSE up -d --build) 2>&1
    fi
  elif echo "$NEEDS_REPO_ROOT" | grep -qw "$name"; then
    local repo_root="${SCRIPT_DIR}/../.."
    local image="alap-smoke-${name}"
    (cd "$repo_root" && $DOCKER build --load -t "$image" -f "examples/servers/${name}/Dockerfile" .) 2>&1
    $DOCKER run -d --name "alap-smoke-${name}" -p 3000:3000 "$image" 2>&1
  elif echo "$NEEDS_PARENT" | grep -qw "$name"; then
    local image="alap-smoke-${name}"
    (cd "$SCRIPT_DIR" && $DOCKER build --load -t "$image" -f "${name}/Dockerfile" .) 2>&1
    $DOCKER run -d --name "alap-smoke-${name}" -p 3000:3000 "$image" 2>&1
  else
    local image="alap-smoke-${name}"
    (cd "$dir" && $DOCKER build --load -t "$image" .) 2>&1
    $DOCKER run -d --name "alap-smoke-${name}" -p 3000:3000 "$image" 2>&1
  fi
}

stop_server() {
  local name="$1"
  local dir="${SCRIPT_DIR}/${name}"

  # Servers that need servers/ as build context
  local NEEDS_PARENT="flask-sqlite django-sqlite fastapi-postgres"

  if is_compose "$name"; then
    if echo "$NEEDS_PARENT" | grep -qw "$name"; then
      (cd "$SCRIPT_DIR" && $COMPOSE -f "${name}/docker-compose.yml" down -v) 2>&1
    else
      (cd "$dir" && $COMPOSE down -v) 2>&1
    fi
  else
    $DOCKER rm -f "alap-smoke-${name}" 2>&1
  fi
}

test_server() {
  local name="$1"
  local before_fail=$FAIL

  echo ""
  bold "▸ ${name}"
  echo ""

  local dir="${SCRIPT_DIR}/${name}"
  if is_compose "$name"; then
    echo "  Starting: cd ${name} && ${COMPOSE} up -d --build"
  else
    echo "  Starting: ${DOCKER} build -t alap-smoke-${name} ${name}/ && ${DOCKER} run -d -p 3000:3000 alap-smoke-${name}"
  fi
  local logfile="/tmp/alap-smoke-${name}-${TIMESTAMP}.log"
  echo "  Log: ${logfile}"

  # Stream build progress: tail the log in background, prefixed for readability.
  # Run in a subshell so we get a single PID to kill (covers both tail and sed).
  touch "$logfile"
  ( tail -f "$logfile" | sed 's/^/    │ /' ) &
  local tail_pid=$!

  if ! start_server "$name" > "$logfile" 2>&1; then
    kill -- -"$tail_pid" 2>/dev/null || kill "$tail_pid" 2>/dev/null; wait "$tail_pid" 2>/dev/null || true
    echo "  $(red 'BUILD FAILED') — see ${logfile}"
    tail -5 "$logfile" 2>/dev/null | sed 's/^/    /'
    FAIL=$((FAIL + 1))
    ERRORS="${ERRORS}\n  ✗ ${name}: build failed"
    stop_server "$name" > /dev/null 2>&1 || true
    return
  fi

  kill -- -"$tail_pid" 2>/dev/null || kill "$tail_pid" 2>/dev/null; wait "$tail_pid" 2>/dev/null || true

  # For compose servers, find the app container; for standalone, it's alap-smoke-${name}
  local container="alap-smoke-${name}"
  if is_compose "$name"; then
    # Compose names containers as <project>-<service>-1; project defaults to directory name.
    # The trailing `|| true` on each stage keeps `set -euo pipefail` from exiting
    # the script if podman ps momentarily returns nothing or head -1 closes its
    # pipe early (SIGPIPE). We tolerate an empty lookup — fallback below covers it.
    local cand
    cand=$({ $DOCKER ps --filter "publish=3000" --format '{{.Names}}' 2>/dev/null || true; } | { head -1 || true; } || true)
    if [ -n "$cand" ]; then
      container="$cand"
    fi
  fi
  echo "  Waiting for http://localhost:3000/configs (max 10m, idle limit 5m)..."
  if ! wait_for_server 3000 "$container"; then
    echo "  $(red 'TIMEOUT') — server did not become ready"
    FAIL=$((FAIL + 1))
    ERRORS="${ERRORS}\n  ✗ ${name}: server timeout"
    stop_server "$name" > /dev/null 2>&1 || true
    return
  fi

  echo "  Running 10 assertions: GET list, PUT, GET, list check, search, 404, DELETE, 404-after-delete, cherry-pick, query"
  run_tests 3000 "$name"

  if is_compose "$name"; then
    echo "  Stopping: ${COMPOSE} down -v"
  else
    echo "  Stopping: ${DOCKER} rm -f alap-smoke-${name}"
  fi
  stop_server "$name" > /dev/null 2>&1 || true

  if [ $FAIL -eq $before_fail ]; then
    echo "  $(green '✓ All passed')"
  else
    echo "  $(red '✗ Failures detected')"
  fi
}

# ---------- main ----------

if [ $# -eq 0 ]; then
  echo "Usage: $0 <server-name|all>"
  echo ""
  echo "Servers: ${ALL_SERVERS}"
  exit 1
fi

target="$1"

echo ""
bold "Alap Server Smoke Tests"
echo ""

if [ "$target" = "all" ]; then
  echo "  ⚠  Building all 9 servers pulls Node, Python, PHP, Go, Rust, and Bun images."
  echo "     This can use 15–25 GB of disk space. Run '${DOCKER} system prune -f' after to reclaim."
  echo ""
  for server in $ALL_SERVERS; do
    test_server "$server"
  done
else
  if [ ! -d "${SCRIPT_DIR}/${target}" ]; then
    echo "Unknown server: ${target}"
    echo "Available: ${ALL_SERVERS}"
    exit 1
  fi
  test_server "$target"
fi

# ---------- summary ----------

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
total=$((PASS + FAIL))
echo "  $(bold 'Results:') ${PASS}/${total} passed"

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "  $(red 'Failures:')"
  printf "$ERRORS\n"
  echo ""
  exit 1
else
  echo "  $(green '✓ All smoke tests passed')"
  echo ""
fi
