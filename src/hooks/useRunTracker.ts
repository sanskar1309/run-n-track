import * as Location from 'expo-location';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  elapsedSec,
  initialTrackerState,
  toRun,
  trackerReducer,
  type TrackerStatus,
} from '@/lib/tracker';
import type { LatLng, RoutePoint, Run } from '@/lib/types';

/** 'checking' until we've asked the OS; 'denied' only when the OS won't show the prompt again. */
export type PermissionState = 'checking' | 'undetermined' | 'granted' | 'denied';

const WATCH_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  distanceInterval: 3,
  timeInterval: 1000,
};

function toPermissionState(res: Location.LocationPermissionResponse): PermissionState {
  if (res.granted) return 'granted';
  return res.canAskAgain ? 'undetermined' : 'denied';
}

export function useRunTracker() {
  const [state, dispatch] = useReducer(trackerReducer, initialTrackerState);
  const [permission, setPermission] = useState<PermissionState>('checking');
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Latest state for finish(), so a double tap can't build the same run twice.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Check permission on mount, and again when the user comes back from Settings.
  useEffect(() => {
    const check = () => Location.getForegroundPermissionsAsync().then((res) => setPermission(toPermissionState(res)));
    check();
    const sub = AppState.addEventListener('change', (appState) => {
      if (appState === 'active') check();
    });
    return () => sub.remove();
  }, []);

  // Follow the user's position whenever we're allowed to.
  useEffect(() => {
    if (permission !== 'granted') return;
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      if (!(await Location.hasServicesEnabledAsync())) {
        setError('Turn on location services to record a run.');
        return;
      }
      const sub = await Location.watchPositionAsync(
        WATCH_OPTIONS,
        ({ coords, timestamp }) => {
          const point: RoutePoint = { lat: coords.latitude, lng: coords.longitude, t: timestamp };
          setError(null);
          setCurrentLocation(point);
          dispatch({ type: 'location', point, accuracyM: coords.accuracy });
        },
        (reason) => setError(`Location error: ${reason}`),
      );
      if (cancelled) sub.remove();
      else subscription = sub;
    })().catch(() => setError('Could not start location updates.'));

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [permission]);

  // Re-render every second while running; the time itself comes from timestamps.
  useEffect(() => {
    if (state.status !== 'running') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.status]);

  const requestPermission = useCallback(async () => {
    setPermission(toPermissionState(await Location.requestForegroundPermissionsAsync()));
  }, []);

  const act = useCallback((type: 'start' | 'pause' | 'resume') => {
    const t = Date.now();
    setNow(t);
    dispatch({ type, now: t });
  }, []);

  /** Ends a paused run and returns it (not yet saved). Returns null if there's no paused run. */
  const finish = useCallback((): Run | null => {
    const current = stateRef.current;
    if (current.status !== 'paused') return null;
    stateRef.current = initialTrackerState;
    dispatch({ type: 'reset' });
    const t = Date.now();
    return toRun(current, t, t.toString(36));
  }, []);

  const discard = useCallback(() => dispatch({ type: 'reset' }), []);

  return {
    status: state.status as TrackerStatus,
    elapsedSec: elapsedSec(state, now),
    distanceM: state.distanceM,
    route: state.route,
    currentLocation,
    permission,
    error,
    requestPermission,
    start: () => act('start'),
    pause: () => act('pause'),
    resume: () => act('resume'),
    finish,
    discard,
  };
}
