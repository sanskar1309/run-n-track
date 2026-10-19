import { useEffect, useRef } from 'react';
import MapView, { Polyline } from 'react-native-maps';

import type { LatLng } from '@/lib/types';

import type { RunMapProps } from './RunMap.types';

// iOS: Apple Maps via react-native-maps (works in Expo Go).

const FOLLOW_DELTA = 0.005; // ~500 m across
const toCoord = (p: LatLng) => ({ latitude: p.lat, longitude: p.lng });

export function RunMap({ route, currentLocation, follow, style }: RunMapProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (!follow || !currentLocation) return;
    mapRef.current?.animateToRegion(
      { ...toCoord(currentLocation), latitudeDelta: FOLLOW_DELTA, longitudeDelta: FOLLOW_DELTA },
      500,
    );
  }, [follow, currentLocation]);

  const fitRoute = () => {
    if (follow || route.length === 0) return;
    if (route.length === 1) {
      mapRef.current?.animateToRegion(
        { ...toCoord(route[0]), latitudeDelta: FOLLOW_DELTA, longitudeDelta: FOLLOW_DELTA },
        0,
      );
      return;
    }
    mapRef.current?.fitToCoordinates(route.map(toCoord), {
      edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
      animated: false,
    });
  };

  return (
    <MapView ref={mapRef} style={style} showsUserLocation={follow} onMapReady={fitRoute}>
      {route.length > 1 && (
        <Polyline coordinates={route.map(toCoord)} strokeWidth={5} strokeColor="#FC4C02" />
      )}
    </MapView>
  );
}
