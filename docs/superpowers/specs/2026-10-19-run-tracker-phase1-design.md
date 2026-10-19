# Run Tracker — Phase 1 "Record a run" — Design

Date: 2026-10-19

## Purpose

A Strava-inspired running app built as a learning project. The developer is an
experienced web frontend dev (React, Vue) learning React Native to become a
web + mobile frontend dev. The project should teach what is genuinely different
on mobile, explained by contrast with the web.

## Constraints

- **Zero cost.** Only free tools and services. No app store publishing.
- **Dev machine:** macOS 12.7, no full Xcode, no Android SDK. Testing happens on a
  physical phone via Expo Go. Node 22 (via nvm) is used; the default Node 14 is
  too old.
- **Expo Go compatible.** Phase 1 uses only libraries that run in Expo Go, so no
  native build is needed.

## Success criteria

1. On a phone in Expo Go, the user can start a run, pause/resume it, and finish it
   while seeing live time, distance, pace, and their route on a map.
2. Finished runs persist across app restarts and appear in a History list.
3. Tapping a run opens a detail screen with the route drawn on a map and summary
   stats.
4. History and Run detail render in a web browser from the same codebase.
5. Pure logic (distance, pace, formatting, storage) is covered by Jest tests.

## Phased roadmap (context only — this spec covers Phase 1)

1. **Record a run** (this spec)
2. Stats & polish: totals, charts, PBs, splits, dark mode
3. Background tracking: development build, screen-locked tracking, notifications
4. Backend & social: Supabase auth, cloud sync, feed

## Stack

- Expo (latest SDK) + TypeScript
- Expo Router (file-based routing, tabs + stack)
- `expo-location` — foreground location permission and `watchPositionAsync`
- `react-native-maps` — map, user location, route `Polyline` (no API key in Expo Go)
- `@react-native-async-storage/async-storage` — persistence
- Plain `StyleSheet` and React state/hooks (no styling or state libraries)
- Jest via `jest-expo` for unit tests

## Screens

```
app/
  _layout.tsx        root Stack
  (tabs)/
    _layout.tsx      Tabs: Record, History
    index.tsx        Record screen
    history.tsx      History screen
  run/[id].tsx       Run detail screen
```

- **Record:** full-screen map following the user, a stats panel (Time, Distance,
  Pace), and controls that change by state:
  idle → `Start`; running → `Pause`; paused → `Resume` + `Finish`.
  Finish saves the run and navigates to its detail screen.
  Finishing a run with zero distance discards it (with a confirm alert).
- **History:** `FlatList` of runs, newest first. Each row: date, distance (km),
  duration, average pace. Empty state when no runs exist. Refreshes on focus.
- **Run detail:** map fitted to the route with a `Polyline`, plus summary stats.
  Not-found state if the id doesn't exist.

## Units

| Unit | Responsibility | Depends on |
|---|---|---|
| `lib/geo.ts` | `haversineDistanceM(a, b)`, `shouldAcceptPoint(prev, next, accuracy)` | nothing |
| `lib/format.ts` | `formatDuration(sec)` → `"mm:ss"`/`"h:mm:ss"`, `formatDistanceKm(m)` → `"2.45"`, `formatPace(sec, m)` → `"5:32"` /km or `"--:--"` | nothing |
| `lib/runStorage.ts` | `saveRun`, `listRuns` (newest first), `getRun(id)` | AsyncStorage |
| `hooks/useRunTracker.ts` | Permission, location subscription, timer, status machine, accumulated route/distance; exposes `{status, elapsedSec, distanceM, route, currentLocation, permission, start, pause, resume, finish}` | `expo-location`, `lib/geo` |
| `components/StatsPanel.tsx` | Presentational Time / Distance / Pace display | `lib/format` |
| `components/RunMap.tsx` (+ `RunMap.web.tsx`) | Map with route polyline; web variant is a placeholder | `react-native-maps` |

## Data model

```ts
type RoutePoint = { lat: number; lng: number; t: number }; // t = epoch ms
type Run = {
  id: string;          // e.g. Date.now().toString(36)
  startedAt: number;   // epoch ms
  durationSec: number; // moving time, excludes paused time
  distanceM: number;
  route: RoutePoint[];
};
```

Storage: a single AsyncStorage key `runs` holding a JSON array of `Run`.

## Tracking behaviour

- `watchPositionAsync` with high accuracy, `distanceInterval: 3`, `timeInterval: 1000`.
- A point is accepted only if accuracy ≤ 20 m and it is ≥ 3 m from the last
  accepted point (filters standing-still jitter).
- Elapsed time is computed from timestamps (sum of active intervals), not by
  counting ticks, so it stays correct if the JS thread stalls. A 1 s interval only
  triggers re-renders.
- While paused, location updates are ignored for distance and route. Resuming
  starts a new segment: the first point after resume is not joined to the last
  point before pause for distance purposes.

## Error handling

- **Permission denied:** Record screen shows an explanation and a button that
  opens system settings (`Linking.openSettings()`).
- **Location services off / errors:** show a message on the Record screen; do not
  crash.
- **Storage read errors / corrupt JSON:** `listRuns` returns `[]` and logs.
- **Web:** Record screen shows "Recording is available in the phone app";
  History and detail work, map is a placeholder.

## Testing

- Jest unit tests for `geo`, `format`, and `runStorage` (AsyncStorage's official
  Jest mock).
- Manual end-to-end: walk outside with Expo Go, verify live stats, pause/resume,
  finish, history, detail, and persistence after app restart.
- Web smoke check: `npx expo start --web`, History and detail render.

## Teaching approach

Built step by step. Claude writes each step in small pieces, explaining every new
concept by contrast with web React (`View` vs `div`, `FlatList` vs `.map()`,
Flexbox defaults, navigation vs URLs, permissions). The developer runs the app on
their phone after each step and gets small exercises along the way.

## Out of scope (Phase 1)

Charts, splits, personal bests, background/screen-locked tracking, notifications,
accounts, cloud sync, dark mode, units other than km.
