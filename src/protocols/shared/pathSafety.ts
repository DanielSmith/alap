/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * Filesystem path-safety helpers used by protocols that read from a
 * configured root (e.g. :obsidian:core:). Kept deliberately tiny; heavier
 * traversal logic belongs in the calling protocol.
 */

import { resolve, sep } from 'node:path';

/**
 * Return true iff `target` lies within `base` after path normalization.
 * Both paths are resolved to absolute form before comparison.
 *
 * Does NOT consult the filesystem — symlinks are resolved by the caller
 * via `fs.realpath` before passing paths in, or via {@link realpathWithin}.
 */
export const isWithin = (base: string, target: string): boolean => {
  const absBase = resolve(base);
  const absTarget = resolve(target);
  if (absTarget === absBase) return true;
  const withSep = absBase.endsWith(sep) ? absBase : absBase + sep;
  return absTarget.startsWith(withSep);
};

/**
 * Resolve symlinks in `target` and verify the real path is still inside `base`.
 * Returns the canonical path, or null if the target escapes the base.
 *
 * Caller is responsible for mapping `null` to whatever error/warning they need.
 */
export const realpathWithin = async (
  base: string,
  target: string,
): Promise<string | null> => {
  const { realpath } = await import('node:fs/promises');
  let realBase: string;
  let realTarget: string;
  try {
    realBase = await realpath(base);
    realTarget = await realpath(target);
  } catch {
    return null;
  }
  return isWithin(realBase, realTarget) ? realTarget : null;
};
