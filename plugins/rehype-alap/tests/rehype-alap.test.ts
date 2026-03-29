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
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import rehypeAlap from '../src/index';

async function process(html: string, options?: Parameters<typeof rehypeAlap>[0]) {
  const result = await unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeAlap, options)
    .use(rehypeStringify)
    .process(html);
  return String(result).trim();
}

describe('rehype-alap', () => {
  // --- Basic transforms ---

  it('transforms alap:.tag link', async () => {
    const html = await process('<a href="alap:.coffee">coffee spots</a>');
    expect(html).toBe('<alap-link query=".coffee">coffee spots</alap-link>');
  });

  it('transforms alap:@macro link', async () => {
    const html = await process('<a href="alap:@nycfood">NYC food</a>');
    expect(html).toBe('<alap-link query="@nycfood">NYC food</alap-link>');
  });

  it('transforms alap:itemId link', async () => {
    const html = await process('<a href="alap:golden">Golden Gate</a>');
    expect(html).toBe('<alap-link query="golden">Golden Gate</alap-link>');
  });

  it('transforms comma-separated IDs', async () => {
    const html = await process('<a href="alap:golden,brooklyn">picks</a>');
    expect(html).toBe('<alap-link query="golden,brooklyn">picks</alap-link>');
  });

  // --- Children preservation ---

  it('preserves plain text content', async () => {
    const html = await process('<a href="alap:.bridge">famous bridges</a>');
    expect(html).toContain('>famous bridges<');
  });

  it('preserves nested children', async () => {
    const html = await process('<a href="alap:.coffee"><strong>bold</strong> text</a>');
    expect(html).toBe('<alap-link query=".coffee"><strong>bold</strong> text</alap-link>');
  });

  it('preserves deeply nested children', async () => {
    const html = await process('<a href="alap:.x"><em><strong>deep</strong></em></a>');
    expect(html).toContain('<em><strong>deep</strong></em>');
    expect(html).toContain('alap-link');
  });

  // --- Non-alap links untouched ---

  it('ignores https links', async () => {
    const html = await process('<a href="https://example.com">link</a>');
    expect(html).toBe('<a href="https://example.com">link</a>');
  });

  it('ignores mailto links', async () => {
    const html = await process('<a href="mailto:x@y.com">email</a>');
    expect(html).toBe('<a href="mailto:x@y.com">email</a>');
  });

  it('ignores hash links', async () => {
    const html = await process('<a href="#">top</a>');
    expect(html).toBe('<a href="#">top</a>');
  });

  it('ignores links with no href', async () => {
    const html = await process('<a>bare anchor</a>');
    expect(html).toBe('<a>bare anchor</a>');
  });

  // --- Attribute handling ---

  it('strips href after transform', async () => {
    const html = await process('<a href="alap:.coffee">spots</a>');
    expect(html).not.toContain('href');
  });

  it('preserves class from original anchor', async () => {
    const html = await process('<a href="alap:.coffee" class="highlight">spots</a>');
    expect(html).toContain('class="highlight"');
    expect(html).toContain('query=".coffee"');
  });

  it('preserves id from original anchor', async () => {
    const html = await process('<a href="alap:.coffee" id="my-link">spots</a>');
    expect(html).toContain('id="my-link"');
  });

  it('preserves data attributes from original anchor', async () => {
    const html = await process('<a href="alap:.coffee" data-section="intro">spots</a>');
    expect(html).toContain('data-section="intro"');
  });

  // --- Options ---

  it('className option adds class to output', async () => {
    const html = await process('<a href="alap:.coffee">spots</a>', { className: 'cms-link' });
    expect(html).toContain('class="cms-link"');
  });

  it('className merges with existing class', async () => {
    const html = await process('<a href="alap:.coffee" class="highlight">spots</a>', { className: 'cms-link' });
    expect(html).toContain('highlight');
    expect(html).toContain('cms-link');
  });

  it('tagName option overrides output element', async () => {
    const html = await process('<a href="alap:.coffee">spots</a>', { tagName: 'x-alap' });
    expect(html).toBe('<x-alap query=".coffee">spots</x-alap>');
  });

  it('queryAttr option overrides query attribute name', async () => {
    const html = await process('<a href="alap:.coffee">spots</a>', { queryAttr: 'data-query' });
    expect(html).toContain('data-query=".coffee"');
    // The default "query" attribute should not appear (data-query replaces it)
    expect(html).not.toMatch(/ query="/);
  });

  // --- Edge cases ---

  it('skips empty query (alap: with nothing after)', async () => {
    const html = await process('<a href="alap:">empty</a>');
    expect(html).toBe('<a href="alap:">empty</a>');
  });

  it('skips whitespace-only query', async () => {
    const html = await process('<a href="alap:   ">spaces</a>');
    expect(html).toBe('<a href="alap:   ">spaces</a>');
  });

  it('trims whitespace from query', async () => {
    const html = await process('<a href="alap: .coffee ">spots</a>');
    expect(html).toContain('query=".coffee"');
  });

  it('transforms multiple alap links in one document', async () => {
    const html = await process(
      '<p><a href="alap:.coffee">coffee</a> and <a href="alap:.bridge">bridges</a></p>',
    );
    expect(html).toContain('<alap-link query=".coffee">coffee</alap-link>');
    expect(html).toContain('<alap-link query=".bridge">bridges</alap-link>');
  });

  it('transforms alap links while leaving non-alap links alone', async () => {
    const html = await process(
      '<p><a href="alap:.coffee">coffee</a> and <a href="https://example.com">example</a></p>',
    );
    expect(html).toContain('<alap-link query=".coffee">coffee</alap-link>');
    expect(html).toContain('<a href="https://example.com">example</a>');
  });

  it('handles non-a elements without errors', async () => {
    const html = await process('<div><p>Just text</p><span>more</span></div>');
    expect(html).toContain('<div><p>Just text</p><span>more</span></div>');
  });

  // --- Idempotency ---

  it('running twice produces same output as once', async () => {
    const once = await process('<a href="alap:.coffee">spots</a>');
    const twice = await process(once);
    expect(twice).toBe(once);
  });

  // --- Operators (work but not recommended) ---

  it('passes through operators in query if present', async () => {
    const html = await process('<a href="alap:.nyc+.bridge">bridges</a>');
    expect(html).toContain('query=".nyc+.bridge"');
  });

  // --- Security ---

  it('attribute injection in href is neutralized by AST parsing', async () => {
    // rehype parses the href as a single attribute value — the &quot; entities
    // become part of the string, not attribute boundaries. The "onclick" text
    // appears inside the query value (HTML-encoded), not as a separate attribute.
    const html = await process('<a href="alap:.x&quot; onclick=&quot;alert(1)">test</a>');
    expect(html).toContain('alap-link');
    // No actual onclick attribute — just the text inside the query value
    expect(html).not.toMatch(/ onclick="/);
  });

  it('script tags in document are not affected by plugin', async () => {
    // Plugin only touches <a> elements — scripts pass through
    // (rehype-sanitize should be used in pipelines that render user content)
    const html = await process('<a href="alap:.coffee">spots</a><script>alert(1)</script>');
    expect(html).toContain('<alap-link query=".coffee">spots</alap-link>');
  });
});
