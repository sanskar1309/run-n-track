import type { LatLng, RoutePoint } from './types';

/**
 * A self-contained Leaflet page rendered inside a WebView on Android.
 * Needed because Expo Go on Android ships an expired Google Maps key (expo/expo#49323).
 * Tiles: OpenStreetMap's standard tile server — free, no API key, fine for light personal use
 * (https://operations.osmfoundation.org/policies/tiles/). Requires attribution and a Referer.
 */
export const LEAFLET_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<!-- OSM tile servers block requests without a Referer; the WebView's baseUrl provides one. -->
<meta name="referrer" content="strict-origin-when-cross-origin" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html, body, #map { margin: 0; height: 100%; background: #e5e3df; }</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: false }).setView([20, 0], 2);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  var line = L.polyline([], { color: '#FC4C02', weight: 5 }).addTo(map);
  var me = null;
  var fitted = false;

  window.updateMap = function (data) {
    line.setLatLngs(data.route);
    if (data.current) {
      if (!me) {
        me = L.circleMarker(data.current, {
          radius: 8, color: '#fff', weight: 3, fillColor: '#1a73e8', fillOpacity: 1
        }).addTo(map);
      } else {
        me.setLatLng(data.current);
      }
    }
    if (data.follow && data.current) {
      map.setView(data.current, map.getZoom() < 15 ? 17 : map.getZoom());
    } else if (!data.follow && !fitted && data.route.length > 0) {
      fitted = true;
      if (data.route.length === 1) map.setView(data.route[0], 17);
      else map.fitBounds(line.getBounds(), { padding: [40, 40] });
    }
  };
</script>
</body>
</html>`;

type MapUpdate = { route: RoutePoint[]; currentLocation: LatLng | null; follow: boolean };

/** JS to run inside the WebView to push new data to the map. Must end with `true;` (WebView requirement). */
export function mapUpdateScript({ route, currentLocation, follow }: MapUpdate): string {
  const data = {
    route: route.map((p) => [p.lat, p.lng]),
    current: currentLocation ? [currentLocation.lat, currentLocation.lng] : null,
    follow,
  };
  return `window.updateMap(${JSON.stringify(data)});true;`;
}
