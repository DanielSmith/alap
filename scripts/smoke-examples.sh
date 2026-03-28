#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
#
# Smoke test: verify examples build against dist/ (no source aliases).
# Catches import issues that dev mode (with Vite aliases) would mask.
#
# Usage:
#   pnpm build && ./scripts/smoke-examples.sh
#
# This creates a temporary vite config without alap/* aliases and runs
# vite build for each example. If an example's imports don't resolve
# from node_modules (i.e., dist/), the build fails.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
EXAMPLES_DIR="$ROOT_DIR/examples/sites"
PASS=0
FAIL=0
SKIP=0
ERRORS=""

red()   { printf '\033[0;31m%s\033[0m' "$1"; }
green() { printf '\033[0;32m%s\033[0m' "$1"; }
dim()   { printf '\033[2m%s\033[0m' "$1"; }
bold()  { printf '\033[1m%s\033[0m' "$1"; }

# Check that dist/ exists
if [ ! -f "$ROOT_DIR/dist/index.js" ]; then
  echo "dist/ not found. Run 'pnpm build' first."
  exit 1
fi

# Create a temporary vite config with NO alap aliases.
# Imports resolve from node_modules -> workspace root -> dist/
TMPCONFIG=$(mktemp "$ROOT_DIR/examples/.vite.smoke.XXXXXX.ts")
trap 'rm -f "$TMPCONFIG"' EXIT

cat > "$TMPCONFIG" << 'VITECONFIG'
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import solid from 'vite-plugin-solid';

export default defineConfig({
  // NO alap aliases — resolve from node_modules (dist/)
  plugins: [
    vue(),
    svelte(),
    solid({ include: ['**/solid/**'], solid: { generate: 'dom' } }),
  ],
  build: {
    outDir: '/tmp/alap-smoke-build',
    emptyOutDir: true,
  },
  logLevel: 'error',
});
VITECONFIG

echo ""
bold "Alap Examples Smoke Test (build against dist/)"
echo ""

# Examples that use serve.sh with --config ../vite.config.ts pattern
for dir in "$EXAMPLES_DIR"/*/; do
  name=$(basename "$dir")

  # Skip examples that have their own package.json (workspace packages with own build)
  if [ -f "$dir/package.json" ]; then
    SKIP=$((SKIP + 1))
    echo "  $(dim '○') ${name} (workspace package — skip)"
    continue
  fi

  # Skip cdn (no vite, uses python http server) and hugo (no TS)
  if [ "$name" = "cdn" ] || [ "$name" = "hugo" ]; then
    SKIP=$((SKIP + 1))
    echo "  $(dim '○') ${name} (no vite — skip)"
    continue
  fi

  # Skip mdx (has own vite config with relative plugin imports)
  if [ "$name" = "mdx" ]; then
    SKIP=$((SKIP + 1))
    echo "  $(dim '○') ${name} (custom vite config — skip)"
    continue
  fi

  # Try building
  if (cd "$ROOT_DIR/examples" && npx vite build \
      --config "$TMPCONFIG" \
      --outDir "/tmp/alap-smoke-build/$name" \
      "sites/$name" \
    ) > /dev/null 2>&1; then
    PASS=$((PASS + 1))
    echo "  $(green '✓') ${name}"
  else
    FAIL=$((FAIL + 1))
    ERRORS="${ERRORS}\n  ✗ ${name}"
    echo "  $(red '✗') ${name}"
    # Show the error
    (cd "$ROOT_DIR/examples" && npx vite build \
      --config "$TMPCONFIG" \
      --outDir "/tmp/alap-smoke-build/$name" \
      "sites/$name" \
    ) 2>&1 | tail -5 | sed 's/^/    /'
  fi
done

# Cleanup build output
rm -rf /tmp/alap-smoke-build

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
total=$((PASS + FAIL))
echo "  $(bold 'Results:') ${PASS}/${total} passed, ${SKIP} skipped"

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "  $(red 'Failures:')"
  printf "$ERRORS\n"
  echo ""
  exit 1
else
  echo "  $(green '✓ All examples build against dist/')"
  echo ""
fi
