/**
 * seeded.ts
 * Deterministic pseudo-random string generation using xoshiro128**.
 *
 * ⚠️  NOT CRYPTOGRAPHICALLY SECURE. Seeded mode is for:
 *   - Reproducible test fixtures
 *   - Snapshot testing
 *   - Demos and consistent example output
 *
 * Never use a seeded string as a security token, password, or secret.
 *
 * Implementation notes:
 *   - Uses xoshiro128** — four 32-bit words, easy to implement correctly in JS
 *   - Rejection sampling uses floating-point division (avoids uint64 overflow)
 *   - maxValid = floor(2^32 / len) * len, computed in float64 (exact up to 2^53)
 */

/** Four 32-bit state words for xoshiro128**. */
type State = [number, number, number, number];

function rotl32(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

/**
 * Hash a seed string into 4 × 32-bit state words using a simple
 * multiplicative hash with good avalanche (splitmix-style).
 */
function seedState(seed: string): State {
  // Two starting hash lanes from the seed string
  let a = 0x9e3779b9 >>> 0;
  let b = 0x6c62272e >>> 0;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    a = (Math.imul(a ^ ch, 0x9e3779b9) + 0x52c09e4d) >>> 0;
    b = (Math.imul(b ^ ch, 0x85ebca6b) + 0xc2b2ae35) >>> 0;
  }

  // Expand into 4 words with splitmix32-style finalisation
  function sm32(v: number): number {
    v = (Math.imul(v ^ (v >>> 16), 0x45d9f3b) + 0x1b873593) >>> 0;
    v = (Math.imul(v ^ (v >>> 16), 0x45d9f3b) + 0xe6546b64) >>> 0;
    return (v ^ (v >>> 16)) >>> 0;
  }

  return [
    sm32(a),
    sm32(b),
    sm32(a ^ 0xdeadbeef),
    sm32(b ^ 0xbaadf00d),
  ];
}

/**
 * Advance xoshiro128** and return a uint32 in [0, 2^32).
 */
function nextUint32(s: State): number {
  const result = Math.imul(rotl32(Math.imul(s[1]!, 5) >>> 0, 7), 9) >>> 0;
  const t = (s[1]! << 9) >>> 0;

  s[2] = (s[2]! ^ s[0]!) >>> 0;
  s[3] = (s[3]! ^ s[1]!) >>> 0;
  s[1] = (s[1]! ^ s[2]!) >>> 0;
  s[0] = (s[0]! ^ s[3]!) >>> 0;
  s[2] = (s[2]! ^ t) >>> 0;
  s[3] = rotl32(s[3]!, 11);

  return result;
}

/**
 * Return a random character from `charset` using rejection sampling.
 *
 * maxValid is computed as: floor(2^32 / len) * len
 * All arithmetic stays in float64 (safe up to 2^53), so no overflow
 * regardless of charset length.
 */
function seededChar(charset: string, state: State): string {
  const len = charset.length;
  // Use float64 to avoid 32-bit overflow: floor(4294967296 / len) * len
  const maxValid = Math.floor(4294967296 / len) * len;
  let n: number;
  do {
    n = nextUint32(state);
  } while (n >= maxValid);
  return charset[n % len]!;
}

export interface SeededGeneratorOptions {
  /** Deterministic seed — same seed + charset + length → same output always. */
  seed: string;
  /** Character pool to draw from. */
  charset: string;
  /** Number of characters to generate. */
  length: number;
}

/**
 * Generate a deterministic string from a seed.
 *
 * @example
 * generateSeeded({ seed: 'test-42', charset: 'abc123', length: 8 })
 * // Always returns the exact same string for these inputs
 *
 * @example Use in tests
 * const id = generateSeeded({ seed: 'fixture', charset: base62, length: 16 });
 * expect(id).toMatchInlineSnapshot('"3Xp9mQr2LzYw7NvT"');
 */
export function generateSeeded({ seed, charset, length }: SeededGeneratorOptions): string {
  const state = seedState(seed);
  const chars: string[] = [];
  for (let i = 0; i < length; i++) {
    chars.push(seededChar(charset, state));
  }
  return chars.join('');
}
