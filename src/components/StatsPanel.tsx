import { StyleSheet, Text, View } from 'react-native';

import { formatDistanceKm, formatDuration, formatPace } from '@/lib/format';

type Props = { elapsedSec: number; distanceM: number };

export function StatsPanel({ elapsedSec, distanceM }: Props) {
  return (
    <View style={styles.row}>
      <Stat label="Time" value={formatDuration(elapsedSec)} />
      <Stat label="Distance (km)" value={formatDistanceKm(distanceM)} />
      <Stat label="Pace (/km)" value={formatPace(elapsedSec, distanceM)} />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center' },
  value: { fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'] },
  label: { marginTop: 2, fontSize: 12, color: '#6b6b6b' },
});
