import { describe, it, expect } from 'vitest';
import {
  formatTime,
  formatFullTime,
  formatDuration,
  formatLatency,
} from '@/utils/formatTime';

describe('formatTime utils', () => {
  it('formats timestamp to time string', () => {
    // 2026-09-15 12:30:00 UTC
    const date = new Date(2026, 8, 15, 12, 30);
    const result = formatTime(date.getTime());
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('formats timestamp to full time string with date and time', () => {
    const date = new Date(2026, 8, 15, 14, 45);
    const result = formatFullTime(date.getTime());
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('formats duration in seconds to mm:ss or hh:mm:ss', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(5)).toBe('0:05');
    expect(formatDuration(45)).toBe('0:45');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(600)).toBe('10:00');
    expect(formatDuration(3665)).toBe('1:01:05');
  });

  it('formats latency in milliseconds with unit', () => {
    expect(formatLatency(0)).toBe('<1 ms');
    expect(formatLatency(42)).toBe('42 ms');
    expect(formatLatency(120)).toBe('120 ms');
  });
});
