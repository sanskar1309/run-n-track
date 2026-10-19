import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Run } from './types';

export const RUNS_KEY = 'runs';

async function readAll(): Promise<Run[]> {
  try {
    const raw = await AsyncStorage.getItem(RUNS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Run[]) : [];
  } catch (error) {
    console.warn('Could not read saved runs', error);
    return [];
  }
}

export async function saveRun(run: Run): Promise<void> {
  const runs = await readAll();
  await AsyncStorage.setItem(RUNS_KEY, JSON.stringify([...runs, run]));
}

/** All saved runs, newest first. */
export async function listRuns(): Promise<Run[]> {
  return (await readAll()).sort((a, b) => b.startedAt - a.startedAt);
}

export async function getRun(id: string): Promise<Run | null> {
  return (await readAll()).find((run) => run.id === id) ?? null;
}
