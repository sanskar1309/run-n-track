import { mapUpdateScript } from '../leafletMap';

describe('mapUpdateScript', () => {
  it('calls window.updateMap with the route as [lat, lng] pairs', () => {
    const script = mapUpdateScript({
      route: [
        { lat: 1, lng: 2, t: 0 },
        { lat: 3, lng: 4, t: 1 },
      ],
      currentLocation: { lat: 3, lng: 4 },
      follow: true,
    });
    expect(script).toBe(
      'window.updateMap({"route":[[1,2],[3,4]],"current":[3,4],"follow":true});true;',
    );
  });

  it('sends null when there is no current location', () => {
    expect(mapUpdateScript({ route: [], currentLocation: null, follow: false })).toBe(
      'window.updateMap({"route":[],"current":null,"follow":false});true;',
    );
  });
});
