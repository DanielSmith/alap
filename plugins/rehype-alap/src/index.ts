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
 * rehype-alap
 *
 * Rehype plugin that transforms `<a href="alap:query">` links into
 * `<alap-link query="query">` web components.
 *
 * Designed for content from headless CMSs (Contentful, Sanity, Strapi,
 * WordPress REST API, Ghost) where authors use WYSIWYG editors and the
 * API returns raw HTML.
 *
 * Recommended patterns for the href value:
 *   <a href="alap:.coffee">spots</a>        → tag query
 *   <a href="alap:golden">bridge</a>        → direct item ID
 *   <a href="alap:@nycfood">food</a>        → macro (best for complex expressions)
 *   <a href="alap:golden,brooklyn">picks</a> → comma-separated IDs
 *
 * For expressions with operators (+, |, -), use macros. CMS sanitizers
 * and WYSIWYG editors may URL-encode or mangle operators in href values.
 *
 * Works with Astro, Next.js, Eleventy, or any rehype/unified pipeline.
 */

import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';

const ALAP_PREFIX = 'alap:';

export interface RehypeAlapOptions {
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

export default function rehypeAlap(options: RehypeAlapOptions = {}) {
  const {
    tagName = 'alap-link',
    queryAttr = 'query',
    className,
  } = options;

  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'a') return;

      const href = node.properties?.href;
      if (typeof href !== 'string' || !href.startsWith(ALAP_PREFIX)) return;

      const query = href.slice(ALAP_PREFIX.length).trim();
      if (!query) return;

      // Rewrite the node in place — children (text, nested elements) are preserved
      node.tagName = tagName;
      delete node.properties.href;
      node.properties[queryAttr] = query;

      if (className) {
        const existing = node.properties.className;
        if (Array.isArray(existing)) {
          existing.push(className);
        } else if (typeof existing === 'string') {
          node.properties.className = [existing, className];
        } else {
          node.properties.className = [className];
        }
      }
    });
  };
}
