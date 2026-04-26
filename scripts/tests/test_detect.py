"""Tests for vault_from_md.detect — SSG auto-detection."""

from __future__ import annotations

from pathlib import Path

import pytest

from vault_from_md.detect import detect_ssgs, which_config


def _touch(p: Path, content: str = "") -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content)


class TestDetectHugo:
    def test_hugo_toml_detected(self, tmp_path: Path) -> None:
        _touch(tmp_path / "hugo.toml", 'baseURL = "https://example.com/"\n')
        assert detect_ssgs(tmp_path) == ("hugo",)

    def test_hugo_yaml_detected(self, tmp_path: Path) -> None:
        _touch(tmp_path / "hugo.yaml", "baseURL: https://example.com/\n")
        assert detect_ssgs(tmp_path) == ("hugo",)

    def test_config_toml_detected_as_hugo(self, tmp_path: Path) -> None:
        # Older Hugo sites use `config.toml` rather than `hugo.toml`.
        _touch(tmp_path / "config.toml", "baseURL = \"x\"\n")
        assert detect_ssgs(tmp_path) == ("hugo",)

    def test_hugo_json_detected(self, tmp_path: Path) -> None:
        _touch(tmp_path / "hugo.json", '{"baseURL": "x"}\n')
        assert detect_ssgs(tmp_path) == ("hugo",)


class TestDetectJekyll:
    def test_config_yml_detected(self, tmp_path: Path) -> None:
        _touch(tmp_path / "_config.yml", "title: My Site\n")
        assert detect_ssgs(tmp_path) == ("jekyll",)

    def test_config_yaml_alt_extension(self, tmp_path: Path) -> None:
        _touch(tmp_path / "_config.yaml", "title: My Site\n")
        assert detect_ssgs(tmp_path) == ("jekyll",)


class TestDetectMkDocs:
    def test_mkdocs_yml_detected(self, tmp_path: Path) -> None:
        _touch(tmp_path / "mkdocs.yml", "site_name: My Docs\n")
        assert detect_ssgs(tmp_path) == ("mkdocs",)

    def test_mkdocs_yaml_alt_extension(self, tmp_path: Path) -> None:
        _touch(tmp_path / "mkdocs.yaml", "site_name: My Docs\n")
        assert detect_ssgs(tmp_path) == ("mkdocs",)


class TestDetectDocusaurus:
    def test_docusaurus_js_detected(self, tmp_path: Path) -> None:
        _touch(tmp_path / "docusaurus.config.js", "module.exports = {};\n")
        assert detect_ssgs(tmp_path) == ("docusaurus",)

    def test_docusaurus_ts_detected(self, tmp_path: Path) -> None:
        _touch(tmp_path / "docusaurus.config.ts", "export default {};\n")
        assert detect_ssgs(tmp_path) == ("docusaurus",)

    def test_docusaurus_mjs_detected(self, tmp_path: Path) -> None:
        _touch(tmp_path / "docusaurus.config.mjs", "export default {};\n")
        assert detect_ssgs(tmp_path) == ("docusaurus",)


class TestDetectNone:
    def test_empty_dir_returns_empty(self, tmp_path: Path) -> None:
        assert detect_ssgs(tmp_path) == ()

    def test_unrelated_files_return_empty(self, tmp_path: Path) -> None:
        _touch(tmp_path / "README.md")
        _touch(tmp_path / "LICENSE")
        _touch(tmp_path / "package.json")
        assert detect_ssgs(tmp_path) == ()

    def test_missing_source_returns_empty(self, tmp_path: Path) -> None:
        # `detect_ssgs` is meant to be a best-effort hint; missing
        # paths shouldn't crash the preview.
        assert detect_ssgs(tmp_path / "does-not-exist") == ()

    def test_file_instead_of_directory_returns_empty(self, tmp_path: Path) -> None:
        f = tmp_path / "actually-a-file"
        f.write_text("x")
        assert detect_ssgs(f) == ()


class TestDetectMultiple:
    def test_hugo_and_mkdocs_both_fire(self, tmp_path: Path) -> None:
        # Unusual but possible — a repo with both config files. Detector
        # reports both; CLI surfaces both and lets the user pick.
        _touch(tmp_path / "hugo.toml", "")
        _touch(tmp_path / "mkdocs.yml", "")
        result = detect_ssgs(tmp_path)
        assert "hugo" in result
        assert "mkdocs" in result

    def test_order_is_stable(self, tmp_path: Path) -> None:
        # Fixed output order makes CLI preview output deterministic
        # regardless of filesystem walk order.
        _touch(tmp_path / "docusaurus.config.js", "")
        _touch(tmp_path / "hugo.toml", "")
        assert detect_ssgs(tmp_path) == ("hugo", "docusaurus")


class TestWhichConfig:
    def test_returns_specific_matching_path(self, tmp_path: Path) -> None:
        f = tmp_path / "hugo.toml"
        _touch(f)
        assert which_config(tmp_path, "hugo") == f

    def test_returns_first_match_when_multiple_hugo_configs(self, tmp_path: Path) -> None:
        # Real repos rarely have both hugo.yaml and hugo.toml but if they
        # do, detector reports *something* consistent rather than nothing.
        _touch(tmp_path / "hugo.yaml")
        _touch(tmp_path / "hugo.toml")
        result = which_config(tmp_path, "hugo")
        assert result is not None
        assert result.name in {"hugo.yaml", "hugo.toml"}

    def test_returns_none_when_nothing_matches(self, tmp_path: Path) -> None:
        assert which_config(tmp_path, "hugo") is None

    def test_returns_none_for_unknown_ssg(self, tmp_path: Path) -> None:
        _touch(tmp_path / "hugo.toml")
        assert which_config(tmp_path, "gatsby") is None
