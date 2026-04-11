/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 */

/** Path segments that could cause prototype pollution if traversed. */
export const BLOCKED_PATH_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);
