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

import { AlapEngine } from 'alap/core';
import { sanitizeUrl } from 'alap/core';
import type { AlapConfig, AlapLink } from 'alap/core';

export interface EleventyAlapOptions {
  /**
   * The Alap config object. Required.
   */
  config: AlapConfig;

  /**
   * CSS class applied to the static `<ul>`/`<ol>` wrapper.
   * @default 'alap-menu'
   */
  menuClass?: string;

  /**
   * CSS class applied to each `<li>` in static mode.
   * @default 'alap-item'
   */
  itemClass?: string;

  /**
   * List type for static shortcodes.
   * @default 'ul'
   */
  listType?: 'ul' | 'ol';
}

type ResolvedLink = { id: string } & AlapLink;

/**
 * Escape HTML special characters for safe interpolation into markup.
 */
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render a list of resolved links as a static HTML `<ul>` or `<ol>`.
 */
function renderStaticList(
  links: ResolvedLink[],
  listType: string,
  menuClass: string,
  itemClass: string,
): string {
  if (links.length === 0) return '';

  const items = links.map((link) => {
    const href = escHtml(sanitizeUrl(link.url));
    const label = escHtml(link.label ?? link.id);
    const cls = link.cssClass
      ? `${itemClass} ${escHtml(link.cssClass)}`
      : itemClass;

    if (link.image) {
      const src = escHtml(sanitizeUrl(link.image));
      const alt = escHtml(link.altText ?? `image for ${link.id}`);
      return `<li class="${cls}"><a href="${href}"${targetAttr(link)}><img src="${src}" alt="${alt}"></a></li>`;
    }

    return `<li class="${cls}"><a href="${href}"${targetAttr(link)}>${label}</a></li>`;
  });

  return `<${listType} class="${menuClass}">${items.join('')}</${listType}>`;
}

function targetAttr(link: AlapLink): string {
  const target = link.targetWindow ?? 'fromAlap';
  return ` target="${escHtml(target)}"`;
}

/**
 * Eleventy plugin for Alap.
 *
 * Provides two shortcodes:
 *
 * **Static mode** — resolves expressions at build time, outputs plain HTML lists (zero JS):
 * ```njk
 * {% alap ".nyc + .bridge" %}
 * ```
 *
 * **Interactive mode** — outputs `<alap-link>` web components for client-side menus:
 * ```njk
 * {% alapLink ".coffee" %}cafes{% endalapLink %}
 * ```
 *
 * @example
 * ```js
 * // .eleventy.js
 * const alapPlugin = require('eleventy-alap');
 * const config = require('./alap-config.json');
 *
 * module.exports = function(eleventyConfig) {
 *   eleventyConfig.addPlugin(alapPlugin, { config });
 * };
 * ```
 */
export function eleventyAlapPlugin(eleventyConfig: any, options: EleventyAlapOptions): void {
  if (!options?.config) {
    throw new Error('eleventy-alap: config option is required');
  }

  const engine = new AlapEngine(options.config);
  const menuClass = options.menuClass ?? 'alap-menu';
  const itemClass = options.itemClass ?? 'alap-item';
  const listType = options.listType ?? (options.config.settings?.listType as string) ?? 'ul';

  /**
   * Static shortcode: resolves at build time, outputs HTML list.
   *
   * {% alap ".nyc + .bridge" %}
   * {% alap "@favorites" %}
   */
  eleventyConfig.addShortcode('alap', (expression: string) => {
    if (!expression) return '';
    const links = engine.resolve(expression);
    return renderStaticList(links, listType, menuClass, itemClass);
  });

  /**
   * Interactive paired shortcode: outputs <alap-link> web component.
   *
   * {% alapLink ".coffee" %}cafes{% endalapLink %}
   */
  eleventyConfig.addPairedShortcode('alapLink', (content: string, query: string) => {
    if (!query) return content;
    return `<alap-link query="${escHtml(query)}">${content}</alap-link>`;
  });

  /**
   * Filter: resolve an expression and return the array of links.
   * Useful in templates where you want custom rendering.
   *
   * {% set bridges = ".nyc + .bridge" | alapResolve %}
   * {% for link in bridges %}...{% endfor %}
   */
  eleventyConfig.addFilter('alapResolve', (expression: string) => {
    if (!expression) return [];
    return engine.resolve(expression);
  });

  /**
   * Filter: resolve and return just the count.
   *
   * {{ ".coffee" | alapCount }} cafes nearby
   */
  eleventyConfig.addFilter('alapCount', (expression: string) => {
    if (!expression) return 0;
    return engine.resolve(expression).length;
  });
}

export default eleventyAlapPlugin;
