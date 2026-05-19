/**
 * charsets.ts
 * Character set constants used across the library.
 */
import { resolveCharsetAlias } from './charset-aliases.js';

export const CHARSETS = {
  numeric: '0123456789',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  symbols: '!@#$%^&*()_+[]{}<>?',
  alphanumeric: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  hex: '0123456789abcdef',
  // Ambiguous characters that are easy to confuse when reading/transcribing
  ambiguous: '0Ol1I',
} as const;

/**
 * Deduplicate characters in a string, preserving order of first occurrence.
 */
export function dedup(str: string): string {
  return [...new Set(str)].join('');
}

/**
 * Build a character pool from option flags.
 * Returns the pool string and throws a descriptive error if the
 * resulting pool is empty or has fewer than 2 unique characters.
 */
export function buildCharset(options: {
  numeric?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  symbols?: boolean;
  readable?: boolean;
  exclude?: string | string[];
  charset?: string;
}): string {
  let pool: string;

  if (options.charset !== undefined) {
    pool = dedup(resolveCharsetAlias(options.charset));
    if (pool.length < 2) {
      throw new Error(
        'Custom charset must contain at least 2 unique characters.'
      );
    }
    return pool;
  }

  const {
    numeric = true,
    lowercase = true,
    uppercase = true,
    symbols = false,
  } = options;

  pool = '';
  if (numeric) pool += CHARSETS.numeric;
  if (lowercase) pool += CHARSETS.lowercase;
  if (uppercase) pool += CHARSETS.uppercase;
  if (symbols) pool += CHARSETS.symbols;

  if (!pool) {
    throw new Error(
      'At least one character type must be enabled (numeric, lowercase, uppercase, or symbols).'
    );
  }

  // Apply readable shorthand
  if (options.readable) {
    for (const ch of CHARSETS.ambiguous) {
      pool = pool.split(ch).join('');
    }
  }

  // Apply explicit exclusions
  if (options.exclude) {
    const excludeChars =
      typeof options.exclude === 'string'
        ? options.exclude
        : options.exclude.join('');
    for (const ch of excludeChars) {
      pool = pool.split(ch).join('');
    }
  }

  pool = dedup(pool);

  if (pool.length < 2) {
    throw new Error(
      'After applying exclusions, the character pool has fewer than 2 unique characters. ' +
        'Loosen your exclude/readable settings or enable more character types.'
    );
  }

  return pool;
}

/**
 * Build the subset of `fullPool` that only contains alphabetic characters.
 */
export function alphabetSubset(fullPool: string): string {
  return [...fullPool]
    .filter(ch => /[a-zA-Z]/.test(ch))
    .join('');
}

/**
 * Build the subset of `fullPool` that only contains numeric characters.
 */
export function numericSubset(fullPool: string): string {
  return [...fullPool]
    .filter(ch => /[0-9]/.test(ch))
    .join('');
}
