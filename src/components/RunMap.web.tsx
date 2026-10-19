import { StyleSheet, Text, View } from 'react-native';

import type { RunMapProps } from './RunMap.types';

// react-native-maps has no web support; Metro picks this file on web instead of RunMap.tsx.
export function RunMap({ style }: RunMapProps) {
  return (
    <View style={[styles.box, style]}>
      <Text style={styles.text}>Map is available in the phone app</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#e5e5e5', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#6b6b6b' },
});
