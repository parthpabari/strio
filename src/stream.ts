/**
 * stream.ts
 * Async generator (iterator) API for memory-efficient bulk generation.
 *
 * Unlike the `count` option (which allocates a Set of N strings upfront),
 * the stream API yields strings one at a time — safe for generating
 * hundreds of thousands of IDs without blowing the heap.
 *
 * @example Basic usage
 * for await (const token of randomStringStream({ length: 24 })) {
 *   await db.insert({ token });
 * }
 * // Runs forever — break when done
 *
 * @example Generate exactly N
 * import { take } from '@ppabari/strio';
 * const ids = await take(randomStringStream({ length: 12 }), 10_000);
 *
 * @example Unique-only stream
 * const stream = uniqueRandomStringStream({ length: 8, charset: 'base36' });
 * for await (const id of stream) { ... }
 */

import type { RandomStringOptions } from './types.js';
import { generateOne } from './generator.js';

/**
 * Infinite async generator that yields random strings from the given options.
 * Each value is independently generated (not deduplicated).
 *
 * Use `take()` or a `break` statement to stop the stream.
 * For bulk operations, prefer `take(randomStringStream(opts), n)` over
 * the `count` option — it avoids allocating a full Set upfront.
 */
export async function* randomStringStream(
  options: RandomStringOptions = {}
): AsyncGenerator<string, never, unknown> {
  // Pre-validate options by generating one eagerly — surfaces config errors
  // before the consumer enters the loop.
  generateOne(options);

  while (true) {
    yield generateOne(options);
  }
}

/**
 * Infinite async generator that yields globally unique strings.
 * Deduplication is maintained via an in-memory Set.
 *
 * ⚠️  Memory grows with consumption. For very large sets (>1M), consider
 * a probabilistic structure (Bloom filter) or external dedup store instead.
 */
export async function* uniqueRandomStringStream(
  options: RandomStringOptions = {}
): AsyncGenerator<string, never, unknown> {
  const seen = new Set<string>();
  generateOne(options); // pre-validate

  while (true) {
    const candidate = generateOne(options);
    if (!seen.has(candidate)) {
      seen.add(candidate);
      yield candidate;
    }
  }
}

/**
 * Collect the first `n` values from any async iterable into an array.
 * Works with both `randomStringStream` and `uniqueRandomStringStream`.
 *
 * @example
 * const tokens = await take(randomStringStream({ length: 32 }), 500);
 * // → string[] of 500 tokens
 */
export async function take<T>(
  iterable: AsyncIterable<T>,
  n: number
): Promise<T[]> {
  if (n <= 0) return [];
  if (!Number.isInteger(n)) throw new Error('n must be a positive integer.');

  const results: T[] = [];
  for await (const value of iterable) {
    results.push(value);
    if (results.length >= n) break;
  }
  return results;
}

/**
 * Like `take`, but filters values through a predicate.
 * Pulls from the stream until `n` values satisfy `predicate`.
 *
 * @example
 * // Get 10 tokens that start with a digit
 * const tokens = await takeWhere(
 *   randomStringStream({ length: 12 }),
 *   10,
 *   t => /^[0-9]/.test(t)
 * );
 */
export async function takeWhere<T>(
  iterable: AsyncIterable<T>,
  n: number,
  predicate: (value: T) => boolean
): Promise<T[]> {
  if (n <= 0) return [];
  const results: T[] = [];
  for await (const value of iterable) {
    if (predicate(value)) {
      results.push(value);
      if (results.length >= n) break;
    }
  }
  return results;
}
