/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * `:location:` protocol — core sub-modes (radius, bbox) shipped here.
 * Tier-2 features (polygon, geojson, route) are opt-in via `with-geo`.
 */

export { locationHandler } from './core';
export { parseCoord, parseRadius, getLocation } from './shared';
