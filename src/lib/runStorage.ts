import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Run, RunSummary } from './types';

/**
 * Each run lives under its own key, so no single value grows past Android's ~2 MB row limit.
 * A small index of summaries (no routes) powers the History list.
 */
export const INDEX_KEY = 'runs:index';
export const runKey = (id: string) => `run:${id}`;
/** Phase 1's original format: one JSON array of every run. Migrated on first access. */
export const LEGACY_RUNS_KEY = 'runs';

const summarize = ({ route: _route, ...summary }: Run): RunSummary => summary;

/** Reads the index; throws if it can't be read, so callers never write over data they couldn't see. */
async function readIndex(): Promise<RunSummary[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  if (raw !== null) {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Run index is not an array');
    return parsed as RunSummary[];
  }
  return migrateLegacy();
}

async function migrateLegacy(): Promise<RunSummary[]> {
  const raw = await AsyncStorage.getItem(LEGACY_RUNS_KEY);
  if (raw === null) return [];
  const runs: unknown = JSON.parse(raw);
  if (!Array.isArray(runs)) throw new Error('Legacy runs are not an array');
  const index = (runs as Run[]).map(summarize);
  await AsyncStorage.multiSet([
    ...(runs as Run[]).map((run): [string, string] => [runKey(run.id), JSON.stringify(run)]),
    [INDEX_KEY, JSON.stringify(index)],
  ]);
  await AsyncStorage.removeItem(LEGACY_RUNS_KEY);
  return index;
}

export async function saveRun(run: Run): Promise<void> {
  const index = await readIndex();
  await AsyncStorage.setItem(runKey(run.id), JSON.stringify(run));
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify([...index, summarize(run)]));
}

/** Summaries of all saved runs, newest first. Returns [] if storage can't be read. */
export async function listRuns(): Promise<RunSummary[]> {
  try {
    return (await readIndex()).sort((a, b) => b.startedAt - a.startedAt);
  } catch (error) {
    console.warn('Could not read saved runs', error);
    return [];
  }
}

export async function getRun(id: string): Promise<Run | null> {
  try {
    await readIndex(); // runs any pending migration first
    const raw = await AsyncStorage.getItem(runKey(id));
    return raw === null ? null : (JSON.parse(raw) as Run);
  } catch (error) {
    console.warn('Could not read run', id, error);
    return null;
  }
}
