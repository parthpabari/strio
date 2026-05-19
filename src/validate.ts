/**
 * validate.ts
 * Validate that a string conforms to a given RandomStringOptions config.
 */

import type { ValidateOptions, ValidationResult } from './types.js';

const DIGIT_RE = /[0-9]/;
const LOWER_RE = /[a-z]/;
const UPPER_RE = /[A-Z]/;
const SYMBOL_RE = /[!@#$%^&*()_+\[\]{}<>?]/;

/**
 * Checks whether `str` satisfies the given validation rules.
 *
 * @example
 * const result = validateRandomString('abc123', {
 *   minLength: 6,
 *   requireNumeric: true,
 *   requireLowercase: true,
 * });
 * result.valid; // true
 *
 * @example
 * const result = validateRandomString('abc', { requireNumeric: true });
 * result.valid;  // false
 * result.errors; // ['Must contain at least one numeric digit.']
 */
export function validateRandomString(
  str: string,
  options: ValidateOptions = {}
): ValidationResult {
  const errors: string[] = [];
  const {
    minLength,
    maxLength,
    length,
    requireNumeric,
    requireLowercase,
    requireUppercase,
    requireSymbols,
    charset,
    pattern,
  } = options;

  if (length !== undefined && str.length !== length) {
    errors.push(`Length must be exactly ${length}, got ${str.length}.`);
  }

  if (minLength !== undefined && str.length < minLength) {
    errors.push(`Length must be at least ${minLength}, got ${str.length}.`);
  }

  if (maxLength !== undefined && str.length > maxLength) {
    errors.push(`Length must be at most ${maxLength}, got ${str.length}.`);
  }

  if (requireNumeric && !DIGIT_RE.test(str)) {
    errors.push('Must contain at least one numeric digit.');
  }

  if (requireLowercase && !LOWER_RE.test(str)) {
    errors.push('Must contain at least one lowercase letter.');
  }

  if (requireUppercase && !UPPER_RE.test(str)) {
    errors.push('Must contain at least one uppercase letter.');
  }

  if (requireSymbols && !SYMBOL_RE.test(str)) {
    errors.push('Must contain at least one symbol.');
  }

  if (charset !== undefined) {
    const charsetSet = new Set(charset);
    const invalidChars = [...new Set(str)].filter(ch => !charsetSet.has(ch));
    if (invalidChars.length > 0) {
      errors.push(
        `Contains characters not in the allowed charset: ${invalidChars.map(c => JSON.stringify(c)).join(', ')}.`
      );
    }
  }

  if (pattern !== undefined) {
    const patternErrors = validatePattern(str, pattern);
    errors.push(...patternErrors);
  }

  return { valid: errors.length === 0, errors };
}

function validatePattern(str: string, pattern: string): string[] {
  const errors: string[] = [];
  const expandedPattern: Array<{ type: 'literal' | 'placeholder'; value: string }> = [];

  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i] as string;
    if (ch === '\\' && i + 1 < pattern.length) {
      expandedPattern.push({ type: 'literal', value: pattern[i + 1] as string });
      i += 2;
    } else if (['#', 'A', 'a', '*', '?'].includes(ch)) {
      expandedPattern.push({ type: 'placeholder', value: ch });
      i++;
    } else {
      expandedPattern.push({ type: 'literal', value: ch });
      i++;
    }
  }

  if (str.length !== expandedPattern.length) {
    errors.push(
      `Pattern expects length ${expandedPattern.length}, got ${str.length}.`
    );
    return errors;
  }

  for (let pos = 0; pos < expandedPattern.length; pos++) {
    const token = expandedPattern[pos]!;
    const ch = str[pos] as string;

    if (token.type === 'literal') {
      if (ch !== token.value) {
        errors.push(
          `Position ${pos}: expected literal '${token.value}', got '${ch}'.`
        );
      }
    } else {
      switch (token.value) {
        case '#':
          if (!DIGIT_RE.test(ch)) {
            errors.push(`Position ${pos}: '#' expects a digit, got '${ch}'.`);
          }
          break;
        case 'A':
          if (!/[A-Z]/.test(ch)) {
            errors.push(`Position ${pos}: 'A' expects an uppercase letter, got '${ch}'.`);
          }
          break;
        case 'a':
          if (!LOWER_RE.test(ch)) {
            errors.push(`Position ${pos}: 'a' expects a lowercase letter, got '${ch}'.`);
          }
          break;
        case '?':
          if (!/[a-zA-Z0-9]/.test(ch)) {
            errors.push(`Position ${pos}: '?' expects an alphanumeric character, got '${ch}'.`);
          }
          break;
        case '*':
          // Any character is valid
          break;
      }
    }
  }

  return errors;
}
