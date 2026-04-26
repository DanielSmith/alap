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
 * :obsidian: protocol — public entry point.
 *
 * Not re-exported from `alap` or `alap/slim`. Consumers opt in explicitly:
 *
 *   import { obsidianHandler } from 'alap/protocols/obsidian';
 *
 *   config.protocols.obsidian = {
 *     generate: obsidianHandler,
 *     vault: 'MyVault',
 *     vaultPath: '/Users/me/Documents/MyVault',
 *   };
 *
 * Runtime is Node-only. Core mode reads the filesystem; REST mode (stub for
 * now) calls the Local REST API plugin. Neither will work in a browser.
 */

import { basename as pathBasename } from 'node:path';

import type { AlapLink, GenerateHandler } from '../../core/types';
import { warn } from '../../core/logger';
import { OBSIDIAN_MODE_CORE, OBSIDIAN_MODE_REST } from './constants';
import { resolveCore } from './core';
import { resolveRest } from './rest';
import type { ObsidianProtocolConfig, ObsidianSearchPreset } from './types';

/**
 * Prefix marking a segment as a preset reference, e.g. `$meta`.
 *
 * Deliberately NOT `@` — that sigil is already taken by expression-level
 * macro expansion (`@macro_name` expands to `config.macros[name].linkItems`),
 * and mixing the two would require `ExpressionParser.expandMacros` to carve
 * out protocol spans. Two sigils, two unambiguous roles:
 *   `@macro`  → expands to expression text (IDs, tags, operators)
 *   `$preset` → expands to protocol arguments (key=value bundles)
 */
const PRESET_SIGIL = '$';

export { OBSIDIAN_MODE_CORE, OBSIDIAN_MODE_REST } from './constants';
export type {
  ObsidianMode,
  ObsidianNote,
  ObsidianProtocolConfig,
  ObsidianRestConfig,
  ObsidianSearchField,
} from './types';

interface ParsedSegments {
  mode: string;
  query: string;
  named: Record<string, string>;
}

const parseObsidianSegments = (
  segments: string[],
  searches: Record<string, ObsidianSearchPreset> | undefined,
): ParsedSegments => {
  const mode = segments[0] ?? '';
  const positional: string[] = [];
  const named: Record<string, string> = {};
  const inlineKeys = new Set<string>();

  // Pass 1: inline `key=value` wins over any preset; positional segments
  // collect into the query. Preset references (`@name`) handled in pass 2.
  for (const seg of segments.slice(1)) {
    if (seg.startsWith(PRESET_SIGIL)) continue;
    const eq = seg.indexOf('=');
    if (eq > 0) {
      const key = seg.slice(0, eq);
      named[key] = seg.slice(eq + 1);
      inlineKeys.add(key);
    } else {
      positional.push(seg);
    }
  }

  // Pass 2: presets fill in any keys not set inline. Later preset wins
  // over earlier preset (left-to-right read order).
  for (const seg of segments.slice(1)) {
    if (!seg.startsWith(PRESET_SIGIL)) continue;
    const presetName = seg.slice(PRESET_SIGIL.length);
    const preset = searches?.[presetName];
    if (!preset) {
      warn(`:obsidian: preset "${PRESET_SIGIL}${presetName}" not found in protocols.obsidian.searches`);
      continue;
    }
    for (const [k, v] of Object.entries(preset)) {
      if (inlineKeys.has(k)) continue;
      named[k] = String(v);
    }
  }

  return { mode, query: positional.join(':'), named };
};

const readProtocolConfig = (raw: unknown): ObsidianProtocolConfig => {
  if (!raw || typeof raw !== 'object') return {};
  return raw as ObsidianProtocolConfig;
};

const ensureVault = async (config: ObsidianProtocolConfig): Promise<{ vault: string; vaultPath: string } | null> => {
  const vaultPath = typeof config.vaultPath === 'string' ? config.vaultPath : '';
  if (!vaultPath) {
    warn(':obsidian:core: missing `vaultPath` in protocol config');
    return null;
  }

  const { stat } = await import('node:fs/promises');
  try {
    const s = await stat(vaultPath);
    if (!s.isDirectory()) {
      warn(`:obsidian:core: vaultPath is not a directory — ${vaultPath}`);
      return null;
    }
  } catch {
    warn(`:obsidian:core: vaultPath does not exist or is unreadable — ${vaultPath}`);
    return null;
  }

  const vault = typeof config.vault === 'string' && config.vault.trim().length > 0
    ? config.vault
    : pathBasename(vaultPath);

  return { vault, vaultPath };
};

/**
 * The :obsidian: generate handler. Dispatches on the first segment
 * (`core` or `rest`). REST is a stub in this release — returns empty and
 * warns.
 */
export const obsidianHandler: GenerateHandler = async (segments, config): Promise<AlapLink[]> => {
  const protoConfig = readProtocolConfig(config.protocols?.obsidian);
  const { mode, query, named } = parseObsidianSegments(segments, protoConfig.searches);

  if (mode === OBSIDIAN_MODE_CORE) {
    const resolved = await ensureVault(protoConfig);
    if (!resolved) return [];
    return resolveCore({
      query,
      named,
      config: protoConfig,
      vault: resolved.vault,
      vaultPath: resolved.vaultPath,
    });
  }

  if (mode === OBSIDIAN_MODE_REST) {
    return resolveRest({ query, named, config: protoConfig });
  }

  warn(`:obsidian: unknown mode "${mode}" — expected "${OBSIDIAN_MODE_CORE}" or "${OBSIDIAN_MODE_REST}"`);
  return [];
};
