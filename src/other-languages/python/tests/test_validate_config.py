import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from expression_parser import validate_config
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
    assert result["allLinks"]["a"]["tags"] == ["ok"]


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
    assert result["allLinks"]["a"]["tags"] == ["good"]


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
