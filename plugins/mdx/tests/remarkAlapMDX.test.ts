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
import remarkAlapMDX from '../src/remarkAlapMDX';
import type { Root, Paragraph } from 'mdast';
import type { MdxJsxTextElement } from 'mdast-util-mdx-jsx';

/** Parse markdown and apply the plugin, returning the transformed AST. */
function parse(md: string, options?: Parameters<typeof remarkAlapMDX>[0]): Root {
  const processor = unified()
    .use(remarkParse)
    .use(remarkAlapMDX, options);

  const tree = processor.parse(md);
  processor.runSync(tree);
  return tree as Root;
}

/** Extract the first child of the first paragraph. */
function firstInline(tree: Root): MdxJsxTextElement {
  const para = tree.children[0] as Paragraph;
  return para.children[0] as unknown as MdxJsxTextElement;
}

/** Get all mdxJsxTextElement nodes from the first paragraph. */
function allJsxNodes(tree: Root): MdxJsxTextElement[] {
  const para = tree.children[0] as Paragraph;
  return para.children.filter(
    (c) => (c as any).type === 'mdxJsxTextElement',
  ) as unknown as MdxJsxTextElement[];
}

/** Helper to get an attribute value by name from a JSX node. */
function getAttr(node: MdxJsxTextElement, name: string): string | undefined {
  const attr = node.attributes.find(
    (a) => a.type === 'mdxJsxAttribute' && a.name === name,
  );
  return attr ? (attr.value as string) : undefined;
}

describe('remarkAlapMDX', () => {
  // --- Basic transforms ---

  it('transforms alap:@macro into AlapLink JSX', () => {
    const tree = parse('[coffee spots](alap:@coffee)');
    const node = firstInline(tree);

    expect(node.type).toBe('mdxJsxTextElement');
    expect(node.name).toBe('AlapLink');
    expect(getAttr(node, 'query')).toBe('@coffee');
    expect(node.children).toEqual([{ type: 'text', value: 'coffee spots' }]);
  });

  it('transforms alap:itemId', () => {
    const tree = parse('[Golden Gate](alap:golden)');
    const node = firstInline(tree);

    expect(node.name).toBe('AlapLink');
    expect(getAttr(node, 'query')).toBe('golden');
    expect(node.children[0]).toEqual({ type: 'text', value: 'Golden Gate' });
  });

  it('transforms alap:.tag', () => {
    const tree = parse('[bridges](alap:.bridge)');
    const node = firstInline(tree);

    expect(getAttr(node, 'query')).toBe('.bridge');
  });

  it('transforms macro for complex expression', () => {
    const tree = parse('[NYC food](alap:@nyc-food)');
    const node = firstInline(tree);

    expect(getAttr(node, 'query')).toBe('@nyc-food');
  });

  it('transforms comma-separated items (no spaces)', () => {
    const tree = parse('[items](alap:golden,brooklyn,ferry)');
    const node = firstInline(tree);

    expect(getAttr(node, 'query')).toBe('golden,brooklyn,ferry');
  });

  it('markdown breaks on spaces in URL (use macros instead)', () => {
    const tree = parse('[explore](alap:.nyc + .sf)');
    const para = tree.children[0] as Paragraph;
    const hasJsx = para.children.some((c) => (c as any).type === 'mdxJsxTextElement');
    expect(hasJsx).toBe(false);
  });

  // --- Does not transform non-alap links ---

  it('leaves regular links unchanged', () => {
    const tree = parse('[example](https://example.com)');
    const para = tree.children[0] as Paragraph;

    expect(para.children[0].type).toBe('link');
    const hasJsx = para.children.some((c) => (c as any).type === 'mdxJsxTextElement');
    expect(hasJsx).toBe(false);
  });

  it('leaves mailto links unchanged', () => {
    const tree = parse('[email](mailto:test@example.com)');
    const para = tree.children[0] as Paragraph;

    expect(para.children[0].type).toBe('link');
  });

  it('leaves ftp links unchanged', () => {
    const tree = parse('[files](ftp://example.com/files)');
    const para = tree.children[0] as Paragraph;

    expect(para.children[0].type).toBe('link');
  });

  // --- Edge cases ---

  it('ignores empty alap: link', () => {
    const tree = parse('[empty](alap:)');
    const para = tree.children[0] as Paragraph;
    const hasJsx = para.children.some((c) => (c as any).type === 'mdxJsxTextElement');
    expect(hasJsx).toBe(false);
  });

  it('trims whitespace from query', () => {
    // Only trailing whitespace matters since leading spaces break markdown URL parsing
    const tree = parse('[test](alap:@coffee)');
    const node = firstInline(tree);
    expect(getAttr(node, 'query')).toBe('@coffee');
  });

  it('preserves bare @ macro', () => {
    const tree = parse('[self](alap:@)');
    const node = firstInline(tree);
    expect(getAttr(node, 'query')).toBe('@');
  });

  // --- Multiple links in one document ---

  it('transforms multiple alap links in the same paragraph', () => {
    const tree = parse('Visit [coffee](alap:@coffee) or [bridges](alap:.bridge) today.');
    const nodes = allJsxNodes(tree);

    expect(nodes).toHaveLength(2);
    expect(getAttr(nodes[0], 'query')).toBe('@coffee');
    expect(getAttr(nodes[1], 'query')).toBe('.bridge');
  });

  it('mixes alap and regular links', () => {
    const tree = parse('See [coffee](alap:@coffee) and [example](https://example.com).');
    const para = tree.children[0] as Paragraph;

    const jsxNodes = para.children.filter((c) => (c as any).type === 'mdxJsxTextElement');
    const linkNodes = para.children.filter((c) => c.type === 'link');

    expect(jsxNodes).toHaveLength(1);
    expect(linkNodes).toHaveLength(1);
  });

  it('transforms links across multiple paragraphs', () => {
    const tree = parse('[a](alap:@one)\n\n[b](alap:@two)');

    const node1 = firstInline(tree);
    const para2 = tree.children[1] as Paragraph;
    const node2 = para2.children[0] as unknown as MdxJsxTextElement;

    expect(getAttr(node1, 'query')).toBe('@one');
    expect(getAttr(node2, 'query')).toBe('@two');
  });

  // --- Inline formatting in link text ---

  it('extracts text from bold link content', () => {
    const tree = parse('[**bold spots**](alap:@favorites)');
    const node = firstInline(tree);
    expect(node.children).toEqual([{ type: 'text', value: 'bold spots' }]);
  });

  it('extracts text from italic link content', () => {
    const tree = parse('[*italic text*](alap:.tag)');
    const node = firstInline(tree);
    expect(node.children).toEqual([{ type: 'text', value: 'italic text' }]);
  });

  it('extracts text from mixed inline formatting', () => {
    const tree = parse('[*italic* and `code`](alap:.tag)');
    const node = firstInline(tree);
    expect(node.children).toEqual([{ type: 'text', value: 'italic and code' }]);
  });

  it('handles link text with no formatting', () => {
    const tree = parse('[plain text](alap:@test)');
    const node = firstInline(tree);
    expect(node.children).toEqual([{ type: 'text', value: 'plain text' }]);
  });

  // --- Options ---

  it('supports custom componentName', () => {
    const tree = parse('[test](alap:@foo)', { componentName: 'MyLink' });
    const node = firstInline(tree);
    expect(node.name).toBe('MyLink');
  });

  it('supports custom queryProp', () => {
    const tree = parse('[test](alap:@foo)', { queryProp: 'expression' });
    const node = firstInline(tree);
    expect(getAttr(node, 'expression')).toBe('@foo');
    expect(getAttr(node, 'query')).toBeUndefined();
  });

  it('supports className option', () => {
    const tree = parse('[test](alap:@foo)', { className: 'alap-link' });
    const node = firstInline(tree);
    expect(getAttr(node, 'className')).toBe('alap-link');
  });

  it('combines all options', () => {
    const tree = parse('[test](alap:@foo)', {
      componentName: 'CustomAlap',
      queryProp: 'expr',
      className: 'custom',
    });
    const node = firstInline(tree);
    expect(node.name).toBe('CustomAlap');
    expect(getAttr(node, 'expr')).toBe('@foo');
    expect(getAttr(node, 'className')).toBe('custom');
  });

  it('omits className attribute when option not set', () => {
    const tree = parse('[test](alap:@foo)');
    const node = firstInline(tree);
    expect(getAttr(node, 'className')).toBeUndefined();
    expect(node.attributes).toHaveLength(1);
  });

  // --- AST node structure ---

  it('produces valid mdxJsxTextElement node structure', () => {
    const tree = parse('[test](alap:@foo)');
    const node = firstInline(tree);

    expect(node).toMatchObject({
      type: 'mdxJsxTextElement',
      name: 'AlapLink',
      attributes: [
        { type: 'mdxJsxAttribute', name: 'query', value: '@foo' },
      ],
      children: [{ type: 'text', value: 'test' }],
    });
  });

  it('preserves surrounding text nodes', () => {
    const tree = parse('before [test](alap:@foo) after');
    const para = tree.children[0] as Paragraph;

    // Should have: text, jsx, text
    expect(para.children).toHaveLength(3);
    expect(para.children[0].type).toBe('text');
    expect((para.children[1] as any).type).toBe('mdxJsxTextElement');
    expect(para.children[2].type).toBe('text');
  });
});
