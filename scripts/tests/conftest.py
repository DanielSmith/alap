"""
Copyright 2026 Daniel Smith — Apache 2.0

pytest conftest for the vault-converter test suite.

Adds `scripts/lib/` to `sys.path` so the test files can import
`vault_from_md.*` without needing an install step. Repo-local testing
convention — mirrors how the scripts themselves bootstrap their import
path.
"""

from __future__ import annotations

import sys
from pathlib import Path

_LIB_PATH = Path(__file__).resolve().parent.parent / "lib"
if str(_LIB_PATH) not in sys.path:
    sys.path.insert(0, str(_LIB_PATH))
