import AsyncStorage from '@react-native-async-storage/async-storage';

import { getRun, listRuns, RUNS_KEY, saveRun } from '../runStorage';
import type { Run } from '../types';

const makeRun = (id: string, startedAt: number): Run => ({
  id,
  startedAt,
  durationSec: 60,
  distanceM: 200,
  route: [],
});

beforeEach(async () => {
  await AsyncStorage.clear();
});

it('returns [] when nothing is stored', async () => {
  expect(await listRuns()).toEqual([]);
});

it('saves and lists runs newest first', async () => {
  await saveRun(makeRun('a', 1));
  await saveRun(makeRun('b', 2));
  expect((await listRuns()).map((r) => r.id)).toEqual(['b', 'a']);
});

it('gets a run by id, or null', async () => {
  await saveRun(makeRun('a', 1));
  expect(await getRun('a')).toEqual(makeRun('a', 1));
  expect(await getRun('missing')).toBeNull();
});

it('returns [] for corrupt JSON', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  await AsyncStorage.setItem(RUNS_KEY, '{not json');
  expect(await listRuns()).toEqual([]);
  warn.mockRestore();
});
