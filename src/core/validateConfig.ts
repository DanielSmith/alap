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

import type { AlapConfig, AlapLink } from './types';
import { sanitizeUrl } from './sanitizeUrl';
import { validateRegex } from './validateRegex';
import { warn } from './logger';

/**
 * Validate and sanitize an AlapConfig loaded from an untrusted source
 * (e.g., a remote server or imported JSON file).
 *
 * - Verifies structural shape (allLinks is an object, links have url strings)
 * - Sanitizes all URLs (link.url, link.image) via sanitizeUrl
 * - Validates and removes dangerous regex search patterns
 * - Filters prototype-pollution keys (__proto__, constructor, prototype)
 *
 * Returns a sanitized copy of the config. Does not mutate the input.
 * Throws if the config is structurally invalid (missing allLinks).
 */
export function validateConfig(config: unknown): AlapConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid config: expected an object');
  }

  const raw = config as Record<string, unknown>;

  // --- allLinks (required) ---
  if (!raw.allLinks || typeof raw.allLinks !== 'object' || Array.isArray(raw.allLinks)) {
    throw new Error('Invalid config: allLinks must be a non-null object');
  }

  const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
  const rawLinks = raw.allLinks as Record<string, unknown>;
  const sanitizedLinks: AlapConfig['allLinks'] = {};

  for (const key of Object.keys(rawLinks)) {
    if (BLOCKED_KEYS.has(key)) continue;

    if (key.includes('-')) {
      warn(`validateConfig: skipping allLinks["${key}"] — hyphens are not allowed in item IDs. Use underscores instead. The "-" character is the WITHOUT operator in expressions.`);
      continue;
    }

    const link = rawLinks[key];
    if (!link || typeof link !== 'object' || Array.isArray(link)) {
      warn(`validateConfig: skipping allLinks["${key}"] — not a valid link object`);
      continue;
    }

    const rawLink = link as Record<string, unknown>;

    // url is required and must be a string
    if (typeof rawLink.url !== 'string') {
      warn(`validateConfig: skipping allLinks["${key}"] — missing or invalid url`);
      continue;
    }

    // Sanitize URLs
    const sanitizedUrl = sanitizeUrl(rawLink.url);
    const sanitizedImage = typeof rawLink.image === 'string' ? sanitizeUrl(rawLink.image) : undefined;

    // tags must be an array of strings if present
    let tags: string[] | undefined;
    if (rawLink.tags !== undefined) {
      if (Array.isArray(rawLink.tags)) {
        tags = rawLink.tags.filter((t): t is string => {
          if (typeof t !== 'string') return false;
          if (t.includes('-')) {
            warn(`validateConfig: allLinks["${key}"] — stripping tag "${t}" (hyphens not allowed in tags). Use underscores instead.`);
            return false;
          }
          return true;
        });
      } else {
        warn(`validateConfig: allLinks["${key}"].tags is not an array — ignoring`);
        // tags stays undefined — the spread below will omit it
      }
    }

    // Build the sanitized link as a proper AlapLink
    const sanitized: AlapLink = { url: sanitizedUrl };
    if (typeof rawLink.label === 'string') sanitized.label = rawLink.label;
    if (tags !== undefined) sanitized.tags = tags;
    if (typeof rawLink.cssClass === 'string') sanitized.cssClass = rawLink.cssClass;
    if (sanitizedImage !== undefined) sanitized.image = sanitizedImage;
    else if (typeof rawLink.image === 'string') sanitized.image = rawLink.image;
    if (typeof rawLink.altText === 'string') sanitized.altText = rawLink.altText;
    if (typeof rawLink.targetWindow === 'string') sanitized.targetWindow = rawLink.targetWindow;
    if (typeof rawLink.description === 'string') sanitized.description = rawLink.description;
    if (typeof rawLink.thumbnail === 'string') sanitized.thumbnail = rawLink.thumbnail;
    if (Array.isArray(rawLink.hooks)) sanitized.hooks = rawLink.hooks.filter((h): h is string => typeof h === 'string');
    if (typeof rawLink.guid === 'string') sanitized.guid = rawLink.guid;
    if (rawLink.createdAt !== undefined) sanitized.createdAt = rawLink.createdAt as string | number;

    sanitizedLinks[key] = sanitized;
  }

  // --- settings (optional) ---
  let settings: AlapConfig['settings'];
  if (raw.settings && typeof raw.settings === 'object' && !Array.isArray(raw.settings)) {
    const rawSettings = raw.settings as Record<string, unknown>;
    settings = {} as AlapConfig['settings'];
    for (const key of Object.keys(rawSettings)) {
      if (!BLOCKED_KEYS.has(key)) {
        (settings as Record<string, unknown>)[key] = rawSettings[key];
      }
    }
  }

  // --- macros (optional) ---
  let macros: AlapConfig['macros'];
  if (raw.macros && typeof raw.macros === 'object' && !Array.isArray(raw.macros)) {
    const rawMacros = raw.macros as Record<string, unknown>;
    macros = {};
    for (const key of Object.keys(rawMacros)) {
      if (BLOCKED_KEYS.has(key)) continue;
      if (key.includes('-')) {
        warn(`validateConfig: skipping macro "${key}" — hyphens are not allowed in macro names. Use underscores instead. The "-" character is the WITHOUT operator in expressions.`);
        continue;
      }
      const macro = rawMacros[key];
      if (macro && typeof macro === 'object' && typeof (macro as Record<string, unknown>).linkItems === 'string') {
        macros[key] = macro as AlapConfig['macros'] extends Record<string, infer M> ? M : never;
      } else {
        warn(`validateConfig: skipping macro "${key}" — invalid shape`);
      }
    }
  }

  // --- searchPatterns (optional) ---
  let searchPatterns: AlapConfig['searchPatterns'];
  if (raw.searchPatterns && typeof raw.searchPatterns === 'object' && !Array.isArray(raw.searchPatterns)) {
    const rawPatterns = raw.searchPatterns as Record<string, unknown>;
    searchPatterns = {};
    for (const key of Object.keys(rawPatterns)) {
      if (BLOCKED_KEYS.has(key)) continue;
      if (key.includes('-')) {
        warn(`validateConfig: skipping searchPattern "${key}" — hyphens are not allowed in pattern keys. Use underscores instead. The "-" character is the WITHOUT operator in expressions.`);
        continue;
      }
      const entry = rawPatterns[key];

      // String shorthand
      if (typeof entry === 'string') {
        const validation = validateRegex(entry);
        if (validation.safe) {
          searchPatterns[key] = entry;
        } else {
          warn(`validateConfig: removing searchPattern "${key}" — ${validation.reason}`);
        }
        continue;
      }

      // Object form
      if (entry && typeof entry === 'object' && typeof (entry as Record<string, unknown>).pattern === 'string') {
        const pattern = (entry as Record<string, unknown>).pattern as string;
        const validation = validateRegex(pattern);
        if (validation.safe) {
          searchPatterns[key] = entry as AlapConfig['searchPatterns'] extends Record<string, infer P> ? P : never;
        } else {
          warn(`validateConfig: removing searchPattern "${key}" — ${validation.reason}`);
        }
        continue;
      }

      warn(`validateConfig: skipping searchPattern "${key}" — invalid shape`);
    }
  }

  const result: AlapConfig = { allLinks: sanitizedLinks };
  if (settings) result.settings = settings;
  if (macros) result.macros = macros;
  if (searchPatterns) result.searchPatterns = searchPatterns;

  return result;
}
