/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 */

export { BLOCKED_PATH_SEGMENTS } from './guards';
export { getPath } from './getPath';
export { stripHtml } from './stripHtml';
export { expandTemplate } from './uriTemplate';
export type { ExpandOptions } from './uriTemplate';
export { loadOptional } from './dynamicImport';
export { readCappedJson } from './readCappedJson';
// Node-only helpers (pathSafety, localhostGuard) are intentionally NOT
// re-exported here — importing them would pull node:fs/promises / node:path
// into every browser bundle that touches `protocols/shared`. Deep-import
// them from the handler modules that actually need them.
