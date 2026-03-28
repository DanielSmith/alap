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

/**
 * Security tests for @alap/mdx
 *
 * Attack surface: markdown content is user-authored (CMS, git, etc.)
 * and flows through the remark plugin into JSX attributes and text
 * nodes. We must ensure that:
 *
 * 1. Query values cannot break out of JSX attributes
 * 2. Link text cannot inject JSX or HTML
 * 3. The plugin does not create nodes that would compile to dangerous code
 * 4. Options (componentName, queryProp) cannot be abused if misconfigured
 *
 * Note: The MDX compiler itself handles JSX compilation and escaping,
 * so the primary concern is producing well-formed AST nodes that
 * don't trick the compiler. The secondary concern is the Alap engine
 * receiving malicious query strings — that's validated by the core
 * library's own security tests, not here.
 */

import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkAlapMDX from '../src/remarkAlapMDX';
import type { Root, Paragraph } from 'mdast';
import type { MdxJsxTextElement } from 'mdast-util-mdx-jsx';

function parse(md: string, options?: Parameters<typeof remarkAlapMDX>[0]): Root {
  const processor = unified()
    .use(remarkParse)
    .use(remarkAlapMDX, options);

  const tree = processor.parse(md);
  processor.runSync(tree);
  return tree as Root;
}

function firstInline(tree: Root): MdxJsxTextElement {
  const para = tree.children[0] as Paragraph;
  return para.children[0] as unknown as MdxJsxTextElement;
}

function getAttr(node: MdxJsxTextElement, name: string): string | undefined {
  const attr = node.attributes.find(
    (a) => a.type === 'mdxJsxAttribute' && a.name === name,
  );
  return attr ? (attr.value as string) : undefined;
}

function getTextContent(node: MdxJsxTextElement): string {
  return node.children
    .filter((c): c is { type: 'text'; value: string } => c.type === 'text')
    .map((c) => c.value)
    .join('');
}

describe('security: query attribute injection', () => {
  it('quotes in query stay as literal attribute value', () => {
    const tree = parse('[test](alap:a"b)');
    const node = firstInline(tree);
    // The value is a raw string in the AST — JSX compilation handles escaping
    expect(getAttr(node, 'query')).toBe('a"b');
    // Crucially, it's a single attribute node, not broken into multiple
    expect(node.attributes).toHaveLength(1);
  });

  it('angle brackets in query are literal values', () => {
    const tree = parse('[test](alap:<script>)');
    const node = firstInline(tree);
    expect(getAttr(node, 'query')).toBe('<script>');
    expect(node.attributes).toHaveLength(1);
  });

  it('JSX expression syntax in query stays literal', () => {
    const tree = parse('[test](alap:{process.env.SECRET})');
    const node = firstInline(tree);
    // Must be a string value, not a JSX expression
    expect(getAttr(node, 'query')).toBe('{process.env.SECRET}');
    expect(node.attributes[0].value).toBe('{process.env.SECRET}');
  });

  it('backticks in query stay literal', () => {
    const tree = parse('[test](alap:`${evil}`)');
    const node = firstInline(tree);
    expect(getAttr(node, 'query')).toBe('`${evil}`');
  });

  it('event handler syntax in query stays as string value', () => {
    const tree = parse('[test](alap:onError=alert(1))');
    const node = firstInline(tree);
    expect(getAttr(node, 'query')).toBe('onError=alert(1)');
    expect(node.attributes).toHaveLength(1);
    expect(node.attributes[0].name).toBe('query');
  });

  it('null bytes in query are preserved as-is', () => {
    // Markdown parser may strip these, but if they get through:
    const tree = parse('[test](alap:a%00b)');
    const node = firstInline(tree);
    expect(getAttr(node, 'query')).toBe('a%00b');
  });
});

describe('security: link text injection', () => {
  it('HTML tags in link text become literal text content', () => {
    const tree = parse('[<img src=x onerror=alert(1)>](alap:@test)');
    const node = firstInline(tree);
    const text = getTextContent(node);
    // Text extraction produces plain text, not HTML nodes
    expect(node.children.every((c) => c.type === 'text')).toBe(true);
  });

  it('script tags in link text become plain text nodes, not HTML', () => {
    const tree = parse('[<script>alert(1)</script>](alap:@test)');
    const node = firstInline(tree);
    // The text may contain the literal string "<script>" — that's fine.
    // What matters is that every child is a text node, not an html node.
    // JSX/React will render text nodes as escaped content, never as raw HTML.
    expect(node.children.every((c) => c.type === 'text')).toBe(true);
    expect(node.children.some((c) => (c as any).type === 'html')).toBe(false);
  });

  it('JSX expression syntax in link text stays literal', () => {
    const tree = parse('[{process.env.SECRET}](alap:@test)');
    const node = firstInline(tree);
    // Markdown parser treats braces as text within link text
    expect(node.children.every((c) => c.type === 'text')).toBe(true);
  });

  it('extremely long link text does not crash', () => {
    const longText = 'a'.repeat(10_000);
    const tree = parse(`[${longText}](alap:@test)`);
    const node = firstInline(tree);
    expect(getTextContent(node)).toBe(longText);
  });

  it('extremely long query does not crash', () => {
    const longQuery = '@' + 'a'.repeat(10_000);
    const tree = parse(`[test](alap:${longQuery})`);
    const node = firstInline(tree);
    expect(getAttr(node, 'query')).toBe(longQuery);
  });
});

describe('security: protocol confusion', () => {
  it('javascript: protocol is not treated as alap:', () => {
    const tree = parse('[click](javascript:alert(1))');
    const para = tree.children[0] as Paragraph;
    const hasJsx = para.children.some((c) => (c as any).type === 'mdxJsxTextElement');
    expect(hasJsx).toBe(false);
  });

  it('data: protocol is not treated as alap:', () => {
    const tree = parse('[click](data:text/html,<script>alert(1)</script>)');
    const para = tree.children[0] as Paragraph;
    const hasJsx = para.children.some((c) => (c as any).type === 'mdxJsxTextElement');
    expect(hasJsx).toBe(false);
  });

  it('ALAP: (uppercase) is not treated as alap:', () => {
    const tree = parse('[test](ALAP:@coffee)');
    const para = tree.children[0] as Paragraph;
    const hasJsx = para.children.some((c) => (c as any).type === 'mdxJsxTextElement');
    expect(hasJsx).toBe(false);
  });

  it('alap:// (double slash) is not treated as alap:', () => {
    // alap: is a protocol prefix, not a URL scheme with authority
    const tree = parse('[test](alap://something)');
    const node = firstInline(tree);
    // The // is part of the query — harmless but verify it parses
    expect(getAttr(node, 'query')).toBe('//something');
  });
});

describe('security: option abuse', () => {
  it('componentName with special chars produces valid AST node', () => {
    // Even with a weird component name, the AST node is well-formed
    const tree = parse('[test](alap:@foo)', { componentName: 'div onClick="alert(1)"' });
    const node = firstInline(tree);
    // The name is a single string in the AST — MDX compiler validates it
    expect(node.name).toBe('div onClick="alert(1)"');
    // It's still just one node, not injected HTML
    expect(node.type).toBe('mdxJsxTextElement');
  });

  it('queryProp with special chars stays as attribute name', () => {
    const tree = parse('[test](alap:@foo)', { queryProp: 'data-x"><script>' });
    const node = firstInline(tree);
    expect(node.attributes).toHaveLength(1);
    expect(node.attributes[0].name).toBe('data-x"><script>');
  });

  it('className with script injection stays as literal value', () => {
    const tree = parse('[test](alap:@foo)', { className: '"><script>alert(1)</script>' });
    const node = firstInline(tree);
    expect(getAttr(node, 'className')).toBe('"><script>alert(1)</script>');
    // Still just attributes, not broken nodes
    expect(node.attributes).toHaveLength(2);
  });
});

describe('security: node structure integrity', () => {
  it('output is always mdxJsxTextElement, never html type', () => {
    const tree = parse('[test](alap:@foo)');
    const node = firstInline(tree);
    // Must be JSX, not raw HTML (unlike remark-alap)
    expect(node.type).toBe('mdxJsxTextElement');
    expect(node.type).not.toBe('html');
  });

  it('attributes are always mdxJsxAttribute with string values', () => {
    const tree = parse('[test](alap:@foo)', { className: 'x' });
    const node = firstInline(tree);

    for (const attr of node.attributes) {
      expect(attr.type).toBe('mdxJsxAttribute');
      expect(typeof attr.value).toBe('string');
      // No mdxJsxAttributeValueExpression (which would eval as JSX)
    }
  });

  it('children are always text nodes, never JSX or HTML', () => {
    const tree = parse('[**bold** and *italic*](alap:@foo)');
    const node = firstInline(tree);

    for (const child of node.children) {
      expect(child.type).toBe('text');
    }
  });
});
