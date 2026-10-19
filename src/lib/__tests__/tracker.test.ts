import {
  elapsedSec,
  initialTrackerState,
  toRun,
  trackerReducer,
  type TrackerAction,
  type TrackerState,
} from '../tracker';

const point = (step: number, t = 0) => ({ lat: step * 0.00005, lng: 0, t }); // ~5.6 m per step
const loc = (step: number, t = 0): TrackerAction => ({
  type: 'location',
  point: point(step, t),
  accuracyM: 5,
});
const run = (...actions: TrackerAction[]): TrackerState =>
  actions.reduce(trackerReducer, initialTrackerState);

describe('trackerReducer', () => {
  it('start → running with zeroed stats', () => {
    const state = run({ type: 'start', now: 1000 });
    expect(state.status).toBe('running');
    expect(state.startedAt).toBe(1000);
    expect(state.distanceM).toBe(0);
    expect(state.route).toEqual([]);
  });

  it('counts elapsed time only while running', () => {
    const state = run(
      { type: 'start', now: 0 },
      { type: 'pause', now: 10_000 },
      { type: 'resume', now: 60_000 },
    );
    expect(elapsedSec(state, 65_000)).toBe(15);
  });

  it('freezes elapsed time while paused', () => {
    const state = run({ type: 'start', now: 0 }, { type: 'pause', now: 10_000 });
    expect(elapsedSec(state, 99_000)).toBe(10);
  });

  it('accumulates distance from accepted points', () => {
    const state = run({ type: 'start', now: 0 }, loc(0), loc(1), loc(2));
    expect(state.distanceM).toBeCloseTo(11.1, 0);
    expect(state.route).toHaveLength(3);
  });

  it('ignores location while idle or paused', () => {
    expect(run(loc(0), loc(1)).route).toEqual([]);
    const paused = run({ type: 'start', now: 0 }, loc(0), { type: 'pause', now: 1 }, loc(1), loc(2));
    expect(paused.distanceM).toBe(0);
    expect(paused.route).toHaveLength(1);
  });

  it('does not join across a pause', () => {
    const state = run(
      { type: 'start', now: 0 },
      loc(0),
      { type: 'pause', now: 1 },
      { type: 'resume', now: 2 },
      loc(200), // ~1.1 km away
    );
    expect(state.distanceM).toBe(0);
    expect(state.route).toHaveLength(2);
  });

  it('ignores actions from the wrong state', () => {
    expect(trackerReducer(initialTrackerState, { type: 'pause', now: 1 })).toBe(initialTrackerState);
    const running = run({ type: 'start', now: 0 });
    expect(trackerReducer(running, { type: 'resume', now: 1 })).toBe(running);
    expect(trackerReducer(running, { type: 'start', now: 1 })).toBe(running);
  });

  it('reset returns initial state', () => {
    const state = run({ type: 'start', now: 0 }, loc(0), { type: 'reset' });
    expect(state).toEqual(initialTrackerState);
  });
});

describe('toRun', () => {
  it('builds a Run from a paused state', () => {
    const state = run(
      { type: 'start', now: 1000 },
      loc(0, 1000),
      loc(1, 2000),
      { type: 'pause', now: 31_000 },
    );
    expect(toRun(state, 50_000, 'abc')).toEqual({
      id: 'abc',
      startedAt: 1000,
      durationSec: 30,
      distanceM: state.distanceM,
      route: [point(0, 1000), point(1, 2000)],
    });
  });
});
