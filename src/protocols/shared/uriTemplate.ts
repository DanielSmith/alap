/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * Minimal `{var}` template expansion shared by protocols that build
 * deterministic URIs (e.g. `obsidian://open?vault={vault}&file={path}`).
 *
 * Values are URL-encoded by default so template authors don't need to
 * remember to escape. Pass `{ raw: ['name'] }` to opt a specific key
 * out of encoding when the caller has already handled it.
 */

const VAR_PATTERN = /\{([a-zA-Z0-9_]+)\}/g;

export interface ExpandOptions {
  /** Names of vars whose values should be inserted verbatim, without URL encoding. */
  raw?: string[];
}

/**
 * Expand `{var}` placeholders in `template` using `vars`.
 *
 * - Missing keys are left as-is (so typos are visible in the output).
 * - `undefined`/`null` values are treated the same as missing keys.
 * - All other values are coerced to string and `encodeURIComponent`-d
 *   unless named in `options.raw`.
 */
export const expandTemplate = (
  template: string,
  vars: Record<string, unknown>,
  options?: ExpandOptions,
): string => {
  const raw = options?.raw ? new Set(options.raw) : null;
  return template.replace(VAR_PATTERN, (match, name: string) => {
    if (!(name in vars)) return match;
    const value = vars[name];
    if (value === undefined || value === null) return match;
    const str = String(value);
    return raw?.has(name) ? str : encodeURIComponent(str);
  });
};
