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

import type { SourceState } from '../../core/types';
import { MENU_ITEM_CLASS } from '../../constants';

/** Text shown inside the menu/lens/lightbox for each in-flight async source. */
export const PLACEHOLDER_LABEL_LOADING = 'Loading\u2026';
/** Text shown when a generate handler throws. */
export const PLACEHOLDER_LABEL_ERROR = 'Couldn\u2019t load';
/** Text shown when a generate handler returns []. */
export const PLACEHOLDER_LABEL_EMPTY = 'Nothing found';

export function placeholderLabel(status: SourceState['status']): string {
  if (status === 'error') return PLACEHOLDER_LABEL_ERROR;
  if (status === 'empty') return PLACEHOLDER_LABEL_EMPTY;
  return PLACEHOLDER_LABEL_LOADING;
}

/**
 * Fade the placeholder in via CSS transition so users can override duration
 * and easing on any ancestor:
 *
 * ```css
 * .alapelem {
 *   --alap-transition-duration: 400ms;
 *   --alap-transition-easing: cubic-bezier(0.2, 0, 0, 1);
 * }
 * ```
 *
 * Defaults: 250ms ease-out. Degrades to instant if requestAnimationFrame
 * isn't available (jsdom/happy-dom test runtimes don't paint between
 * microtasks reliably, and a test-only visual polish isn't worth a pref).
 */
function animateFadeIn(el: HTMLElement): void {
  el.style.opacity = '0';
  el.style.transition =
    'opacity var(--alap-transition-duration, 250ms) var(--alap-transition-easing, ease-out)';

  const apply = () => {
    el.style.opacity = '1';
  };
  if (typeof requestAnimationFrame === 'function') {
    // Two frames: one to paint opacity 0, one to start the transition.
    requestAnimationFrame(() => requestAnimationFrame(apply));
  } else {
    apply();
  }
}

/**
 * Build a menu-shaped placeholder item: `<li class="alapListElem"><a>Label</a></li>`.
 *
 * The `<li>` carries the same class (`alapListElem`) real menu items use, and
 * the inner `<a>` inherits the user's link styling so the placeholder looks
 * and sizes identically to a real row. The inner `<a>` deliberately omits
 * `role="menuitem"` (and has no `href`), so keyboard navigation and click
 * handlers — which query `a[role="menuitem"]` — skip it.
 *
 * The placeholder contract for tests and CSS remains `[data-alap-placeholder]`
 * on the outer `<li>`.
 */
export function buildMenuPlaceholder(source: SourceState): HTMLLIElement {
  const li = document.createElement('li');
  li.setAttribute('role', 'none');
  li.setAttribute('data-alap-placeholder', source.status);
  li.setAttribute('data-alap-placeholder-token', source.token);
  li.className = `alapListElem alap-placeholder alap-placeholder-${source.status}`;
  li.setAttribute('aria-live', 'polite');

  const a = document.createElement('a');
  a.setAttribute('aria-disabled', 'true');
  a.setAttribute('tabindex', '-1');
  a.textContent = placeholderLabel(source.status);
  li.appendChild(a);
  animateFadeIn(li);
  return li;
}

/**
 * Build a panel-shaped placeholder: a single `<div>` with the placeholder
 * attributes. Used by lens and lightbox, which render content inside a
 * styled panel rather than a list. Styled via lens.css / lightbox.css.
 */
export function buildPanelPlaceholder(source: SourceState): HTMLDivElement {
  const el = document.createElement('div');
  el.setAttribute('data-alap-placeholder', source.status);
  el.setAttribute('data-alap-placeholder-token', source.token);
  el.className = `alap-placeholder alap-placeholder-${source.status}`;
  el.setAttribute('aria-live', 'polite');
  el.textContent = placeholderLabel(source.status);
  animateFadeIn(el);
  return el;
}

/**
 * Legacy alias kept for callers that pre-date the menu/panel split. Prefer
 * `buildMenuPlaceholder` or `buildPanelPlaceholder` for new code.
 */
export function buildPlaceholderItem(source: SourceState, tagName = 'li'): HTMLElement {
  if (tagName === 'li') return buildMenuPlaceholder(source);
  return buildPanelPlaceholder(source);
}

/**
 * Append placeholder `<li>` entries to an existing menu list element for each
 * source. No-ops when `sources` is empty. Placeholders always go to the tail
 * (refiners have already run against the resolved items).
 */
export function appendPlaceholders(list: HTMLElement, sources: readonly SourceState[]): void {
  for (const src of sources) {
    list.appendChild(buildMenuPlaceholder(src));
  }
}

/**
 * Static description of a placeholder row, expressed as plain data so framework
 * adapters (React JSX, Vue templates, Svelte runes, Solid, Qwik) can render it
 * with their native idioms via attribute spread. Single source of truth for the
 * `[data-alap-placeholder]` DOM contract that tests query against.
 */
export interface PlaceholderDescriptor {
  /** Hyphenated attribute keys ready for `{...attrs}` / `v-bind="attrs"` spread. */
  attrs: {
    role: 'none';
    'aria-live': 'polite';
    'data-alap-placeholder': SourceState['status'];
    'data-alap-placeholder-token': string;
  };
  /** Outer-row class — same surface DOM/WC's `buildMenuPlaceholder` writes. */
  className: string;
  /** Localized label text for the inner `<a>`. */
  label: string;
}

export function placeholderDescriptor(source: SourceState): PlaceholderDescriptor {
  return {
    attrs: {
      role: 'none',
      'aria-live': 'polite',
      'data-alap-placeholder': source.status,
      'data-alap-placeholder-token': source.token,
    },
    className: `${MENU_ITEM_CLASS} alap-placeholder alap-placeholder-${source.status}`,
    label: placeholderLabel(source.status),
  };
}
