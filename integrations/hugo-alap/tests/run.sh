#!/bin/bash
# SPDX-License-Identifier: Apache-2.0
#
# Golden file tests for hugo-alap shortcode.
# Builds the test site with Hugo (via container), then checks output for expected patterns.
#
# Usage:
#   ./run.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SITE_DIR="$SCRIPT_DIR/site"
OUTPUT_DIR="$SITE_DIR/public"
IMAGE_TAG="hugo-alap-test"

# Clean previous build
rm -rf "$OUTPUT_DIR"

# Build inside a container, copy output back out
podman build -t "$IMAGE_TAG" -f "$SCRIPT_DIR/Dockerfile" "$SCRIPT_DIR"
CONTAINER_ID=$(podman create "$IMAGE_TAG")
podman cp "$CONTAINER_ID:/src/public" "$OUTPUT_DIR"
podman rm "$CONTAINER_ID" > /dev/null

INDEX="$OUTPUT_DIR/index.html"

if [ ! -f "$INDEX" ]; then
  echo "FAIL: Hugo build did not produce $INDEX"
  exit 1
fi

PASS=0
FAIL=0

assert_contains() {
  local label="$1"
  local pattern="$2"
  if grep -qF "$pattern" "$INDEX"; then
    echo "  PASS: $label"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $label"
    echo "    expected to find: $pattern"
    FAIL=$((FAIL + 1))
  fi
}

assert_not_contains() {
  local label="$1"
  local pattern="$2"
  if grep -qF "$pattern" "$INDEX"; then
    echo "  FAIL: $label"
    echo "    should NOT contain: $pattern"
    FAIL=$((FAIL + 1))
  else
    echo "  PASS: $label"
    PASS=$((PASS + 1))
  fi
}

echo ""
echo "hugo-alap shortcode tests"
echo "========================="
echo ""

echo "Functional:"
assert_contains "positional param" '<alap-link query=".coffee">cafes</alap-link>'
assert_contains "named param" '<alap-link query=".coffee">cafes</alap-link>'
assert_contains "named with config" '<alap-link query=".coffee" config="docs">cafes</alap-link>'
# Hugo encodes + as &#43; in attributes — browsers decode it back, so the web component
# receives ".nyc + .bridge" correctly. We test for the encoded form.
assert_contains "intersection" '<alap-link query=".nyc &#43; .bridge">NYC bridges</alap-link>'
assert_contains "union" '<alap-link query=".nyc | .sf">NYC or SF</alap-link>'
assert_contains "subtraction" '<alap-link query=".nyc - .bridge">NYC without bridges</alap-link>'
assert_contains "combined operators" '<alap-link query=".nyc | .sf - .tourist">NYC or SF minus tourist</alap-link>'
assert_contains "macro" '<alap-link query="@favorites">my links</alap-link>'
assert_contains "regex" '<alap-link query="/bridge/l">regex search</alap-link>'
assert_contains "protocol" '<alap-link query=":web:api.example.com:">protocol</alap-link>'
assert_contains "refiner" '<alap-link query=".coffee *top3*">refined</alap-link>'
assert_contains "empty query passes through" 'just text'
assert_contains "inner HTML preserved" '<alap-link query=".coffee">coffee <em>spots</em></alap-link>'

echo ""
echo "Security:"
assert_not_contains "no raw script tag in query" '<script>alert(1)</script>" onmouseover'
assert_contains "script tag escaped in query attr" '&lt;script&gt;'
assert_not_contains "no unescaped double quote breaks attr" 'onmouseover="alert(1)">'
assert_not_contains "no unescaped single quote breaks attr" "onclick='alert(1)'"

echo ""
echo "Structure:"
assert_not_contains "empty query does not emit alap-link" '<alap-link query="">just text</alap-link>'

echo ""
echo "Results: $PASS passed, $FAIL failed"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "Output was:"
  cat "$INDEX"
  exit 1
fi

# Clean up
rm -rf "$OUTPUT_DIR"
