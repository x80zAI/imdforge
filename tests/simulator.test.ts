import { describe, expect, it } from 'vitest';
import { calculateSimulation, formatPoolShare, formatTokenAmount, MAX_TOKEN_AMOUNT, parseTokenAmount, SimulationInputError, TOKEN_SCALE } from '../src/lib/simulator';

const defaults = { amount: '1000', pool: '100000', retiredDaily: '10000', days: 30 };

describe('retirement scenario calculation', () => {
  it('includes the proposed stake in the pool and applies the 4.5% retirement assumption', () => {
    const result = calculateSimulation(defaults);
    expect(result.dailyReward).toBe(4_455_445_544_554_455_445n);
    expect(result.reward).toBe(133_663_366_336_633_663_366n);
    expect(formatPoolShare(result.share)).toBe('0.99%');
  });

  it('returns zero for an empty pool with no simulated stake', () => {
    const result = calculateSimulation({ ...defaults, amount: '0', pool: '0' });
    expect(result.share).toBe(0n);
    expect(result.dailyReward).toBe(0n);
    expect(result.reward).toBe(0n);
  });

  it('gives the first stake the whole pool share', () => {
    const result = calculateSimulation({ ...defaults, pool: '0' });
    expect(result.share).toBe(TOKEN_SCALE);
    expect(result.dailyReward).toBe(450n * TOKEN_SCALE);
    expect(result.reward).toBe(13_500n * TOKEN_SCALE);
  });

  it('does not infer rewards when daily retirement is zero', () => {
    expect(calculateSimulation({ ...defaults, retiredDaily: '0' }).reward).toBe(0n);
  });

  it('keeps the smallest token unit and rounds only after calculating the full horizon', () => {
    const result = calculateSimulation({ amount: '0.000000000000000001', pool: '0', retiredDaily: '0.000000000000000001', days: 30 });
    expect(result.amount).toBe(1n);
    expect(result.dailyReward).toBe(0n);
    expect(result.reward).toBe(1n);
  });

  it('lowers a stake’s rewards when the existing pool increases', () => {
    expect(calculateSimulation({ ...defaults, pool: '200000' }).reward).toBeLessThan(calculateSimulation(defaults).reward);
  });

  it.each([0, 366, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects an invalid horizon %s', days => {
    expect(() => calculateSimulation({ ...defaults, days })).toThrow(SimulationInputError);
  });

  it('identifies the field with invalid token input', () => {
    try {
      calculateSimulation({ ...defaults, retiredDaily: '-100' });
      throw new Error('Expected the input to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(SimulationInputError);
      expect((error as SimulationInputError).field).toBe('retiredDaily');
    }
  });
});

describe('token input precision and display', () => {
  it('reads 18 decimal places exactly without floating point conversion', () => {
    expect(parseTokenAmount(' 12.123456789012345678 ')).toBe(12_123_456_789_012_345_678n);
    expect(formatTokenAmount(parseTokenAmount('12.123456789012345678'), 18)).toBe('12.123456789012345678');
  });

  it.each(['-1', '+1', '1e3', 'Infinity', 'NaN', '1,000', '.5', '1.', '', '0.1234567890123456789', '1000000000000.000000000000000001', '10000000000000'])('rejects ambiguous or unsupported input %s', value => {
    expect(() => parseTokenAmount(value)).toThrow();
  });

  it('accepts the exact maximum and maintains precision at that size', () => {
    expect(parseTokenAmount('1000000000000')).toBe(MAX_TOKEN_AMOUNT);
    expect(formatTokenAmount(MAX_TOKEN_AMOUNT, 0)).toBe('1,000,000,000,000');
  });

  it('formats readable units without rounding a reward upward', () => {
    expect(formatTokenAmount(parseTokenAmount('1200.999999'), 4)).toBe('1,200.9999');
    expect(formatTokenAmount(0n, 4)).toBe('0.0000');
    expect(() => formatTokenAmount(1n, 19)).toThrow();
  });
});
