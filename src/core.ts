/**
 * core.ts
 * Cryptographically secure, bias-free random byte generation.
 * Works in Node.js (>=18), browsers, Deno, and edge runtimes.
 */

/**
 * Returns a single cryptographically secure random byte (0–255).
 * Uses the Web Crypto API universally — available natively in
 * Node >=18, all modern browsers, Deno, Cloudflare Workers, etc.
 */
function getRandomByte(): number {
  const buf = new Uint8Array(1);
  crypto.getRandomValues(buf);
  return buf[0] as number;
}

/**
 * Returns a random character from `charset` with no modulo bias.
 *
 * Naive approach:  index = randomByte % charset.length
 * Problem:         If 256 is not evenly divisible by charset.length,
 *                  some characters appear slightly more often.
 *
 * Fix (rejection sampling):
 *   Compute the largest multiple of charset.length that fits in 0–255.
 *   Discard bytes >= that threshold and retry.
 *   Expected retries: < 1 per character for any charset <= 128 chars.
 */
export function getRandomChar(charset: string): string {
  const len = charset.length;
  // Largest multiple of `len` that fits in a byte (0–255 range)
  const maxValid = 256 - (256 % len);

  let byte: number;
  do {
    byte = getRandomByte();
  } while (byte >= maxValid);

  return charset[byte % len] as string;
}

/**
 * Fills an array of `count` random characters from `charset`.
 * Batches the crypto call for efficiency.
 */
export function getRandomChars(charset: string, count: number): string[] {
  const len = charset.length;
  const maxValid = 256 - (256 % len);
  const result: string[] = [];

  // Over-allocate to avoid multiple round trips; 40% buffer is generous
  // for any realistic charset size.
  const bufSize = Math.ceil(count * 1.4) + 32;
  const buf = new Uint8Array(bufSize);

  while (result.length < count) {
    crypto.getRandomValues(buf);
    for (let i = 0; i < buf.length && result.length < count; i++) {
      const byte = buf[i] as number;
      if (byte < maxValid) {
        result.push(charset[byte % len] as string);
      }
    }
    // Extremely unlikely to need a second pass, but handles edge cases
    // like a 1-char charset (which is blocked by validation anyway)
  }

  return result;
}
