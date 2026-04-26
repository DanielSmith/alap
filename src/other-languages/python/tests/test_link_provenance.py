# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

"""Tests for link_provenance — tier-stamping utilities."""

import sys
import os

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from link_provenance import (
    PROVENANCE_KEY,
    clone_provenance,
    get_provenance,
    is_author_tier,
    is_protocol_tier,
    is_storage_tier,
    stamp_provenance,
)


class TestStampAndGet:
    def test_stamp_author_then_read(self):
        link = {"url": "/a"}
        stamp_provenance(link, "author")
        assert get_provenance(link) == "author"

    def test_stamp_storage_local(self):
        link = {"url": "/a"}
        stamp_provenance(link, "storage:local")
        assert get_provenance(link) == "storage:local"

    def test_stamp_storage_remote(self):
        link = {"url": "/a"}
        stamp_provenance(link, "storage:remote")
        assert get_provenance(link) == "storage:remote"

    def test_stamp_protocol(self):
        link = {"url": "/a"}
        stamp_provenance(link, "protocol:web")
        assert get_provenance(link) == "protocol:web"

    def test_unstamped_returns_none(self):
        assert get_provenance({"url": "/a"}) is None

    def test_stamp_overwrites_existing(self):
        link = {"url": "/a"}
        stamp_provenance(link, "author")
        stamp_provenance(link, "protocol:web")
        assert get_provenance(link) == "protocol:web"

    def test_stamp_uses_reserved_key(self):
        link = {"url": "/a"}
        stamp_provenance(link, "author")
        assert PROVENANCE_KEY in link
        assert link[PROVENANCE_KEY] == "author"


class TestInvalidTier:
    def test_rejects_unknown_tier(self):
        with pytest.raises(ValueError):
            stamp_provenance({"url": "/a"}, "admin")

    def test_rejects_typo_author(self):
        with pytest.raises(ValueError):
            stamp_provenance({"url": "/a"}, "Author")

    def test_rejects_empty(self):
        with pytest.raises(ValueError):
            stamp_provenance({"url": "/a"}, "")

    def test_rejects_non_string(self):
        with pytest.raises(ValueError):
            stamp_provenance({"url": "/a"}, 42)  # type: ignore[arg-type]

    def test_accepts_any_protocol_suffix(self):
        # protocol:<anything> is allowed — handler name can be anything
        link = {"url": "/a"}
        stamp_provenance(link, "protocol:custom_handler_42")
        assert get_provenance(link) == "protocol:custom_handler_42"


class TestTierPredicates:
    def test_is_author_true_for_author(self):
        link = {"url": "/a"}
        stamp_provenance(link, "author")
        assert is_author_tier(link) is True
        assert is_storage_tier(link) is False
        assert is_protocol_tier(link) is False

    def test_is_storage_true_for_local(self):
        link = {"url": "/a"}
        stamp_provenance(link, "storage:local")
        assert is_author_tier(link) is False
        assert is_storage_tier(link) is True
        assert is_protocol_tier(link) is False

    def test_is_storage_true_for_remote(self):
        link = {"url": "/a"}
        stamp_provenance(link, "storage:remote")
        assert is_storage_tier(link) is True

    def test_is_protocol_true_for_protocol_web(self):
        link = {"url": "/a"}
        stamp_provenance(link, "protocol:web")
        assert is_author_tier(link) is False
        assert is_storage_tier(link) is False
        assert is_protocol_tier(link) is True

    def test_all_false_for_unstamped(self):
        link = {"url": "/a"}
        assert is_author_tier(link) is False
        assert is_storage_tier(link) is False
        assert is_protocol_tier(link) is False


class TestCloneProvenance:
    def test_copies_stamp_to_dest(self):
        src = {"url": "/a"}
        stamp_provenance(src, "protocol:web")
        dest = {"url": "/b"}
        clone_provenance(src, dest)
        assert get_provenance(dest) == "protocol:web"

    def test_no_op_when_src_unstamped(self):
        src = {"url": "/a"}
        dest = {"url": "/b"}
        clone_provenance(src, dest)
        assert get_provenance(dest) is None
        assert PROVENANCE_KEY not in dest

    def test_overwrites_existing_stamp_on_dest(self):
        src = {"url": "/a"}
        stamp_provenance(src, "storage:remote")
        dest = {"url": "/b"}
        stamp_provenance(dest, "author")
        clone_provenance(src, dest)
        assert get_provenance(dest) == "storage:remote"
