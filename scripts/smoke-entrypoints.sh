#!/usr/bin/env bash
#
# Smoke test for npm package entrypoints.
# Verifies each subpath export resolves correctly after npm pack + install.
#
# Usage:
#   ./scripts/smoke-entrypoints.sh
#
# Prerequisites:
#   pnpm build && npm pack (creates alap-*.tgz)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PASS=0
FAIL=0
ERRORS=""

red()   { printf '\033[0;31m%s\033[0m' "$1"; }
green() { printf '\033[0;32m%s\033[0m' "$1"; }
bold()  { printf '\033[1m%s\033[0m' "$1"; }

assert_ok() {
  local label="$1"
  local code="$2"
  if node --input-type=module -e "$code" > /dev/null 2>&1; then
    PASS=$((PASS + 1))
    echo "  $(green '✓') ${label}"
  else
    FAIL=$((FAIL + 1))
    ERRORS="${ERRORS}\n  ✗ ${label}"
    echo "  $(red '✗') ${label}"
    # Show the error
    node --input-type=module -e "$code" 2>&1 | head -3 | sed 's/^/    /'
  fi
}

assert_fails() {
  local label="$1"
  local code="$2"
  local expected_error="$3"
  local output
  if output=$(node --input-type=module -e "$code" 2>&1); then
    FAIL=$((FAIL + 1))
    ERRORS="${ERRORS}\n  ✗ ${label} (expected failure but succeeded)"
    echo "  $(red '✗') ${label} (expected failure)"
  elif echo "$output" | grep -q "$expected_error"; then
    PASS=$((PASS + 1))
    echo "  $(green '✓') ${label}"
  else
    FAIL=$((FAIL + 1))
    ERRORS="${ERRORS}\n  ✗ ${label} (wrong error)"
    echo "  $(red '✗') ${label} (wrong error)"
    echo "$output" | head -3 | sed 's/^/    /'
  fi
}

# --- Setup: install from tarball in a temp dir ---

TARBALL=$(ls -t "${ROOT_DIR}"/alap-*.tgz 2>/dev/null | head -1)
if [ -z "$TARBALL" ]; then
  echo "No alap-*.tgz found. Run 'pnpm build && npm pack' first."
  exit 1
fi

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo ""
bold "Alap Entrypoint Smoke Tests"
echo ""
echo "  Tarball: $(basename "$TARBALL")"
echo "  Temp dir: ${TMPDIR}"
echo ""

cd "$TMPDIR"
echo '{"type":"module","dependencies":{"alap":"file:'"$TARBALL"'"}}' > package.json
npm install > /dev/null 2>&1

echo "$(bold 'Core (no DOM needed)')"
assert_ok "alap/core — AlapEngine" \
  "import { AlapEngine } from 'alap/core'; console.assert(typeof AlapEngine === 'function');"

assert_ok "alap/core — ExpressionParser" \
  "import { ExpressionParser } from 'alap/core'; console.assert(typeof ExpressionParser === 'function');"

assert_ok "alap/core — mergeConfigs" \
  "import { mergeConfigs } from 'alap/core'; console.assert(typeof mergeConfigs === 'function');"

assert_ok "alap/core — warn" \
  "import { warn } from 'alap/core'; console.assert(typeof warn === 'function');"

assert_ok "alap/core — types resolve" \
  "import { AlapEngine } from 'alap/core'; const e = new AlapEngine({ allLinks: {} }); console.assert(e.query('.x').length === 0);"

echo ""
echo "$(bold 'Main entry (needs DOM — expected to fail in Node)')"
assert_fails "alap — fails without DOM" \
  "import { AlapUI } from 'alap';" \
  "HTMLElement"

echo ""
echo "$(bold 'Framework adapters (peer deps missing — expected to fail)')"
assert_fails "alap/react — fails without react" \
  "import { AlapProvider } from 'alap/react';" \
  "react"

assert_fails "alap/vue — fails without vue" \
  "import { AlapProvider } from 'alap/vue';" \
  "vue"

assert_fails "alap/svelte — fails without svelte" \
  "import { AlapProvider } from 'alap/svelte';" \
  "svelte"

assert_fails "alap/solid — fails without solid-js" \
  "import { AlapProvider } from 'alap/solid';" \
  "solid-js"

assert_fails "alap/storage — fails without idb" \
  "import { createIndexedDBStore } from 'alap/storage';" \
  "idb"

echo ""
echo "$(bold 'Storage (with idb peer dep installed)')"
npm install idb > /dev/null 2>&1
assert_ok "alap/storage — createRemoteStore" \
  "import { createRemoteStore } from 'alap/storage'; console.assert(typeof createRemoteStore === 'function');"

assert_ok "alap/storage — createHybridStore" \
  "import { createHybridStore } from 'alap/storage'; console.assert(typeof createHybridStore === 'function');"

assert_ok "alap/storage — createIndexedDBStore" \
  "import { createIndexedDBStore } from 'alap/storage'; console.assert(typeof createIndexedDBStore === 'function');"

# --- Summary ---

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
  echo "  $(green '✓ All entrypoint tests passed')"
  echo ""
fi
