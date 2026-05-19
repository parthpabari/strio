/**
 * short-id.ts
 * Collision-resistant short IDs with an optional checksum character.
 *
 * A checksum character (Luhn-style mod-N) is appended to the random
 * portion so that single-character transcription errors are detectable
 * without a database lookup. The checksum uses the same charset as the
 * random portion — the output looks uniform.
 *
 * Format: [prefix_][random chars][checksum char]
 *
 * @example
 * const id = generateId({ prefix: 'usr' });
 * // → 'usr_K3xP9mQr2L4c'  (10 random + 1 checksum = 11 chars after prefix)
 *
 * validateId('usr_K3xP9mQr2L4c', { prefix: 'usr' });
 * // → { valid: true, ... }
 */

import { getRandomChars } from './core.js';
import { buildCharset } from './charsets.js';
import { resolveCharsetAlias } from './charset-aliases.js';

export interface ShortIdOptions {
  /**
   * Optional prefix string, e.g. `'usr'` → `'usr_K3xP9mQr'`.
   * An underscore separator is added automatically between prefix and random part.
   * Set `separator: ''` to disable.
   */
  prefix?: string;
  /**
   * Separator between prefix and random portion.
   * @default '_'
   */
  separator?: string;
  /**
   * Length of the random portion (before checksum is added).
   * Total random section = randomLength + 1 (checksum).
   * @default 12
   */
  randomLength?: number;
  /**
   * Character pool for the random portion. Accepts a charset alias
   * (e.g. `'base58'`) or a raw character string.
   * @default base58 (no ambiguous chars)
   */
  charset?: string;
  /**
   * Whether to append a checksum character.
   * Disable only if you need exact length control.
   * @default true
   */
  checksum?: boolean;
}

export interface ShortIdValidateOptions {
  /** Expected prefix (without separator). */
  prefix?: string;
  /** Separator used when the ID was generated. @default '_' */
  separator?: string;
  /** Charset used when the ID was generated. @default base58 */
  charset?: string;
  /** Whether the ID was generated with a checksum. @default true */
  checksum?: boolean;
}

export interface ShortIdValidateResult {
  valid: boolean;
  errors: string[];
}

/**
 * Compute a mod-N checksum character for `payload` over `charset`.
 * Detects all single-character substitutions and many transpositions.
 */
function computeChecksum(payload: string, charset: string): string {
  const n = charset.length;
  let sum = 0;
  for (let i = 0; i < payload.length; i++) {
    const idx = charset.indexOf(payload[i]!);
    if (idx === -1) return charset[0]!; // fallback; caller validates charset
    // Alternate weight 1 and 2 (Luhn-style) to catch transpositions too
    const weight = (i % 2 === 0) ? 1 : 2;
    sum += idx * weight;
  }
  return charset[sum % n]!;
}

/**
 * Generate a collision-resistant short ID.
 *
 * @example
 * generateId()                          // → 'K3xP9mQr2L4Xc'
 * generateId({ prefix: 'usr' })         // → 'usr_K3xP9mQr2L4Xc'
 * generateId({ prefix: 'inv', randomLength: 8 }) // → 'inv_K3xP9mQrc'
 * generateId({ charset: 'base62' })     // → '4jK9mQr2L4Xz3'
 */
export function generateId(options: ShortIdOptions = {}): string {
  const {
    prefix,
    separator = '_',
    randomLength = 12,
    charset: rawCharset = 'base58',
    checksum = true,
  } = options;

  const resolvedCharset = resolveCharsetAlias(rawCharset);
  const charset = buildCharset({ charset: resolvedCharset });

  if (randomLength < 4) throw new Error('randomLength must be at least 4.');

  const randomPart = getRandomChars(charset, randomLength).join('');
  const checksumChar = checksum ? computeChecksum(randomPart, charset) : '';
  const randomSection = randomPart + checksumChar;

  if (prefix) {
    return `${prefix}${separator}${randomSection}`;
  }
  return randomSection;
}

/**
 * Validate a short ID against a known config.
 * Checks prefix, separator, and checksum integrity.
 *
 * @example
 * validateId('usr_K3xP9mQr2L4Xc', { prefix: 'usr' })
 * // → { valid: true, errors: [] }
 *
 * validateId('usr_K3xP9mQr2L4Xa', { prefix: 'usr' })
 * // → { valid: false, errors: ['Checksum mismatch — ID may be corrupted or mistyped.'] }
 */
export function validateId(
  id: string,
  options: ShortIdValidateOptions = {}
): ShortIdValidateResult {
  const {
    prefix,
    separator = '_',
    charset: rawCharset = 'base58',
    checksum = true,
  } = options;

  const errors: string[] = [];
  const resolvedCharset = resolveCharsetAlias(rawCharset);
  let payload = id;

  // Check prefix
  if (prefix) {
    const expectedStart = `${prefix}${separator}`;
    if (!id.startsWith(expectedStart)) {
      errors.push(`Expected prefix '${prefix}${separator}', got '${id.slice(0, expectedStart.length)}'.`);
      return { valid: false, errors };
    }
    payload = id.slice(expectedStart.length);
  }

  // Check all chars are in charset
  const charsetSet = new Set(resolvedCharset);
  const badChars = [...new Set(payload)].filter(c => !charsetSet.has(c));
  if (badChars.length > 0) {
    errors.push(`Contains characters outside the expected charset: ${badChars.map(c => JSON.stringify(c)).join(', ')}.`);
  }

  // Check checksum
  if (checksum && payload.length >= 2 && errors.length === 0) {
    const randomPart = payload.slice(0, -1);
    const providedChecksum = payload.slice(-1);
    const expectedChecksum = computeChecksum(randomPart, resolvedCharset);
    if (providedChecksum !== expectedChecksum) {
      errors.push('Checksum mismatch — ID may be corrupted or mistyped.');
    }
  }

  return { valid: errors.length === 0, errors };
}
