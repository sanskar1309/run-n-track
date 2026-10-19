export type LatLng = { lat: number; lng: number };

/** A GPS fix on the route; t is epoch ms. */
export type RoutePoint = LatLng & { t: number };

export type Run = {
  id: string;
  startedAt: number; // epoch ms
  durationSec: number; // moving time, excludes paused time
  distanceM: number;
  route: RoutePoint[];
};
