/**
 * charset-aliases.ts
 * Named character set aliases for common encoding schemes.
 * Pass any alias name as the `charset` option in generateRandomString.
 *
 * @example
 * import { generateRandomString, CHARSET_ALIASES } from '@ppabari/strio';
 * generateRandomString({ charset: CHARSET_ALIASES.base58, length: 22 });
 * // or via string shorthand:
 * generateRandomString({ charset: 'base58', length: 22 });
 */

export const CHARSET_ALIASES: Record<string, string> = {
  /**
   * Base16 — hex digits, lowercase.
   * Use for: hash representations, color codes, compact binary encoding.
   */
  base16: '0123456789abcdef',

  /** Base16 uppercase variant */
  base16upper: '0123456789ABCDEF',

  /**
   * Base32 — RFC 4648. Uppercase alpha + digits, no padding chars.
   * Use for: case-insensitive tokens, OTP secrets (Google Authenticator compatible).
   */
  base32: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',

  /**
   * Base32 hex — RFC 4648 §7. Sortable alternative to standard base32.
   */
  base32hex: '0123456789ABCDEFGHIJKLMNOPQRSTUV',

  /**
   * Base36 — digits + lowercase alpha.
   * Use for: short URLs, case-insensitive IDs, number system conversions.
   */
  base36: '0123456789abcdefghijklmnopqrstuvwxyz',

  /**
   * Base58 — Bitcoin alphabet. No 0/O/I/l to avoid visual ambiguity.
   * Use for: Bitcoin addresses, IPFS CIDs, human-readable tokens.
   */
  base58: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',

  /**
   * Base62 — digits + lowercase + uppercase. Max density for alphanumeric.
   * Use for: URL shorteners, compact IDs, high-entropy tokens.
   */
  base62: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',

  /**
   * Base64 URL-safe — RFC 4648 §5. No +/= padding; URL and filename safe.
   * Use for: JWT components, URL tokens, file names.
   */
  base64url: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_',

  /**
   * Alphanumeric — same as base62. Alias for clarity.
   */
  alphanumeric: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',

  /**
   * Alpha — letters only, mixed case.
   */
  alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',

  /**
   * Numeric — digits only.
   */
  numeric: '0123456789',

  /**
   * Hex — alias for base16 lowercase.
   */
  hex: '0123456789abcdef',

  /**
   * Crockford Base32 — human-friendly, case-insensitive, excludes I/L/O/U.
   * Use for: serial numbers, redemption codes, user-facing IDs.
   */
  crockford32: '0123456789ABCDEFGHJKMNPQRSTVWXYZ',
} as const;

export type CharsetAlias = keyof typeof CHARSET_ALIASES;

/**
 * Resolve a charset value: if it matches a known alias, return the
 * corresponding character string; otherwise return the value as-is.
 *
 * This is called inside buildCharset so alias names work transparently
 * as the `charset` option.
 *
 * @example
 * resolveCharsetAlias('base58') // → '123456789ABCDEF...'
 * resolveCharsetAlias('abc')    // → 'abc'
 */
export function resolveCharsetAlias(value: string): string {
  return CHARSET_ALIASES[value] ?? value;
}
