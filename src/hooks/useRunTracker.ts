import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
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

const KEEP_AWAKE_TAG = 'run-tracker';
const SERVICES_OFF_ERROR = 'Turn on location services to record a run.';

function toPermissionState(res: Location.LocationPermissionResponse): PermissionState {
  if (res.granted) return 'granted';
  return res.canAskAgain ? 'undetermined' : 'denied';
}

export function useRunTracker() {
  const [state, dispatch] = useReducer(trackerReducer, initialTrackerState);
  const [permission, setPermission] = useState<PermissionState>('checking');
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  // null until checked; re-checked whenever the app comes back to the foreground.
  const [servicesOn, setServicesOn] = useState<boolean | null>(null);
  const [watchError, setWatchError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Latest state for finish(), so a double tap can't build the same run twice.
  const stateRef = useRef(state);
  const finishingRef = useRef(false);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Check permission and location services on mount, and again when the user comes back
  // from Settings or the quick-settings shade.
  useEffect(() => {
    const check = () => {
      Location.getForegroundPermissionsAsync().then((res) => setPermission(toPermissionState(res)));
      Location.hasServicesEnabledAsync().then(setServicesOn);
    };
    check();
    const sub = AppState.addEventListener('change', (appState) => {
      if (appState === 'active') check();
    });
    return () => sub.remove();
  }, []);

  // Follow the user's position whenever we're allowed to and location services are on.
  useEffect(() => {
    if (permission !== 'granted' || servicesOn !== true) return;
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    Location.watchPositionAsync(
      WATCH_OPTIONS,
      ({ coords, timestamp }) => {
        const point: RoutePoint = { lat: coords.latitude, lng: coords.longitude, t: timestamp };
        setWatchError(null);
        setCurrentLocation(point);
        dispatch({ type: 'location', point, accuracyM: coords.accuracy });
      },
      (reason) => setWatchError(`Location error: ${reason}`),
    )
      .then((sub) => {
        if (cancelled) sub.remove();
        else subscription = sub;
      })
      .catch(() => setWatchError('Could not start location updates.'));

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [permission, servicesOn]);

  // Re-render every second while running; the time itself comes from timestamps.
  // Also keep the screen on: a locked screen stops foreground GPS updates (background tracking is Phase 3).
  useEffect(() => {
    if (state.status !== 'running') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    return () => {
      clearInterval(id);
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [state.status]);

  const requestPermission = useCallback(async () => {
    setPermission(toPermissionState(await Location.requestForegroundPermissionsAsync()));
  }, []);

  const act = useCallback((type: 'start' | 'pause' | 'resume') => {
    const t = Date.now();
    setNow(t);
    dispatch({ type, now: t });
  }, []);

  /**
   * Ends a paused run by passing it to `save`. The run is only cleared once `save` succeeds;
   * if it throws, the run stays paused so the user can retry. Returns null if there's nothing
   * to finish (not paused, or a finish is already in progress).
   */
  const finish = useCallback(async (save: (run: Run) => Promise<void>): Promise<Run | null> => {
    const current = stateRef.current;
    if (current.status !== 'paused' || finishingRef.current) return null;
    finishingRef.current = true;
    try {
      const t = Date.now();
      const run = toRun(current, t, t.toString(36));
      await save(run);
      stateRef.current = initialTrackerState;
      dispatch({ type: 'reset' });
      return run;
    } finally {
      finishingRef.current = false;
    }
  }, []);

  const discard = useCallback(() => dispatch({ type: 'reset' }), []);

  return {
    status: state.status as TrackerStatus,
    elapsedSec: elapsedSec(state, now),
    distanceM: state.distanceM,
    route: state.route,
    currentLocation,
    permission,
    error: permission === 'granted' && servicesOn === false ? SERVICES_OFF_ERROR : watchError,
    requestPermission,
    start: () => act('start'),
    pause: () => act('pause'),
    resume: () => act('resume'),
    finish,
    discard,
  };
}
