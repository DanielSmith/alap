/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * YAML frontmatter extraction for `.md` notes.
 *
 * Uses the `yaml` package when installed (full spec support), and falls
 * back to a line-based parser that handles the keys we actually read
 * (title, tags, cover, image, description, created, modified). The
 * fallback is intentionally minimal — if a vault's frontmatter uses
 * anchors or complex nested structures, install `yaml`.
 */

import { loadOptional } from '../shared';
import { OBSIDIAN_FRONTMATTER_FENCE, OBSIDIAN_OPTIONAL_YAML_PKG } from './constants';

export interface ParsedMarkdown {
  frontmatter: Record<string, unknown>;
  body: string;
}

interface YamlModule {
  parse: (src: string) => unknown;
}

/**
 * Split a markdown buffer into `{ frontmatter, body }`.
 * Notes without a leading `---` fence get `frontmatter: {}` and the full
 * text as the body.
 */
export const parseMarkdown = async (source: string): Promise<ParsedMarkdown> => {
  const fence = OBSIDIAN_FRONTMATTER_FENCE;
  if (!source.startsWith(`${fence}\n`) && !source.startsWith(`${fence}\r\n`)) {
    return { frontmatter: {}, body: source };
  }

  // Find the closing fence — must appear on its own line.
  const closeRegex = new RegExp(`\\r?\\n${escapeRegex(fence)}\\r?\\n`);
  const rest = source.slice(fence.length + 1);
  const closeMatch = rest.match(closeRegex);
  if (!closeMatch || closeMatch.index === undefined) {
    return { frontmatter: {}, body: source };
  }

  const yamlText = rest.slice(0, closeMatch.index);
  const body = rest.slice(closeMatch.index + closeMatch[0].length);

  const frontmatter = await parseYamlBlock(yamlText);
  return { frontmatter, body };
};

const parseYamlBlock = async (yamlText: string): Promise<Record<string, unknown>> => {
  const mod = await loadOptional<YamlModule>(OBSIDIAN_OPTIONAL_YAML_PKG);
  if (mod?.parse) {
    try {
      const parsed = mod.parse(yamlText);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      // Bad YAML — fall through to the minimal parser so we still return *something*.
    }
  }
  return parseMinimalYaml(yamlText);
};

/**
 * Minimal YAML subset: top-level `key: value` pairs plus tag arrays.
 * Supports:
 *   - scalars (strings, numbers, bools)
 *   - quoted strings ("...", '...')
 *   - inline arrays (`tags: [a, b, c]`)
 *   - block arrays:
 *       tags:
 *         - a
 *         - b
 *
 * Anything more complex returns as the raw string — callers treat unknown
 * shapes defensively.
 */
const parseMinimalYaml = (text: string): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  const lines = text.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    i++;
    if (!line || /^\s*#/.test(line)) continue;

    const kvMatch = line.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
    if (!kvMatch) continue;
    const key = kvMatch[1];
    const raw = kvMatch[2].trim();

    if (raw === '') {
      // Possible block array on subsequent indented lines
      const arr: unknown[] = [];
      while (i < lines.length) {
        const next = lines[i];
        const itemMatch = next.match(/^\s*-\s+(.*)$/);
        if (!itemMatch) break;
        arr.push(coerceScalar(itemMatch[1].trim()));
        i++;
      }
      out[key] = arr;
      continue;
    }

    if (raw.startsWith('[') && raw.endsWith(']')) {
      out[key] = raw
        .slice(1, -1)
        .split(',')
        .map((s) => coerceScalar(s.trim()))
        .filter((v) => v !== '');
      continue;
    }

    out[key] = coerceScalar(raw);
  }

  return out;
};

const coerceScalar = (raw: string): unknown => {
  if (raw === '') return '';
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null' || raw === '~') return null;
  if (/^-?\d+$/.test(raw)) return Number(raw);
  if (/^-?\d+\.\d+$/.test(raw)) return Number(raw);
  return raw;
};

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
