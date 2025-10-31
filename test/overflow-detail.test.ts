import { describe, expect, it } from 'vitest';
import { computeOverflowDetail, OVERFLOW_NOTE_TEXT } from '../lib/math-brain/overflow-detail';

describe('overflow detail exports', () => {
  it('captures overflow deltas and formats drivers', () => {
    const detail = computeOverflowDetail({
      rawMagnitude: 6.23456,
      clampedMagnitude: 5,
      rawDirectionalBias: -6.5,
      clampedDirectionalBias: -5,
      aspects: [
        {
          p1_name: 'Mars',
          p1_owner: 'Person A',
          p2_name: 'Venus',
          p2_owner: 'Person B',
          aspect: 'Square',
          orbit: 2.4,
        },
        {
          p1_name: 'Sun',
          p2_name: 'Moon',
          aspect: 'Trine',
          orbit: 1.2,
        },
      ],
    });

    expect(detail).not.toBeNull();
    if (!detail) return;

    expect(detail.magnitude_delta).toBeCloseTo(1.2346, 4);
    expect(detail.directional_delta).toBeCloseTo(-1.5, 4);
    expect(detail.note).toBe(OVERFLOW_NOTE_TEXT);
    expect(detail.drivers).toContain('Mars(Person A) ▻ Venus(Person B) Square');
    expect(detail.drivers).toContain('Sun ▻ Moon Trine');
  });

  it('returns null when readings stay within bounds', () => {
    const detail = computeOverflowDetail({
      rawMagnitude: 4.999,
      clampedMagnitude: 4.999,
      rawDirectionalBias: -4.9,
      clampedDirectionalBias: -4.9,
      aspects: [],
    });

    expect(detail).toBeNull();
  });

  it('ignores NaN and Infinity inputs', () => {
    const detail = computeOverflowDetail({
      rawMagnitude: Number.POSITIVE_INFINITY,
      clampedMagnitude: 5,
      rawDirectionalBias: Number.NaN,
      clampedDirectionalBias: -5,
      aspects: [
        {
          p1_name: 'Mercury',
          p2_name: 'Pluto',
          aspect: 'Opposition',
          orbit: 'not a number',
        },
      ],
    });

    expect(detail).toBeNull();
  });

  it('limits drivers to top four unique entries with fallbacks', () => {
    const detail = computeOverflowDetail({
      rawMagnitude: 7,
      clampedMagnitude: 5,
      rawDirectionalBias: null,
      clampedDirectionalBias: null,
      aspects: [
        { subject: 'Body 1', target: 'Body 2', type: 'Conjunction', orbit: 1 },
        { subject: 'Body 1', target: 'Body 2', type: 'Conjunction', orbit: 0.5 },
        { subject: 'Body 3', target: 'Body 4', type: 'Trine', orb: 2.5 },
        { subject: 'Body 5', target: 'Body 6', type: 'Opposition', orbit: 3.1 },
        { subject: 'Body 7', target: 'Body 8', type: 'Square', orbit: 4.2 },
        { subject: '', target: '', type: '', orbit: 5.1 },
      ],
    });

    expect(detail).not.toBeNull();
    if (!detail) return;

    expect(detail.drivers.length).toBeLessThanOrEqual(4);
    expect(detail.drivers).toContain('Body 1 ▻ Body 2 Conjunction');
    expect(detail.drivers).toContain('Body 3 ▻ Body 4 Trine');
    expect(detail.drivers).not.toContain('');
  });
});
