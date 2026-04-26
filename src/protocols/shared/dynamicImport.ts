/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * Memoised optional-dependency loader. Protocols that prefer a third-party
 * library when available but can fall back to a built-in implementation
 * use this to avoid hard dependencies and to avoid re-importing on every
 * call.
 *
 * Resolution is cached permanently per specifier (including negative
 * results) because module presence does not change mid-process.
 */

type LoadState<T> =
  | { kind: 'resolved'; value: T }
  | { kind: 'rejected' }
  | { kind: 'pending'; promise: Promise<T | null> };

const cache = new Map<string, LoadState<unknown>>();

/**
 * Try to import `specifier`. Returns the module namespace on success, or
 * null if the package isn't installed (or fails to load for any reason).
 *
 * The specifier is passed through a variable so bundlers can't see a static
 * string and try to resolve it at build time — callers get true runtime
 * optionality.
 */
export const loadOptional = async <T = unknown>(specifier: string): Promise<T | null> => {
  const cached = cache.get(specifier) as LoadState<T> | undefined;
  if (cached) {
    if (cached.kind === 'resolved') return cached.value;
    if (cached.kind === 'rejected') return null;
    return cached.promise;
  }

  const promise = (async () => {
    try {
      const dynamicSpec = specifier;
      const mod = (await import(/* @vite-ignore */ dynamicSpec)) as T;
      cache.set(specifier, { kind: 'resolved', value: mod });
      return mod;
    } catch {
      cache.set(specifier, { kind: 'rejected' });
      return null;
    }
  })();

  cache.set(specifier, { kind: 'pending', promise });
  return promise;
};

/**
 * Test-only: drop the cache entry for a specifier so the next call retries.
 * Not exported from the shared barrel; pulled directly in tests.
 */
export const __resetDynamicImportCache = (specifier?: string): void => {
  if (specifier) cache.delete(specifier);
  else cache.clear();
};
