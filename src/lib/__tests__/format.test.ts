import { formatDistanceKm, formatDuration, formatPace } from '../format';

describe('formatDuration', () => {
  it('pads minutes and seconds', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(65)).toBe('01:05');
  });

  it('adds hours when needed', () => {
    expect(formatDuration(3725)).toBe('1:02:05');
  });

  it('floors fractional seconds', () => {
    expect(formatDuration(59.9)).toBe('00:59');
  });
});

describe('formatDistanceKm', () => {
  it('shows km with 2 decimals', () => {
    expect(formatDistanceKm(0)).toBe('0.00');
    expect(formatDistanceKm(2450)).toBe('2.45');
    expect(formatDistanceKm(10004)).toBe('10.00');
  });
});

describe('formatPace', () => {
  it('is minutes:seconds per km', () => {
    expect(formatPace(332, 1000)).toBe('5:32');
    expect(formatPace(1500, 5000)).toBe('5:00');
  });

  it('shows --:-- under 10 m', () => {
    expect(formatPace(5, 0)).toBe('--:--');
    expect(formatPace(5, 9.9)).toBe('--:--');
  });

  it('shows --:-- when slower than 59:59/km', () => {
    expect(formatPace(3600, 1000)).toBe('--:--');
  });
});
