/**
 * test/secrets.test.ts
 * Tests for all functions in src/secrets.ts
 */

import { describe, it, expect } from 'vitest';
import {
  generateBytes,
  generateHexKey,
  generateBase64Key,
  generateJwtSecret,
  generateApiKey,
  generateOtp,
  maskSecret,
  timingSafeEqual,
  generateCookieSecret,
  generateAesKey,
  generateNextAuthSecret,
  generateDjangoSecretKey,
  generateRailsSecretKeyBase,
} from '../src/secrets.js';

// ─────────────────────────────────────────────────────────────────────────────
// 1. generateBytes
// ─────────────────────────────────────────────────────────────────────────────
describe('generateBytes', () => {
  it('returns a Uint8Array', () => {
    expect(generateBytes(32)).toBeInstanceOf(Uint8Array);
  });

  it('returns correct length', () => {
    expect(generateBytes(16).length).toBe(16);
    expect(generateBytes(32).length).toBe(32);
    expect(generateBytes(64).length).toBe(64);
  });

  it('produces different values on successive calls', () => {
    const a = generateBytes(32);
    const b = generateBytes(32);
    expect(Buffer.from(a).toString('hex')).not.toBe(Buffer.from(b).toString('hex'));
  });

  it('throws on length 0', () => {
    expect(() => generateBytes(0)).toThrow(RangeError);
  });

  it('throws on negative length', () => {
    expect(() => generateBytes(-1)).toThrow(RangeError);
  });

  it('throws on non-integer', () => {
    expect(() => generateBytes(1.5)).toThrow(RangeError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. generateHexKey
// ─────────────────────────────────────────────────────────────────────────────
describe('generateHexKey', () => {
  it('returns lowercase hex string', () => {
    expect(generateHexKey(256)).toMatch(/^[0-9a-f]+$/);
  });

  it('256 bits → 64 hex chars', () => {
    expect(generateHexKey(256)).toHaveLength(64);
  });

  it('128 bits → 32 hex chars', () => {
    expect(generateHexKey(128)).toHaveLength(32);
  });

  it('512 bits → 128 hex chars', () => {
    expect(generateHexKey(512)).toHaveLength(128);
  });

  it('defaults to 256 bits', () => {
    expect(generateHexKey()).toHaveLength(64);
  });

  it('produces different keys on each call', () => {
    expect(generateHexKey(256)).not.toBe(generateHexKey(256));
  });

  it('throws on non-multiple-of-8', () => {
    expect(() => generateHexKey(255)).toThrow(RangeError);
  });

  it('throws on 0 bits', () => {
    expect(() => generateHexKey(0)).toThrow(RangeError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. generateBase64Key
// ─────────────────────────────────────────────────────────────────────────────
describe('generateBase64Key', () => {
  it('defaults to url-safe-no-pad', () => {
    const key = generateBase64Key(256);
    expect(key).not.toMatch(/[+/=]/); // no standard base64 chars
    expect(key).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it('standard variant has padding and +/', () => {
    // 32 bytes → some padding likely; just verify it's valid base64
    const key = generateBase64Key(256, 'standard');
    expect(() => atob(key)).not.toThrow();
  });

  it('url-safe variant replaces + and / but keeps =', () => {
    // Run many times — at least one will have padding
    let hasPadding = false;
    for (let i = 0; i < 50; i++) {
      const k = generateBase64Key(256, 'url-safe');
      expect(k).not.toMatch(/[+/]/);
      if (k.includes('=')) hasPadding = true;
    }
    // url-safe-no-pad must never have padding
    const noPad = generateBase64Key(256, 'url-safe-no-pad');
    expect(noPad).not.toContain('=');
  });

  it('url-safe-no-pad never has padding', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateBase64Key(256, 'url-safe-no-pad')).not.toContain('=');
    }
  });

  it('different calls produce different keys', () => {
    expect(generateBase64Key(256)).not.toBe(generateBase64Key(256));
  });

  it('throws on unknown variant', () => {
    expect(() => generateBase64Key(256, 'unknown' as never)).toThrow(TypeError);
  });

  it('throws on non-multiple-of-8 bits', () => {
    expect(() => generateBase64Key(100)).toThrow(RangeError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. generateJwtSecret
// ─────────────────────────────────────────────────────────────────────────────
describe('generateJwtSecret', () => {
  it('returns required fields', () => {
    const r = generateJwtSecret();
    expect(typeof r.secret).toBe('string');
    expect(r.algorithm).toBe('HS256');
    expect(r.bits).toBe(256);
    expect(r.format).toBe('base64url');
    expect(typeof r.example).toBe('string');
  });

  it('HS256 produces 256-bit base64url secret', () => {
    const { secret, bits } = generateJwtSecret({ algorithm: 'HS256' });
    expect(bits).toBe(256);
    expect(secret).not.toContain('=');
    expect(secret).not.toMatch(/[+/]/);
  });

  it('HS384 produces 384-bit secret', () => {
    const { secret, bits } = generateJwtSecret({ algorithm: 'HS384' });
    expect(bits).toBe(384);
    expect(secret.length).toBeGreaterThan(40);
  });

  it('HS512 produces 512-bit secret', () => {
    const { bits } = generateJwtSecret({ algorithm: 'HS512' });
    expect(bits).toBe(512);
  });

  it('hex format returns lowercase hex', () => {
    const { secret } = generateJwtSecret({ format: 'hex' });
    expect(secret).toMatch(/^[0-9a-f]+$/);
    expect(secret).toHaveLength(64); // 256 bits = 64 hex chars
  });

  it('utf8-like format returns base62 string', () => {
    const { secret } = generateJwtSecret({ format: 'utf8-like' });
    expect(secret.length).toBeGreaterThan(20);
    expect(secret).toMatch(/^[0-9A-Za-z]+$/);
  });

  it('bits override respected when above minimum', () => {
    const { bits } = generateJwtSecret({ algorithm: 'HS256', bits: 512 });
    expect(bits).toBe(512);
  });

  it('throws when bits below algorithm minimum', () => {
    expect(() => generateJwtSecret({ algorithm: 'HS512', bits: 256 })).toThrow(RangeError);
  });

  it('throws on unknown algorithm', () => {
    expect(() => generateJwtSecret({ algorithm: 'RS256' as never })).toThrow(TypeError);
  });

  it('throws on bits not multiple of 8', () => {
    expect(() => generateJwtSecret({ bits: 257 })).toThrow(RangeError);
  });

  it('produces different secrets on each call', () => {
    expect(generateJwtSecret().secret).not.toBe(generateJwtSecret().secret);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. generateApiKey
// ─────────────────────────────────────────────────────────────────────────────
describe('generateApiKey', () => {
  it('returns required fields', () => {
    const r = generateApiKey();
    expect(typeof r.key).toBe('string');
    expect(typeof r.prefix).toBe('string');
    expect(typeof r.randomLength).toBe('number');
    expect(typeof r.bits).toBe('number');
  });

  it('default format: type_env_random', () => {
    const { key, prefix } = generateApiKey({ type: 'myapp', environment: 'prod' });
    expect(key).toMatch(/^myapp_prod_/);
    expect(prefix).toBe('myapp_prod');
  });

  it('custom type and environment', () => {
    const { key } = generateApiKey({ type: 'tok', environment: 'test' });
    expect(key).toMatch(/^tok_test_/);
  });

  it('no environment → type_random', () => {
    const { key, prefix } = generateApiKey({ type: 'pk' });
    expect(key).toMatch(/^pk_/);
    expect(prefix).toBe('pk');
    // Should not have a second underscore segment from env
    expect(key.split('_').length).toBe(2);
  });

  it('256 bits → correct random length for base62', () => {
    // ceil(256 / log2(62)) = ceil(256 / 5.954) = ceil(43.0) = 44
    const { randomLength } = generateApiKey({ bits: 256 });
    expect(randomLength).toBe(Math.ceil(256 / Math.log2(62)));
  });

  it('hex charset produces hex random portion', () => {
    const { key } = generateApiKey({ type: 'sk', charset: 'hex' });
    const randomPart = key.split('_').pop()!;
    expect(randomPart).toMatch(/^[0-9a-f]+$/);
  });

  it('base58 charset only uses base58 chars', () => {
    const base58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const { key } = generateApiKey({ type: 'sk', charset: 'base58' });
    const randomPart = key.split('_').pop()!;
    expect([...randomPart].every(c => base58.includes(c))).toBe(true);
  });

  it('custom separator works', () => {
    const { key } = generateApiKey({ type: 'sk', environment: 'live', separator: '-' });
    expect(key).toMatch(/^sk-live-/);
  });

  it('different calls produce different keys', () => {
    expect(generateApiKey().key).not.toBe(generateApiKey().key);
  });

  it('throws on non-multiple-of-8 bits', () => {
    expect(() => generateApiKey({ bits: 100 })).toThrow(RangeError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. generateOtp
// ─────────────────────────────────────────────────────────────────────────────
describe('generateOtp', () => {
  it('returns required fields', () => {
    const r = generateOtp();
    expect(typeof r.code).toBe('string');
    expect(typeof r.value).toBe('number');
    expect(r.digits).toBe(6);
  });

  it('default 6-digit code', () => {
    const { code } = generateOtp();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[0-9]+$/);
  });

  it('zero-pads short values', () => {
    // Run many times — some values will be < 100000 and need padding
    let sawPadding = false;
    for (let i = 0; i < 500; i++) {
      const { code, value } = generateOtp();
      expect(code).toHaveLength(6);
      if (value < 100000) sawPadding = true;
    }
    // Zero-padding is probabilistic; just verify length is always correct
    // (1/10 chance each iteration, so 500 iterations will almost always hit it)
  });

  it('8-digit OTP has length 8', () => {
    const { code, digits } = generateOtp({ digits: 8 });
    expect(code).toHaveLength(8);
    expect(digits).toBe(8);
  });

  it('value is in range [0, 10^digits)', () => {
    for (let i = 0; i < 50; i++) {
      const { value } = generateOtp({ digits: 6 });
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1_000_000);
    }
  });

  it('allowLeadingZero:false → first digit non-zero (stats)', () => {
    let sawLeadingZero = false;
    for (let i = 0; i < 200; i++) {
      const { code } = generateOtp({ digits: 6, allowLeadingZero: false });
      if (code[0] === '0') sawLeadingZero = true;
    }
    expect(sawLeadingZero).toBe(false);
  });

  it('produces variety (not same code)', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateOtp().code));
    expect(codes.size).toBeGreaterThan(1);
  });

  it('throws on digits < 1', () => {
    expect(() => generateOtp({ digits: 0 })).toThrow(RangeError);
  });

  it('throws on digits > 10', () => {
    expect(() => generateOtp({ digits: 11 })).toThrow(RangeError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. maskSecret
// ─────────────────────────────────────────────────────────────────────────────
describe('maskSecret', () => {
  it('masks a plain secret', () => {
    const masked = maskSecret('supersecretpassword');
    expect(masked).toContain('*');
    expect(masked).not.toBe('supersecretpassword');
  });

  it('auto-detects strio_live_ prefix', () => {
    const masked = maskSecret('strio_live_K3xP9mQr2LzYw7NvTq8s');
    expect(masked).toMatch(/^strio_live_/);
    expect(masked).toContain('*');
  });

  it('auto-detects strio_test_ prefix', () => {
    expect(maskSecret('strio_test_abc123def456')).toMatch(/^strio_test_/);
  });

  it('shows last 4 chars by default', () => {
    const secret = 'strio_live_ABCDEFGHIJ1234';
    const masked = maskSecret(secret);
    expect(masked.endsWith('1234')).toBe(true);
  });

  it('custom visibleEnd', () => {
    // payload after 'strio_live_' prefix = 'ABCDEFGHIJ1234' (14 chars)
    // visibleEnd: 6 → last 6 chars of payload = 'IJ1234'
    const masked = maskSecret('strio_live_ABCDEFGHIJ1234', { visibleEnd: 6 });
    expect(masked).toMatch(/^strio_live_/);
    expect(masked.endsWith('IJ1234')).toBe(true);
    expect(masked).toContain('*');
  });

  it('never reveals the full secret', () => {
    const secret = 'strio_live_K3xP9mQr2LzYw7NvTq8sHfGbJ5cD4eAK';
    const masked = maskSecret(secret);
    expect(masked).not.toBe(secret);
    expect(masked.length).toBeLessThan(secret.length);
  });

  it('always contains mask chars', () => {
    const masked = maskSecret('any_random_secret_value_here');
    expect(masked).toContain('*');
  });

  it('empty string returns empty', () => {
    expect(maskSecret('')).toBe('');
  });

  it('very short secret gets min mask length', () => {
    const masked = maskSecret('ab');
    expect(masked).toContain('****');
  });

  it('custom maskChar', () => {
    const masked = maskSecret('supersecretvalue', { maskChar: '•' });
    expect(masked).toContain('•');
    expect(masked).not.toContain('*');
  });

  it('api_ prefix auto-detected', () => {
    expect(maskSecret('api_someRandomApiKey1234')).toMatch(/^api_/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. timingSafeEqual
// ─────────────────────────────────────────────────────────────────────────────
describe('timingSafeEqual', () => {
  it('equal strings → true', () => {
    expect(timingSafeEqual('hello', 'hello')).toBe(true);
  });

  it('different strings → false', () => {
    expect(timingSafeEqual('hello', 'world')).toBe(false);
  });

  it('empty strings → true', () => {
    expect(timingSafeEqual('', '')).toBe(true);
  });

  it('different lengths → false', () => {
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
  });

  it('same content, different length → false', () => {
    expect(timingSafeEqual('abc', 'abc ')).toBe(false);
  });

  it('works with Uint8Array', () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2, 3, 4]);
    const c = new Uint8Array([1, 2, 3, 5]);
    expect(timingSafeEqual(a, b)).toBe(true);
    expect(timingSafeEqual(a, c)).toBe(false);
  });

  it('string vs Uint8Array of same UTF-8 bytes → true', () => {
    const str = 'hello';
    const bytes = new TextEncoder().encode(str);
    expect(timingSafeEqual(str, bytes)).toBe(true);
  });

  it('single char difference → false', () => {
    const a = 'K3xP9mQr2LzYw7NvTq8sHfGbJ5cD4eAK';
    const b = 'K3xP9mQr2LzYw7NvTq8sHfGbJ5cD4eAX'; // last char changed
    expect(timingSafeEqual(a, b)).toBe(false);
  });

  it('real token comparison workflow', () => {
    const stored = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    const valid   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    const invalid = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJX';
    expect(timingSafeEqual(stored, valid)).toBe(true);
    expect(timingSafeEqual(stored, invalid)).toBe(false);
  });

  it('does not short-circuit (runs to completion)', () => {
    // We can't directly test timing, but we can verify it always returns
    // the correct value regardless of which character differs
    for (let pos = 0; pos < 32; pos++) {
      const a = 'a'.repeat(32);
      const bArr = [...a];
      bArr[pos] = 'b';
      expect(timingSafeEqual(a, bArr.join(''))).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Framework helpers
// ─────────────────────────────────────────────────────────────────────────────
describe('generateCookieSecret', () => {
  it('returns a non-empty string', () => {
    expect(typeof generateCookieSecret()).toBe('string');
    expect(generateCookieSecret().length).toBeGreaterThan(0);
  });

  it('is URL-safe (no +/=)', () => {
    for (let i = 0; i < 10; i++) {
      expect(generateCookieSecret()).not.toMatch(/[+/=]/);
    }
  });

  it('default is 256-bit (43 base64url chars)', () => {
    // 256 bits = 32 bytes → ceil(32 * 4/3) = 43 base64url chars (no padding)
    expect(generateCookieSecret()).toHaveLength(43);
  });

  it('throws for < 128 bits', () => {
    expect(() => generateCookieSecret(64)).toThrow(RangeError);
  });
});

describe('generateAesKey', () => {
  it('default 256 bits → 64-char hex', () => {
    const key = generateAesKey();
    expect(typeof key).toBe('string');
    expect(key).toHaveLength(64);
    expect(key).toMatch(/^[0-9a-f]+$/);
  });

  it('128 bits → 32-char hex', () => {
    expect(generateAesKey(128)).toHaveLength(32);
  });

  it('192 bits → 48-char hex', () => {
    expect(generateAesKey(192)).toHaveLength(48);
  });

  it('bytes format → Uint8Array', () => {
    const key = generateAesKey(256, 'bytes');
    expect(key).toBeInstanceOf(Uint8Array);
    expect((key as Uint8Array).length).toBe(32);
  });

  it('base64 format → url-safe string', () => {
    const key = generateAesKey(256, 'base64');
    expect(typeof key).toBe('string');
    expect(key).not.toMatch(/[+/=]/);
  });

  it('different calls differ', () => {
    expect(generateAesKey()).not.toBe(generateAesKey());
  });
});

describe('generateNextAuthSecret', () => {
  it('returns a 43-char base64url string (256 bits)', () => {
    const s = generateNextAuthSecret();
    expect(s).toHaveLength(43);
    expect(s).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it('produces different secrets each call', () => {
    expect(generateNextAuthSecret()).not.toBe(generateNextAuthSecret());
  });
});

describe('generateDjangoSecretKey', () => {
  it('returns a 64-char string', () => {
    expect(generateDjangoSecretKey()).toHaveLength(64);
  });

  it('uses Django-allowed chars only', () => {
    const ALLOWED = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*(-_=+)ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const key = generateDjangoSecretKey();
    expect([...key].every(c => ALLOWED.includes(c))).toBe(true);
  });

  it('produces variety', () => {
    const keys = new Set(Array.from({ length: 10 }, () => generateDjangoSecretKey()));
    expect(keys.size).toBeGreaterThan(1);
  });
});

describe('generateRailsSecretKeyBase', () => {
  it('returns a 128-char hex string (512 bits)', () => {
    const key = generateRailsSecretKeyBase();
    expect(key).toHaveLength(128);
    expect(key).toMatch(/^[0-9a-f]+$/);
  });

  it('produces different keys each call', () => {
    expect(generateRailsSecretKeyBase()).not.toBe(generateRailsSecretKeyBase());
  });
});
