import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from validate_config import (
    ConfigMigrationError,
    _FrozenAlapConfig,
    assert_no_handlers_in_config,
    sanitize_link_urls,
    validate_config,
)
from link_provenance import (
    PROVENANCE_KEY,
    get_provenance,
    is_author_tier,
    is_protocol_tier,
    is_storage_tier,
)
import pytest
import copy


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _minimal_config():
    return {
        "allLinks": {
            "alpha": {"url": "https://example.com/alpha", "label": "Alpha"},
        }
    }


# ---------------------------------------------------------------------------
# Structural validation
# ---------------------------------------------------------------------------

def test_minimal_valid_config_passes():
    result = validate_config(_minimal_config())
    assert "allLinks" in result
    assert "alpha" in result["allLinks"]


def test_preserves_settings():
    cfg = _minimal_config()
    cfg["settings"] = {"listType": "ul", "menuTimeout": 5000}
    result = validate_config(cfg)
    assert result["settings"]["listType"] == "ul"
    assert result["settings"]["menuTimeout"] == 5000


def test_preserves_macros():
    cfg = _minimal_config()
    cfg["macros"] = {"fav": {"linkItems": "alpha"}}
    result = validate_config(cfg)
    assert result["macros"]["fav"]["linkItems"] == "alpha"


def test_preserves_search_patterns():
    cfg = _minimal_config()
    cfg["searchPatterns"] = {"bridge": "bridge"}
    result = validate_config(cfg)
    assert result["searchPatterns"]["bridge"] == "bridge"


# ---------------------------------------------------------------------------
# Non-dict inputs
# ---------------------------------------------------------------------------

def test_raises_on_none():
    with pytest.raises(ValueError, match="expected a dict"):
        validate_config(None)


def test_raises_on_string():
    with pytest.raises(ValueError, match="expected a dict"):
        validate_config("string")


def test_raises_on_list():
    with pytest.raises(ValueError, match="expected a dict"):
        validate_config([])


# ---------------------------------------------------------------------------
# allLinks validation
# ---------------------------------------------------------------------------

def test_raises_when_alllinks_missing():
    with pytest.raises(ValueError, match="allLinks"):
        validate_config({"settings": {}})


def test_raises_when_alllinks_is_list():
    with pytest.raises(ValueError, match="allLinks"):
        validate_config({"allLinks": []})


def test_skips_links_with_missing_url():
    cfg = {"allLinks": {"nourl": {"label": "No URL"}}}
    result = validate_config(cfg)
    assert "nourl" not in result["allLinks"]


def test_skips_non_dict_links():
    cfg = {"allLinks": {"bad": "not a dict", "good": {"url": "https://ok.com"}}}
    result = validate_config(cfg)
    assert "bad" not in result["allLinks"]
    assert "good" in result["allLinks"]


# ---------------------------------------------------------------------------
# URL sanitization
# ---------------------------------------------------------------------------

def test_sanitizes_javascript_url_to_about_blank():
    cfg = {"allLinks": {"xss": {"url": "javascript:alert(1)", "label": "XSS"}}}
    result = validate_config(cfg)
    assert result["allLinks"]["xss"]["url"] == "about:blank"


def test_sanitizes_javascript_in_image_field():
    cfg = {"allLinks": {
        "img": {"url": "https://safe.com", "image": "javascript:alert(1)"},
    }}
    result = validate_config(cfg)
    assert result["allLinks"]["img"]["image"] == "about:blank"


def test_leaves_safe_https_url_unchanged():
    cfg = {"allLinks": {"safe": {"url": "https://example.com"}}}
    result = validate_config(cfg)
    assert result["allLinks"]["safe"]["url"] == "https://example.com"


# ---------------------------------------------------------------------------
# Tag validation
# ---------------------------------------------------------------------------

def test_filters_non_string_tags():
    cfg = {"allLinks": {"a": {"url": "https://x.com", "tags": ["ok", 42, None]}}}
    result = validate_config(cfg)
    # Frozen config returns tuples where the raw config had lists
    assert result["allLinks"]["a"]["tags"] == ("ok",)


def test_ignores_non_list_tags():
    cfg = {"allLinks": {"a": {"url": "https://x.com", "tags": "not-a-list"}}}
    result = validate_config(cfg)
    # tags key should not be present when the source wasn't a list
    assert "tags" not in result["allLinks"]["a"]


# ---------------------------------------------------------------------------
# Hyphen rejection
# ---------------------------------------------------------------------------

def test_skips_hyphenated_item_ids():
    cfg = {"allLinks": {"bad-id": {"url": "https://x.com"}}}
    result = validate_config(cfg)
    assert "bad-id" not in result["allLinks"]


def test_skips_hyphenated_macro_names():
    cfg = _minimal_config()
    cfg["macros"] = {"my-macro": {"linkItems": "alpha"}}
    result = validate_config(cfg)
    assert "macros" not in result or "my-macro" not in result.get("macros", {})


def test_skips_hyphenated_search_pattern_keys():
    cfg = _minimal_config()
    cfg["searchPatterns"] = {"my-pattern": "bridge"}
    result = validate_config(cfg)
    assert "searchPatterns" not in result or "my-pattern" not in result.get("searchPatterns", {})


def test_strips_hyphenated_tags_but_keeps_link():
    cfg = {"allLinks": {"a": {"url": "https://x.com", "tags": ["good", "bad-tag"]}}}
    result = validate_config(cfg)
    assert "a" in result["allLinks"]
    assert result["allLinks"]["a"]["tags"] == ("good",)


def test_allows_hyphens_in_non_expression_fields():
    cfg = {"allLinks": {"a": {
        "url": "https://my-site.com",
        "label": "My-Label",
        "cssClass": "my-class",
        "description": "some-thing",
    }}}
    result = validate_config(cfg)
    link = result["allLinks"]["a"]
    assert link["url"] == "https://my-site.com"
    assert link["label"] == "My-Label"
    assert link["cssClass"] == "my-class"
    assert link["description"] == "some-thing"


# ---------------------------------------------------------------------------
# Dangerous regex removal
# ---------------------------------------------------------------------------

def test_removes_dangerous_regex_patterns():
    cfg = _minimal_config()
    cfg["searchPatterns"] = {"evil": "(a+)+"}
    result = validate_config(cfg)
    assert "searchPatterns" not in result or "evil" not in result.get("searchPatterns", {})


# ---------------------------------------------------------------------------
# Prototype-pollution / dunder blocking
# ---------------------------------------------------------------------------

def test_drops_proto_keys_from_alllinks():
    cfg = {"allLinks": {
        "__proto__": {"url": "https://evil.com"},
        "safe": {"url": "https://safe.com"},
    }}
    result = validate_config(cfg)
    assert "__proto__" not in result["allLinks"]
    assert "safe" in result["allLinks"]


def test_drops_class_dunder_keys():
    cfg = {"allLinks": {
        "__class__": {"url": "https://evil.com"},
        "ok": {"url": "https://ok.com"},
    }}
    result = validate_config(cfg)
    assert "__class__" not in result["allLinks"]
    assert "ok" in result["allLinks"]


def test_drops_bases_dunder_keys():
    cfg = {"allLinks": {
        "__bases__": {"url": "https://evil.com"},
        "ok": {"url": "https://ok.com"},
    }}
    result = validate_config(cfg)
    assert "__bases__" not in result["allLinks"]
    assert "ok" in result["allLinks"]


# ---------------------------------------------------------------------------
# Input immutability
# ---------------------------------------------------------------------------

def test_does_not_mutate_input():
    cfg = {
        "allLinks": {
            "a": {"url": "javascript:alert(1)", "tags": ["x", 42]},
        }
    }
    original = copy.deepcopy(cfg)
    validate_config(cfg)
    assert cfg == original


# ---------------------------------------------------------------------------
# 3.2 additions
# ---------------------------------------------------------------------------


class TestProvenance:
    def test_default_stamps_author(self):
        result = validate_config(_minimal_config())
        assert is_author_tier(result["allLinks"]["alpha"])
        assert get_provenance(result["allLinks"]["alpha"]) == "author"

    def test_storage_local_stamp(self):
        result = validate_config(_minimal_config(), provenance="storage:local")
        assert is_storage_tier(result["allLinks"]["alpha"])
        assert get_provenance(result["allLinks"]["alpha"]) == "storage:local"

    def test_storage_remote_stamp(self):
        result = validate_config(_minimal_config(), provenance="storage:remote")
        assert get_provenance(result["allLinks"]["alpha"]) == "storage:remote"

    def test_protocol_stamp(self):
        result = validate_config(_minimal_config(), provenance="protocol:web")
        assert is_protocol_tier(result["allLinks"]["alpha"])
        assert get_provenance(result["allLinks"]["alpha"]) == "protocol:web"

    def test_stamp_cannot_be_preset_by_input(self):
        # Input tries to pre-stamp itself as author while being loaded
        # from storage:remote. The whitelist in validate_config filters
        # _provenance out, and stamp_provenance runs after whitelist.
        cfg = {
            "allLinks": {
                "a": {"url": "https://x.com", PROVENANCE_KEY: "author"},
            }
        }
        result = validate_config(cfg, provenance="storage:remote")
        assert get_provenance(result["allLinks"]["a"]) == "storage:remote"


class TestHooksAllowlist:
    def test_author_keeps_all_hooks_verbatim(self):
        cfg = {
            "allLinks": {
                "a": {"url": "/a", "hooks": ["hover", "click", "anything"]},
            },
        }
        result = validate_config(cfg)
        assert result["allLinks"]["a"]["hooks"] == ("hover", "click", "anything")

    def test_non_author_without_allowlist_strips_all_hooks(self, recwarn):
        # No settings.hooks declared + non-author tier → fail-closed,
        # strip every hook.
        cfg = {
            "allLinks": {
                "a": {"url": "/a", "hooks": ["hover", "click"]},
            },
        }
        result = validate_config(cfg, provenance="storage:remote")
        assert "hooks" not in result["allLinks"]["a"]
        assert any("dropping" in str(w.message) for w in recwarn)

    def test_non_author_intersects_against_allowlist(self, recwarn):
        cfg = {
            "settings": {"hooks": ["hover"]},
            "allLinks": {
                "a": {"url": "/a", "hooks": ["hover", "attacker-chosen"]},
            },
        }
        result = validate_config(cfg, provenance="protocol:web")
        assert result["allLinks"]["a"]["hooks"] == ("hover",)
        assert any("attacker-chosen" in str(w.message) for w in recwarn)

    def test_non_author_fully_stripped_when_none_match(self):
        cfg = {
            "settings": {"hooks": ["approved_hook"]},
            "allLinks": {
                "a": {"url": "/a", "hooks": ["evil", "worse"]},
            },
        }
        result = validate_config(cfg, provenance="storage:remote")
        assert "hooks" not in result["allLinks"]["a"]


class TestIdempotence:
    def test_revalidate_returns_same_instance(self):
        cfg = _minimal_config()
        first = validate_config(cfg, provenance="storage:remote")
        second = validate_config(first)  # no provenance → should short-circuit
        assert first is second

    def test_revalidate_preserves_provenance(self):
        cfg = _minimal_config()
        first = validate_config(cfg, provenance="storage:remote")
        # Even if caller passes provenance="author" on re-validate, the
        # original storage:remote stamp is kept via short-circuit.
        second = validate_config(first, provenance="author")
        assert first is second
        assert get_provenance(second["allLinks"]["alpha"]) == "storage:remote"

    def test_bare_dict_not_mistaken_for_validated(self):
        # A plain dict matching the shape of a validated one must NOT
        # short-circuit — it has no stamp and must go through validation.
        cfg = _minimal_config()
        first = validate_config(cfg)
        raw_lookalike = {"allLinks": dict(cfg["allLinks"])}
        second = validate_config(raw_lookalike)
        assert first is not second


class TestAssertNoHandlersInConfig:
    def test_direct_call_rejects_generate_function(self):
        cfg = {"protocols": {"web": {"generate": lambda args, config, opts: []}}}
        with pytest.raises(ConfigMigrationError):
            assert_no_handlers_in_config(cfg)

    def test_direct_call_rejects_filter_function(self):
        cfg = {"protocols": {"custom": {"filter": lambda links: links}}}
        with pytest.raises(ConfigMigrationError):
            assert_no_handlers_in_config(cfg)

    def test_direct_call_rejects_handler_function(self):
        cfg = {"protocols": {"custom": {"handler": lambda *a: []}}}
        with pytest.raises(ConfigMigrationError):
            assert_no_handlers_in_config(cfg)

    def test_permits_data_only_protocols(self):
        cfg = {"protocols": {"web": {"keys": {"books": {"url": "..."}}}}}
        assert_no_handlers_in_config(cfg)

    def test_no_protocols_field_is_ok(self):
        assert_no_handlers_in_config({"allLinks": {}})

    def test_validate_config_raises_on_function_in_protocols(self):
        cfg = {
            "allLinks": {"a": {"url": "/a"}},
            "protocols": {"web": {"generate": lambda *a: []}},
        }
        with pytest.raises(ConfigMigrationError):
            validate_config(cfg)


class TestDeepFreezeImmutability:
    def test_top_level_mutation_raises(self):
        result = validate_config(_minimal_config())
        with pytest.raises(TypeError):
            result["settings"] = {"injected": True}

    def test_nested_mutation_raises(self):
        result = validate_config(_minimal_config())
        with pytest.raises(TypeError):
            result["allLinks"]["alpha"]["url"] = "https://evil.com"

    def test_is_frozen_alap_config_subclass(self):
        result = validate_config(_minimal_config())
        assert isinstance(result, _FrozenAlapConfig)


class TestMetaUrlSanitization:
    def test_meta_url_key_sanitized(self):
        cfg = {
            "allLinks": {
                "a": {
                    "url": "/a",
                    "meta": {"iconUrl": "javascript:alert(1)"},
                },
            },
        }
        result = validate_config(cfg)
        assert result["allLinks"]["a"]["meta"]["iconUrl"] == "about:blank"

    def test_meta_url_case_insensitive_match(self):
        cfg = {
            "allLinks": {
                "a": {
                    "url": "/a",
                    "meta": {"ImageURL": "javascript:alert(1)", "AvatarUrl": "data:text/html,x"},
                },
            },
        }
        result = validate_config(cfg)
        assert result["allLinks"]["a"]["meta"]["ImageURL"] == "about:blank"
        assert result["allLinks"]["a"]["meta"]["AvatarUrl"] == "about:blank"

    def test_meta_non_url_key_untouched(self):
        cfg = {
            "allLinks": {
                "a": {
                    "url": "/a",
                    "meta": {"author": "Someone", "rank": 1, "body": "plain text"},
                },
            },
        }
        result = validate_config(cfg)
        assert result["allLinks"]["a"]["meta"]["author"] == "Someone"
        assert result["allLinks"]["a"]["meta"]["rank"] == 1

    def test_meta_blocked_keys_recursed(self):
        cfg = {
            "allLinks": {
                "a": {
                    "url": "/a",
                    "meta": {
                        "__proto__": {"bad": True},
                        "__class__": {"bad": True},
                        "legit": "ok",
                    },
                },
            },
        }
        result = validate_config(cfg)
        meta = result["allLinks"]["a"]["meta"]
        assert "__proto__" not in meta
        assert "__class__" not in meta
        assert meta["legit"] == "ok"


class TestThumbnailSanitization:
    def test_thumbnail_sanitized(self):
        cfg = {
            "allLinks": {
                "a": {
                    "url": "/a",
                    "thumbnail": "javascript:alert(1)",
                },
            },
        }
        result = validate_config(cfg)
        assert result["allLinks"]["a"]["thumbnail"] == "about:blank"

    def test_thumbnail_valid_url_preserved(self):
        cfg = {
            "allLinks": {
                "a": {
                    "url": "/a",
                    "thumbnail": "https://example.com/thumb.jpg",
                },
            },
        }
        result = validate_config(cfg)
        assert result["allLinks"]["a"]["thumbnail"] == "https://example.com/thumb.jpg"


class TestSanitizeLinkUrlsHelper:
    def test_direct_call_sanitizes_url(self):
        out = sanitize_link_urls({"url": "javascript:alert(1)"})
        assert out["url"] == "about:blank"

    def test_direct_call_sanitizes_image(self):
        out = sanitize_link_urls({"url": "/a", "image": "data:text/html,x"})
        assert out["image"] == "about:blank"

    def test_direct_call_sanitizes_thumbnail(self):
        out = sanitize_link_urls({"url": "/a", "thumbnail": "vbscript:bad"})
        assert out["thumbnail"] == "about:blank"

    def test_direct_call_sanitizes_meta_url(self):
        out = sanitize_link_urls(
            {"url": "/a", "meta": {"coverUrl": "javascript:bad"}}
        )
        assert out["meta"]["coverUrl"] == "about:blank"

    def test_direct_call_strips_blocked_meta_keys(self):
        out = sanitize_link_urls(
            {"url": "/a", "meta": {"__proto__": {"x": 1}, "ok": "keep"}}
        )
        assert "__proto__" not in out["meta"]
        assert out["meta"]["ok"] == "keep"
