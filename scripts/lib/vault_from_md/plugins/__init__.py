"""
Copyright 2026 Daniel Smith — Apache 2.0

SSG shortcode plugin loader.

Each plugin lives in its own module (`hugo.py`, `jekyll.py`, `mkdocs.py`,
`docusaurus.py`) and exports a single `transform(body: str) -> str`
function. The loader reads a tuple of plugin names and returns the
corresponding transform functions in the same order, to be applied in
sequence by the convert pipeline.

**Lazy loading is intentional.** Each branch uses `from . import NAME`,
which Python's import system only executes when the branch fires. A
user running with `--ssg hugo` never imports `docusaurus.py` — its
regex tables stay off the heap, and its dependencies (if any) are
never touched. This matters most for the Docusaurus plugin, since
readers have been loudly cautious about the Docusaurus npm ecosystem:
if you don't load it, you don't exercise it.

Unknown plugin names are silently dropped by the loader. The CLI layer
(`vault_convert.py`) is responsible for validating names against a
known set and warning the user before calling in — by the time the
loader sees a list, every name should already be valid. The silent-drop
behaviour here is defense in depth, not user-facing.
"""

from __future__ import annotations

from collections.abc import Callable


def load(names: tuple[str, ...]) -> list[Callable[[str], str]]:
    """
    Resolve plugin names to transform functions, preserving order.

    Args:
        names: Tuple of plugin names (e.g. `("hugo", "mkdocs")`). Names
            may appear more than once; each occurrence adds the
            corresponding transform to the output list, which means
            duplicates result in the same transform running multiple
            times. Not a use case we support but not one we block
            either; transforms are meant to be idempotent.

    Returns:
        A list of `(body: str) -> str` callables in the same order as
        `names`. Empty list when `names` is empty. Unknown names
        contribute nothing to the output.
    """
    transforms: list[Callable[[str], str]] = []
    for name in names:
        if name == "hugo":
            from . import hugo
            transforms.append(hugo.transform)
        elif name == "jekyll":
            from . import jekyll
            transforms.append(jekyll.transform)
        elif name == "mkdocs":
            from . import mkdocs
            transforms.append(mkdocs.transform)
        elif name == "docusaurus":
            from . import docusaurus
            transforms.append(docusaurus.transform)
    return transforms
