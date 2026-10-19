import { useEffect, useRef, useState } from 'react';
import { WebView } from 'react-native-webview';

import { LEAFLET_HTML, mapUpdateScript } from '@/lib/leafletMap';

import type { RunMapProps } from './RunMap.types';

// Android: Leaflet + OpenStreetMap in a WebView, because Google Maps in Expo Go is broken (expo/expo#49323).
// iOS uses RunMap.ios.tsx (Apple Maps), web uses RunMap.web.tsx.
export function RunMap({ route, currentLocation, follow, style }: RunMapProps) {
  const webRef = useRef<WebView>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    webRef.current?.injectJavaScript(mapUpdateScript({ route, currentLocation, follow }));
  }, [loaded, route, currentLocation, follow]);

  return (
    <WebView
      ref={webRef}
      style={style}
      originWhitelist={['*']}
      source={{ html: LEAFLET_HTML, baseUrl: 'https://localhost/' }}
      onLoadEnd={() => setLoaded(true)}
    />
  );
}
