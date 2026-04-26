# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0

"""Alap expression parser — server-side Python port of alap/core."""

from .deep_clone import DeepCloneError, deep_clone_data
from .deep_freeze import deep_freeze
from .expression_parser import (
    ExpressionParser,
    cherry_pick_links,
    merge_configs,
    resolve_expression,
)
from .link_provenance import (
    PROVENANCE_KEY,
    clone_provenance,
    get_provenance,
    is_author_tier,
    is_protocol_tier,
    is_storage_tier,
    stamp_provenance,
)
from .sanitize_by_tier import (
    sanitize_css_class_by_tier,
    sanitize_target_window_by_tier,
    sanitize_url_by_tier,
)
from .sanitize_url import (
    sanitize_url,
    sanitize_url_strict,
    sanitize_url_with_schemes,
)
from .validate_config import (
    ConfigMigrationError,
    assert_no_handlers_in_config,
    sanitize_link_urls,
    validate_config,
)
from .validate_regex import validate_regex

__all__ = [
    # Expression parsing
    "ExpressionParser",
    "cherry_pick_links",
    "merge_configs",
    "resolve_expression",
    # URL sanitization
    "sanitize_url",
    "sanitize_url_strict",
    "sanitize_url_with_schemes",
    # Tier-aware sanitization
    "sanitize_url_by_tier",
    "sanitize_css_class_by_tier",
    "sanitize_target_window_by_tier",
    # Provenance
    "PROVENANCE_KEY",
    "stamp_provenance",
    "get_provenance",
    "is_author_tier",
    "is_storage_tier",
    "is_protocol_tier",
    "clone_provenance",
    # Clone / freeze
    "deep_clone_data",
    "deep_freeze",
    "DeepCloneError",
    # Validation
    "validate_config",
    "sanitize_link_urls",
    "assert_no_handlers_in_config",
    "ConfigMigrationError",
    "validate_regex",
]
