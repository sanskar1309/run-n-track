# Run Tracker

A Strava-inspired running app built with Expo + React Native as a learning project.
Record a run with live time, distance, pace and your route on a map; runs are saved on the device
and listed in History.

## Run it

Requires Node 22 (`.nvmrc`) and the **Expo Go** app on your phone (same Wi-Fi as your computer).

```bash
nvm use
npm install
npx expo start        # scan the QR code with Expo Go (Android) or the Camera app (iPhone)
npx expo start --web  # History/detail in the browser; recording is phone-only
```

## Develop

```bash
npm test          # Jest unit tests (src/lib)
npx tsc --noEmit  # typecheck
npx expo lint     # lint
```

## Structure

```
src/app/            screens (Expo Router: (tabs)/index = Record, (tabs)/history, run/[id])
src/components/     StatsPanel, RunMap (.ios = Apple Maps, default = Leaflet WebView, .web = placeholder)
src/hooks/          useRunTracker — location permission + GPS stream + timer
src/lib/            pure logic: format, geo, tracker reducer, runStorage, leafletMap
docs/superpowers/   design spec and implementation plan
```

## Notes

- **Expo SDK 57**, because the store Expo Go doesn't support SDK 58 yet.
- **Android map** is Leaflet + OpenStreetMap tiles in a WebView: Expo Go on Android ships an expired
  Google Maps key ([expo/expo#49323](https://github.com/expo/expo/issues/49323)).
  Map data © OpenStreetMap contributors.
