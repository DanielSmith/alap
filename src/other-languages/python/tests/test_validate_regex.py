import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from validate_regex import validate_regex


# ---------------------------------------------------------------------------
# Valid patterns
# ---------------------------------------------------------------------------

def test_valid_simple_pattern():
    assert validate_regex("bridge")["safe"] is True


def test_valid_anchored_pattern():
    assert validate_regex("^foo$")["safe"] is True


def test_valid_character_class():
    assert validate_regex("[a-z]+")["safe"] is True


def test_safe_quantified_group():
    assert validate_regex("(abc)+")["safe"] is True


def test_safe_alternation_group():
    assert validate_regex("(a|b)*")["safe"] is True


# ---------------------------------------------------------------------------
# Invalid / dangerous patterns
# ---------------------------------------------------------------------------

def test_invalid_syntax_unclosed_bracket():
    result = validate_regex("[unclosed")
    assert result["safe"] is False


def test_nested_quantifier_a_plus_plus():
    result = validate_regex("(a+)+")
    assert result["safe"] is False
    assert "Nested quantifier" in result["reason"]


def test_nested_quantifier_a_star_star_b():
    result = validate_regex("(a*)*b")
    assert result["safe"] is False
    assert "Nested quantifier" in result["reason"]


def test_nested_quantifier_word_plus():
    result = validate_regex(r"(\w+\w+)+")
    assert result["safe"] is False
    assert "Nested quantifier" in result["reason"]
