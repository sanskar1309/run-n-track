import type { LatLng } from './types';

const EARTH_RADIUS_M = 6371000;
/** Fixes less accurate than this are too noisy to use. */
export const MAX_ACCURACY_M = 20;
/** Movements smaller than this are treated as GPS jitter while standing still. */
export const MIN_STEP_M = 3;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two coordinates, in metres. */
export function haversineDistanceM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Whether a new GPS fix should be added to the route. */
export function shouldAcceptPoint(
  prev: LatLng | null,
  next: LatLng,
  accuracyM: number | null,
): boolean {
  if (accuracyM !== null && accuracyM > MAX_ACCURACY_M) return false;
  if (prev === null) return true;
  return haversineDistanceM(prev, next) >= MIN_STEP_M;
}
