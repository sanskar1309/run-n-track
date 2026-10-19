import { act, renderHook, waitFor } from '@testing-library/react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import { AppState, type AppStateStatus } from 'react-native';

import type { Run } from '@/lib/types';

import { useRunTracker } from '../useRunTracker';

jest.mock('expo-location', () => ({
  Accuracy: { BestForNavigation: 6 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));

const loc = jest.mocked(Location);
let appStateHandler: (state: AppStateStatus) => void = () => {};

beforeEach(() => {
  jest.clearAllMocks();
  loc.getForegroundPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true } as never);
  loc.hasServicesEnabledAsync.mockResolvedValue(true);
  loc.watchPositionAsync.mockResolvedValue({ remove: jest.fn() });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    appStateHandler = handler as (state: AppStateStatus) => void;
    return { remove: jest.fn() } as never;
  });
});

async function pausedRun() {
  const hook = await renderHook(() => useRunTracker());
  await waitFor(() => expect(hook.result.current.permission).toBe('granted'));
  await act(async () => hook.result.current.start());
  await act(async () => hook.result.current.pause());
  return hook;
}

it('keeps the paused run when saving fails, so the user can retry', async () => {
  const { result } = await pausedRun();
  const failingSave = jest.fn(() => Promise.reject(new Error('disk full')));

  await act(async () => {
    await expect(result.current.finish(failingSave)).rejects.toThrow('disk full');
  });
  expect(result.current.status).toBe('paused');

  const save = jest.fn((_run: Run) => Promise.resolve());
  let saved: Run | null = null;
  await act(async () => {
    saved = await result.current.finish(save);
  });
  expect(save).toHaveBeenCalledTimes(1);
  expect(saved).not.toBeNull();
  expect(result.current.status).toBe('idle');
});

it('saves only once when Finish is tapped twice', async () => {
  const { result } = await pausedRun();
  const save = jest.fn((_run: Run) => Promise.resolve());

  let results: (Run | null)[] = [];
  await act(async () => {
    results = await Promise.all([result.current.finish(save), result.current.finish(save)]);
  });
  expect(save).toHaveBeenCalledTimes(1);
  expect(results.filter(Boolean)).toHaveLength(1);
});

it('keeps the screen awake only while running', async () => {
  const hook = await renderHook(() => useRunTracker());
  await waitFor(() => expect(hook.result.current.permission).toBe('granted'));
  expect(activateKeepAwakeAsync).not.toHaveBeenCalled();

  await act(async () => hook.result.current.start());
  expect(activateKeepAwakeAsync).toHaveBeenCalledTimes(1);

  await act(async () => hook.result.current.pause());
  expect(deactivateKeepAwake).toHaveBeenCalled();
});

it('starts location updates once location services are turned back on', async () => {
  loc.hasServicesEnabledAsync.mockResolvedValue(false);
  const { result } = await renderHook(() => useRunTracker());
  await waitFor(() => expect(result.current.error).toBe('Turn on location services to record a run.'));
  expect(loc.watchPositionAsync).not.toHaveBeenCalled();

  loc.hasServicesEnabledAsync.mockResolvedValue(true);
  await act(async () => appStateHandler('active'));

  await waitFor(() => expect(loc.watchPositionAsync).toHaveBeenCalledTimes(1));
  expect(result.current.error).toBeNull();
});
