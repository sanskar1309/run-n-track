import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>
      {/* Temporary: proves the stack push works. Removed in the History step. */}
      <Link href="/run/abc" style={styles.link}>
        Open test run →
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  title: { fontSize: 24, fontWeight: '600' },
  link: { fontSize: 18, color: '#FC4C02' },
});
