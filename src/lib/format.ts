const MIN_PACE_DISTANCE_M = 10;
const MAX_PACE_SEC_PER_KM = 59 * 60 + 59;

const pad2 = (n: number) => n.toString().padStart(2, '0');

/** 65 → "01:05", 3725 → "1:02:05" */
export function formatDuration(totalSec: number): string {
  const sec = Math.floor(totalSec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
}

/** 2450 → "2.45" */
export function formatDistanceKm(meters: number): string {
  return (meters / 1000).toFixed(2);
}

/** Average pace per km, e.g. "5:32". "--:--" while too short or too slow to be meaningful. */
export function formatPace(durationSec: number, meters: number): string {
  if (meters < MIN_PACE_DISTANCE_M) return '--:--';
  const secPerKm = Math.round(durationSec / (meters / 1000));
  if (secPerKm > MAX_PACE_SEC_PER_KM) return '--:--';
  return `${Math.floor(secPerKm / 60)}:${pad2(secPerKm % 60)}`;
}
