import { describe, it, expect } from 'vitest';
import DimsLib from '../lib/dims.js';

const { computeDims } = DimsLib;

describe('computeDims', () => {
  it('subtracts chrome padding then divides and rounds', () => {
    // (800 - 56) / 8 = 93; (600 - 52) / 20 = 27.4 -> 27
    expect(computeDims(800, 600, 8, 20)).toEqual({ cols: 93, rows: 27 });
  });

  it('rounds to nearest integer', () => {
    // (500 - 56) / 8 = 55.5 -> 56 ; (300 - 52) / 21 = 11.81 -> 12
    expect(computeDims(500, 300, 8, 21)).toEqual({ cols: 56, rows: 12 });
  });

  it('clamps cols to a minimum of 20 and rows to a minimum of 8', () => {
    expect(computeDims(100, 100, 8, 20)).toEqual({ cols: 20, rows: 8 });
  });

  it('never drops below the floors even for zero-sized terminals', () => {
    const { cols, rows } = computeDims(0, 0, 8, 20);
    expect(cols).toBe(20);
    expect(rows).toBe(8);
  });
});
