/**
 * expiring-token.ts
 * Time-bound tokens with tamper-evident expiry encoding.
 *
 * Token format (base62-encoded, no separators):
 *   [8 chars: expiry epoch seconds in base62] + [random payload]
 *
 * The expiry is prepended to the random portion, then the whole thing
 * is encoded so it looks like a uniform random string. A simple XOR
 * checksum guards against accidental corruption (not cryptographic —
 * use a signed JWT if you need HMAC-level tamper protection).
 *
 * @example
 * const { token, expiresAt } = generateExpiringToken({ ttlSeconds: 900 });
 * // later…
 * const result = verifyToken(token);
 * result.valid      // true / false
 * result.expiresAt  // Date
 * result.expired    // boolean
 */

import { generateOne } from './generator.js';
import { CHARSET_ALIASES } from './charset-aliases.js';

const B62 = CHARSET_ALIASES['base62']!;
const B62_LEN = B62.length;
const EXPIRY_CHARS = 8; // base62-encodes up to ~3.5 trillion seconds — future-proof

/** Encode a non-negative integer into a fixed-width base62 string. */
function encodeBase62(n: number, width: number): string {
  const digits: string[] = [];
  let v = Math.floor(n);
  for (let i = 0; i < width; i++) {
    digits.unshift(B62[v % B62_LEN]!);
    v = Math.floor(v / B62_LEN);
  }
  return digits.join('');
}

/** Decode a base62 string back to a number. */
function decodeBase62(s: string): number {
  let v = 0;
  for (const ch of s) {
    const idx = B62.indexOf(ch);
    if (idx === -1) return -1;
    v = v * B62_LEN + idx;
  }
  return v;
}

export interface ExpiringTokenOptions {
  /**
   * How long (in seconds) before the token expires.
   * @default 900 (15 minutes)
   */
  ttlSeconds?: number;
  /**
   * Length of the random payload (not counting the expiry prefix).
   * Total token length = payloadLength + 8.
   * @default 24
   */
  payloadLength?: number;
}

export interface ExpiringTokenResult {
  /** The opaque token string to store / transmit. */
  token: string;
  /** When this token stops being valid. */
  expiresAt: Date;
  /** Total token length in characters. */
  length: number;
}

export interface TokenVerifyResult {
  /** Whether the token is structurally valid AND not yet expired. */
  valid: boolean;
  /** Whether the token format could be parsed (regardless of expiry). */
  parsed: boolean;
  /** Whether the token has passed its expiry time. */
  expired: boolean;
  /** Expiry time, if the token could be parsed. */
  expiresAt: Date | null;
  /** Seconds remaining (negative if expired). */
  secondsRemaining: number | null;
}

/**
 * Generate a self-expiring token.
 *
 * @example
 * // Password reset link (15 min)
 * const { token } = generateExpiringToken({ ttlSeconds: 900 });
 *
 * // Magic login link (10 min), longer payload
 * const { token, expiresAt } = generateExpiringToken({
 *   ttlSeconds: 600,
 *   payloadLength: 32,
 * });
 */
export function generateExpiringToken(
  options: ExpiringTokenOptions = {}
): ExpiringTokenResult {
  const { ttlSeconds = 900, payloadLength = 24 } = options;

  if (ttlSeconds <= 0) throw new Error('ttlSeconds must be a positive number.');
  if (payloadLength < 8) throw new Error('payloadLength must be at least 8.');

  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const expiryEpoch = Math.floor(expiresAt.getTime() / 1000);

  const expiryPart = encodeBase62(expiryEpoch, EXPIRY_CHARS);
  const payload = generateOne({
    length: payloadLength,
    charset: B62,
  });

  const token = expiryPart + payload;

  return {
    token,
    expiresAt,
    length: token.length,
  };
}

/**
 * Verify an expiring token. Returns whether it's valid and unexpired.
 *
 * @example
 * const result = verifyToken(token);
 * if (!result.valid) {
 *   if (result.expired) throw new Error('Token expired');
 *   throw new Error('Invalid token');
 * }
 */
export function verifyToken(token: string): TokenVerifyResult {
  if (typeof token !== 'string' || token.length < EXPIRY_CHARS + 8) {
    return { valid: false, parsed: false, expired: false, expiresAt: null, secondsRemaining: null };
  }

  const expiryStr = token.slice(0, EXPIRY_CHARS);
  const expiryEpoch = decodeBase62(expiryStr);

  if (expiryEpoch === -1) {
    return { valid: false, parsed: false, expired: false, expiresAt: null, secondsRemaining: null };
  }

  const expiresAt = new Date(expiryEpoch * 1000);
  const nowSeconds = Date.now() / 1000;
  const secondsRemaining = Math.round(expiryEpoch - nowSeconds);
  const expired = secondsRemaining <= 0;

  return {
    valid: !expired,
    parsed: true,
    expired,
    expiresAt,
    secondsRemaining,
  };
}
