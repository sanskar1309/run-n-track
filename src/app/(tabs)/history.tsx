import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatDistanceKm, formatDuration, formatPace } from '@/lib/format';
import { listRuns } from '@/lib/runStorage';
import type { RunSummary } from '@/lib/types';

export default function HistoryScreen() {
  const [runs, setRuns] = useState<RunSummary[]>([]);

  // Tabs stay mounted, so reload every time this tab comes into focus (e.g. after finishing a run).
  useFocusEffect(
    useCallback(() => {
      listRuns().then(setRuns);
    }, []),
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Text style={styles.title}>History</Text>
      <FlatList
        data={runs}
        keyExtractor={(run) => run.id}
        renderItem={({ item }) => <RunRow run={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<Text style={styles.empty}>No runs yet. Go record your first one!</Text>}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

function RunRow({ run }: { run: RunSummary }) {
  const date = new Date(run.startedAt);
  return (
    <Link href={{ pathname: '/run/[id]', params: { id: run.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
        <Text style={styles.date}>
          {date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
          {' · '}
          {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <View style={styles.stats}>
          <Stat value={`${formatDistanceKm(run.distanceM)} km`} label="Distance" />
          <Stat value={formatDuration(run.durationSec)} label="Time" />
          <Stat value={`${formatPace(run.durationSec, run.distanceM)} /km`} label="Pace" />
        </View>
      </Pressable>
    </Link>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },
  title: { fontSize: 32, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
  separator: { height: 12 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 16, color: '#6b6b6b' },
  row: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 12 },
  rowPressed: { opacity: 0.7 },
  date: { fontSize: 14, fontWeight: '600', color: '#FC4C02' },
  stats: { flexDirection: 'row' },
  stat: { flex: 1 },
  statValue: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12, color: '#6b6b6b', marginTop: 2 },
});
