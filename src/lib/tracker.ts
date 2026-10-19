import { haversineDistanceM, shouldAcceptPoint } from './geo';
import type { RoutePoint, Run } from './types';

export type TrackerStatus = 'idle' | 'running' | 'paused';

export type TrackerState = {
  status: TrackerStatus;
  startedAt: number | null;
  /** Active time from finished segments (start/resume → pause). */
  activeMs: number;
  /** When the current running segment began; null unless running. */
  segmentStartedAt: number | null;
  route: RoutePoint[];
  distanceM: number;
  /** Last accepted point of the current segment; null right after start/resume. */
  lastPoint: RoutePoint | null;
};

export type TrackerAction =
  | { type: 'start'; now: number }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'location'; point: RoutePoint; accuracyM: number | null }
  | { type: 'reset' };

export const initialTrackerState: TrackerState = {
  status: 'idle',
  startedAt: null,
  activeMs: 0,
  segmentStartedAt: null,
  route: [],
  distanceM: 0,
  lastPoint: null,
};

export function trackerReducer(state: TrackerState, action: TrackerAction): TrackerState {
  switch (action.type) {
    case 'start':
      if (state.status !== 'idle') return state;
      return {
        ...initialTrackerState,
        status: 'running',
        startedAt: action.now,
        segmentStartedAt: action.now,
      };

    case 'pause':
      if (state.status !== 'running' || state.segmentStartedAt === null) return state;
      return {
        ...state,
        status: 'paused',
        activeMs: state.activeMs + (action.now - state.segmentStartedAt),
        segmentStartedAt: null,
      };

    case 'resume':
      if (state.status !== 'paused') return state;
      // lastPoint = null starts a new segment, so we never add the distance covered while paused.
      return { ...state, status: 'running', segmentStartedAt: action.now, lastPoint: null };

    case 'location': {
      if (state.status !== 'running') return state;
      if (!shouldAcceptPoint(state.lastPoint, action.point, action.accuracyM)) return state;
      const step = state.lastPoint ? haversineDistanceM(state.lastPoint, action.point) : 0;
      return {
        ...state,
        route: [...state.route, action.point],
        distanceM: state.distanceM + step,
        lastPoint: action.point,
      };
    }

    case 'reset':
      return initialTrackerState;
  }
}

/** Moving time in whole seconds, computed from timestamps so a stalled JS thread can't drift it. */
export function elapsedSec(state: TrackerState, now: number): number {
  const currentSegmentMs =
    state.status === 'running' && state.segmentStartedAt !== null ? now - state.segmentStartedAt : 0;
  return Math.floor((state.activeMs + currentSegmentMs) / 1000);
}

export function toRun(state: TrackerState, now: number, id: string): Run {
  return {
    id,
    startedAt: state.startedAt ?? now,
    durationSec: elapsedSec(state, now),
    distanceM: state.distanceM,
    route: state.route,
  };
}
