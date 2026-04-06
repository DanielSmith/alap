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
echo "=== Podman (alap-* images and containers only) ==="
ALAP_CONTAINERS=$(podman ps -a --filter "ancestor=alap-*" --format "{{.ID}} {{.Image}}" 2>/dev/null || true)
ALAP_IMAGES=$(podman images --format "{{.ID}} {{.Repository}}" 2>/dev/null | grep -E '\balap-' || true)

if [[ -z "$ALAP_CONTAINERS" && -z "$ALAP_IMAGES" ]]; then
  echo "  (no alap containers or images found)"
else
  if [[ -n "$ALAP_CONTAINERS" ]]; then
    echo "$ALAP_CONTAINERS" | while read -r id image; do
      if $DRY_RUN; then
        echo "  would remove container: $id ($image)"
      else
        echo "  removing container: $id ($image)"
        podman rm --force "$id"
      fi
    done
  fi

  if [[ -n "$ALAP_IMAGES" ]]; then
    echo "$ALAP_IMAGES" | while read -r id repo; do
      if $DRY_RUN; then
        echo "  would remove image: $id ($repo)"
      else
        echo "  removing image: $id ($repo)"
        podman rmi --force "$id"
      fi
    done
  fi
fi

echo ""
if $DRY_RUN; then
  echo "Dry run complete. Run with --force to execute."
else
  echo "Clean. Ready for a fresh 'pnpm install'."
fi
