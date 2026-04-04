/**
 * :echo: protocol — toy example of a lazy-loaded protocol plugin.
 *
 * Usage in expressions:
 *   :echo:example.com:        → { label: "example.com", url: "https://example.com" }
 *   :echo:en.wikipedia.org/wiki/Coffee:  → { label: "en.wikipedia.org/wiki/Coffee", url: "https://..." }
 *
 * This file is dynamically imported on first use — it's not in the main bundle.
 */

import type { AlapLink } from 'alap/core';
import { sanitizeUrl } from 'alap/core';

export const generate = async (segments: string[]): Promise<AlapLink[]> => {
  const raw = segments.join(':');
  if (!raw) return [];

  const url = sanitizeUrl(raw.startsWith('http') ? raw : `https://${raw}`);
  if (!url) return [];

  return [{
    label: raw,
    url,
    tags: ['echo'],
  }];
};
