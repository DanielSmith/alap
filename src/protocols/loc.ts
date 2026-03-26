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

import type { ProtocolHandler } from '../core/types';

const EARTH_RADIUS_MI = 3958.8;
const EARTH_RADIUS_KM = 6371;

/**
 * Haversine distance between two [lat, lng] points.
 * Returns distance in the specified unit.
 */
const haversine = (
  [lat1, lon1]: [number, number],
  [lat2, lon2]: [number, number],
  unit: 'mi' | 'km',
): number => {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const R = unit === 'km' ? EARTH_RADIUS_KM : EARTH_RADIUS_MI;
  return R * c;
};

/**
 * Parse a coordinate string "lat,lng" into a tuple.
 */
const parseCoord = (s: string): [number, number] | null => {
  const parts = s.split(',');
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return [lat, lng];
};

/**
 * Parse a radius string like "5mi" or "10km" into value and unit.
 */
const parseRadius = (s: string): { value: number; unit: 'mi' | 'km' } | null => {
  const match = s.match(/^(\d+(?:\.\d+)?)(mi|km)$/i);
  if (!match) return null;
  return { value: parseFloat(match[1]), unit: match[2].toLowerCase() as 'mi' | 'km' };
};

/**
 * Get location from a link's meta.location field.
 * Expects [lat, lng] array.
 */
const getLocation = (link: { meta?: Record<string, unknown> }): [number, number] | null => {
  const loc = link.meta?.location;
  if (!Array.isArray(loc) || loc.length !== 2) return null;
  const [lat, lng] = loc;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return [lat, lng];
};

/**
 * Built-in `:loc:` protocol handler.
 *
 * Filters links by geographic location. Links must have `meta.location: [lat, lng]`.
 *
 * Syntax:
 *   :loc:                              → has location metadata (existence check)
 *   :loc:40.7,-74.0:5mi:              → within 5 miles of coordinates
 *   :loc:40.7,-74.0:10km:             → within 10 kilometers
 *   :loc:40.7,-74.0:40.8,-73.9:      → within bounding box (SW corner, NE corner)
 */
export const locHandler: ProtocolHandler = (segments, link) => {
  const linkLoc = getLocation(link);

  // No args: existence check — does this link have location data?
  if (segments.length === 0) {
    return linkLoc !== null;
  }

  if (!linkLoc) return false;

  if (segments.length === 2) {
    const center = parseCoord(segments[0]);
    if (!center) return false;

    // Check if second arg is a radius (e.g. "5mi") or a coordinate (bounding box)
    const radius = parseRadius(segments[1]);
    if (radius) {
      const dist = haversine(center, linkLoc, radius.unit);
      return dist <= radius.value;
    }

    // Bounding box: two coordinates
    const corner2 = parseCoord(segments[1]);
    if (corner2) {
      const [minLat, minLng] = [Math.min(center[0], corner2[0]), Math.min(center[1], corner2[1])];
      const [maxLat, maxLng] = [Math.max(center[0], corner2[0]), Math.max(center[1], corner2[1])];
      return linkLoc[0] >= minLat && linkLoc[0] <= maxLat
        && linkLoc[1] >= minLng && linkLoc[1] <= maxLng;
    }
  }

  return false;
};
