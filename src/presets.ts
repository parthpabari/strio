/**
 * presets.ts
 * Ready-to-use named presets for common use cases.
 * Each preset is a plain `RandomStringOptions` object — pass it directly
 * to `generateRandomString` or spread it to customise.
 *
 * @example
 * import { generateRandomString, PRESETS } from 'secure-random-string';
 * const token = generateRandomString(PRESETS.TOKEN);
 * const longToken = generateRandomString({ ...PRESETS.TOKEN, length: 64 });
 */

import type { RandomStringOptions } from './types.js';

export const PRESETS = {
  /**
   * API token / session key.
   * 32-char alphanumeric (no symbols), readable=false for max entropy.
   * ~190 bits of entropy.
   */
  TOKEN: {
    length: 32,
    numeric: true,
    lowercase: true,
    uppercase: true,
    symbols: false,
  } satisfies RandomStringOptions,

  /**
   * Strong password.
   * 20 chars, all character types including symbols.
   * ~131 bits of entropy.
   */
  PASSWORD: {
    length: 20,
    numeric: true,
    lowercase: true,
    uppercase: true,
    symbols: true,
  } satisfies RandomStringOptions,

  /**
   * Human-readable token — no ambiguous characters (0/O/l/I/1).
   * Safe to read aloud or transcribe from a screen.
   * 16 chars, ~93 bits of entropy.
   */
  READABLE: {
    length: 16,
    numeric: true,
    lowercase: true,
    uppercase: true,
    symbols: false,
    readable: true,
  } satisfies RandomStringOptions,

  /**
   * URL-safe slug identifier.
   * Lowercase letters and digits only, starts with a letter.
   * 12 chars, ~62 bits of entropy.
   */
  SLUG: {
    length: 12,
    numeric: true,
    lowercase: true,
    uppercase: false,
    symbols: false,
    startWith: 'alphabet',
  } satisfies RandomStringOptions,

  /**
   * Lowercase hex string.
   * Compatible with UUID hex components, color codes, hash representations.
   * 32 chars (128-bit equivalent), ~128 bits of entropy.
   */
  HEX: {
    length: 32,
    charset: '0123456789abcdef',
  } satisfies RandomStringOptions,

  /**
   * Numeric PIN code. 6 digits, starts with a non-zero digit.
   * ~17 bits of entropy — suitable for short-lived OTP codes.
   */
  PIN: {
    length: 6,
    numeric: true,
    lowercase: false,
    uppercase: false,
    symbols: false,
    exclude: '0',
    startWith: 'numeric',
  } satisfies RandomStringOptions,

  /**
   * UUID-like string (not RFC 4122 compliant, but same visual format).
   * Uses `pattern` to produce 8-4-4-4-12 hex grouping.
   * ~122 bits of entropy (same as UUIDv4).
   */
  UUID_LIKE: {
    pattern: '\\*\\*\\*\\*\\*\\*\\*\\*-\\*\\*\\*\\*-\\*\\*\\*\\*-\\*\\*\\*\\*-\\*\\*\\*\\*\\*\\*\\*\\*\\*\\*\\*\\*',
    charset: '0123456789abcdef',
  } satisfies RandomStringOptions,

  /**
   * Short alphanumeric ID — suitable for database record IDs.
   * 8 chars, uppercase alphanumeric, starts with a letter.
   * ~41 bits — good for IDs when combined with a namespace/prefix.
   */
  SHORT_ID: {
    length: 8,
    numeric: true,
    lowercase: false,
    uppercase: true,
    symbols: false,
    startWith: 'alphabet',
  } satisfies RandomStringOptions,

  /**
   * Invitation / redemption code.
   * 16 chars, readable (no ambiguous chars), pattern grouped for readability.
   * @example 'KXPZ-9MR2-LQ4Y-8WVN'
   */
  INVITE_CODE: {
    pattern: 'AAAA-AAAA-AAAA-AAAA',
    readable: true,
  } satisfies RandomStringOptions,
} as const;

export type PresetName = keyof typeof PRESETS;
