# Run Tracker Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Strava-inspired Expo app that records a run (live time/distance/pace + route on a map), saves it on the device, and shows a history list and run detail.

**Architecture:** Expo Router app with a Tabs group (Record, History) inside a root Stack (Run detail). All logic that can be pure lives in `lib/` (formatting, geo math, a tracker reducer, storage) and is unit tested with Jest; `hooks/useRunTracker.ts` wires the reducer to `expo-location`; screens stay thin.

**Tech Stack:** Expo (latest SDK), TypeScript, Expo Router, expo-location, react-native-maps, @react-native-async-storage/async-storage, jest-expo.

**Spec:** `docs/superpowers/specs/2026-10-19-run-tracker-phase1-design.md`

## Global Constraints

- Zero cost: only free libraries/services; nothing that needs an API key or paid account.
- Must run in Expo Go (no custom native code, no dev build). Install native libs with `npx expo install` so versions match the SDK.
- Node 22. Every shell command runs after `source ~/.nvm/nvm.sh && nvm use 22` (the machine's default Node 14 breaks npm). Commit an `.nvmrc` containing `22`.
- No styling or state libraries: plain `StyleSheet` and React hooks.
- Tests never live under `app/` (Expo Router treats every file there as a route). Tests go in `__tests__/` folders next to the code.
- Units: kilometres only. Distance shown with 2 decimals, pace as `m:ss` per km.
- GPS filter: reject accuracy > 20 m; reject points < 3 m from the last accepted point.
- Watch options: `Location.Accuracy.BestForNavigation`, `distanceInterval: 3`, `timeInterval: 1000`.
- Storage: single AsyncStorage key `runs` holding a JSON array of `Run`.
- Teaching: each task's commit is preceded by an explanation to the developer of the new RN concepts, contrasted with web React, and the app is run on their phone via Expo Go where the task says so.

## Review Focus

1. **Tiny distance at the start of a run** — pace must show `--:--` (not `0:03` or `Infinity`) until at least 10 m covered. Test in Task 2.
2. **Movement while paused** — distance gained between pause and resume must not be counted, and the first point after resume must not be joined to the last point before pause. Test in Task 4.
3. **Corrupt or missing storage** — invalid JSON under `runs` must yield `[]`, not a crash. Test in Task 5.
4. **Double-tapping Finish** — must save exactly one run. `finish()` returns `null` when status isn't `paused`. Test in Task 4 (reducer ignores `pause`/`finish`-path actions from the wrong state).
5. **Location fixes arriving while idle or paused** — ignored for distance/route but still update the "you are here" position. Test in Task 4.

---

### Task 1: Scaffold the Expo app + Jest

**Files:**
- Create: whole Expo project at repo root, `.nvmrc`, `jest.setup.ts`, `lib/__tests__/sanity.test.ts` (deleted in Task 2)
- Modify: `package.json` (jest config + `test` script), `app.json` (name, slug, location permission text)

**Interfaces:**
- Produces: `npm test` runs Jest with the `jest-expo` preset and AsyncStorage mock; `npx expo start` serves the app.

- [ ] **Step 1:** Scaffold into a temp folder (repo root already has `docs/`), then move contents up:
  `npx create-expo-app@latest app-tmp --yes` → move everything (incl. dotfiles, except `.git` if created) from `app-tmp/` into the repo root → remove `app-tmp/`.
- [ ] **Step 2:** `npm run reset-project` and answer `n` (delete example files rather than keeping `app-example/`). Expected: `app/index.tsx` and `app/_layout.tsx` only.
- [ ] **Step 3:** `npx expo install expo-location react-native-maps @react-native-async-storage/async-storage` and `npx expo install jest-expo jest @types/jest -- --save-dev`.
- [ ] **Step 4:** In `package.json` add `"test": "jest"` and `"jest": { "preset": "jest-expo", "setupFiles": ["<rootDir>/jest.setup.ts"] }`. `jest.setup.ts` mocks AsyncStorage with `@react-native-async-storage/async-storage/jest/async-storage-mock`.
- [ ] **Step 5:** In `app.json`: `name: "Run Tracker"`, `slug: "run-tracker"`, and the `expo-location` config plugin with `locationWhenInUsePermission: "Run Tracker uses your location to record your runs."`.
- [ ] **Step 6:** Write `lib/__tests__/sanity.test.ts` (`expect(1 + 1).toBe(2)`), run `npm test`. Expected: 1 passed.
- [ ] **Step 7:** `npx expo start`, scan the QR with Expo Go on the phone. Expected: the reset-project starter screen renders. Also `npx tsc --noEmit` → no errors.
- [ ] **Step 8:** Commit `chore: scaffold Expo app with Jest`.

### Task 2: Formatting helpers

**Files:**
- Create: `lib/format.ts`, `lib/__tests__/format.test.ts`
- Delete: `lib/__tests__/sanity.test.ts`

**Interfaces:**
- Produces: `formatDuration(totalSec: number): string`, `formatDistanceKm(meters: number): string`, `formatPace(durationSec: number, meters: number): string`

- [ ] **Step 1: Write the failing tests**

```ts
describe('formatDuration', () => {
  it('pads minutes and seconds', () => { expect(formatDuration(0)).toBe('00:00'); expect(formatDuration(65)).toBe('01:05'); });
  it('adds hours when needed', () => { expect(formatDuration(3725)).toBe('1:02:05'); });
  it('floors fractional seconds', () => { expect(formatDuration(59.9)).toBe('00:59'); });
});
describe('formatDistanceKm', () => {
  it('shows km with 2 decimals', () => { expect(formatDistanceKm(0)).toBe('0.00'); expect(formatDistanceKm(2450)).toBe('2.45'); expect(formatDistanceKm(10004)).toBe('10.00'); });
});
describe('formatPace', () => {
  it('is minutes:seconds per km', () => { expect(formatPace(332, 1000)).toBe('5:32'); expect(formatPace(1500, 5000)).toBe('5:00'); });
  it('shows --:-- under 10 m', () => { expect(formatPace(5, 0)).toBe('--:--'); expect(formatPace(5, 9.9)).toBe('--:--'); });
  it('shows --:-- when slower than 59:59/km', () => { expect(formatPace(3600, 1000)).toBe('--:--'); });
});
```

- [ ] **Step 2:** `npm test -- format` → FAIL (module not found).
- [ ] **Step 3:** Implement the three functions in `lib/format.ts`. Pace = `durationSec / (meters / 1000)`, rounded to whole seconds.
- [ ] **Step 4:** `npm test -- format` → PASS. Delete the sanity test.
- [ ] **Step 5:** Commit `feat: add duration, distance and pace formatting`.

### Task 3: Geo helpers + shared types

**Files:**
- Create: `lib/types.ts`, `lib/geo.ts`, `lib/__tests__/geo.test.ts`

**Interfaces:**
- Produces (`lib/types.ts`): `type LatLng = { lat: number; lng: number }`, `type RoutePoint = LatLng & { t: number }`, `type Run = { id: string; startedAt: number; durationSec: number; distanceM: number; route: RoutePoint[] }`
- Produces (`lib/geo.ts`): `haversineDistanceM(a: LatLng, b: LatLng): number`, `shouldAcceptPoint(prev: LatLng | null, next: LatLng, accuracyM: number | null): boolean`, constants `MAX_ACCURACY_M = 20`, `MIN_STEP_M = 3`

- [ ] **Step 1: Write the failing tests**

```ts
it('is 0 for the same point', () => { expect(haversineDistanceM({lat: 18.52, lng: 73.85}, {lat: 18.52, lng: 73.85})).toBe(0); });
it('is ~111195 m for 1 degree of latitude', () => { expect(haversineDistanceM({lat: 0, lng: 0}, {lat: 1, lng: 0})).toBeCloseTo(111195, -1); });
it('rejects poor accuracy', () => { expect(shouldAcceptPoint(null, {lat: 0, lng: 0}, 25)).toBe(false); });
it('accepts the first good point', () => { expect(shouldAcceptPoint(null, {lat: 0, lng: 0}, 5)).toBe(true); });
it('accepts unknown accuracy', () => { expect(shouldAcceptPoint(null, {lat: 0, lng: 0}, null)).toBe(true); });
it('rejects jitter under 3 m', () => { expect(shouldAcceptPoint({lat: 0, lng: 0}, {lat: 0.00002, lng: 0}, 5)).toBe(false); }); // ~2.2 m
it('accepts a real step', () => { expect(shouldAcceptPoint({lat: 0, lng: 0}, {lat: 0.00005, lng: 0}, 5)).toBe(true); });  // ~5.6 m
```

- [ ] **Step 2:** `npm test -- geo` → FAIL.
- [ ] **Step 3:** Implement with Earth radius `6371000` m.
- [ ] **Step 4:** `npm test -- geo` → PASS.
- [ ] **Step 5:** Commit `feat: add geo distance and GPS point filter`.

### Task 4: Tracker reducer (pure run state machine)

Decomposition note: the spec puts the status machine in `useRunTracker`; it is split into a pure reducer here so pause/resume/elapsed-time logic is unit testable without a phone.

**Files:**
- Create: `lib/tracker.ts`, `lib/__tests__/tracker.test.ts`

**Interfaces:**
- Consumes: `RoutePoint`, `Run` (Task 3), `haversineDistanceM`, `shouldAcceptPoint` (Task 3)
- Produces:
  ```ts
  type TrackerStatus = 'idle' | 'running' | 'paused';
  type TrackerState = { status: TrackerStatus; startedAt: number | null; activeMs: number; segmentStartedAt: number | null; route: RoutePoint[]; distanceM: number; lastPoint: RoutePoint | null };
  type TrackerAction =
    | { type: 'start'; now: number } | { type: 'pause'; now: number } | { type: 'resume'; now: number }
    | { type: 'location'; point: RoutePoint; accuracyM: number | null } | { type: 'reset' };
  const initialTrackerState: TrackerState;
  function trackerReducer(state: TrackerState, action: TrackerAction): TrackerState;
  function elapsedSec(state: TrackerState, now: number): number;          // floor of active seconds
  function toRun(state: TrackerState, now: number, id: string): Run;
  ```

- [ ] **Step 1: Write the failing tests** (use fixed `now` numbers; points ~5.6 m apart via `lat` steps of `0.00005`)

```ts
it('start → running with zeroed stats', ...)                       // status 'running', startedAt = now, distanceM 0
it('counts elapsed time only while running', ...)                  // start@0, pause@10_000, resume@60_000 → elapsedSec(state, 65_000) === 15
it('accumulates distance from accepted points', ...)               // 3 points 0.00005 apart → distanceM ≈ 11.1 (toBeCloseTo(11.1, 0)), route length 3
it('ignores location while idle or paused', ...)                   // distanceM stays 0, route unchanged
it('does not join across a pause', ...)                            // p1, pause, resume, p2 far away (lat +0.01) → distanceM stays 0, route has both points
it('ignores actions from the wrong state', ...)                    // 'pause' while idle and 'resume' while running return the same state object
it('toRun builds a Run from a paused state', ...)                  // durationSec = elapsedSec, distanceM, route, startedAt, id
it('reset returns initial state', ...)
```

- [ ] **Step 2:** `npm test -- tracker` → FAIL.
- [ ] **Step 3:** Implement. On `resume`, set `lastPoint = null` so the next accepted point starts a new segment (no distance added for it). Filtering uses `shouldAcceptPoint(state.lastPoint, point, accuracyM)`.
- [ ] **Step 4:** `npm test -- tracker` → PASS.
- [ ] **Step 5:** Commit `feat: add pure run tracker reducer`.

### Task 5: Run storage

**Files:**
- Create: `lib/runStorage.ts`, `lib/__tests__/runStorage.test.ts`

**Interfaces:**
- Consumes: `Run` (Task 3)
- Produces: `saveRun(run: Run): Promise<void>`, `listRuns(): Promise<Run[]>` (newest `startedAt` first), `getRun(id: string): Promise<Run | null>`, `RUNS_KEY = 'runs'`

- [ ] **Step 1: Write the failing tests** (`beforeEach(() => AsyncStorage.clear())`)

```ts
it('returns [] when nothing is stored', ...)
it('saves and lists runs newest first', ...)       // save startedAt 1 then 2 → listRuns ids [2, 1]
it('gets a run by id, or null', ...)
it('returns [] for corrupt JSON', ...)             // AsyncStorage.setItem('runs', '{not json') → listRuns() === []
```

- [ ] **Step 2:** `npm test -- runStorage` → FAIL.
- [ ] **Step 3:** Implement; `listRuns` wraps `JSON.parse` in try/catch, logs with `console.warn`, returns `[]`.
- [ ] **Step 4:** `npm test -- runStorage` → PASS.
- [ ] **Step 5:** Commit `feat: persist runs with AsyncStorage`.

### Task 6: Navigation shell (Tabs + Stack)

**Files:**
- Modify: `app/_layout.tsx` (root `Stack`: `(tabs)` with `headerShown: false`, `run/[id]` titled "Run")
- Delete: `app/index.tsx`
- Create: `app/(tabs)/_layout.tsx` (`Tabs` with Record and History, icons from `@expo/vector-icons` Ionicons `walk`/`list`), `app/(tabs)/index.tsx`, `app/(tabs)/history.tsx`, `app/run/[id].tsx` — each a placeholder `Text` with its screen name; the detail placeholder shows the `id` from `useLocalSearchParams`.

- [ ] **Step 1:** Create the files above.
- [ ] **Step 2:** `npx tsc --noEmit` → no errors.
- [ ] **Step 3:** Run on phone. Expected: two tabs switch; temporarily add `<Link href="/run/abc">` on History and confirm it pushes a detail screen showing `abc` with a back button; then remove the link.
- [ ] **Step 4:** Commit `feat: add tab and stack navigation`.

### Task 7: StatsPanel + RunMap components

**Files:**
- Create: `components/StatsPanel.tsx`, `components/RunMap.tsx`, `components/RunMap.web.tsx`

**Interfaces:**
- Consumes: format helpers (Task 2), `LatLng`, `RoutePoint` (Task 3)
- Produces:
  - `StatsPanel({ elapsedSec, distanceM }: { elapsedSec: number; distanceM: number })` — three columns: Time / Distance (km) / Pace (/km); pace via `formatPace(elapsedSec, distanceM)`.
  - `RunMap({ route, currentLocation, follow, style }: { route: RoutePoint[]; currentLocation: LatLng | null; follow: boolean; style?: StyleProp<ViewStyle> })` — native: `MapView` with `showsUserLocation`, `Polyline` (width 5) for `route`; when `follow` and `currentLocation` changes, `animateCamera` to it; when `!follow`, fit to route coordinates once on layout with padding 40. Web variant renders a grey box with text "Map is available in the phone app".

- [ ] **Step 1:** Implement the three files.
- [ ] **Step 2:** Temporarily render `<StatsPanel elapsedSec={332} distanceM={1000} />` and `<RunMap route={[]} currentLocation={null} follow />` on the Record tab. Run on phone. Expected: `05:32 / 1.00 / 5:32` and a map. Run `npx expo start --web` → the web placeholder renders instead of crashing.
- [ ] **Step 3:** `npx tsc --noEmit` → no errors.
- [ ] **Step 4:** Commit `feat: add stats panel and run map components`.

### Task 8: useRunTracker hook + Record screen

**Files:**
- Create: `hooks/useRunTracker.ts`
- Modify: `app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `trackerReducer`, `initialTrackerState`, `elapsedSec`, `toRun` (Task 4); `saveRun` (Task 5); `StatsPanel`, `RunMap` (Task 7)
- Produces:
  ```ts
  type PermissionState = 'undetermined' | 'granted' | 'denied';
  function useRunTracker(): {
    status: TrackerStatus; elapsedSec: number; distanceM: number; route: RoutePoint[];
    currentLocation: LatLng | null; permission: PermissionState; error: string | null;
    requestPermission(): Promise<void>; start(): void; pause(): void; resume(): void;
    finish(): Run | null;   // null unless status === 'paused'; resets state after building the Run
    discard(): void;        // reset without saving
  }
  ```

- [ ] **Step 1:** Implement the hook: `useReducer(trackerReducer, initialTrackerState)`; on mount read `Location.getForegroundPermissionsAsync()`; when `granted`, `watchPositionAsync` (Global Constraints options), store `currentLocation` and dispatch `location` actions with `accuracyM: coords.accuracy`; remove the subscription on unmount; a 1 s `setInterval` only while `running` bumps a tick so `elapsedSec(state, Date.now())` re-renders; catch watch errors into `error` (e.g. "Turn on location services to record a run.").
- [ ] **Step 2:** Build the Record screen:
  - web (`Platform.OS === 'web'`): centered text "Recording is available in the phone app".
  - `undetermined`: explanation + "Allow location" button → `requestPermission()`.
  - `denied`: explanation + "Open Settings" button → `Linking.openSettings()`.
  - `granted`: `RunMap` (follow) filling the screen, `StatsPanel` card over the bottom, controls: idle → Start; running → Pause; paused → Resume + Finish. `error` shown as a banner.
  - Finish: if `distanceM === 0`, `Alert.alert` "Discard run?" (Discard → `discard()`, Cancel keeps paused); else `const run = finish()`, if non-null `await saveRun(run)` then `router.push(\`/run/${run.id}\`)`. Disable the Finish button while saving (Review Focus 4). Run id: `Date.now().toString(36)`.
  - Wrap in `SafeAreaView` from `react-native-safe-area-context`.
- [ ] **Step 3:** `npm test` (all pass) and `npx tsc --noEmit` (no errors).
- [ ] **Step 4:** On phone: deny permission once → denied screen + Open Settings works; grant → map centres on you. Walk ~100 m: time ticks, distance and pace update, line draws; pause, walk, resume → distance didn't jump; Finish → lands on detail placeholder.
- [ ] **Step 5:** Commit `feat: record runs with live GPS tracking`.

### Task 9: History screen

**Files:**
- Modify: `app/(tabs)/history.tsx`

**Interfaces:**
- Consumes: `listRuns` (Task 5), format helpers (Task 2)

- [ ] **Step 1:** Implement: load with `listRuns()` inside `useFocusEffect` (from `expo-router`) so it refreshes when the tab is opened; `FlatList` keyed by `id`; row shows date (`new Date(startedAt).toLocaleDateString()` + time), `formatDistanceKm` km, `formatDuration`, `formatPace` /km; row is a `Pressable` linking to `/run/[id]`; `ListEmptyComponent`: "No runs yet. Go record your first one!".
- [ ] **Step 2:** On phone: the run from Task 8 is listed; record a second short run → it appears on top after switching tabs; tap opens detail. Kill and reopen the app → runs still there.
- [ ] **Step 3:** Commit `feat: list saved runs in history`.

### Task 10: Run detail screen

**Files:**
- Modify: `app/run/[id].tsx`

**Interfaces:**
- Consumes: `getRun` (Task 5), `RunMap` with `follow={false}`, `StatsPanel` (Task 7)

- [ ] **Step 1:** Implement: `getRun(id)` on mount; loading state (`ActivityIndicator`); `null` → "Run not found"; otherwise header title set to the run date via `<Stack.Screen options={{ title }} />`, `RunMap` (route, no follow) in the top ~60% and `StatsPanel` with `durationSec`/`distanceM` below.
- [ ] **Step 2:** On phone: the route of a recorded run is drawn and the map fits it; `/run/doesnotexist` (temporary link or deep link) shows "Run not found".
- [ ] **Step 3:** Commit `feat: show run detail with route map`.

### Task 11: Final verification

- [ ] **Step 1:** `npm test` → all suites pass. `npx tsc --noEmit` → no errors. `npx expo lint` → no errors.
- [ ] **Step 2:** `npx expo start --web`: Record tab shows the phone-only message; History lists nothing (web storage is separate) without crashing; `/run/x` shows "Run not found".
- [ ] **Step 3:** Full outdoor walk-test against the spec's success criteria 1–3 on the phone.
- [ ] **Step 4:** Add a short `README.md` (what it is, `nvm use 22`, `npm install`, `npx expo start`, `npm test`) and commit `docs: add README`.
