import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RunMap } from '@/components/RunMap';
import { StatsPanel } from '@/components/StatsPanel';

// Temporary preview with fake data (a small loop in central London). Replaced by live GPS in the next step.
const DEMO_ROUTE = [
  { lat: 51.5079, lng: -0.1281, t: 0 },
  { lat: 51.5085, lng: -0.1265, t: 0 },
  { lat: 51.5075, lng: -0.1248, t: 0 },
  { lat: 51.5066, lng: -0.1262, t: 0 },
  { lat: 51.5079, lng: -0.1281, t: 0 },
];

export default function RecordScreen() {
  return (
    <View style={styles.container}>
      <RunMap route={DEMO_ROUTE} currentLocation={null} follow={false} style={styles.map} />
      <SafeAreaView edges={['bottom']} style={styles.panel}>
        <StatsPanel elapsedSec={332} distanceM={1000} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  panel: { backgroundColor: '#fff', paddingTop: 16, paddingBottom: 8 },
});
