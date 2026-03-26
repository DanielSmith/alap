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
 * remark-alap
 *
 * Remark plugin that transforms `[text](alap:query)` links into
 * `<alap-link query="query">text</alap-link>` web components.
 *
 * Syntax examples:
 *   [coffee spots](alap:@coffee)        → macro (recommended for complex queries)
 *   [Golden Gate](alap:golden)           → direct item ID
 *   [bridges](alap:.bridge)              → tag query
 *   [all bridges](alap:@all_bridges)     → macro wrapping `.nyc + .bridge`
 *
 * The `alap:` prefix acts as a custom protocol scheme, which markdown
 * parsers accept as a valid URL — no escaping needed.
 *
 * For expressions with spaces or operators (`.nyc + .food`, `.a | .b`),
 * use macros. Markdown parsers break on spaces in the URL portion,
 * and macros keep prose readable anyway.
 *
 * Works with Astro, Next.js, or any remark pipeline.
 */

import { visit } from 'unist-util-visit';
import type { Root, Link, PhrasingContent } from 'mdast';

const ALAP_PREFIX = 'alap:';

export interface RemarkAlapOptions {
  /**
   * HTML tag name to emit. Default: `'alap-link'`.
   * Override if you use a custom element name.
   */
  tagName?: string;

  /**
   * HTML attribute for the query. Default: `'query'`.
   */
  queryAttr?: string;

  /**
   * Optional CSS class to add to every emitted element.
   */
  className?: string;
}

export default function remarkAlap(options: RemarkAlapOptions = {}) {
  const {
    tagName = 'alap-link',
    queryAttr = 'query',
    className,
  } = options;

  return (tree: Root) => {
    visit(tree, 'link', (node: Link, index, parent) => {
      if (!node.url.startsWith(ALAP_PREFIX)) return;

      const query = node.url.slice(ALAP_PREFIX.length).trim();
      if (!query) return;

      const text = extractText(node.children);

      const classAttr = className ? ` class="${escapeAttr(className)}"` : '';
      const html = `<${tagName} ${queryAttr}="${escapeAttr(query)}"${classAttr}>${escapeHtml(text)}</${tagName}>`;

      if (parent && typeof index === 'number') {
        (parent.children as any[])[index] = { type: 'html', value: html };
      }
    });
  };
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
