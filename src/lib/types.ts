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

/** What the History list needs: a Run without its (large) route. */
export type RunSummary = Omit<Run, 'route'>;
