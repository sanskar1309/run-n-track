import { haversineDistanceM, shouldAcceptPoint } from '../geo';

describe('haversineDistanceM', () => {
  it('is 0 for the same point', () => {
    expect(haversineDistanceM({ lat: 18.52, lng: 73.85 }, { lat: 18.52, lng: 73.85 })).toBe(0);
  });

  it('is ~111195 m for 1 degree of latitude', () => {
    expect(haversineDistanceM({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111195, -1);
  });
});

describe('shouldAcceptPoint', () => {
  it('rejects poor accuracy', () => {
    expect(shouldAcceptPoint(null, { lat: 0, lng: 0 }, 25)).toBe(false);
  });

  it('accepts the first good point', () => {
    expect(shouldAcceptPoint(null, { lat: 0, lng: 0 }, 5)).toBe(true);
  });

  it('accepts unknown accuracy', () => {
    expect(shouldAcceptPoint(null, { lat: 0, lng: 0 }, null)).toBe(true);
  });

  it('rejects jitter under 3 m', () => {
    expect(shouldAcceptPoint({ lat: 0, lng: 0 }, { lat: 0.00002, lng: 0 }, 5)).toBe(false); // ~2.2 m
  });

  it('accepts a real step', () => {
    expect(shouldAcceptPoint({ lat: 0, lng: 0 }, { lat: 0.00005, lng: 0 }, 5)).toBe(true); // ~5.6 m
  });
});
