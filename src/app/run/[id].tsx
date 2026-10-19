import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RunMap } from '@/components/RunMap';
import { StatsPanel } from '@/components/StatsPanel';
import { getRun } from '@/lib/runStorage';
import type { Run } from '@/lib/types';

export default function RunDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // undefined = still loading, null = not found
  const [run, setRun] = useState<Run | null | undefined>(undefined);

  useEffect(() => {
    getRun(id).then(setRun);
  }, [id]);

  if (run === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (run === null) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Run' }} />
        <Text style={styles.notFound}>Run not found</Text>
      </View>
    );
  }

  const title = new Date(run.startedAt).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title }} />
      <RunMap route={run.route} currentLocation={null} follow={false} style={styles.map} />
      <SafeAreaView edges={['bottom']} style={styles.panel}>
        <StatsPanel elapsedSec={run.durationSec} distanceM={run.distanceM} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 16, color: '#6b6b6b' },
  map: { flex: 3 },
  panel: { flex: 2, paddingTop: 24 },
});
