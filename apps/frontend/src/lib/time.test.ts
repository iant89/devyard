import { describe, expect, it } from 'vitest';
import { timeAgo } from './time';

describe('timeAgo', () => {
  const now = Date.parse('2026-11-27T12:00:00Z');
  const ago = (sec: number) => new Date(now - sec * 1000).toISOString();
  it('matches the mockup wording', () => {
    expect(timeAgo(ago(5), now)).toBe('Just now');
    expect(timeAgo(ago(3 * 60), now)).toBe('3 min ago');
    expect(timeAgo(ago(60 * 60), now)).toBe('1 h ago');
    expect(timeAgo(ago(26 * 3600), now)).toBe('1 day ago');
    expect(timeAgo(ago(5 * 86400), now)).toBe('5 days ago');
  });
  it('clamps future timestamps (clock skew) to "Just now"', () => {
    expect(timeAgo(ago(-120), now)).toBe('Just now');
  });
  it('falls back to a date after 30 days', () => {
    expect(timeAgo(ago(45 * 86400), now)).toMatch(/2026/);
  });
});
