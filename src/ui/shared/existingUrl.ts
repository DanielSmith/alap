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

import type { AlapLink } from '../../core/types';

type ExistingUrlMode = 'prepend' | 'append' | 'ignore';

/**
 * Resolve the existingUrl mode for a trigger element.
 * Per-anchor `data-alap-existing` overrides the global setting.
 */
export function resolveExistingUrlMode(
  trigger: HTMLElement,
  globalSetting: ExistingUrlMode | undefined,
): ExistingUrlMode {
  const attr = trigger.getAttribute('data-alap-existing');
  if (attr === 'prepend' || attr === 'append' || attr === 'ignore') {
    return attr;
  }
  return globalSetting ?? 'prepend';
}

/**
 * Extract the href from a trigger and inject a synthetic link item
 * into the links array according to the mode.
 *
 * Returns a new array (does not mutate the input).
 */
export function injectExistingUrl(
  links: Array<{ id: string } & AlapLink>,
  trigger: HTMLElement,
  mode: ExistingUrlMode,
): Array<{ id: string } & AlapLink> {
  if (mode === 'ignore') return links;

  const href = trigger.getAttribute('href');
  if (!href || href === '#' || href === '') return links;

  // Build a label from the URL — use hostname if parseable, otherwise the raw href
  let label: string;
  try {
    const url = new URL(href, window.location.href);
    label = url.hostname + (url.pathname !== '/' ? url.pathname : '');
  } catch {
    label = href;
  }

  const synthetic: { id: string } & AlapLink = {
    id: '_existing',
    label,
    url: href,
  };

  if (mode === 'prepend') {
    return [synthetic, ...links];
  }
  // append
  return [...links, synthetic];
}
