/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * Location-protocol-specific glue: pulls coordinates out of link meta and
 * parses the colon-delimited segment strings the `:location:` protocol uses.
 *
 * Pure spatial math (distance, polygon containment) lives in `src/geo/`.
 */

import type { LatLng, Unit } from '../../geo';

export const parseCoord = (s: string): LatLng | null => {
  const parts = s.split(',');
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return [lat, lng];
};

export const parseRadius = (s: string): { value: number; unit: Unit } | null => {
  const match = s.match(/^(\d+(?:\.\d+)?)(mi|km)$/i);
  if (!match) return null;
  return { value: parseFloat(match[1]), unit: match[2].toLowerCase() as Unit };
};

export const getLocation = (link: { meta?: Record<string, unknown> }): LatLng | null => {
  const loc = link.meta?.location;
  if (!Array.isArray(loc) || loc.length !== 2) return null;
  const [lat, lng] = loc;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return [lat, lng];
};
