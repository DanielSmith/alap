/**
 * Copyright 2026 Daniel Smith
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeUrlByTier,
  sanitizeCssClassByTier,
  sanitizeTargetWindowByTier,
} from '../../src/core/sanitizeByTier';
import { sanitizeUrlStrict } from '../../src/core/sanitizeUrl';
import { stampProvenance } from '../../src/core/linkProvenance';
import type { AlapLink } from '../../src/core/types';

/**
 * Phase 6 Step 1 — additive tier-aware sanitizer primitives.
 *
 * Policy: fail-closed. Only the 'author' provenance tier gets loose
 * treatment. Everything else — protocol:*, storage:*, and importantly
 * unstamped links — gets the strict sanitizer / dropped cssClass /
 * clamped target. Unstamped arrives only when a renderer is fed a link
 * that bypassed validateConfig and the engine's auto-validate; treat it
 * as suspicious.
 */

function makeLink(): AlapLink {
  return { url: 'https://example.com/', label: 'link' };
}

describe('sanitizeUrlStrict primitive', () => {
  it('allows http, https, mailto, and relative URLs', () => {
    expect(sanitizeUrlStrict('https://example.com/a')).toBe('https://example.com/a');
    expect(sanitizeUrlStrict('http://example.com/a')).toBe('http://example.com/a');
    expect(sanitizeUrlStrict('mailto:hello@example.com')).toBe('mailto:hello@example.com');
    expect(sanitizeUrlStrict('/relative/path')).toBe('/relative/path');
    expect(sanitizeUrlStrict('#fragment')).toBe('#fragment');
  });

  it('rejects tel, ftp, and custom schemes not on the allowlist', () => {
    expect(sanitizeUrlStrict('tel:+14155551212')).toBe('about:blank');
    expect(sanitizeUrlStrict('ftp://example.com/a')).toBe('about:blank');
    expect(sanitizeUrlStrict('custom-scheme://whatever')).toBe('about:blank');
  });

  it('rejects the dangerous scheme set the base sanitizer already blocks', () => {
    expect(sanitizeUrlStrict('javascript:alert(1)')).toBe('about:blank');
    expect(sanitizeUrlStrict('data:text/html,<script>alert(1)</script>')).toBe('about:blank');
    expect(sanitizeUrlStrict('vbscript:msgbox(1)')).toBe('about:blank');
    expect(sanitizeUrlStrict('blob:abcd')).toBe('about:blank');
  });
});

describe('sanitizeUrlByTier — author gets loose, everyone else gets strict', () => {
  it('author-tier: allows tel: and other loose-tier schemes', () => {
    const link = makeLink();
    stampProvenance(link, 'author');
    expect(sanitizeUrlByTier('tel:+14155551212', link)).toBe('tel:+14155551212');
    expect(sanitizeUrlByTier('https://example.com/', link)).toBe('https://example.com/');
  });

  it('protocol-tier: strict — blocks tel:, permits https/mailto', () => {
    const link = makeLink();
    stampProvenance(link, 'protocol:web');
    expect(sanitizeUrlByTier('tel:+14155551212', link)).toBe('about:blank');
    expect(sanitizeUrlByTier('https://example.com/', link)).toBe('https://example.com/');
    expect(sanitizeUrlByTier('mailto:a@b.com', link)).toBe('mailto:a@b.com');
  });

  it('storage-tier: strict (both local and remote)', () => {
    const local = makeLink();
    const remote = makeLink();
    stampProvenance(local, 'storage:local');
    stampProvenance(remote, 'storage:remote');
    expect(sanitizeUrlByTier('tel:+14155551212', local)).toBe('about:blank');
    expect(sanitizeUrlByTier('tel:+14155551212', remote)).toBe('about:blank');
  });

  it('unstamped: strict (fail-closed)', () => {
    const link = makeLink();
    // Intentionally not stamped — should be treated as untrusted.
    expect(sanitizeUrlByTier('tel:+14155551212', link)).toBe('about:blank');
    expect(sanitizeUrlByTier('javascript:alert(1)', link)).toBe('about:blank');
    expect(sanitizeUrlByTier('https://example.com/', link)).toBe('https://example.com/');
  });
});

describe('sanitizeUrlStrict extraSchemes — widening with library ceiling', () => {
  it('passes through baseline schemes when no extras requested', () => {
    expect(sanitizeUrlStrict('https://example.com/')).toBe('https://example.com/');
    expect(sanitizeUrlStrict('mailto:a@b.com')).toBe('mailto:a@b.com');
  });

  it('unions extraSchemes on top of baseline (does not narrow)', () => {
    // obsidian is in SCHEME_CEILING; extras add to baseline, never replace it.
    expect(sanitizeUrlStrict('obsidian://open?vault=V', ['obsidian'])).toBe('obsidian://open?vault=V');
    expect(sanitizeUrlStrict('https://example.com/', ['obsidian'])).toBe('https://example.com/');
    expect(sanitizeUrlStrict('mailto:a@b.com', ['obsidian'])).toBe('mailto:a@b.com');
  });

  it('drops extraSchemes outside the library ceiling', () => {
    // vscode/slack/javascript are NOT in SCHEME_CEILING — silently filtered out.
    expect(sanitizeUrlStrict('vscode://file/etc/passwd', ['vscode'])).toBe('about:blank');
    expect(sanitizeUrlStrict('slack://open', ['slack'])).toBe('about:blank');
    expect(sanitizeUrlStrict('javascript:alert(1)', ['javascript'])).toBe('about:blank');
  });

  it('careless handler: ceiling holds even with mixed allowed/disallowed extras', () => {
    // Even if the handler stamps a list that includes javascript, the ceiling
    // intersects it down to just the blessed schemes.
    expect(sanitizeUrlStrict('obsidian://open', ['obsidian', 'javascript'])).toBe('obsidian://open');
    expect(sanitizeUrlStrict('javascript:alert(1)', ['obsidian', 'javascript'])).toBe('about:blank');
  });

  it('empty extraSchemes list collapses to baseline behavior', () => {
    expect(sanitizeUrlStrict('obsidian://open', [])).toBe('about:blank');
    expect(sanitizeUrlStrict('https://example.com/', [])).toBe('https://example.com/');
  });
});

describe('sanitizeUrlByTier honors link.allowedSchemes for non-author tiers', () => {
  it('protocol tier with allowedSchemes=["obsidian"] permits obsidian://', () => {
    const link: AlapLink = { url: 'obsidian://open', allowedSchemes: ['obsidian'] };
    stampProvenance(link, 'protocol:obsidian');
    expect(sanitizeUrlByTier('obsidian://open?vault=V&file=F', link)).toBe('obsidian://open?vault=V&file=F');
  });

  it('protocol tier without allowedSchemes still strips obsidian:// (default strict)', () => {
    const link = makeLink();
    stampProvenance(link, 'protocol:obsidian');
    expect(sanitizeUrlByTier('obsidian://open', link)).toBe('about:blank');
  });

  it('protocol tier cannot widen past the ceiling via link.allowedSchemes', () => {
    const link: AlapLink = { url: 'vscode://x', allowedSchemes: ['vscode', 'javascript'] };
    stampProvenance(link, 'protocol:web');
    expect(sanitizeUrlByTier('vscode://file/etc/passwd', link)).toBe('about:blank');
    expect(sanitizeUrlByTier('javascript:alert(1)', link)).toBe('about:blank');
  });

  it('storage tier with allowedSchemes is also bounded by the ceiling', () => {
    // (validateConfig should strip allowedSchemes from storage-tier links
    // before they reach this point — but this asserts the sanitizer's own
    // defense holds even if the field somehow survives.)
    const link: AlapLink = { url: 'vscode://x', allowedSchemes: ['vscode'] };
    stampProvenance(link, 'storage:local');
    expect(sanitizeUrlByTier('vscode://anything', link)).toBe('about:blank');
  });

  it('author tier ignores allowedSchemes (already gets loose sanitizer)', () => {
    const link: AlapLink = { url: 'tel:+14155551212', allowedSchemes: ['vscode'] };
    stampProvenance(link, 'author');
    // Loose sanitizer permits tel:; allowedSchemes is irrelevant on this path.
    expect(sanitizeUrlByTier('tel:+14155551212', link)).toBe('tel:+14155551212');
  });
});

describe('sanitizeCssClassByTier — author keeps, everyone else drops', () => {
  it('author-tier preserves cssClass exactly', () => {
    const link = makeLink();
    stampProvenance(link, 'author');
    expect(sanitizeCssClassByTier('highlight', link)).toBe('highlight');
    expect(sanitizeCssClassByTier('a b c', link)).toBe('a b c');
  });

  it('protocol-tier drops cssClass', () => {
    const link = makeLink();
    stampProvenance(link, 'protocol:web');
    expect(sanitizeCssClassByTier('highlight', link)).toBeUndefined();
  });

  it('storage-tier drops cssClass', () => {
    const link = makeLink();
    stampProvenance(link, 'storage:local');
    expect(sanitizeCssClassByTier('highlight', link)).toBeUndefined();
  });

  it('unstamped drops cssClass (fail-closed)', () => {
    const link = makeLink();
    expect(sanitizeCssClassByTier('highlight', link)).toBeUndefined();
  });

  it('undefined input returns undefined regardless of tier', () => {
    const link = makeLink();
    stampProvenance(link, 'author');
    expect(sanitizeCssClassByTier(undefined, link)).toBeUndefined();
  });
});

describe('sanitizeTargetWindowByTier — author keeps, everyone else clamps to _blank', () => {
  it('author-tier preserves targetWindow', () => {
    const link = makeLink();
    stampProvenance(link, 'author');
    expect(sanitizeTargetWindowByTier('_self', link)).toBe('_self');
    expect(sanitizeTargetWindowByTier('_top', link)).toBe('_top');
    expect(sanitizeTargetWindowByTier('named-window', link)).toBe('named-window');
  });

  it('protocol-tier clamps _top/_self/_parent/named to _blank', () => {
    const link = makeLink();
    stampProvenance(link, 'protocol:web');
    expect(sanitizeTargetWindowByTier('_top', link)).toBe('_blank');
    expect(sanitizeTargetWindowByTier('_self', link)).toBe('_blank');
    expect(sanitizeTargetWindowByTier('_parent', link)).toBe('_blank');
    expect(sanitizeTargetWindowByTier('named-window', link)).toBe('_blank');
  });

  it('storage-tier clamps to _blank', () => {
    const link = makeLink();
    stampProvenance(link, 'storage:local');
    expect(sanitizeTargetWindowByTier('_top', link)).toBe('_blank');
  });

  it('unstamped clamps to _blank (fail-closed)', () => {
    const link = makeLink();
    expect(sanitizeTargetWindowByTier('_top', link)).toBe('_blank');
  });

  it('author-tier with undefined input stays undefined (caller fallback chain applies)', () => {
    const link = makeLink();
    stampProvenance(link, 'author');
    expect(sanitizeTargetWindowByTier(undefined, link)).toBeUndefined();
  });

  it('non-author with undefined input still clamps to _blank (no fallback inheritance)', () => {
    // Non-author must not pick up an author-configured default target window
    // via the caller's `?? options.defaultTargetWindow ?? 'fromAlap'` chain;
    // clamp unconditionally.
    const protocol = makeLink();
    stampProvenance(protocol, 'protocol:web');
    expect(sanitizeTargetWindowByTier(undefined, protocol)).toBe('_blank');

    const unstamped = makeLink();
    expect(sanitizeTargetWindowByTier(undefined, unstamped)).toBe('_blank');
  });
});
