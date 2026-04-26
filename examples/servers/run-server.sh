#!/usr/bin/env bash
#
# Build and run any Alap server example via Docker/Podman.
# Finds the repo root automatically — run from anywhere.
#
# Usage:
#   ./run-server.sh                       # auto-detect server from cwd
#   ./run-server.sh express-sqlite        # specify server
#   ./run-server.sh -p bun-sqlite         # prune first, then build + run
#   ./run-server.sh -e docker flask-sqlite
#   ./run-server.sh --help
#

set -euo pipefail

red()   { printf '\033[0;31m%s\033[0m\n' "$1"; }
green() { printf '\033[0;32m%s\033[0m\n' "$1"; }
bold()  { printf '\033[1m%s\033[0m\n' "$1"; }

# Clean up background processes on exit/interrupt
tail_pid=""
cleanup() {
  if [ -n "$tail_pid" ]; then
    kill -- -"$tail_pid" 2>/dev/null || kill "$tail_pid" 2>/dev/null
    wait "$tail_pid" 2>/dev/null || true
  fi
}
trap 'cleanup; exit' INT TERM
trap 'cleanup' EXIT

ALL_SERVERS="express-sqlite hono-sqlite bun-sqlite flask-sqlite django-sqlite laravel-sqlite gin-sqlite axum-sqlite sinatra-sqlite java-spring fastapi-postgres"

show_help() {
  echo ""
  bold "run-server.sh — build and run an Alap server example"
  echo ""
  echo "  Finds the repo root automatically. Run from anywhere."
  echo ""
  bold "Usage:"
  echo "  ./run-server.sh [options] [server-name]"
  echo ""
  bold "Options:"
  echo "  -h, --help       Show this help"
  echo "  -p, --prune      Prune all containers, images, and cache before building"
  echo "  -e, --env ENV    Container runtime: 'docker' or 'podman' (auto-detected if omitted)"
  echo ""
  bold "Servers:"
  for s in $ALL_SERVERS; do
    echo "    $s"
  done
  echo ""
  bold "Examples:"
  echo "  ./run-server.sh                          # auto-detect from current directory"
  echo "  ./run-server.sh bun-sqlite               # build + run bun server"
  echo "  ./run-server.sh -p axum-sqlite           # prune everything, then build + run"
  echo "  ./run-server.sh -e docker flask-sqlite   # force Docker runtime"
  echo "  cd gin-sqlite && ../run-server.sh        # auto-detect from cwd"
  echo ""
  bold "Stopping:"
  echo "  Ctrl-C in the terminal, then:"
  echo "    docker rm -f alap-<server-name>"
  echo "    # or: podman rm -f alap-<server-name>"
  echo ""
}

# --- Parse args ---

PRUNE=false
FORCED_ENV=""
SERVER=""

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help)
      show_help
      exit 0
      ;;
    -p|--prune)
      PRUNE=true
      shift
      ;;
    -e|--env)
      if [ $# -lt 2 ]; then
        red "Error: -e requires an argument (docker or podman)"
        exit 1
      fi
      FORCED_ENV="$2"
      if [ "$FORCED_ENV" != "docker" ] && [ "$FORCED_ENV" != "podman" ]; then
        red "Error: -e must be 'docker' or 'podman', got '${FORCED_ENV}'"
        exit 1
      fi
      shift 2
      ;;
    -*)
      red "Unknown option: $1"
      echo "  Run with --help for usage."
      exit 1
      ;;
    *)
      SERVER="$1"
      shift
      ;;
  esac
done

# --- Detect container runtime ---

detect_runtime() {
  local has_docker=false has_podman=false

  # Check if the daemon is actually running, not just installed.
  # docker info can succeed even when Docker Desktop isn't running
  # (the privileged helper responds), so verify the engine is live.
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
    echo "  Override with: -e docker" >&2
    echo "podman"
  elif $has_docker; then
    echo "docker"
  elif $has_podman; then
    echo "podman"
  else
    red "Neither Docker nor Podman is running." >&2
    echo "  Install one of:" >&2
    echo "    Docker Desktop: https://www.docker.com/products/docker-desktop" >&2
    echo "    Podman:         https://podman.io/docs/installation" >&2
    exit 1
  fi
}

if [ -n "$FORCED_ENV" ]; then
  DOCKER="$FORCED_ENV"
else
  DOCKER=$(detect_runtime)
fi

# --- Find repo root by walking up until we see src/core + docs + examples ---

find_repo_root() {
  local dir
  dir=$(cd "$(dirname "$0")" && pwd)
  while [ "$dir" != "/" ]; do
    if [ -d "$dir/src/core" ] && [ -d "$dir/docs" ] && [ -d "$dir/examples" ]; then
      echo "$dir"
      return 0
    fi
    dir=$(dirname "$dir")
  done
  return 1
}

REPO_ROOT=$(find_repo_root) || {
  red "Could not find repo root (looked for src/core + docs + examples)."
  exit 1
}

SERVERS_DIR="${REPO_ROOT}/examples/servers"

# --- Determine which server to run ---

detect_server() {
  local cwd
  cwd=$(pwd)
  local dirname
  dirname=$(basename "$cwd")

  for s in $ALL_SERVERS; do
    if [ "$dirname" = "$s" ] && [ "$(dirname "$cwd")" = "$SERVERS_DIR" ]; then
      echo "$s"
      return 0
    fi
  done

  return 1
}

if [ -n "$SERVER" ]; then
  : # already set from args
elif SERVER=$(detect_server); then
  : # detected from cwd
else
  show_help
  exit 1
fi

SERVER_DIR="${SERVERS_DIR}/${SERVER}"

if [ ! -d "$SERVER_DIR" ]; then
  red "Unknown server: ${SERVER}"
  echo ""
  echo "  Available:"
  for s in $ALL_SERVERS; do
    echo "    $s"
  done
  exit 1
fi

IMAGE="alap-${SERVER}"

# --- Determine build strategy ---

COMPOSE_SERVERS="fastapi-postgres"
NEEDS_REPO_ROOT="express-sqlite hono-sqlite bun-sqlite gin-sqlite axum-sqlite sinatra-sqlite java-spring"
IS_COMPOSE=false

if echo "$COMPOSE_SERVERS" | grep -qw "$SERVER"; then
  IS_COMPOSE=true
  # Detect compose command
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
fi

# Servers that need servers/ as context (for shared/ dependency)
NEEDS_PARENT="flask-sqlite django-sqlite fastapi-postgres"

if echo "$NEEDS_REPO_ROOT" | grep -qw "$SERVER"; then
  CONTEXT="$REPO_ROOT"
  DOCKERFILE="examples/servers/${SERVER}/Dockerfile"
elif echo "$NEEDS_PARENT" | grep -qw "$SERVER"; then
  CONTEXT="$SERVERS_DIR"
  DOCKERFILE="${SERVER}/Dockerfile"
else
  # Self-contained servers (laravel-sqlite, etc.) — context is their own directory
  CONTEXT="${SERVERS_DIR}/${SERVER}"
  DOCKERFILE="Dockerfile"
fi

# --- Header ---

echo ""
bold "━━━ ${SERVER} ━━━"
echo ""
echo "  Runtime:    ${DOCKER}"
echo "  Context:    ${CONTEXT}"
echo "  Dockerfile: ${DOCKERFILE}"

# --- Pre-flight: Podman VM memory check for Rust builds ---

RUST_SERVERS="axum-sqlite"
MIN_VM_MEMORY_MB=8192

if [ "$DOCKER" = "podman" ] && echo "$RUST_SERVERS" | grep -qw "$SERVER"; then
  mem_mb=$(podman machine inspect --format '{{.Resources.Memory}}' 2>/dev/null) || true
  if [ -n "$mem_mb" ] && [ "$mem_mb" -lt "$MIN_VM_MEMORY_MB" ] 2>/dev/null; then
    echo ""
    red "WARNING: Podman VM has only ${mem_mb} MB of memory."
    echo "  Rust builds benefit from at least ${MIN_VM_MEMORY_MB} MB to avoid"
    echo "  thrashing a DRAM-less SSD. Consider:"
    echo ""
    echo "    podman machine stop"
    echo "    podman machine set --memory ${MIN_VM_MEMORY_MB}"
    echo "    podman machine start"
    echo ""
    printf "Continue anyway? [y/N] "
    read -r answer
    case "$answer" in
      [yY]*) ;;
      *) echo "Aborted."; exit 1 ;;
    esac
  fi
fi

# --- Prune ---

if $PRUNE; then
  echo ""
  bold "Pruning..."
  printf "  Stopping containers..."
  $DOCKER stop $($DOCKER ps -q) 2>/dev/null || true
  printf " removing..."
  $DOCKER rm -f $($DOCKER ps -aq) 2>/dev/null || true
  printf " removing images..."
  local_images=$($DOCKER images -q 2>/dev/null) || true
  [ -n "$local_images" ] && $DOCKER rmi -f $local_images 2>/dev/null || true
  printf " system prune..."
  $DOCKER system prune -a -f > /dev/null 2>&1 || true
  echo " done."
fi

# --- Stop anything on port 3000 ---

if $IS_COMPOSE; then
  (cd "$SERVERS_DIR" && $COMPOSE -f "${SERVER}/docker-compose.yml" down -v) 2>/dev/null || true
else
  $DOCKER rm -f "$IMAGE" 2>/dev/null || true
fi

# --- Build ---

echo ""
echo "  Note: First build pulls base images and installs dependencies (1–2 minutes)."
echo "  Subsequent builds are cached and much faster."
if echo "$RUST_SERVERS" | grep -qw "$SERVER"; then
  echo ""
  echo "  Rust builds compile ~300 dependencies on first run (5–8 minutes)."
  echo "  For a quick start, try: ./run-server.sh express-sqlite"
fi
echo ""

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOGFILE="/tmp/alap-run-${SERVER}-${TIMESTAMP}.log"

bold "Building ${SERVER}..."
echo "  Log: ${LOGFILE}"
echo ""

touch "$LOGFILE"
( tail -f "$LOGFILE" | sed 's/^/    │ /' ) &
tail_pid=$!

start_time=$SECONDS

if $IS_COMPOSE; then
  if ! (cd "$SERVERS_DIR" && $COMPOSE -f "${SERVER}/docker-compose.yml" build) > "$LOGFILE" 2>&1; then
    kill -- -"$tail_pid" 2>/dev/null || kill "$tail_pid" 2>/dev/null; wait "$tail_pid" 2>/dev/null || true
    echo ""
    red "BUILD FAILED — see ${LOGFILE}"
    tail -5 "$LOGFILE" 2>/dev/null | sed 's/^/    /'
    exit 1
  fi
else
  if ! (cd "$CONTEXT" && $DOCKER build --load -t "$IMAGE" -f "$DOCKERFILE" .) > "$LOGFILE" 2>&1; then
    kill -- -"$tail_pid" 2>/dev/null || kill "$tail_pid" 2>/dev/null; wait "$tail_pid" 2>/dev/null || true
    echo ""
    red "BUILD FAILED — see ${LOGFILE}"
    tail -5 "$LOGFILE" 2>/dev/null | sed 's/^/    /'
    exit 1
  fi
fi

kill -- -"$tail_pid" 2>/dev/null || kill "$tail_pid" 2>/dev/null; wait "$tail_pid" 2>/dev/null || true

echo ""
echo "Build completed in $(( SECONDS - start_time ))s"

# --- Run ---

echo ""
bold "Starting ${SERVER} on http://localhost:3000"
if $IS_COMPOSE; then
  echo "  Stop with: cd examples/servers && ${COMPOSE} -f ${SERVER}/docker-compose.yml down -v"
else
  echo "  Stop with: ${DOCKER} rm -f ${IMAGE}"
fi
echo "  Log: ${LOGFILE}"
echo ""

# Restart tail for the run phase
( tail -f "$LOGFILE" | sed 's/^/    │ /' ) &
tail_pid=$!

if $IS_COMPOSE; then
  (cd "$SERVERS_DIR" && $COMPOSE -f "${SERVER}/docker-compose.yml" up) >> "$LOGFILE" 2>&1
else
  $DOCKER run --rm --init --name "$IMAGE" -p 3000:3000 "$IMAGE" >> "$LOGFILE" 2>&1
fi
