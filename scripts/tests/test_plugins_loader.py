"""Tests for vault_from_md.plugins — the SSG plugin loader."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from vault_from_md import plugins


# Plain markdown passes through every SSG plugin unchanged (all four
# plugins operate only on their own syntax; neutral input is identity).
# This lets us exercise loader semantics using a real plugin without
# needing a dedicated test-only fixture module.
_PLAIN_MARKDOWN = "# Heading\n\nA paragraph with [a link](to.md).\n\n- list item\n"


class TestLoad:
    def test_empty_input_returns_empty_list(self) -> None:
        assert plugins.load(()) == []

    def test_known_name_loads_a_callable(self) -> None:
        transforms = plugins.load(("hugo",))
        assert len(transforms) == 1
        assert callable(transforms[0])

    def test_plugin_on_plain_markdown_is_identity(self) -> None:
        # Every plugin must leave unrelated markdown untouched — this
        # is the "non-interference" contract each plugin's own test
        # file already covers; here we exercise the integration shape:
        # load() returns callables that respect that contract.
        for name in ("hugo", "jekyll", "mkdocs", "docusaurus"):
            [transform] = plugins.load((name,))
            assert transform(_PLAIN_MARKDOWN) == _PLAIN_MARKDOWN

    def test_unknown_names_silently_dropped(self) -> None:
        # Loader's contract: drop anything it doesn't recognize. The CLI
        # is responsible for warning users; the loader stays quiet.
        assert plugins.load(("xyzzy",)) == []
        # Unknowns interspersed with a known name yield the same list
        # as the known name alone.
        assert len(plugins.load(("xyzzy", "hugo", "abcdef"))) == len(plugins.load(("hugo",)))

    def test_preserves_declared_order(self) -> None:
        # Two known plugins in different orders produce different
        # transform lists — the loader doesn't sort.
        a = plugins.load(("hugo", "mkdocs"))
        b = plugins.load(("mkdocs", "hugo"))
        assert a != b
        assert len(a) == 2

    def test_duplicates_not_deduped(self) -> None:
        # Transform lists are position-significant; the convert loop
        # applies them in order. Dropping dupes would silently change
        # behaviour for a user who names the same plugin twice.
        assert len(plugins.load(("hugo", "hugo", "hugo"))) == 3


class TestLazyImports:
    """
    Proof that the plugin architecture is lazy: importing the plugins
    package does NOT import any plugin module, and loading a plugin by
    name only imports that specific one.

    Runs in a fresh Python subprocess so previous test imports don't
    contaminate sys.modules.
    """

    def test_importing_plugins_does_not_load_any_plugin_module(self) -> None:
        # Fresh-process import of just the package should not trigger
        # any per-plugin module imports. Validates that no plugin leaks
        # into the import graph until explicitly requested.
        lib_path = str(Path(__file__).resolve().parent.parent / "lib")
        result = subprocess.run(
            [
                sys.executable, "-c",
                "import sys; "
                f"sys.path.insert(0, '{lib_path}'); "
                "from vault_from_md import plugins; "
                "modules_after_import = set(sys.modules); "
                "leaked = [m for m in modules_after_import "
                "          if m.startswith('vault_from_md.plugins.')]; "
                "print(','.join(sorted(leaked)) if leaked else 'clean')",
            ],
            capture_output=True, text=True, check=True,
        )
        assert result.stdout.strip() == "clean", (
            f"plugin modules leaked into sys.modules at import time: {result.stdout}"
        )

    def test_loading_hugo_imports_only_hugo(self) -> None:
        # After `load(("hugo",))`, sys.modules should contain
        # `vault_from_md.plugins.hugo` but not jekyll / mkdocs / docusaurus.
        # This is the main guarantee — users running --ssg hugo shouldn't
        # pay the import cost for plugins they aren't using.
        lib_path = str(Path(__file__).resolve().parent.parent / "lib")
        result = subprocess.run(
            [
                sys.executable, "-c",
                "import sys; "
                f"sys.path.insert(0, '{lib_path}'); "
                "from vault_from_md import plugins; "
                "plugins.load(('hugo',)); "
                "loaded = [m for m in sys.modules "
                "          if m.startswith('vault_from_md.plugins.')]; "
                "print(','.join(sorted(loaded)))",
            ],
            capture_output=True, text=True, check=True,
        )
        loaded = result.stdout.strip().split(",")
        assert "vault_from_md.plugins.hugo" in loaded
        for other in ("jekyll", "mkdocs", "docusaurus"):
            assert f"vault_from_md.plugins.{other}" not in loaded, (
                f"unexpected import: vault_from_md.plugins.{other} "
                f"was loaded by `plugins.load(('hugo',))`"
            )

    def test_loading_one_plugin_does_not_pull_in_siblings(self) -> None:
        # Exhaustive version — for each real plugin, loading it alone
        # should not import any other plugin module.
        lib_path = str(Path(__file__).resolve().parent.parent / "lib")
        for plugin in ("hugo", "jekyll", "mkdocs", "docusaurus"):
            result = subprocess.run(
                [
                    sys.executable, "-c",
                    "import sys; "
                    f"sys.path.insert(0, '{lib_path}'); "
                    "from vault_from_md import plugins; "
                    f"plugins.load(('{plugin}',)); "
                    "loaded = [m.rsplit('.', 1)[-1] for m in sys.modules "
                    "          if m.startswith('vault_from_md.plugins.')]; "
                    "print(','.join(sorted(loaded)))",
                ],
                capture_output=True, text=True, check=True,
            )
            loaded = set(result.stdout.strip().split(","))
            assert plugin in loaded, f"{plugin} should have been imported"
            siblings = {"hugo", "jekyll", "mkdocs", "docusaurus"} - {plugin}
            for sibling in siblings:
                assert sibling not in loaded, (
                    f"loading '{plugin}' unexpectedly pulled in '{sibling}'"
                )
