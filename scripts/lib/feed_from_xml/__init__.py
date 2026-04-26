"""
Copyright 2026 Daniel Smith — Apache 2.0

RSS / Atom feed → markdown items.

Sibling to `vault_from_md`. Parses a feed XML file into structured
items and renders them as markdown-with-frontmatter files suitable for
feeding into `vault_convert.py` as a second pass.

Two-step workflow (deliberate):

    python3 scripts/feed_to_md.py feed.xml /tmp/feed-md/
    pnpm run vault:convert /tmp/feed-md/ ~/vaults/feed --yes

Keeping the feed parser standalone means `vault_convert.py` stays
single-purpose, and feed-specific quirks (different publishers produce
different element shapes) are contained in one place.
"""

