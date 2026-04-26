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

import type { ProtocolHandler } from '../../core/types';
import type { LatLng } from '../../geo';
import { haversine } from '../../geo';
import { parseCoord, parseRadius, getLocation } from './shared';

/**
 * Built-in `:location:` protocol handler — core sub-modes.
 *
 * Filters links by geographic location. Links must have `meta.location: [lat, lng]`.
 *
 * Syntax:
 *   :location:                                  → has location metadata (existence)
 *   :location:radius:40.7,-74.0:5mi:           → within 5 miles of coordinates
 *   :location:radius:40.7,-74.0:10km:          → within 10 kilometers
 *   :location:bbox:40.7,-74.0:40.8,-73.9:      → within bounding box (SW, NE)
 *
 * Tier-2 sub-modes (polygon, geojson, route) are added by wrapping with `withGeo`
 * from './with-geo'. They require named presets in the protocol config block.
 */
export const locationHandler: ProtocolHandler = (segments, link) => {
  const linkLoc = getLocation(link);

  if (segments.length === 0) return linkLoc !== null;
  if (!linkLoc) return false;

  const subMode = segments[0];
  const args = segments.slice(1);

  if (subMode === 'radius') return radius(linkLoc, args);
  if (subMode === 'bbox') return bbox(linkLoc, args);

  return false;
};

const radius = (linkLoc: LatLng, args: string[]): boolean => {
  if (args.length !== 2) return false;
  const center = parseCoord(args[0]);
  const r = parseRadius(args[1]);
  if (!center || !r) return false;
  return haversine(center, linkLoc, r.unit) <= r.value;
};

const bbox = (linkLoc: LatLng, args: string[]): boolean => {
  if (args.length !== 2) return false;
  const c1 = parseCoord(args[0]);
  const c2 = parseCoord(args[1]);
  if (!c1 || !c2) return false;
  const minLat = Math.min(c1[0], c2[0]);
  const maxLat = Math.max(c1[0], c2[0]);
  const minLng = Math.min(c1[1], c2[1]);
  const maxLng = Math.max(c1[1], c2[1]);
  return linkLoc[0] >= minLat && linkLoc[0] <= maxLat
    && linkLoc[1] >= minLng && linkLoc[1] <= maxLng;
};
