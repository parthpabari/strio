/**
 * types.ts
 * All public TypeScript types and interfaces.
 */

/** Which character category the first character must belong to. */
export type StartWith = 'alphabet' | 'numeric' | 'any';

/**
 * Options for `generateRandomString` and `generateRandomStringAsync`.
 *
 * Character pool is built from the enabled flags, then reduced
 * by any `exclude` characters. You may also pass a fully custom
 * `charset` which bypasses all flags.
 */
export interface RandomStringOptions {
  /**
   * Total length of the generated string (including prefix/suffix).
   * The random portion will be `length - prefix.length - suffix.length`.
   * @default 16
   */
  length?: number;

  /** Include digits 0–9. @default true */
  numeric?: boolean;

  /** Include lowercase a–z. @default true */
  lowercase?: boolean;

  /** Include uppercase A–Z. @default true */
  uppercase?: boolean;

  /** Include symbols `!@#$%^&*()_+[]{}<>?`. @default false */
  symbols?: boolean;

  /**
   * Exclude specific characters from the pool.
   * Useful for removing visually ambiguous chars like `0`, `O`, `l`, `I`, `1`.
   * Applied after charset construction; must not eliminate the entire pool.
   */
  exclude?: string | string[];

  /**
   * Shorthand for `exclude: ['0','O','l','I','1']`.
   * Produces strings that are easy to read and transcribe.
   * @default false
   */
  readable?: boolean;

  /**
   * Fully custom character pool. Overrides `numeric`, `lowercase`,
   * `uppercase`, `symbols`, and `readable`. Duplicate characters are
   * removed automatically. Must have at least 2 unique characters.
   */
  charset?: string;

  /**
   * Constrain the first character of the random portion.
   * - `'alphabet'` — must be a–z or A–Z (whichever are enabled)
   * - `'numeric'`  — must be 0–9
   * - `'any'`      — no constraint
   * @default 'any'
   */
  startWith?: StartWith;

  /**
   * Fixed string prepended to the result. Does not count toward
   * the random entropy; the random portion shrinks accordingly so
   * the total length stays at `length`.
   * @example `{ prefix: 'usr_', length: 20 }` → `'usr_' + 16 random chars`
   */
  prefix?: string;

  /**
   * Fixed string appended to the result. Same length accounting as `prefix`.
   */
  suffix?: string;

  /**
   * Pattern string where special placeholders are replaced with random chars.
   * When `pattern` is set, `length` is ignored.
   *
   * Placeholders:
   * - `#` → random digit (0–9)
   * - `A` → random uppercase letter
   * - `a` → random lowercase letter
   * - `*` → random char from the full enabled charset
   * - `?` → random alphanumeric char
   *
   * Escape a literal placeholder with a backslash: `\#` → `#`
   *
   * @example `{ pattern: '####-AAAA-####' }` → `'4821-KXPZ-0937'`
   * @example `{ pattern: 'usr_**********' }` → `'usr_k3Xp9mQr2L'`
   */
  pattern?: string;

  /**
   * Generate multiple unique strings in a single call.
   * Returns a `string[]` instead of `string` when > 1.
   * Uniqueness is guaranteed; throws if `count` exceeds the
   * theoretical maximum unique combinations for the given config.
   * @default 1
   */
  count?: number;

  /**
   * Deterministic seed for reproducible output.
   * Same seed + same options = same string every time.
   *
   * ⚠️  NOT cryptographically secure. Use only for tests,
   * snapshots, and demos — never for real tokens or secrets.
   *
   * When `seed` is set the crypto engine is bypassed entirely.
   */
  seed?: string;
}

/** Result type: single string when count=1 (default), array when count>1. */
export type RandomStringResult<T extends RandomStringOptions> =
  T extends { count: infer C }
    ? C extends 1
      ? string
      : C extends number
        ? string[]
        : string
    : string;

/** Options for `validateRandomString`. */
export interface ValidateOptions {
  /** Minimum length (inclusive). */
  minLength?: number;
  /** Maximum length (inclusive). */
  maxLength?: number;
  /** Exact length. */
  length?: number;
  /** Must contain at least one digit. */
  requireNumeric?: boolean;
  /** Must contain at least one lowercase letter. */
  requireLowercase?: boolean;
  /** Must contain at least one uppercase letter. */
  requireUppercase?: boolean;
  /** Must contain at least one symbol. */
  requireSymbols?: boolean;
  /** All characters must belong to this set. */
  charset?: string;
  /** Pattern the string must match (same syntax as generation pattern). */
  pattern?: string;
}

/** Result from `validateRandomString`. */
export interface ValidationResult {
  /** Whether the string passes all checks. */
  valid: boolean;
  /** List of rule violations. Empty when `valid` is true. */
  errors: string[];
}

/** Result from `estimateEntropy`. */
export interface EntropyResult {
  /** Shannon entropy in bits. */
  bits: number;
  /** Human-readable strength label. */
  strength: 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong';
  /** Charset size used in the calculation. */
  charsetSize: number;
  /** Effective random length (excluding prefix/suffix). */
  effectiveLength: number;
  /** Approximate number of possible combinations (as a string to avoid overflow). */
  combinations: string;
}
