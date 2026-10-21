# Run Tracker — Phase 2a "Run fixes" — Design

Date: 2026-10-21
Builds on: `2026-10-19-run-tracker-phase1-design.md`

## Purpose

Fix the problems a runner notices while using the Phase 1 app, found in the Phase 1
code review. No new features; stats features are Phase 2b.

## Constraints

Same as Phase 1: zero cost, runs in Expo Go (SDK 57), Node 22, plain StyleSheet and
React hooks. Previously saved runs must keep working without migration.

## Success criteria

1. A run paused and resumed shows a gap in the route line, on both the Record and
   Run detail maps. Distance is unchanged from Phase 1 behaviour.
2. During a run the user can pan and zoom. Dragging the map stops auto-follow and
   shows a "Recenter" button; tapping it resumes follow. Following never resets the
   user's zoom.
3. Standing still with GPS accuracy of N metres adds no distance unless the position
   moves more than max(3 m, N) from the last accepted point.
4. History shows a spinner, not "No runs yet", until the first load finishes.
5. On Android, the map's route line and position dot render without internet access
   (tiles may be blank). If the WebView renderer is killed, the map reloads and
   redraws.

## 1. Route segments

- `RoutePoint` gains an optional field: `newSegment?: true`.
- Tracker reducer: on `resume`, the next accepted point is stored with
  `newSegment: true`. The first point of a run is never marked.
  Implementation: the reducer already sets `lastPoint = null` on resume; a point
  accepted while `lastPoint === null` and `route.length > 0` gets `newSegment: true`.
- New pure helper `toSegments(route: RoutePoint[]): RoutePoint[][]` in
  `src/lib/segments.ts`: splits before every point with `newSegment`. Empty route →
  `[]`. Old runs (no markers) → one segment.
- Maps draw segments, never the flat route:
  - Leaflet: `L.polyline` with an array of segments (multi-polyline).
  - iOS: one `<Polyline>` per segment with length > 1.
- Detail-screen fitting uses all points of all segments.

## 2. Pan, zoom and Recenter

- `RunMapProps` gains `onUserPan?: () => void`. `follow` keeps its meaning: when true
  the camera tracks `currentLocation`.
- Record screen owns `following` state (initially true). It passes
  `follow={following}` and `onUserPan={() => setFollowing(false)}`. When
  `following` is false it shows a "Recenter" button over the map (top right, below
  the safe area). Tapping it sets `following` to true. Starting a run sets
  `following` to true.
- Following keeps zoom:
  - Leaflet: first follow uses zoom 17 if the current zoom is < 15; afterwards
    `panTo` the location without changing zoom.
  - iOS: `animateCamera({ center })` without zoom/altitude.
- Detecting a user pan:
  - Leaflet: `map.on('dragstart')` posts `{"type":"userPan"}` via
    `window.ReactNativeWebView.postMessage`; `RunMap` parses it in `onMessage` and
    calls `onUserPan`.
  - iOS: `onPanDrag` → `onUserPan`.
- Detail screen passes `follow={false}` and no `onUserPan` (unchanged behaviour).

## 3. Standing-still filter

- `shouldAcceptPoint(prev, next, accuracyM)`: reject if `accuracyM > 20`
  (unchanged); with a previous point, accept only if distance ≥
  `max(MIN_STEP_M, accuracyM ?? 0)`. `MIN_STEP_M` stays 3.

## 4. History loading state

- `runs` state starts as `null`. While `null`, show an `ActivityIndicator`.
  Subsequent focus refreshes keep showing the current list (no spinner flash).

## 5. Android map reliability

- Add `leaflet` (npm, same version as before: 1.9.4) as a dev dependency.
- `scripts/vendor-leaflet.js` reads `node_modules/leaflet/dist/leaflet.js` and
  `leaflet.css` and writes `src/lib/vendor/leaflet.generated.ts` exporting
  `LEAFLET_JS` and `LEAFLET_CSS` strings. The generated file is committed; an npm
  script `vendor:leaflet` regenerates it.
- `LEAFLET_HTML` inlines both instead of loading from unpkg. Tiles still load from
  `tile.openstreetmap.org`.
- `RunMap` (Android) handles `onRenderProcessGone`: mark not loaded and call
  `reload()`; `onLoadEnd` then re-sends the latest data.

## Testing

- Unit: `toSegments` (empty, no markers, two segments, marker on first point is
  ignored); reducer marks the first point after resume and never the first point of
  a run; `shouldAcceptPoint` with accuracy 10 rejects 8 m and accepts 11 m, with null
  accuracy uses 3 m; `mapUpdateScript` sends segments; Leaflet HTML contains no
  `unpkg.com` reference.
- Component: History shows a spinner before `listRuns` resolves, then the list.
- Phone: walk, pause, move ~30 m, resume → gap in line on Record and detail maps;
  drag map → Recenter appears, tap → follows again at the same zoom; airplane mode
  on the Run detail screen → route line still visible.

## Out of scope (Phase 2b and later)

Totals, chart, splits, personal bests, dark mode, deleting runs, auto-pause, offline
map tiles, background tracking.
