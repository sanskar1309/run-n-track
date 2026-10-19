import AsyncStorage from '@react-native-async-storage/async-storage';

import { getRun, INDEX_KEY, LEGACY_RUNS_KEY, listRuns, runKey, saveRun } from '../runStorage';
import type { Run } from '../types';

const makeRun = (id: string, startedAt: number): Run => ({
  id,
  startedAt,
  durationSec: 60,
  distanceM: 200,
  route: [{ lat: 1, lng: 2, t: startedAt }],
});

let warn: jest.SpyInstance;

beforeEach(async () => {
  await AsyncStorage.clear();
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => warn.mockRestore());

it('returns [] when nothing is stored', async () => {
  expect(await listRuns()).toEqual([]);
});

it('lists run summaries newest first, without routes', async () => {
  await saveRun(makeRun('a', 1));
  await saveRun(makeRun('b', 2));
  expect(await listRuns()).toEqual([
    { id: 'b', startedAt: 2, durationSec: 60, distanceM: 200 },
    { id: 'a', startedAt: 1, durationSec: 60, distanceM: 200 },
  ]);
});

it('gets a full run by id, or null', async () => {
  await saveRun(makeRun('a', 1));
  expect(await getRun('a')).toEqual(makeRun('a', 1));
  expect(await getRun('missing')).toBeNull();
});

it('stores each run under its own key', async () => {
  await saveRun(makeRun('a', 1));
  expect(JSON.parse((await AsyncStorage.getItem(runKey('a')))!)).toEqual(makeRun('a', 1));
});

it('returns [] for a corrupt index', async () => {
  await AsyncStorage.setItem(INDEX_KEY, '{not json');
  expect(await listRuns()).toEqual([]);
});

it('refuses to save over an unreadable index instead of wiping it', async () => {
  await AsyncStorage.setItem(INDEX_KEY, '{not json');
  await expect(saveRun(makeRun('a', 1))).rejects.toThrow();
  expect(await AsyncStorage.getItem(INDEX_KEY)).toBe('{not json');
});

it('migrates runs saved in the old single-key format', async () => {
  await AsyncStorage.setItem(LEGACY_RUNS_KEY, JSON.stringify([makeRun('old', 1)]));
  await saveRun(makeRun('new', 2));
  expect((await listRuns()).map((r) => r.id)).toEqual(['new', 'old']);
  expect(await getRun('old')).toEqual(makeRun('old', 1));
  expect(await AsyncStorage.getItem(LEGACY_RUNS_KEY)).toBeNull();
});

it('lists old-format runs even before the next save', async () => {
  await AsyncStorage.setItem(LEGACY_RUNS_KEY, JSON.stringify([makeRun('old', 1)]));
  expect((await listRuns()).map((r) => r.id)).toEqual(['old']);
  expect(await getRun('old')).toEqual(makeRun('old', 1));
});
