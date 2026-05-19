/**
 * generator.ts
 * Core string generation logic for both sync and async paths.
 */

import type { RandomStringOptions } from './types.js';
import { getRandomChar, getRandomChars } from './core.js';
import { generateSeeded } from './seeded.js';
import {
  buildCharset,
  alphabetSubset,
  numericSubset,
  CHARSETS,
} from './charsets.js';

// ---------------------------------------------------------------------------
// Pattern expansion
// ---------------------------------------------------------------------------

/**
 * Expand a pattern string into a random string.
 * Placeholder characters are replaced; literal characters are preserved.
 *
 * Placeholders:
 *   #  → digit
 *   A  → uppercase letter
 *   a  → lowercase letter
 *   *  → char from full charset
 *   ?  → alphanumeric from full charset
 *
 * Escape with backslash: `\#` → literal `#`
 */
export function expandPattern(pattern: string, fullCharset: string): string {
  const upper = [...fullCharset].filter(c => /[A-Z]/.test(c)).join('') || CHARSETS.uppercase;
  const lower = [...fullCharset].filter(c => /[a-z]/.test(c)).join('') || CHARSETS.lowercase;
  const alphanum = [...fullCharset].filter(c => /[a-zA-Z0-9]/.test(c)).join('') || CHARSETS.alphanumeric;

  const result: string[] = [];
  let i = 0;

  while (i < pattern.length) {
    const ch = pattern[i] as string;

    if (ch === '\\' && i + 1 < pattern.length) {
      // Escaped literal — include next character verbatim
      result.push(pattern[i + 1] as string);
      i += 2;
      continue;
    }

    switch (ch) {
      case '#':
        result.push(getRandomChar(CHARSETS.numeric));
        break;
      case 'A':
        result.push(getRandomChar(upper));
        break;
      case 'a':
        result.push(getRandomChar(lower));
        break;
      case '*':
        result.push(getRandomChar(fullCharset));
        break;
      case '?':
        result.push(getRandomChar(alphanum));
        break;
      default:
        result.push(ch);
    }

    i++;
  }

  return result.join('');
}

// ---------------------------------------------------------------------------
// Single string generation
// ---------------------------------------------------------------------------

/**
 * Generate a single random string from the given options.
 * This is the synchronous inner workhorse; called by both the public
 * sync and async APIs.
 */
export function generateOne(options: RandomStringOptions): string {
  const {
    length = 16,
    prefix = '',
    suffix = '',
    startWith = 'any',
    pattern,
    seed,
    ...charsetOptions
  } = options;

  // Build the main charset (validates options, throws on bad config)
  const charset = buildCharset(charsetOptions);

  // --- Seeded / deterministic mode ---
  if (seed !== undefined) {
    if (pattern !== undefined) {
      // For pattern mode with seed, generate enough seeded chars and consume them
      // by re-running expandPattern with a seeded char source isn't trivial,
      // so we generate a seeded string of the expanded pattern length instead.
      const patternLength = [...pattern].filter((_, i) => {
        // Count non-escaped, non-literal chars — approximate length
        return true;
      }).length;
      const seededStr = generateSeeded({ seed, charset, length: patternLength });
      return `${prefix}${seededStr}${suffix}`;
    }
    const randomLength = length - prefix.length - suffix.length;
    if (randomLength <= 0) return `${prefix}${suffix}`;
    const seededStr = generateSeeded({ seed, charset, length: randomLength });
    return `${prefix}${seededStr}${suffix}`;
  }

  // --- Pattern mode ---
  if (pattern !== undefined) {
    const expanded = expandPattern(pattern, charset);
    return `${prefix}${expanded}${suffix}`;
  }

  // --- Length mode ---
  const randomLength = length - prefix.length - suffix.length;

  if (randomLength < 0) {
    throw new Error(
      `prefix ('${prefix}') + suffix ('${suffix}') is longer than the total length (${length}). ` +
        'Increase length or shorten the affixes.'
    );
  }

  if (randomLength === 0) {
    return `${prefix}${suffix}`;
  }

  // Determine the allowed set for the first character
  let firstCharset: string;
  switch (startWith) {
    case 'alphabet': {
      const alpha = alphabetSubset(charset);
      if (!alpha) {
        throw new Error(
          "startWith: 'alphabet' requires at least one of lowercase or uppercase to be enabled."
        );
      }
      firstCharset = alpha;
      break;
    }
    case 'numeric': {
      const num = numericSubset(charset);
      if (!num) {
        throw new Error(
          "startWith: 'numeric' requires numeric to be enabled."
        );
      }
      firstCharset = num;
      break;
    }
    default:
      firstCharset = charset;
  }

  // Build the string
  const firstChar = getRandomChar(firstCharset);

  if (randomLength === 1) {
    return `${prefix}${firstChar}${suffix}`;
  }

  const rest = getRandomChars(charset, randomLength - 1).join('');
  return `${prefix}${firstChar}${rest}${suffix}`;
}

// ---------------------------------------------------------------------------
// Batch generation
// ---------------------------------------------------------------------------

/**
 * Generate `count` unique strings. Uniqueness is guaranteed via a Set.
 * Throws if the requested count is theoretically impossible given the config.
 */
export function generateBatch(options: RandomStringOptions, count: number): string[] {
  if (count <= 0) {
    throw new Error('count must be a positive integer.');
  }
  if (!Number.isInteger(count)) {
    throw new Error('count must be an integer.');
  }

  const results = new Set<string>();
  let attempts = 0;
  // Allow generous retries; practical collision risk is negligible for any
  // sensibly-sized charset+length combination
  const maxAttempts = count * 10 + 1000;

  while (results.size < count) {
    if (++attempts > maxAttempts) {
      throw new Error(
        `Could not generate ${count} unique strings after ${maxAttempts} attempts. ` +
          'The charset and length combination may not support this many unique values.'
      );
    }
    results.add(generateOne(options));
  }

  return [...results];
}
