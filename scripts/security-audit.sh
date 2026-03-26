#!/usr/bin/env bash
#
# Copyright 2026 Daniel Smith
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# Security audit for the Alap monorepo.
# Walks all package.json files, runs dependency audits, security tests,
# and lockfile integrity checks.
#
# Usage:
#   ./scripts/security-audit.sh
#
# Exit codes:
#   0 — all checks passed
#   1 — one or more checks failed
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PASS=0
FAIL=0
WARN=0
ERRORS=""

red()   { printf '\033[0;31m%s\033[0m' "$1"; }
green() { printf '\033[0;32m%s\033[0m' "$1"; }
yellow(){ printf '\033[0;33m%s\033[0m' "$1"; }
bold()  { printf '\033[1m%s\033[0m' "$1"; }

pass() {
  PASS=$((PASS + 1))
  echo "  $(green '✓') $1"
}

fail() {
  FAIL=$((FAIL + 1))
  ERRORS="${ERRORS}\n  ✗ $1"
  echo "  $(red '✗') $1"
}

warn() {
  WARN=$((WARN + 1))
  echo "  $(yellow '⚠') $1"
}

# ─────────────────────────────────────────────
# 1. Dependency audit — all workspaces
# ─────────────────────────────────────────────

echo ""
bold "1. Dependency Audit"
echo ""

cd "$ROOT_DIR"

# Main workspace
if pnpm audit --audit-level=high > /dev/null 2>&1; then
  pass "alap (root) — no known vulnerabilities"
else
  fail "alap (root) — vulnerabilities found"
  pnpm audit --audit-level=high 2>&1 | tail -20 | sed 's/^/    /'
fi

# Walk sub-packages that have their own lockfiles
for pkg in $(find . -name "package.json" -not -path "*/node_modules/*" -not -path "./package.json" | sort); do
  dir=$(dirname "$pkg")
  name=$(basename "$dir")

  # Only audit if the directory has its own lockfile or node_modules
  if [ -f "$dir/pnpm-lock.yaml" ] || [ -f "$dir/package-lock.json" ]; then
    if (cd "$dir" && pnpm audit --audit-level=high > /dev/null 2>&1); then
      pass "$dir — no known vulnerabilities"
    else
      fail "$dir — vulnerabilities found"
    fi
  else
    # No lockfile means it uses the root workspace — already audited
    pass "$dir — uses root workspace (already audited)"
  fi
done

# ─────────────────────────────────────────────
# 2. Security test suites
# ─────────────────────────────────────────────

echo ""
bold "2. Security Tests"
echo ""

cd "$ROOT_DIR"

security_tests=(
  "tests/core/sanitize-url.test.ts"
  "tests/core/validate-regex.test.ts"
  "tests/core/validate-config.test.ts"
  "tests/core/tier24-web-protocol.test.ts"
)

for test_file in "${security_tests[@]}"; do
  if [ -f "$test_file" ]; then
    test_name=$(basename "$test_file" .test.ts)
    if pnpm vitest run "$test_file" --reporter=verbose > /tmp/alap-sec-"$test_name".log 2>&1; then
      count=$(grep -c "✓\|✓" /tmp/alap-sec-"$test_name".log 2>/dev/null || echo "?")
      pass "$test_name ($count assertions)"
    else
      fail "$test_name — FAILED"
      tail -10 /tmp/alap-sec-"$test_name".log | sed 's/^/    /'
    fi
  else
    warn "$test_file — not found (skipped)"
  fi
done

# ─────────────────────────────────────────────
# 3. Dangerous pattern scan
# ─────────────────────────────────────────────

echo ""
bold "3. Dangerous Code Patterns"
echo ""

cd "$ROOT_DIR"

# Patterns to scan for in source code (not tests, not node_modules, not vendored)
# Excludes: other-languages/, vendor/, *.min.js
SCAN_EXCLUDE="--exclude-dir=other-languages --exclude-dir=vendor --exclude=*.min.js"

declare -A patterns
patterns=(
  ["eval("]='[^.]eval\s*\('
  ["new Function("]='new\s+Function\s*\('
  ["dangerouslySetInnerHTML"]='dangerouslySetInnerHTML'
  ["document.write"]='document\.write\s*\('
  ["child_process"]="require\s*\(\s*['\"]child_process"
  ["insertAdjacentHTML"]='insertAdjacentHTML'
)

for name in "${!patterns[@]}"; do
  matches=$(grep -rE "${patterns[$name]}" src/ --include="*.ts" --include="*.js" $SCAN_EXCLUDE -l 2>/dev/null || true)
  if [ -z "$matches" ]; then
    pass "No '$name' in src/"
  else
    count=$(echo "$matches" | wc -l | tr -d ' ')
    warn "'$name' found in $count file(s):"
    echo "$matches" | sed 's/^/      /'
  fi
done

# innerHTML — special case (check for non-empty assignment)
# Only flag innerHTML that isn't clearing (innerHTML = '')
innerHTML_all=$(grep -rn 'innerHTML' src/ --include="*.ts" --include="*.js" $SCAN_EXCLUDE 2>/dev/null || true)
if [ -z "$innerHTML_all" ]; then
  pass "No innerHTML usage in src/"
else
  # Separate safe (clearing) from potentially unsafe
  innerHTML_safe=$(echo "$innerHTML_all" | grep -E "innerHTML\s*=\s*['\"]['\"]" || true)
  innerHTML_other=$(echo "$innerHTML_all" | grep -vE "innerHTML\s*=\s*['\"]['\"]" || true)

  if [ -z "$innerHTML_other" ]; then
    safe_count=$(echo "$innerHTML_safe" | wc -l | tr -d ' ')
    pass "innerHTML used $safe_count time(s) — all are safe (clearing only)"
  else
    count=$(echo "$innerHTML_all" | wc -l | tr -d ' ')
    warn "innerHTML found in $count location(s) — verify manually:"
    echo "$innerHTML_all" | sed 's/^/      /'
  fi
fi

# ─────────────────────────────────────────────
# 4. Lockfile integrity
# ─────────────────────────────────────────────

echo ""
bold "4. Lockfile Integrity"
echo ""

cd "$ROOT_DIR"

if [ -f "pnpm-lock.yaml" ]; then
  # Check that lockfile is up to date with package.json
  if pnpm install --frozen-lockfile > /dev/null 2>&1; then
    pass "pnpm-lock.yaml is in sync with package.json"
  else
    fail "pnpm-lock.yaml is out of sync — run 'pnpm install' to update"
  fi
else
  fail "No pnpm-lock.yaml found at root"
fi

# ─────────────────────────────────────────────
# 5. Production dependency count
# ─────────────────────────────────────────────

echo ""
bold "5. Production Dependencies"
echo ""

cd "$ROOT_DIR"

prod_deps=$(node -e "
  const pkg = require('./package.json');
  const deps = Object.keys(pkg.dependencies || {});
  console.log(deps.length + ' runtime dependencies');
  deps.forEach(d => console.log('  - ' + d));
" 2>/dev/null || echo "0 runtime dependencies")

dep_count=$(echo "$prod_deps" | head -1 | grep -oE '[0-9]+')

if [ "$dep_count" = "0" ]; then
  pass "Zero runtime dependencies"
else
  warn "$prod_deps"
fi

# Check peer deps for awareness
peer_deps=$(node -e "
  const pkg = require('./package.json');
  const peers = Object.keys(pkg.peerDependencies || {});
  console.log(peers.length);
  peers.forEach(d => console.log('  - ' + d));
" 2>/dev/null || echo "0")

peer_count=$(echo "$peer_deps" | head -1)
if [ "$peer_count" != "0" ]; then
  echo "  ℹ  $peer_count peer dependencies (shipped only when consumer installs):"
  echo "$peer_deps" | tail -n +2 | sed 's/^/  /'
fi

# ─────────────────────────────────────────────
# 6. GitHub Actions SHA pinning
# ─────────────────────────────────────────────

echo ""
bold "6. GitHub Actions SHA Pinning"
echo ""

cd "$ROOT_DIR"

sha_issues=0
for wf in .github/workflows/*.yml; do
  if [ ! -f "$wf" ]; then
    warn "No workflow files found in .github/workflows/"
    break
  fi

  # Find 'uses:' lines that reference a mutable tag (e.g., @v4, @v3.1)
  # instead of a 40-character hex SHA
  mutable=$(grep -nE 'uses:\s+\S+@v[0-9]' "$wf" 2>/dev/null || true)
  if [ -n "$mutable" ]; then
    sha_issues=$((sha_issues + 1))
    fail "$wf — mutable version tags found (pin to SHA):"
    echo "$mutable" | sed 's/^/      /'
  fi
done

if [ "$sha_issues" -eq 0 ]; then
  pass "All GitHub Actions pinned to commit SHAs"
fi

# ─────────────────────────────────────────────
# 7. Cross-language security tests
# ─────────────────────────────────────────────

echo ""
bold "7. Cross-Language Security Tests"
echo ""

OTHER_LANGS="$ROOT_DIR/src/other-languages"

# Rust
if [ -d "$OTHER_LANGS/rust" ] && command -v cargo > /dev/null 2>&1; then
  echo "  Rust:"
  if (cd "$OTHER_LANGS/rust" && cargo test --test validate_config_test --test ssrf_guard_test > /tmp/alap-sec-rust.log 2>&1); then
    count=$(grep -c "^test .* ok$" /tmp/alap-sec-rust.log 2>/dev/null || echo "?")
    pass "Rust security tests ($count passed)"
  else
    fail "Rust security tests — FAILED"
    tail -10 /tmp/alap-sec-rust.log | sed 's/^/    /'
  fi
else
  warn "Rust — cargo not found or directory missing (skipped)"
fi

# Python
if [ -d "$OTHER_LANGS/python" ] && command -v python3 > /dev/null 2>&1; then
  echo "  Python:"
  if (cd "$OTHER_LANGS/python" && python3 -m pytest tests/test_validate_config.py tests/test_validate_regex.py tests/test_ssrf_guard.py -q > /tmp/alap-sec-python.log 2>&1); then
    count=$(grep -oE '[0-9]+ passed' /tmp/alap-sec-python.log | head -1)
    pass "Python security tests ($count)"
  else
    fail "Python security tests — FAILED"
    tail -10 /tmp/alap-sec-python.log | sed 's/^/    /'
  fi
else
  warn "Python — python3 not found or directory missing (skipped)"
fi

# PHP
if [ -d "$OTHER_LANGS/php" ] && command -v php > /dev/null 2>&1; then
  echo "  PHP:"
  if (cd "$OTHER_LANGS/php" && vendor/bin/phpunit tests/ValidateConfigTest.php tests/ValidateRegexTest.php tests/SsrfGuardTest.php > /tmp/alap-sec-php.log 2>&1); then
    count=$(grep -oE 'Tests: [0-9]+' /tmp/alap-sec-php.log | head -1)
    pass "PHP security tests ($count)"
  else
    fail "PHP security tests — FAILED"
    tail -10 /tmp/alap-sec-php.log | sed 's/^/    /'
  fi
else
  warn "PHP — php not found or directory missing (skipped)"
fi

# Go
if [ -d "$OTHER_LANGS/go" ] && command -v go > /dev/null 2>&1; then
  echo "  Go:"
  if (cd "$OTHER_LANGS/go" && go test -run 'ValidateConfig|IsPrivateHost' -v > /tmp/alap-sec-go.log 2>&1); then
    count=$(grep -c "^    --- PASS\|^--- PASS" /tmp/alap-sec-go.log 2>/dev/null || echo "?")
    pass "Go security tests ($count passed)"
  else
    fail "Go security tests — FAILED"
    tail -10 /tmp/alap-sec-go.log | sed 's/^/    /'
  fi
else
  warn "Go — go not found or directory missing (skipped)"
fi

# ─────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
total=$((PASS + FAIL + WARN))
echo "  $(bold 'Security Audit Results')"
echo "  $(green "✓ $PASS passed")  $(yellow "⚠ $WARN warnings")  $(red "✗ $FAIL failed")"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "  $(red 'Failures:')"
  printf "$ERRORS\n"
  echo ""
  exit 1
else
  echo ""
  if [ $WARN -gt 0 ]; then
    echo "  $(yellow 'Review warnings above — no blockers found.')"
  else
    echo "  $(green '✓ All security checks passed.')"
  fi
  echo ""
fi
