/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * :obsidian:core: — filesystem mode.
 *
 * Walks a vault directory, parses frontmatter, grep-matches notes against
 * the query segment, and returns {@link AlapLink}s. Node-only — this file
 * imports `node:fs/promises` and is excluded from browser bundles via
 * subpath export.
 *
 * Heavier optional dependencies (`fast-glob`, `yaml`) are loaded via
 * {@link loadOptional} on first use; built-in fallbacks handle the common
 * case of `**\/*.md` scanning and simple frontmatter.
 */

import { basename, relative, resolve as resolvePath, sep } from 'node:path';

import type { AlapLink } from '../../core/types';
import { MAX_FILESYSTEM_FILES, MAX_GENERATED_LINKS } from '../../constants';
import { loadOptional } from '../shared';
import { isWithin, realpathWithin } from '../shared/pathSafety';
import {
  OBSIDIAN_DEFAULT_GLOBS,
  OBSIDIAN_DEFAULT_IGNORE,
  OBSIDIAN_MAX_MATCH_BYTES,
  OBSIDIAN_NOTE_EXTENSION_RE,
  OBSIDIAN_OPTIONAL_GLOB_PKG,
} from './constants';
import { parseMarkdown } from './frontmatter';
import { scanInlineTags } from './inlineTags';
import { buildLink } from './linkBuilder';
import { matches, resolveSearchFields } from './matching';
import { findAliasedNeedle, resolveTagAliases } from './tagAliases';
import type { ObsidianNote, ObsidianProtocolConfig } from './types';

interface GlobFn {
  (patterns: string | string[], options?: {
    cwd?: string;
    ignore?: string[];
    onlyFiles?: boolean;
    absolute?: boolean;
    dot?: boolean;
  }): Promise<string[]>;
}

interface FastGlobModule {
  default?: GlobFn;
  glob?: GlobFn;
}

export interface ResolveCoreArgs {
  /** Query string — segment immediately after `:obsidian:core:`. */
  query: string;
  /** Optional named args from remaining segments (e.g. `fields=tags,body`). */
  named: Record<string, string>;
  /** The validated protocol config (vault, paths, flags). */
  config: ObsidianProtocolConfig;
  /** Resolved `vault` display name (used in the URI template). */
  vault: string;
  /** Resolved `vaultPath` — verified to exist and be a directory. */
  vaultPath: string;
}

/**
 * Core mode entry point. Returns a bounded array of links.
 */
export const resolveCore = async (args: ResolveCoreArgs): Promise<AlapLink[]> => {
  const { query, named, config, vault, vaultPath } = args;

  const searchFields = resolveSearchFields(named.fields ?? config.searchFields);
  const globs = asArray(config.globs) ?? [...OBSIDIAN_DEFAULT_GLOBS];
  const ignore = mergeIgnore(config.ignore);

  const namedMax = parsePositiveInt(named.maxFiles);
  const configured = namedMax ?? config.maxFiles ?? MAX_FILESYSTEM_FILES;
  const maxFiles = Math.min(configured, MAX_FILESYSTEM_FILES);

  const relPaths = await enumerateMarkdownFiles({ vaultPath, globs, ignore, maxFiles });
  if (relPaths.length === 0) return [];

  const { keyToTag, tagToKey } = resolveTagAliases(config.tagAliases);
  const needle = query.toLowerCase();
  const aliasedNeedle = findAliasedNeedle(needle, keyToTag);
  const links: AlapLink[] = [];

  for (const relPath of relPaths) {
    if (links.length >= MAX_GENERATED_LINKS) break;

    const note = await loadNote(vaultPath, relPath);
    if (!note) continue;
    if (!matches(note, needle, searchFields, aliasedNeedle)) continue;

    links.push(
      buildLink({
        note,
        vault,
        linkTemplate: config.linkTemplate,
        thumbnailFields: config.thumbnailFields,
        mediaBaseUrl: config.mediaBaseUrl,
        tagToKey,
        // The strict-tier sanitizer always honors http/https/mailto
        // (see STRICT_BASE_SCHEMES in src/core/sanitizeUrl.ts);
        // `allowedSchemes` is a per-link list of EXTRA schemes the
        // protocol wants to widen the strict allowlist with. Default
        // to ['obsidian'] so this protocol's obsidian://open?…
        // URIs survive sanitization without explicit opt-in.
        allowedSchemes: config.allowedSchemes ?? ['obsidian'],
      }),
    );
  }

  return links;
};

// --- File enumeration -------------------------------------------------------

interface EnumerateArgs {
  vaultPath: string;
  globs: string[];
  ignore: string[];
  maxFiles: number;
}

const enumerateMarkdownFiles = async (args: EnumerateArgs): Promise<string[]> => {
  const viaFastGlob = await tryFastGlob(args);
  if (viaFastGlob) return viaFastGlob;

  // Built-in fallback: recursive readdir + simple matcher.
  const { readdir } = await import('node:fs/promises');
  const includeRe = args.globs.map(globToRegex);
  const ignoreRe = args.ignore.map(globToRegex);

  const results: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    if (results.length >= args.maxFiles) return;

    const entries = await readdir(dir, { withFileTypes: true }).catch(() => null);
    if (!entries) return;

    for (const entry of entries) {
      if (results.length >= args.maxFiles) return;
      const abs = `${dir}${sep}${entry.name}`;
      const rel = toPosix(relative(args.vaultPath, abs));
      if (ignoreRe.some((re) => re.test(rel))) continue;

      if (entry.isDirectory()) {
        await walk(abs);
      } else if (entry.isFile() && includeRe.some((re) => re.test(rel))) {
        results.push(rel);
      }
      // Symlinks are skipped — realpath check happens per-read.
    }
  };

  await walk(args.vaultPath);
  return results;
};

const tryFastGlob = async (args: EnumerateArgs): Promise<string[] | null> => {
  const mod = await loadOptional<FastGlobModule>(OBSIDIAN_OPTIONAL_GLOB_PKG);
  const fn = mod?.default ?? mod?.glob;
  if (!fn) return null;
  try {
    const found = await fn(args.globs, {
      cwd: args.vaultPath,
      ignore: args.ignore,
      onlyFiles: true,
      absolute: false,
      dot: false,
    });
    return found.slice(0, args.maxFiles);
  } catch {
    return null;
  }
};

// --- Note loading -----------------------------------------------------------

const loadNote = async (vaultPath: string, relPath: string): Promise<ObsidianNote | null> => {
  const absPath = resolvePath(vaultPath, relPath);
  if (!isWithin(vaultPath, absPath)) return null;

  const real = await realpathWithin(vaultPath, absPath);
  if (!real) return null;

  const { open } = await import('node:fs/promises');
  let handle: Awaited<ReturnType<typeof open>>;
  try {
    handle = await open(real, 'r');
  } catch {
    return null;
  }

  try {
    const buf = Buffer.alloc(OBSIDIAN_MAX_MATCH_BYTES);
    const { bytesRead } = await handle.read(buf, 0, OBSIDIAN_MAX_MATCH_BYTES, 0);
    const source = buf.subarray(0, bytesRead).toString('utf8');
    const { frontmatter, body } = await parseMarkdown(source);

    return {
      relPath: toPosix(relPath),
      absPath: real,
      basename: basename(relPath).replace(OBSIDIAN_NOTE_EXTENSION_RE, ''),
      frontmatter,
      body,
      inlineTags: scanInlineTags(body),
    };
  } catch {
    return null;
  } finally {
    await handle.close().catch(() => {});
  }
};

// --- Helpers ---------------------------------------------------------------

const parsePositiveInt = (raw: unknown): number | null => {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
};

const asArray = (raw: unknown): string[] | null => {
  if (Array.isArray(raw) && raw.every((s) => typeof s === 'string')) return raw as string[];
  return null;
};

const mergeIgnore = (override?: string[]): string[] => {
  const base: string[] = [...OBSIDIAN_DEFAULT_IGNORE];
  if (!override || override.length === 0) return base;
  const seen = new Set<string>(base);
  for (const pat of override) if (!seen.has(pat)) { base.push(pat); seen.add(pat); }
  return base;
};

const toPosix = (p: string): string => (sep === '/' ? p : p.split(sep).join('/'));

/**
 * Minimal glob-to-regex for the patterns we actually advertise:
 * `**\/*.md`, `.obsidian/**`, `**\/.DS_Store`, and similar.
 *
 * Supported: `*`, `**`, `?`. Character classes and brace expansion are
 * NOT supported — install `fast-glob` if the vault needs them.
 */
const globToRegex = (glob: string): RegExp => {
  let re = '';
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // `**/` consumes any number of path segments (including zero).
        if (glob[i + 2] === '/') {
          re += '(?:.*/)?';
          i += 3;
          continue;
        }
        re += '.*';
        i += 2;
        continue;
      }
      re += '[^/]*';
      i += 1;
      continue;
    }
    if (c === '?') { re += '[^/]'; i += 1; continue; }
    if (/[.+^${}()|[\]\\]/.test(c)) { re += '\\' + c; i += 1; continue; }
    re += c;
    i += 1;
  }
  return new RegExp(`^${re}$`);
};
