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
 * remarkAlapMDX
 *
 * Remark plugin that transforms `[text](alap:query)` links into
 * `<AlapLink query="query">text</AlapLink>` JSX elements for MDX.
 *
 * Unlike `remark-alap` (which emits `<alap-link>` web component HTML),
 * this plugin emits `mdxJsxTextElement` AST nodes that the MDX compiler
 * processes as React JSX. The resulting `<AlapLink>` resolves via
 * `AlapProvider` context — no web component registration needed.
 *
 * Syntax examples:
 *   [coffee spots](alap:@coffee)        → macro
 *   [Golden Gate](alap:golden)           → direct item ID
 *   [bridges](alap:.bridge)              → tag query
 *   [all bridges](alap:@all_bridges)     → macro wrapping complex expression
 *
 * For expressions with spaces or operators (`.nyc + .food`, `.a | .b`),
 * use macros. Markdown parsers break on spaces in the URL portion.
 */

import { visit } from 'unist-util-visit';
import type { Root, Link, PhrasingContent } from 'mdast';
import type { MdxJsxTextElement, MdxJsxAttribute } from 'mdast-util-mdx-jsx';

const ALAP_PROTOCOL = 'alap:';

export interface RemarkAlapMDXOptions {
  /**
   * JSX component name to emit. Default: `'AlapLink'`.
   * Override if you remap the component in your MDX provider.
   */
  componentName?: string;

  /**
   * JSX prop name for the query. Default: `'query'`.
   */
  queryProp?: string;

  /**
   * Optional CSS class added to every emitted component via className prop.
   */
  className?: string;
}

export default function remarkAlapMDX(options: RemarkAlapMDXOptions = {}) {
  const {
    componentName = 'AlapLink',
    queryProp = 'query',
    className,
  } = options;

  return (tree: Root) => {
    visit(tree, 'link', (node: Link, index, parent) => {
      if (!node.url.startsWith(ALAP_PROTOCOL)) return;

      const query = node.url.slice(ALAP_PROTOCOL.length).trim();
      if (!query) return;

      const attributes: MdxJsxAttribute[] = [
        { type: 'mdxJsxAttribute', name: queryProp, value: query },
      ];

      if (className) {
        attributes.push({
          type: 'mdxJsxAttribute',
          name: 'className',
          value: className,
        });
      }

      const jsxNode: MdxJsxTextElement = {
        type: 'mdxJsxTextElement',
        name: componentName,
        attributes,
        children: flattenToText(node.children),
      };

      if (parent && typeof index === 'number') {
        (parent.children as any[])[index] = jsxNode;
      }
    });
  };
}

/**
 * Convert phrasing content to plain text nodes.
 *
 * MDX JSX element children must be valid mdast nodes. We extract
 * the text content from any inline formatting (bold, italic, code)
 * and produce flat text nodes. This matches remark-alap's behavior
 * of extracting plain text from formatted link content.
 */
function flattenToText(children: PhrasingContent[]): Array<{ type: 'text'; value: string }> {
  const text = extractText(children);
  if (!text) return [];
  return [{ type: 'text', value: text }];
}

/** Recursively extract plain text from phrasing content nodes. */
function extractText(children: PhrasingContent[]): string {
  let result = '';
  for (const child of children) {
    if ('value' in child) {
      result += child.value;
    } else if ('children' in child) {
      result += extractText(child.children as PhrasingContent[]);
    }
  }
  return result;
}
