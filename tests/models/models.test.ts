import { describe, it, expect } from 'vitest';
import { createTokenSummary, recomputeTotal } from '../../src/models/index.js';

describe('TokenSummary', () => {
  it('computes total from input + output when not explicitly set', () => {
    const tokens = createTokenSummary({ inputTokens: 100, outputTokens: 20 });
    expect(tokens.totalTokens).toBe(120);
  });

  it('preserves explicit total', () => {
    const tokens = createTokenSummary({
      inputTokens: 100,
      outputTokens: 20,
      totalTokens: 999,
    });
    expect(tokens.totalTokens).toBe(999);
  });

  it('sets total to null when zero', () => {
    const tokens = createTokenSummary();
    expect(tokens.totalTokens).toBeNull();
  });

  it('recomputeTotal leaves explicit total alone', () => {
    const tokens = createTokenSummary({ totalTokens: 5 });
    recomputeTotal(tokens);
    expect(tokens.totalTokens).toBe(5);
  });
});
