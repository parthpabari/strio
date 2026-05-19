/**
 * test/generator.test.ts
 * Tests for the main generateRandomString API.
 */

import { describe, it, expect } from 'vitest';
import {
  generateRandomString,
  generateRandomStringAsync,
  PRESETS,
  estimateEntropy,
  validateRandomString,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// generateRandomString — basic behaviour
// ---------------------------------------------------------------------------

describe('generateRandomString — length', () => {
  it('defaults to length 16', () => {
    expect(generateRandomString()).toHaveLength(16);
  });

  it('produces the exact requested length', () => {
    for (const len of [1, 8, 32, 64, 128]) {
      expect(generateRandomString({ length: len })).toHaveLength(len);
    }
  });

  it('returns a string', () => {
    expect(typeof generateRandomString()).toBe('string');
  });

  it('produces different strings on successive calls', () => {
    const results = new Set(Array.from({ length: 20 }, () => generateRandomString({ length: 32 })));
    expect(results.size).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// Character set flags
// ---------------------------------------------------------------------------

describe('generateRandomString — charset flags', () => {
  it('numeric-only produces only digits', () => {
    const s = generateRandomString({ length: 50, numeric: true, lowercase: false, uppercase: false });
    expect(s).toMatch(/^[0-9]+$/);
  });

  it('lowercase-only produces only lowercase', () => {
    const s = generateRandomString({ length: 50, numeric: false, lowercase: true, uppercase: false });
    expect(s).toMatch(/^[a-z]+$/);
  });

  it('uppercase-only produces only uppercase', () => {
    const s = generateRandomString({ length: 50, numeric: false, lowercase: false, uppercase: true });
    expect(s).toMatch(/^[A-Z]+$/);
  });

  it('symbols-only string contains symbols', () => {
    const s = generateRandomString({
      length: 50,
      numeric: false,
      lowercase: false,
      uppercase: false,
      symbols: true,
    });
    expect(s).toMatch(/^[!@#$%^&*()\\_+\[\]{}<>?]+$/);
  });

  it('throws when no charset enabled', () => {
    expect(() =>
      generateRandomString({ numeric: false, lowercase: false, uppercase: false })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// readable & exclude
// ---------------------------------------------------------------------------

describe('generateRandomString — readable & exclude', () => {
  it('readable mode never includes ambiguous chars', () => {
    for (let i = 0; i < 50; i++) {
      const s = generateRandomString({ length: 100, readable: true });
      expect(s).not.toMatch(/[0OlI1]/);
    }
  });

  it('exclude removes specified characters', () => {
    const s = generateRandomString({ length: 200, exclude: 'aeiouAEIOU' });
    expect(s).not.toMatch(/[aeiouAEIOU]/);
  });

  it('exclude as array works', () => {
    const s = generateRandomString({ length: 100, exclude: ['x', 'y', 'z'] });
    expect(s).not.toMatch(/[xyz]/);
  });
});

// ---------------------------------------------------------------------------
// Custom charset
// ---------------------------------------------------------------------------

describe('generateRandomString — custom charset', () => {
  it('only uses characters from custom charset', () => {
    const charset = 'abc';
    const s = generateRandomString({ length: 100, charset });
    expect(s).toMatch(/^[abc]+$/);
  });

  it('throws if custom charset has < 2 unique chars', () => {
    expect(() => generateRandomString({ charset: 'a' })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// startWith
// ---------------------------------------------------------------------------

describe('generateRandomString — startWith', () => {
  it("startWith:'alphabet' always starts with a letter", () => {
    for (let i = 0; i < 100; i++) {
      const s = generateRandomString({ startWith: 'alphabet' });
      expect(s[0]).toMatch(/[a-zA-Z]/);
    }
  });

  it("startWith:'numeric' always starts with a digit", () => {
    for (let i = 0; i < 100; i++) {
      const s = generateRandomString({ startWith: 'numeric' });
      expect(s[0]).toMatch(/[0-9]/);
    }
  });

  it("startWith:'alphabet' throws when no alpha chars available", () => {
    expect(() =>
      generateRandomString({
        numeric: true,
        lowercase: false,
        uppercase: false,
        startWith: 'alphabet',
      })
    ).toThrow("startWith: 'alphabet'");
  });

  it("startWith:'numeric' throws when numeric=false", () => {
    expect(() =>
      generateRandomString({
        numeric: false,
        startWith: 'numeric',
      })
    ).toThrow("startWith: 'numeric'");
  });
});

// ---------------------------------------------------------------------------
// Prefix & suffix
// ---------------------------------------------------------------------------

describe('generateRandomString — prefix & suffix', () => {
  it('prepends prefix', () => {
    const s = generateRandomString({ length: 20, prefix: 'usr_' });
    expect(s).toMatch(/^usr_/);
    expect(s).toHaveLength(20);
  });

  it('appends suffix', () => {
    const s = generateRandomString({ length: 20, suffix: '_end' });
    expect(s).toMatch(/_end$/);
    expect(s).toHaveLength(20);
  });

  it('handles both prefix and suffix', () => {
    const s = generateRandomString({ length: 20, prefix: 'tok_', suffix: '_v2' });
    expect(s).toMatch(/^tok_/);
    expect(s).toMatch(/_v2$/);
    expect(s).toHaveLength(20);
  });

  it('throws if prefix+suffix exceed length', () => {
    expect(() =>
      generateRandomString({ length: 5, prefix: 'toolong', suffix: 'x' })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Pattern mode
// ---------------------------------------------------------------------------

describe('generateRandomString — pattern', () => {
  it('# produces digits', () => {
    const s = generateRandomString({ pattern: '####' });
    expect(s).toMatch(/^[0-9]{4}$/);
  });

  it('A produces uppercase letters', () => {
    const s = generateRandomString({ pattern: 'AAAA' });
    expect(s).toMatch(/^[A-Z]{4}$/);
  });

  it('a produces lowercase letters', () => {
    const s = generateRandomString({ pattern: 'aaaa' });
    expect(s).toMatch(/^[a-z]{4}$/);
  });

  it('* produces chars from full charset', () => {
    const s = generateRandomString({ pattern: '****', charset: 'abc' });
    expect(s).toMatch(/^[abc]{4}$/);
  });

  it('? produces alphanumeric chars', () => {
    const s = generateRandomString({ pattern: '????' });
    expect(s).toMatch(/^[a-zA-Z0-9]{4}$/);
  });

  it('literal characters pass through unchanged', () => {
    const s = generateRandomString({ pattern: '####-AAAA' });
    expect(s).toMatch(/^[0-9]{4}-[A-Z]{4}$/);
  });

  it('escape sequences produce literal placeholder chars', () => {
    const s = generateRandomString({ pattern: '\\#\\A\\a\\*' });
    expect(s).toBe('#Aa*');
  });

  it('complex mixed pattern', () => {
    const s = generateRandomString({ pattern: '####-AAAA-####' });
    expect(s).toMatch(/^[0-9]{4}-[A-Z]{4}-[0-9]{4}$/);
  });

  it('pattern ignores length option', () => {
    const s = generateRandomString({ pattern: '##-##', length: 100 });
    expect(s).toHaveLength(5); // 2 + 1 literal + 2
  });
});

// ---------------------------------------------------------------------------
// Batch generation (count)
// ---------------------------------------------------------------------------

describe('generateRandomString — count', () => {
  it('count:1 returns a string', () => {
    const result = generateRandomString({ count: 1 });
    expect(typeof result).toBe('string');
  });

  it('count > 1 returns an array', () => {
    const result = generateRandomString({ length: 16, count: 10 });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(10);
  });

  it('all results are unique', () => {
    const results = generateRandomString({ length: 16, count: 50 });
    expect(new Set(results).size).toBe(50);
  });

  it('all results have correct length', () => {
    const results = generateRandomString({ length: 12, count: 20 });
    results.forEach(s => expect(s).toHaveLength(12));
  });

  it('throws on non-integer count', () => {
    expect(() => generateRandomString({ count: 1.5 as number })).toThrow();
  });

  it('throws on count <= 0', () => {
    expect(() => generateRandomString({ count: 0 as number })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Async variant
// ---------------------------------------------------------------------------

describe('generateRandomStringAsync', () => {
  it('returns a Promise', () => {
    expect(generateRandomStringAsync()).toBeInstanceOf(Promise);
  });

  it('resolves to a string for count=1', async () => {
    const result = await generateRandomStringAsync({ length: 16 });
    expect(typeof result).toBe('string');
    expect(result).toHaveLength(16);
  });

  it('resolves to string[] for count > 1', async () => {
    const result = await generateRandomStringAsync({ length: 16, count: 5 });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(5);
  });

  it('async results are unique', async () => {
    const result = await generateRandomStringAsync({ length: 20, count: 30 });
    expect(new Set(result).size).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// PRESETS
// ---------------------------------------------------------------------------

describe('PRESETS', () => {
  it('TOKEN produces a 32-char alphanumeric string', () => {
    const s = generateRandomString(PRESETS.TOKEN);
    expect(s).toHaveLength(32);
    expect(s).toMatch(/^[a-zA-Z0-9]+$/);
  });

  it('PASSWORD produces a 20-char string with all types', () => {
    // Run multiple times to ensure all types appear
    let hasDigit = false, hasLower = false, hasUpper = false, hasSymbol = false;
    for (let i = 0; i < 20; i++) {
      const s = generateRandomString(PRESETS.PASSWORD);
      expect(s).toHaveLength(20);
      if (/[0-9]/.test(s)) hasDigit = true;
      if (/[a-z]/.test(s)) hasLower = true;
      if (/[A-Z]/.test(s)) hasUpper = true;
      if (/[!@#$%^&*]/.test(s)) hasSymbol = true;
    }
    expect(hasDigit).toBe(true);
    expect(hasLower).toBe(true);
    expect(hasUpper).toBe(true);
    expect(hasSymbol).toBe(true);
  });

  it('READABLE produces no ambiguous characters', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateRandomString(PRESETS.READABLE)).not.toMatch(/[0OlI1]/);
    }
  });

  it('SLUG starts with a letter and is lowercase alphanumeric', () => {
    for (let i = 0; i < 30; i++) {
      const s = generateRandomString(PRESETS.SLUG);
      expect(s).toHaveLength(12);
      expect(s[0]).toMatch(/[a-z]/);
      expect(s).toMatch(/^[a-z0-9]+$/);
    }
  });

  it('HEX produces a 32-char hex string', () => {
    const s = generateRandomString(PRESETS.HEX);
    expect(s).toHaveLength(32);
    expect(s).toMatch(/^[0-9a-f]+$/);
  });

  it('PIN produces 6-char numeric string not starting with 0', () => {
    for (let i = 0; i < 30; i++) {
      const s = generateRandomString(PRESETS.PIN);
      expect(s).toHaveLength(6);
      expect(s).toMatch(/^[0-9]+$/);
      expect(s[0]).not.toBe('0');
    }
  });

  it('SHORT_ID starts with uppercase letter', () => {
    for (let i = 0; i < 30; i++) {
      const s = generateRandomString(PRESETS.SHORT_ID);
      expect(s).toHaveLength(8);
      expect(s[0]).toMatch(/[A-Z]/);
    }
  });

  it('INVITE_CODE matches AAAA-AAAA-AAAA-AAAA pattern with readable chars', () => {
    for (let i = 0; i < 20; i++) {
      const s = generateRandomString(PRESETS.INVITE_CODE);
      expect(s).toMatch(/^[A-Z]{4}-[A-Z]{4}-[A-Z]{4}-[A-Z]{4}$/);
      expect(s).not.toMatch(/[0OlI1]/);
    }
  });
});

// ---------------------------------------------------------------------------
// estimateEntropy
// ---------------------------------------------------------------------------

describe('estimateEntropy', () => {
  it('returns higher bits for longer strings', () => {
    const short = estimateEntropy({ length: 8 });
    const long = estimateEntropy({ length: 32 });
    expect(long.bits).toBeGreaterThan(short.bits);
  });

  it('returns higher bits for larger charsets', () => {
    const small = estimateEntropy({ length: 16, numeric: true, lowercase: false, uppercase: false });
    const large = estimateEntropy({ length: 16, numeric: true, lowercase: true, uppercase: true, symbols: true });
    expect(large.bits).toBeGreaterThan(small.bits);
  });

  it('labels very-strong for long strings', () => {
    const e = estimateEntropy({ length: 32 });
    expect(e.strength).toBe('very-strong');
  });

  it('labels very-weak for short numeric', () => {
    const e = estimateEntropy({ length: 4, numeric: true, lowercase: false, uppercase: false });
    expect(e.strength).toBe('very-weak');
  });

  it('returns sensible values for TOKEN preset', () => {
    const e = estimateEntropy(PRESETS.TOKEN);
    expect(e.bits).toBeGreaterThan(150);
    expect(e.charsetSize).toBe(62);
    expect(e.effectiveLength).toBe(32);
  });

  it('works for pattern-based options', () => {
    const e = estimateEntropy({ pattern: '####-AAAA' });
    expect(e.bits).toBeGreaterThan(0);
    expect(e.effectiveLength).toBe(8);
  });

  it('returns 0 bits when prefix+suffix fill entire length', () => {
    const e = estimateEntropy({ length: 4, prefix: 'ab', suffix: 'cd' });
    expect(e.bits).toBe(0);
    expect(e.strength).toBe('very-weak');
  });
});

// ---------------------------------------------------------------------------
// validateRandomString
// ---------------------------------------------------------------------------

describe('validateRandomString', () => {
  it('returns valid:true for a conforming string', () => {
    const result = validateRandomString('abc123', {
      minLength: 6,
      requireNumeric: true,
      requireLowercase: true,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails length check', () => {
    const result = validateRandomString('abc', { length: 6 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/exactly 6/);
  });

  it('fails minLength check', () => {
    const result = validateRandomString('ab', { minLength: 5 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/at least 5/);
  });

  it('fails maxLength check', () => {
    const result = validateRandomString('abcdefgh', { maxLength: 5 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/at most 5/);
  });

  it('fails requireNumeric check', () => {
    const result = validateRandomString('abcdef', { requireNumeric: true });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/numeric digit/);
  });

  it('fails requireLowercase check', () => {
    const result = validateRandomString('ABCDEF', { requireLowercase: true });
    expect(result.valid).toBe(false);
  });

  it('fails requireUppercase check', () => {
    const result = validateRandomString('abcdef', { requireUppercase: true });
    expect(result.valid).toBe(false);
  });

  it('fails requireSymbols check', () => {
    const result = validateRandomString('abcABC123', { requireSymbols: true });
    expect(result.valid).toBe(false);
  });

  it('fails charset check with invalid characters', () => {
    const result = validateRandomString('abc123', { charset: 'abc' });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/not in the allowed charset/);
  });

  it('passes charset check when all chars are in set', () => {
    const result = validateRandomString('abcabc', { charset: 'abc' });
    expect(result.valid).toBe(true);
  });

  it('validates pattern — correct string', () => {
    const result = validateRandomString('1234-ABCD', { pattern: '####-AAAA' });
    expect(result.valid).toBe(true);
  });

  it('validates pattern — wrong length', () => {
    const result = validateRandomString('123-ABCD', { pattern: '####-AAAA' });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/Pattern expects length/);
  });

  it('validates pattern — wrong char type at position', () => {
    const result = validateRandomString('AAAA-1234', { pattern: '####-AAAA' });
    expect(result.valid).toBe(false);
  });

  it('accumulates multiple errors', () => {
    const result = validateRandomString('a', {
      minLength: 5,
      requireNumeric: true,
      requireUppercase: true,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('passes with no options', () => {
    const result = validateRandomString('anything');
    expect(result.valid).toBe(true);
  });
});
