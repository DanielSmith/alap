# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

"""Tests for the Python expression parser — mirrors the TS test tiers."""

import sys
from pathlib import Path

import pytest

# Add parent to path so we can import the parser
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from expression_parser import (
    ExpressionParser,
    cherry_pick_links,
    merge_configs,
    resolve_expression,
)
from sanitize_url import sanitize_url

# ---------------------------------------------------------------------------
# Test config — mirrors tests/fixtures/links.ts
# ---------------------------------------------------------------------------

TEST_CONFIG = {
    "settings": {"listType": "ul", "menuTimeout": 5000},
    "macros": {
        "cars": {"linkItems": "vwbug, bmwe36"},
        "nycbridges": {"linkItems": ".nyc + .bridge"},
        "everything": {"linkItems": ".nyc | .sf"},
    },
    "searchPatterns": {
        "bridges": "bridge",
        "germanCars": {
            "pattern": "VW|BMW",
            "options": {"fields": "l", "limit": 5},
        },
    },
    "allLinks": {
        "vwbug": {
            "label": "VW Bug",
            "url": "https://example.com/vwbug",
            "tags": ["car", "vw", "germany"],
        },
        "bmwe36": {
            "label": "BMW E36",
            "url": "https://example.com/bmwe36",
            "tags": ["car", "bmw", "germany"],
        },
        "miata": {
            "label": "Mazda Miata",
            "url": "https://example.com/miata",
            "tags": ["car", "mazda", "japan"],
        },
        "brooklyn": {
            "label": "Brooklyn Bridge",
            "url": "https://example.com/brooklyn",
            "tags": ["nyc", "bridge", "landmark"],
        },
        "manhattan": {
            "label": "Manhattan Bridge",
            "url": "https://example.com/manhattan",
            "tags": ["nyc", "bridge"],
        },
        "highline": {
            "label": "The High Line",
            "url": "https://example.com/highline",
            "tags": ["nyc", "park", "landmark"],
        },
        "centralpark": {
            "label": "Central Park",
            "url": "https://example.com/centralpark",
            "tags": ["nyc", "park"],
        },
        "goldengate": {
            "label": "Golden Gate",
            "url": "https://example.com/goldengate",
            "tags": ["sf", "bridge", "landmark"],
        },
        "dolores": {
            "label": "Dolores Park",
            "url": "https://example.com/dolores",
            "tags": ["sf", "park"],
        },
        "towerbridge": {
            "label": "Tower Bridge",
            "url": "https://example.com/towerbridge",
            "tags": ["london", "bridge", "landmark"],
        },
        "aqus": {
            "label": "Aqus Cafe",
            "url": "https://example.com/aqus",
            "tags": ["coffee", "sf"],
        },
        "bluebottle": {
            "label": "Blue Bottle",
            "url": "https://example.com/bluebottle",
            "tags": ["coffee", "sf", "nyc"],
        },
        "acre": {
            "label": "Acre Coffee",
            "url": "https://example.com/acre",
            "tags": ["coffee"],
        },
    },
}


@pytest.fixture
def parser():
    return ExpressionParser(TEST_CONFIG)


# ---------------------------------------------------------------------------
# Tier 1 — Operands
# ---------------------------------------------------------------------------


class TestOperands:
    def test_single_item_id(self, parser):
        assert parser.query("vwbug") == ["vwbug"]

    def test_single_class(self, parser):
        result = parser.query(".car")
        assert sorted(result) == ["bmwe36", "miata", "vwbug"]

    def test_nonexistent_item(self, parser):
        assert parser.query("doesnotexist") == []

    def test_nonexistent_class(self, parser):
        assert parser.query(".doesnotexist") == []


# ---------------------------------------------------------------------------
# Tier 2 — Commas
# ---------------------------------------------------------------------------


class TestCommas:
    def test_two_items(self, parser):
        assert parser.query("vwbug, bmwe36") == ["vwbug", "bmwe36"]

    def test_three_items(self, parser):
        assert parser.query("vwbug, bmwe36, miata") == ["vwbug", "bmwe36", "miata"]

    def test_item_and_class(self, parser):
        result = parser.query("vwbug, .sf")
        assert result[0] == "vwbug"
        assert "goldengate" in result
        assert "dolores" in result

    def test_deduplication(self, parser):
        result = parser.query("vwbug, vwbug")
        assert result == ["vwbug"]


# ---------------------------------------------------------------------------
# Tier 3 — Operators
# ---------------------------------------------------------------------------


class TestOperators:
    def test_intersection(self, parser):
        result = parser.query(".nyc + .bridge")
        assert sorted(result) == ["brooklyn", "manhattan"]

    def test_union(self, parser):
        result = parser.query(".nyc | .sf")
        assert "brooklyn" in result
        assert "goldengate" in result

    def test_subtraction(self, parser):
        result = parser.query(".nyc - .bridge")
        assert "brooklyn" not in result
        assert "manhattan" not in result
        assert "highline" in result
        assert "centralpark" in result


# ---------------------------------------------------------------------------
# Tier 4 — Chained operators
# ---------------------------------------------------------------------------


class TestChained:
    def test_three_way_intersection(self, parser):
        result = parser.query(".nyc + .bridge + .landmark")
        assert result == ["brooklyn"]

    def test_union_then_subtract(self, parser):
        result = parser.query(".nyc | .sf - .bridge")
        # Left-to-right: (.nyc | .sf) - .bridge
        assert "brooklyn" not in result
        assert "manhattan" not in result
        assert "goldengate" not in result
        assert "highline" in result


# ---------------------------------------------------------------------------
# Tier 5 — Mixed
# ---------------------------------------------------------------------------


class TestMixed:
    def test_item_and_class_intersection(self, parser):
        result = parser.query("brooklyn + .landmark")
        assert result == ["brooklyn"]

    def test_class_union_with_item(self, parser):
        result = parser.query(".car | goldengate")
        assert "vwbug" in result
        assert "goldengate" in result


# ---------------------------------------------------------------------------
# Tier 6 — Macros
# ---------------------------------------------------------------------------


class TestMacros:
    def test_named_macro(self, parser):
        result = parser.query("@cars")
        assert sorted(result) == ["bmwe36", "vwbug"]

    def test_macro_with_operators(self, parser):
        result = parser.query("@nycbridges")
        assert sorted(result) == ["brooklyn", "manhattan"]

    def test_unknown_macro(self, parser):
        result = parser.query("@nonexistent")
        assert result == []

    def test_bare_macro_with_anchor(self, parser):
        # Bare @ uses anchorId
        config_with_macro = {
            **TEST_CONFIG,
            "macros": {**TEST_CONFIG["macros"], "myanchor": {"linkItems": "vwbug"}},
        }
        p = ExpressionParser(config_with_macro)
        result = p.query("@", "myanchor")
        assert result == ["vwbug"]


# ---------------------------------------------------------------------------
# Tier 7 — Parentheses
# ---------------------------------------------------------------------------


class TestParentheses:
    def test_basic_grouping(self, parser):
        # Without parens: .nyc | .sf + .bridge => (.nyc | .sf) + .bridge (left-to-right)
        # With parens: .nyc | (.sf + .bridge) => .nyc union (sf bridges)
        without = parser.query(".nyc | .sf + .bridge")
        with_parens = parser.query(".nyc | (.sf + .bridge)")
        # with_parens should include all NYC items + goldengate
        assert "highline" in with_parens
        assert "centralpark" in with_parens
        assert "goldengate" in with_parens

    def test_nested_parens(self, parser):
        result = parser.query("((.nyc + .bridge) | (.sf + .bridge))")
        assert sorted(result) == ["brooklyn", "goldengate", "manhattan"]

    def test_parens_with_subtraction(self, parser):
        result = parser.query("(.nyc | .sf) - .park")
        assert "centralpark" not in result
        assert "dolores" not in result
        assert "brooklyn" in result


# ---------------------------------------------------------------------------
# Tier 8 — Edge cases
# ---------------------------------------------------------------------------


class TestEdgeCases:
    def test_empty_string(self, parser):
        assert parser.query("") == []

    def test_whitespace_only(self, parser):
        assert parser.query("   ") == []

    def test_none_expression(self, parser):
        assert parser.query(None) == []

    def test_empty_config(self):
        p = ExpressionParser({"allLinks": {}})
        assert p.query(".car") == []

    def test_no_alllinks(self):
        p = ExpressionParser({})
        assert p.query("vwbug") == []


# ---------------------------------------------------------------------------
# Convenience functions
# ---------------------------------------------------------------------------


class TestConvenience:
    def test_resolve_expression(self):
        results = resolve_expression(TEST_CONFIG, ".car + .germany")
        ids = [r["id"] for r in results]
        assert sorted(ids) == ["bmwe36", "vwbug"]
        # Each result should have id, label, url, tags
        for r in results:
            assert "id" in r
            assert "label" in r
            assert "url" in r

    def test_cherry_pick_links(self):
        result = cherry_pick_links(TEST_CONFIG, "vwbug, miata")
        assert "vwbug" in result
        assert "miata" in result
        assert "bmwe36" not in result

    def test_merge_configs(self):
        config1 = {
            "allLinks": {"a": {"label": "A", "url": "https://a.com"}},
            "macros": {"m1": {"linkItems": "a"}},
        }
        config2 = {
            "allLinks": {"b": {"label": "B", "url": "https://b.com"}},
            "macros": {"m2": {"linkItems": "b"}},
        }
        merged = merge_configs(config1, config2)
        assert "a" in merged["allLinks"]
        assert "b" in merged["allLinks"]
        assert "m1" in merged["macros"]
        assert "m2" in merged["macros"]

    def test_merge_configs_later_wins(self):
        config1 = {"allLinks": {"a": {"label": "Old", "url": "https://old.com"}}}
        config2 = {"allLinks": {"a": {"label": "New", "url": "https://new.com"}}}
        merged = merge_configs(config1, config2)
        assert merged["allLinks"]["a"]["label"] == "New"


# ---------------------------------------------------------------------------
# URL sanitization
# ---------------------------------------------------------------------------


class TestSanitizeUrl:
    def test_safe_urls(self):
        assert sanitize_url("https://example.com") == "https://example.com"
        assert sanitize_url("http://example.com") == "http://example.com"
        assert sanitize_url("mailto:user@example.com") == "mailto:user@example.com"
        assert sanitize_url("/relative/path") == "/relative/path"
        assert sanitize_url("") == ""

    def test_javascript_blocked(self):
        assert sanitize_url("javascript:alert(1)") == "about:blank"
        assert sanitize_url("JAVASCRIPT:alert(1)") == "about:blank"
        assert sanitize_url("JavaScript:void(0)") == "about:blank"

    def test_data_blocked(self):
        assert sanitize_url("data:text/html,<h1>Hi</h1>") == "about:blank"

    def test_vbscript_blocked(self):
        assert sanitize_url("vbscript:MsgBox") == "about:blank"

    def test_blob_blocked(self):
        assert sanitize_url("blob:https://example.com/uuid") == "about:blank"

    def test_control_chars_stripped(self):
        assert sanitize_url("java\nscript:alert(1)") == "about:blank"
        assert sanitize_url("java\tscript:alert(1)") == "about:blank"

    def test_sanitize_in_resolve(self):
        """Ensure resolve_expression sanitizes URLs."""
        config = {
            "allLinks": {
                "bad": {
                    "label": "Evil",
                    "url": "javascript:alert(1)",
                    "tags": ["test"],
                },
                "good": {
                    "label": "Good",
                    "url": "https://example.com",
                    "tags": ["test"],
                },
            }
        }
        results = resolve_expression(config, ".test")
        urls = {r["id"]: r["url"] for r in results}
        assert urls["bad"] == "about:blank"
        assert urls["good"] == "https://example.com"

    def test_sanitize_in_cherry_pick(self):
        """Ensure cherry_pick_links sanitizes URLs."""
        config = {
            "allLinks": {
                "bad": {
                    "label": "Evil",
                    "url": "javascript:alert(1)",
                    "tags": ["test"],
                },
            }
        }
        result = cherry_pick_links(config, ".test")
        assert result["bad"]["url"] == "about:blank"


# ---------------------------------------------------------------------------
# Protocol config for tests
# ---------------------------------------------------------------------------

def _tag_protocol(segments, link, item_id):
    """Test protocol handler: checks if the link has a given tag."""
    if not segments:
        return False
    tag = segments[0]
    return tag in (link.get("tags") or [])


def _throwing_protocol(segments, link, item_id):
    """Protocol handler that always throws."""
    raise ValueError("boom")


PROTOCOL_CONFIG = {
    **TEST_CONFIG,
    "protocols": {
        "hastag": {"handler": _tag_protocol},
        "broken": {"handler": _throwing_protocol},
    },
}


# ---------------------------------------------------------------------------
# Tier 9 — Protocols
# ---------------------------------------------------------------------------


class TestProtocols:
    def test_protocol_tokenization(self):
        """Protocol :name:arg: produces a PROTOCOL token."""
        from expression_parser import ExpressionParser
        tokens = ExpressionParser._tokenize(":time:7d:")
        assert len(tokens) == 1
        assert tokens[0].type == "PROTOCOL"
        assert tokens[0].value == "time|7d"

    def test_protocol_multi_arg_tokenization(self):
        """Protocol :name:a:b: joins segments with |."""
        from expression_parser import ExpressionParser
        tokens = ExpressionParser._tokenize(":time:7d:newest:")
        assert len(tokens) == 1
        assert tokens[0].type == "PROTOCOL"
        assert tokens[0].value == "time|7d|newest"

    def test_protocol_resolution(self):
        """Protocol resolves via handler predicate."""
        parser = ExpressionParser(PROTOCOL_CONFIG)
        result = parser.query(":hastag:coffee:")
        assert sorted(result) == ["acre", "aqus", "bluebottle"]

    def test_unknown_protocol(self):
        """Unknown protocol warns and returns empty."""
        parser = ExpressionParser(PROTOCOL_CONFIG)
        with pytest.warns(UserWarning, match="Unknown protocol"):
            result = parser.query(":nonexistent:arg:")
        assert result == []

    def test_protocol_handler_throws(self):
        """Handler that throws skips that item with a warning."""
        parser = ExpressionParser(PROTOCOL_CONFIG)
        with pytest.warns(UserWarning, match="handler threw"):
            result = parser.query(":broken:arg:")
        assert result == []

    def test_protocol_with_tag_intersection(self):
        """Protocol composed with tag operator."""
        parser = ExpressionParser(PROTOCOL_CONFIG)
        result = parser.query(":hastag:coffee: + .sf")
        assert sorted(result) == ["aqus", "bluebottle"]

    def test_protocol_with_tag_union(self):
        """Protocol composed with union."""
        parser = ExpressionParser(PROTOCOL_CONFIG)
        result = parser.query(":hastag:coffee: | .bridge")
        # coffee items + bridge items
        assert "acre" in result
        assert "brooklyn" in result
        assert "goldengate" in result

    def test_protocol_no_config(self):
        """Protocol with no protocols in config returns empty."""
        parser = ExpressionParser(TEST_CONFIG)
        with pytest.warns(UserWarning, match="Unknown protocol"):
            result = parser.query(":hastag:coffee:")
        assert result == []


# ---------------------------------------------------------------------------
# Tier 10 — Refiners
# ---------------------------------------------------------------------------


class TestRefiners:
    def test_refiner_tokenization(self):
        """Refiner *name* produces a REFINER token."""
        from expression_parser import ExpressionParser
        tokens = ExpressionParser._tokenize("*sort*")
        assert len(tokens) == 1
        assert tokens[0].type == "REFINER"
        assert tokens[0].value == "sort"

    def test_refiner_with_arg_tokenization(self):
        """Refiner *name:arg* preserves arg."""
        from expression_parser import ExpressionParser
        tokens = ExpressionParser._tokenize("*sort:label*")
        assert len(tokens) == 1
        assert tokens[0].type == "REFINER"
        assert tokens[0].value == "sort:label"

    def test_sort_refiner_default(self):
        """*sort* sorts by label (default)."""
        parser = ExpressionParser(TEST_CONFIG)
        result = parser.query(".car *sort*")
        labels = [TEST_CONFIG["allLinks"][r]["label"] for r in result]
        assert labels == sorted(labels, key=str.lower)

    def test_sort_refiner_by_url(self):
        """*sort:url* sorts by url field."""
        parser = ExpressionParser(TEST_CONFIG)
        result = parser.query(".car *sort:url*")
        urls = [TEST_CONFIG["allLinks"][r]["url"] for r in result]
        assert urls == sorted(urls, key=str.lower)

    def test_reverse_refiner(self):
        """*reverse* reverses the order."""
        parser = ExpressionParser(TEST_CONFIG)
        normal = parser.query(".car *sort*")
        reversed_result = parser.query(".car *sort* *reverse*")
        assert reversed_result == list(reversed(normal))

    def test_limit_refiner(self):
        """*limit:N* takes first N items."""
        parser = ExpressionParser(TEST_CONFIG)
        result = parser.query(".car *sort* *limit:2*")
        assert len(result) == 2

    def test_limit_zero(self):
        """*limit:0* returns empty."""
        parser = ExpressionParser(TEST_CONFIG)
        result = parser.query(".car *limit:0*")
        assert result == []

    def test_skip_refiner(self):
        """*skip:N* skips first N items."""
        parser = ExpressionParser(TEST_CONFIG)
        full = parser.query(".car *sort*")
        skipped = parser.query(".car *sort* *skip:1*")
        assert skipped == full[1:]

    def test_shuffle_refiner(self):
        """*shuffle* randomizes (just check it returns the same items)."""
        parser = ExpressionParser(TEST_CONFIG)
        result = parser.query(".car *shuffle*")
        assert sorted(result) == sorted(["vwbug", "bmwe36", "miata"])

    def test_unique_refiner(self):
        """*unique:field* deduplicates by field."""
        config = {
            "allLinks": {
                "a": {"label": "A", "url": "https://same.com", "tags": ["t"]},
                "b": {"label": "B", "url": "https://same.com", "tags": ["t"]},
                "c": {"label": "C", "url": "https://other.com", "tags": ["t"]},
            }
        }
        parser = ExpressionParser(config)
        result = parser.query(".t *unique:url*")
        urls = [config["allLinks"][r]["url"] for r in result]
        assert len(urls) == len(set(urls))
        assert len(result) == 2

    def test_unknown_refiner(self):
        """Unknown refiner warns and skips."""
        parser = ExpressionParser(TEST_CONFIG)
        with pytest.warns(UserWarning, match="Unknown refiner"):
            result = parser.query(".car *bogus*")
        # Should still return the .car items, just unrefined
        assert sorted(result) == ["bmwe36", "miata", "vwbug"]

    def test_refiner_in_parenthesized_group(self):
        """Refiners work inside parenthesized groups."""
        parser = ExpressionParser(TEST_CONFIG)
        result = parser.query("(.car *sort* *limit:1*), goldengate")
        # First segment: sorted cars limited to 1, second segment: goldengate
        assert len(result) == 2
        assert "goldengate" in result

    def test_refiner_chained_sort_limit(self):
        """Sort then limit produces sorted subset."""
        parser = ExpressionParser(TEST_CONFIG)
        sorted_all = parser.query(".car *sort*")
        sorted_limited = parser.query(".car *sort* *limit:2*")
        assert sorted_limited == sorted_all[:2]


# ---------------------------------------------------------------------------
# Tier 11 — Hyphenated identifiers
# ---------------------------------------------------------------------------


class TestHyphenatedIdentifiers:
    def test_hyphen_parsed_as_without(self):
        """Hyphenated identifiers are parsed as id MINUS id."""
        config = {
            "allLinks": {
                "my": {"label": "My", "url": "https://my.com", "tags": []},
                "item": {"label": "Item", "url": "https://item.com", "tags": []},
            }
        }
        parser = ExpressionParser(config)
        # "my-item" should be parsed as "my" MINUS "item", not as a single ID
        result = parser.query("my-item")
        # "my" minus "item" = ["my"] (since "item" is removed)
        assert result == ["my"]

    def test_hyphen_in_class_context(self):
        """Hyphen between bare words acts as subtraction."""
        parser = ExpressionParser(TEST_CONFIG)
        # vwbug-miata should be vwbug WITHOUT miata
        result = parser.query("vwbug - miata")
        assert result == ["vwbug"]
