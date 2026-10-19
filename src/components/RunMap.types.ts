import type { StyleProp, ViewStyle } from 'react-native';

import type { LatLng, RoutePoint } from '@/lib/types';

export type RunMapProps = {
  route: RoutePoint[];
  currentLocation: LatLng | null;
  /** true: keep the camera on the runner. false: fit the whole route once. */
  follow: boolean;
  style?: StyleProp<ViewStyle>;
};
