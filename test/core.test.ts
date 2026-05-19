/**
 * test/core.test.ts
 * Tests for the bias-free crypto engine and charset building.
 */

import { describe, it, expect } from 'vitest';
import { getRandomChar, getRandomChars } from '../src/core.js';
import { buildCharset, dedup, alphabetSubset, numericSubset } from '../src/charsets.js';

// ---------------------------------------------------------------------------
// getRandomChar
// ---------------------------------------------------------------------------

describe('getRandomChar', () => {
  it('returns a single character', () => {
    const ch = getRandomChar('abc');
    expect(ch).toHaveLength(1);
  });

  it('always returns a character within the charset', () => {
    const charset = 'abc123';
    const charSet = new Set(charset);
    for (let i = 0; i < 500; i++) {
      expect(charSet.has(getRandomChar(charset))).toBe(true);
    }
  });

  it('works with a 2-character charset', () => {
    const results = new Set<string>();
    for (let i = 0; i < 200; i++) {
      results.add(getRandomChar('ab'));
    }
    expect(results.size).toBe(2);
  });

  it('works with a large charset (alphanumeric+symbols, 75 chars)', () => {
    const charset =
      '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+';
    const charSet = new Set(charset);
    for (let i = 0; i < 1000; i++) {
      expect(charSet.has(getRandomChar(charset))).toBe(true);
    }
  });

  it('produces a roughly uniform distribution (chi-squared sanity check)', () => {
    // With 4 chars and 4000 samples, expected = 1000 each.
    // Chi-squared critical value at p=0.001, df=3 is ~16.3. Being lenient.
    const charset = 'abcd';
    const counts: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };
    const N = 4000;
    for (let i = 0; i < N; i++) {
      const ch = getRandomChar(charset);
      counts[ch] = (counts[ch] ?? 0) + 1;
    }
    const expected = N / charset.length;
    const chi2 = Object.values(counts).reduce(
      (sum, obs) => sum + Math.pow(obs - expected, 2) / expected,
      0
    );
    // Very generous threshold — just checks for catastrophic bias
    expect(chi2).toBeLessThan(50);
  });
});

// ---------------------------------------------------------------------------
// getRandomChars
// ---------------------------------------------------------------------------

describe('getRandomChars', () => {
  it('returns the exact requested count', () => {
    expect(getRandomChars('abc', 10)).toHaveLength(10);
    expect(getRandomChars('abc', 1)).toHaveLength(1);
    expect(getRandomChars('abc', 100)).toHaveLength(100);
  });

  it('all returned chars are in the charset', () => {
    const charset = 'xyz789';
    const charSet = new Set(charset);
    const result = getRandomChars(charset, 200);
    result.forEach(ch => expect(charSet.has(ch)).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// buildCharset
// ---------------------------------------------------------------------------

describe('buildCharset', () => {
  it('includes all enabled types by default', () => {
    const cs = buildCharset({});
    expect(cs).toMatch(/[0-9]/);
    expect(cs).toMatch(/[a-z]/);
    expect(cs).toMatch(/[A-Z]/);
  });

  it('excludes symbols by default', () => {
    const cs = buildCharset({});
    expect(cs).not.toMatch(/[!@#$%^]/);
  });

  it('includes symbols when enabled', () => {
    const cs = buildCharset({ symbols: true });
    expect(cs).toMatch(/[!@#$%^]/);
  });

  it('excludes specified characters', () => {
    const cs = buildCharset({ exclude: 'aeiou' });
    expect(cs).not.toMatch(/[aeiou]/);
    expect(cs).toMatch(/[b-df-hj-np-tv-z]/);
  });

  it('exclude as array works', () => {
    const cs = buildCharset({ exclude: ['a', 'b', 'c'] });
    expect(cs).not.toContain('a');
    expect(cs).not.toContain('b');
    expect(cs).not.toContain('c');
  });

  it('readable mode removes ambiguous chars', () => {
    const cs = buildCharset({ readable: true });
    expect(cs).not.toContain('0');
    expect(cs).not.toContain('O');
    expect(cs).not.toContain('l');
    expect(cs).not.toContain('I');
    expect(cs).not.toContain('1');
  });

  it('custom charset overrides all flags', () => {
    const cs = buildCharset({ charset: 'abcABC', numeric: false, lowercase: false });
    expect(cs).toBe('abcABC');
  });

  it('deduplicates custom charset', () => {
    const cs = buildCharset({ charset: 'aaabbbccc' });
    expect(cs).toBe('abc');
  });

  it('throws if no character type enabled', () => {
    expect(() =>
      buildCharset({ numeric: false, lowercase: false, uppercase: false })
    ).toThrow('At least one character type must be enabled');
  });

  it('throws if custom charset has fewer than 2 unique chars', () => {
    expect(() => buildCharset({ charset: 'aaaa' })).toThrow(
      'at least 2 unique characters'
    );
  });

  it('throws if exclusions eliminate all characters', () => {
    expect(() =>
      buildCharset({
        numeric: true,
        lowercase: false,
        uppercase: false,
        exclude: '0123456789',
      })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Subset helpers
// ---------------------------------------------------------------------------

describe('alphabetSubset', () => {
  it('returns only alpha chars', () => {
    const subset = alphabetSubset('abc123XYZ!@#');
    expect(subset).toBe('abcXYZ');
  });

  it('returns empty string if no alpha in pool', () => {
    expect(alphabetSubset('123!@#')).toBe('');
  });
});

describe('numericSubset', () => {
  it('returns only digit chars', () => {
    const subset = numericSubset('abc123');
    expect(subset).toBe('123');
  });

  it('returns empty string if no digits in pool', () => {
    expect(numericSubset('abcXYZ')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// dedup
// ---------------------------------------------------------------------------

describe('dedup', () => {
  it('removes duplicate characters', () => {
    expect(dedup('aabbcc')).toBe('abc');
  });

  it('preserves order of first occurrence', () => {
    expect(dedup('caab')).toBe('cab');
  });

  it('returns same string if no duplicates', () => {
    expect(dedup('abc')).toBe('abc');
  });
});
