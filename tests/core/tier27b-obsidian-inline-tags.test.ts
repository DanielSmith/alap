/**
 * Copyright 2026 Daniel Smith
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { describe, expect, it } from 'vitest';

import {
  INLINE_TAGS_MAX_PER_NOTE,
  scanInlineTags,
} from '../../src/protocols/obsidian/inlineTags';

/**
 * Tier 27b: inline `#tag` body scanner.
 *
 * Pure unit tests against the scanner. Does not stand up a vault — see
 * tier27 for end-to-end protocol coverage.
 */

describe('scanInlineTags — canonical cases', () => {
  it('finds a single inline tag in prose', () => {
    expect(scanInlineTags('A note about #techno music.')).toEqual(['techno']);
  });

  it('finds multiple tags in prose', () => {
    expect(scanInlineTags('Tags: #techno #ambient #drum_and_bass'))
      .toEqual(['techno', 'ambient', 'drum_and_bass']);
  });

  it('matches a tag at the very start of the body', () => {
    expect(scanInlineTags('#opening tag here')).toEqual(['opening']);
  });

  it('matches a tag on a line of its own', () => {
    expect(scanInlineTags('first line\n#lonely\nthird line')).toEqual(['lonely']);
  });

  it('preserves original case in the returned value', () => {
    expect(scanInlineTags('About #CameCase and #lower tags.'))
      .toEqual(['CameCase', 'lower']);
  });

  it('returns unique tags, preserving first-occurrence order', () => {
    expect(scanInlineTags('#a #b #a #c #b'))
      .toEqual(['a', 'b', 'c']);
  });

  it('returns empty array for a body with no tags', () => {
    expect(scanInlineTags('Plain prose with no hashes.')).toEqual([]);
  });

  it('returns empty array for an empty body', () => {
    expect(scanInlineTags('')).toEqual([]);
  });
});

describe('scanInlineTags — tag shape rules', () => {
  it('allows underscores', () => {
    expect(scanInlineTags('#work_project here')).toEqual(['work_project']);
  });

  it('allows hyphens (hyphen is valid inside an Obsidian tag name)', () => {
    expect(scanInlineTags('#this-tag here')).toEqual(['this-tag']);
  });

  it('allows forward slashes (nested tag syntax) — preserved whole', () => {
    expect(scanInlineTags('#work/project here')).toEqual(['work/project']);
  });

  it('allows deep nesting — Alap stores the full string, no decomposition', () => {
    const out = scanInlineTags('#work/project/2026/q2 active');
    expect(out).toEqual(['work/project/2026/q2']);
    // Invariant: scanner must never split nested tags.
    expect(out).not.toContain('work');
    expect(out).not.toContain('project');
  });

  it('rejects leading-digit tag names (#123 is not a tag)', () => {
    expect(scanInlineTags('#123 and #2foo here')).toEqual([]);
  });

  it('rejects a leading-hyphen pseudo-tag', () => {
    expect(scanInlineTags('#-foo here')).toEqual([]);
  });

  it('rejects a bare # with no body', () => {
    expect(scanInlineTags('# alone')).toEqual([]);
  });

  it('accepts digits after the first char', () => {
    expect(scanInlineTags('#q1 and #q2_2026 planning')).toEqual(['q1', 'q2_2026']);
  });

  it('distinguishes #this-tag from #this_tag (both valid, distinct)', () => {
    expect(scanInlineTags('#this-tag and #this_tag differ.'))
      .toEqual(['this-tag', 'this_tag']);
  });
});

describe('scanInlineTags — boundary gates', () => {
  it('does not match # preceded by a non-whitespace character', () => {
    expect(scanInlineTags('email@domain.com/#anchor')).toEqual([]);
  });

  it('does not match a URL fragment', () => {
    expect(scanInlineTags('See https://example.com/path#section for details.'))
      .toEqual([]);
  });

  it('does not match an Obsidian wikilink section reference', () => {
    expect(scanInlineTags('Jump to [[note#heading]] for context.')).toEqual([]);
  });

  it('does not match inside a word', () => {
    expect(scanInlineTags('foo#bar is not a tag')).toEqual([]);
  });

  it('matches when preceded by a tab', () => {
    expect(scanInlineTags('leading\t#tabbed tag')).toEqual(['tabbed']);
  });

  it('matches when preceded by a newline', () => {
    expect(scanInlineTags('line one\n#lineTwoTag here')).toEqual(['lineTwoTag']);
  });
});

describe('scanInlineTags — headings', () => {
  it('does not mistake a heading marker for a tag', () => {
    expect(scanInlineTags('# Heading\n\nBody')).toEqual([]);
  });

  it('does not mistake subheadings (##, ###, ######) for tags', () => {
    const body = '## Two\n### Three\n###### Six\n\nend';
    expect(scanInlineTags(body)).toEqual([]);
  });

  it('finds inline tags inside a heading line', () => {
    // Obsidian does recognise tags inside heading text.
    expect(scanInlineTags('# Section about #architecture')).toEqual(['architecture']);
  });

  it('finds a tag after a heading on a later line', () => {
    expect(scanInlineTags('# Heading\n\nBody with #realtag here.'))
      .toEqual(['realtag']);
  });
});

describe('scanInlineTags — code regions', () => {
  it('skips tags inside a fenced code block', () => {
    const body = 'Before #outside\n\n```\n#inside not a tag\n```\n\nAfter #also_outside';
    expect(scanInlineTags(body)).toEqual(['outside', 'also_outside']);
  });

  it('skips tags inside a language-tagged fenced code block', () => {
    const body = 'see:\n\n```css\n.cls { color: #fff; }\n#id { color: #abc123; }\n```\n\n#realtag';
    expect(scanInlineTags(body)).toEqual(['realtag']);
  });

  it('skips tags inside inline code', () => {
    expect(scanInlineTags('The `#faketag` is code but #realtag is a tag.'))
      .toEqual(['realtag']);
  });

  it('handles an unterminated fenced code block without throwing', () => {
    const body = 'prose #before\n\n```\nnever closed\n#inside_fence';
    expect(scanInlineTags(body)).toEqual(['before']);
  });

  it('handles an unterminated inline-code backtick gracefully', () => {
    // Lone unmatched backtick leaves the body intact; tag still visible.
    const body = 'prose #tag and a lone ` backtick';
    expect(scanInlineTags(body)).toEqual(['tag']);
  });

  it('tags on either side of a code span both match', () => {
    expect(scanInlineTags('#alpha `code` #beta')).toEqual(['alpha', 'beta']);
  });
});

describe('scanInlineTags — Obsidian-idiomatic content', () => {
  it('handles a realistic mixed body', () => {
    const body = [
      '---',
      'title: Demo note',
      '---',
      '',
      '# Weekly review',
      '',
      'Worked on #alap and #ttt today.',
      '',
      'Context: [[prior-note#open-questions]] — see also the #work/project/2026 bucket.',
      '',
      '```js',
      '// #not_a_tag, inside code',
      '```',
      '',
      'Ambient listening: #ambient, #drone.',
    ].join('\n');
    expect(scanInlineTags(body))
      .toEqual(['alap', 'ttt', 'work/project/2026', 'ambient', 'drone']);
  });

  it('tolerates punctuation adjacent to tags', () => {
    expect(scanInlineTags('(#one) [#two]. "#three"?'))
      .toEqual([]);
  });

  it('matches a tag immediately before trailing punctuation', () => {
    expect(scanInlineTags('Topics: #one, #two; #three.'))
      .toEqual(['one', 'two', 'three']);
  });
});

describe('scanInlineTags — caps and safety', () => {
  it('caps output at INLINE_TAGS_MAX_PER_NOTE', () => {
    const body = Array.from(
      { length: INLINE_TAGS_MAX_PER_NOTE + 50 },
      (_, i) => `#tag_${i}`,
    ).join(' ');
    const out = scanInlineTags(body);
    expect(out.length).toBe(INLINE_TAGS_MAX_PER_NOTE);
    expect(out[0]).toBe('tag_0');
    expect(out[out.length - 1]).toBe(`tag_${INLINE_TAGS_MAX_PER_NOTE - 1}`);
  });

  it('is fast on a large tag-free body (no catastrophic backtracking)', () => {
    const body = 'x'.repeat(100_000);
    const start = Date.now();
    expect(scanInlineTags(body)).toEqual([]);
    expect(Date.now() - start).toBeLessThan(100);
  });

  it('is idempotent — scanning twice returns the same result', () => {
    const body = 'Notes with #alpha and #beta across #alpha repeats.';
    const first = scanInlineTags(body);
    const second = scanInlineTags(body);
    expect(second).toEqual(first);
  });
});
