/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * Great-circle distance math. Pure mechanism — usable by any protocol or refiner.
 */

const EARTH_RADIUS_MI = 3958.8;
const EARTH_RADIUS_KM = 6371;

export type LatLng = [number, number];
export type Unit = 'mi' | 'km';

/**
 * Haversine great-circle distance between two [lat, lng] points.
 */
export const haversine = (
  [lat1, lon1]: LatLng,
  [lat2, lon2]: LatLng,
  unit: Unit,
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
