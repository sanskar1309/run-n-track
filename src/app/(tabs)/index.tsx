import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RunMap } from '@/components/RunMap';
import { StatsPanel } from '@/components/StatsPanel';
import { useRunTracker } from '@/hooks/useRunTracker';
import { saveRun } from '@/lib/runStorage';

const BRAND = '#FC4C02';

export default function RecordScreen() {
  if (Platform.OS === 'web') {
    return <Message text="Recording is available in the phone app." />;
  }
  return <Recorder />;
}

function Recorder() {
  const tracker = useRunTracker();
  const [saving, setSaving] = useState(false);

  if (tracker.permission === 'checking') {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (tracker.permission === 'undetermined') {
    return (
      <Message text="Run Tracker needs your location to record your route, distance and pace.">
        <Button label="Allow location" onPress={tracker.requestPermission} />
      </Message>
    );
  }
  if (tracker.permission === 'denied') {
    return (
      <Message text="Location access is turned off. Enable it in Settings to record runs.">
        <Button label="Open Settings" onPress={() => Linking.openSettings()} />
      </Message>
    );
  }

  const onFinish = async () => {
    if (tracker.distanceM === 0) {
      Alert.alert('Discard run?', 'No distance was recorded.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: tracker.discard },
      ]);
      return;
    }
    setSaving(true);
    try {
      const run = await tracker.finish(saveRun);
      if (run) router.push({ pathname: '/run/[id]', params: { id: run.id } });
    } catch {
      // The run is still paused, so tapping Finish again retries the save.
      Alert.alert('Could not save run', 'Your run is still here. Tap Finish to try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <RunMap
        route={tracker.route}
        currentLocation={tracker.currentLocation}
        follow
        style={StyleSheet.absoluteFill}
      />

      {tracker.error && (
        <SafeAreaView edges={['top']} style={styles.bannerWrap} pointerEvents="none">
          <Text style={styles.banner}>{tracker.error}</Text>
        </SafeAreaView>
      )}

      <View style={styles.panel}>
        <StatsPanel elapsedSec={tracker.elapsedSec} distanceM={tracker.distanceM} />
        <View style={styles.controls}>
          {tracker.status === 'idle' && <Button label="Start" onPress={tracker.start} />}
          {tracker.status === 'running' && <Button label="Pause" variant="dark" onPress={tracker.pause} />}
          {tracker.status === 'paused' && (
            <>
              <Button label="Resume" onPress={tracker.resume} />
              <Button label="Finish" variant="dark" onPress={onFinish} disabled={saving} />
            </>
          )}
        </View>
      </View>
    </View>
  );
}

function Message({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <View style={styles.center}>
      <Text style={styles.message}>{text}</Text>
      {children}
    </View>
  );
}

type ButtonProps = { label: string; onPress: () => void; variant?: 'brand' | 'dark'; disabled?: boolean };

function Button({ label, onPress, variant = 'brand', disabled }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: variant === 'brand' ? BRAND : '#222' },
        (pressed || disabled) && { opacity: 0.6 },
      ]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  message: { fontSize: 16, textAlign: 'center', color: '#333' },
  bannerWrap: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  banner: {
    marginTop: 8,
    backgroundColor: '#b00020',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  panel: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  button: { minWidth: 120, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 999, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
