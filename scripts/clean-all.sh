#!/usr/bin/env bash
# Reset to a fresh-checkout state: remove all caches, dependencies, and build artifacts
#
# Usage:
#   ./scripts/clean-all.sh           # dry run (show what would be removed)
#   ./scripts/clean-all.sh --force   # actually remove everything

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DRY_RUN=true

if [[ "${1:-}" == "--force" ]]; then
  DRY_RUN=false
fi

remove_dirs() {
  local label="$1"
  local name="$2"

  echo "=== $label ==="
  local dirs
  dirs=$(find "$REPO_ROOT" -name "$name" -type d -prune 2>/dev/null)

  if [[ -z "$dirs" ]]; then
    echo "  (none found)"
    return
  fi

  echo "$dirs" | while read -r dir; do
    if $DRY_RUN; then
      echo "  would remove: $dir"
    else
      echo "  removing: $dir"
      rm -rf "$dir"
    fi
  done
}

if $DRY_RUN; then
  echo "DRY RUN — pass --force to actually remove"
  echo ""
fi

remove_dirs "node_modules" "node_modules"
echo ""
remove_dirs "dist" "dist"
echo ""
remove_dirs "dist-tgz" "dist-tgz"
echo ""
remove_dirs ".turbo cache" ".turbo"
echo ""

echo "=== pnpm store ==="
if $DRY_RUN; then
  echo "  would run: pnpm store prune"
else
  pnpm store prune
fi

echo ""
echo "=== Podman ==="
if $DRY_RUN; then
  echo "  would run: podman system prune --all --force"
  echo "  would run: podman volume prune --force"
else
  podman system prune --all --force
  podman volume prune --force
fi

echo ""
if $DRY_RUN; then
  echo "Dry run complete. Run with --force to execute."
else
  echo "Clean. Ready for a fresh 'pnpm install'."
fi
