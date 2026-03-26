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
import remarkParse from 'remark-parse';
import remarkHtml from 'remark-html';
import remarkAlap from '../src/index';

async function process(md: string, options?: Parameters<typeof remarkAlap>[0]) {
  const result = await unified()
    .use(remarkParse)
    .use(remarkAlap, options)
    .use(remarkHtml, { sanitize: false })
    .process(md);
  return String(result).trim();
}

describe('remark-alap', () => {
  // --- Basic transforms ---

  it('transforms alap:@macro link', async () => {
    const html = await process('[coffee spots](alap:@coffee)');
    expect(html).toContain('<alap-link query="@coffee">coffee spots</alap-link>');
  });

  it('transforms alap:itemId link', async () => {
    const html = await process('[Golden Gate](alap:golden)');
    expect(html).toContain('<alap-link query="golden">Golden Gate</alap-link>');
  });

  it('transforms alap:.tag link', async () => {
    const html = await process('[bridges](alap:.bridge)');
    expect(html).toContain('<alap-link query=".bridge">bridges</alap-link>');
  });

  it('transforms macro for complex expression (recommended pattern)', async () => {
    // Writers use macros for expressions with spaces/operators:
    // config defines @nyc-food → .nyc + .food
    const html = await process('[NYC food](alap:@nyc-food)');
    expect(html).toContain('<alap-link query="@nyc-food">NYC food</alap-link>');
  });

  it('transforms comma-separated items (no spaces)', async () => {
    const html = await process('[items](alap:golden,brooklyn,ferry)');
    expect(html).toContain('<alap-link query="golden,brooklyn,ferry">items</alap-link>');
  });

  it('markdown breaks on spaces in URL (use macros instead)', async () => {
    // This is expected: markdown parsers don't treat spaces in URLs as valid.
    // The alap:@macro pattern exists specifically to solve this.
    const html = await process('[explore](alap:.nyc + .sf)');
    expect(html).not.toContain('alap-link');
  });

  // --- Does not transform non-alap links ---

  it('leaves regular links unchanged', async () => {
    const html = await process('[example](https://example.com)');
    expect(html).toContain('<a href="https://example.com">example</a>');
    expect(html).not.toContain('alap-link');
  });

  it('leaves mailto links unchanged', async () => {
    const html = await process('[email](mailto:test@example.com)');
    expect(html).toContain('mailto:');
    expect(html).not.toContain('alap-link');
  });

  // --- Edge cases ---

  it('ignores empty alap: link', async () => {
    const html = await process('[empty](alap:)');
    // Empty query — should not transform
    expect(html).not.toContain('alap-link');
  });

  it('markdown breaks on whitespace in query (use macros instead)', async () => {
    // Spaces in URL portion cause markdown to not parse it as a link
    const html = await process('[spots](alap:  @coffee  )');
    expect(html).not.toContain('alap-link');
  });

  it('escapes HTML in text content', async () => {
    const html = await process('[<script>alert</script>](alap:@test)');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('escapes quotes in query', async () => {
    const html = await process('[test](alap:a"b)');
    expect(html).toContain('query="a&quot;b"');
  });

  // --- Multiple links in one document ---

  it('transforms multiple alap links in the same paragraph', async () => {
    const html = await process(
      'Visit [coffee](alap:@coffee) or [bridges](alap:.bridge) today.',
    );
    expect(html).toContain('<alap-link query="@coffee">coffee</alap-link>');
    expect(html).toContain('<alap-link query=".bridge">bridges</alap-link>');
  });

  it('mixes alap and regular links', async () => {
    const html = await process(
      'See [coffee](alap:@coffee) and [example](https://example.com).',
    );
    expect(html).toContain('<alap-link query="@coffee">coffee</alap-link>');
    expect(html).toContain('<a href="https://example.com">example</a>');
  });

  // --- Inline formatting in link text ---

  it('extracts text from bold link content', async () => {
    const html = await process('[**bold spots**](alap:@favorites)');
    expect(html).toContain('>bold spots</alap-link>');
  });

  it('extracts text from mixed inline formatting', async () => {
    const html = await process('[*italic* and `code`](alap:.tag)');
    expect(html).toContain('>italic and code</alap-link>');
  });

  // --- Options ---

  it('supports custom tagName', async () => {
    const html = await process('[test](alap:@foo)', { tagName: 'x-alap' });
    expect(html).toContain('<x-alap query="@foo">test</x-alap>');
  });

  it('supports custom queryAttr', async () => {
    const html = await process('[test](alap:@foo)', { queryAttr: 'data-query' });
    expect(html).toContain('data-query="@foo"');
  });

  it('supports className option', async () => {
    const html = await process('[test](alap:@foo)', { className: 'alap' });
    expect(html).toContain('class="alap"');
  });

  it('combines all options', async () => {
    const html = await process('[test](alap:@foo)', {
      tagName: 'my-link',
      queryAttr: 'expr',
      className: 'custom',
    });
    expect(html).toContain('<my-link expr="@foo" class="custom">test</my-link>');
  });
});
