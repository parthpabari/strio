/**
 * zod.ts
 * Zod schema factory for @ppabari/strio.
 *
 * Creates a `z.string()` schema that validates a string against strio
 * options. The Zod peer dependency is optional — import from the
 * subpath `@ppabari/strio/zod` only when Zod is available.
 *
 * @example
 * import { z } from 'zod';
 * import { randomStringSchema } from '@ppabari/strio/zod';
 *
 * const tokenSchema = randomStringSchema({
 *   length: 32,
 *   charset: 'base62',
 * });
 *
 * tokenSchema.parse('k3Xp9mQr2LzYw7NvTq8sHfGbJ5cD4eAK'); // ✓
 * tokenSchema.parse('short'); // throws ZodError
 *
 * // In a form schema
 * const UserSchema = z.object({
 *   id: randomStringSchema({ length: 12, charset: 'base58' }),
 *   apiKey: randomStringSchema({ length: 32 }),
 * });
 */

import type { ValidateOptions } from './types.js';
import { validateRandomString } from './validate.js';

/**
 * Options for building a Zod schema. A superset of ValidateOptions
 * with an extra `description` for the schema's `.describe()` call.
 */
export interface RandomStringSchemaOptions extends ValidateOptions {
  /** Optional human-readable description added to the Zod schema. */
  description?: string;
}

/**
 * A minimal type shim for the parts of Zod we need.
 * Avoids importing Zod at the type level so the module loads even when
 * Zod is not installed — errors only at runtime if you try to call this.
 */
interface ZodStringLike {
  refine(
    check: (val: string) => boolean,
    params: { message: string }
  ): ZodStringLike;
  describe(text: string): ZodStringLike;
}

interface ZodLike {
  string(): ZodStringLike;
}

/**
 * Create a Zod string schema that validates against strio's ValidateOptions.
 *
 * @param options - Validation rules (length, charset, required character types, etc.)
 * @param zod - The `z` object from zod. Pass explicitly to avoid a hard dependency.
 *
 * @example
 * import { z } from 'zod';
 * import { randomStringSchema } from '@ppabari/strio/zod';
 *
 * const schema = randomStringSchema({ length: 16, requireUppercase: true }, z);
 */
export function randomStringSchema(
  options: RandomStringSchemaOptions = {},
  zod?: ZodLike
): ZodStringLike {
  // Attempt to auto-import Zod if not provided — works in Node/bundler envs
  // Falls back gracefully with a helpful error if unavailable
  let z: ZodLike;

  if (zod) {
    z = zod;
  } else {
    try {
      // Use indirect eval to avoid TypeScript's require type check.
      // This is intentional: zod is an optional peer dependency.
      const req = (typeof globalThis !== 'undefined' &&
        (globalThis as Record<string, unknown>)['require']) as
        | ((id: string) => ZodLike)
        | undefined;
      z = req ? req('zod') : (() => { throw new Error('no require'); })();
    } catch {
      throw new Error(
        '@ppabari/strio: Zod is not installed. Run `npm install zod` or pass the `z` ' +
        'object explicitly: `randomStringSchema(options, z)`.'
      );
    }
  }

  const { description, ...validateOpts } = options;

  let schema = z.string().refine(
    (val: string) => {
      const result = validateRandomString(val, validateOpts);
      return result.valid;
    },
    {
      message: buildMessage(validateOpts),
    }
  );

  if (description) {
    schema = schema.describe(description);
  }

  return schema;
}

function buildMessage(opts: ValidateOptions): string {
  const parts: string[] = [];

  if (opts.length !== undefined) parts.push(`exactly ${opts.length} characters`);
  if (opts.minLength !== undefined) parts.push(`at least ${opts.minLength} characters`);
  if (opts.maxLength !== undefined) parts.push(`at most ${opts.maxLength} characters`);
  if (opts.requireNumeric) parts.push('at least one digit');
  if (opts.requireLowercase) parts.push('at least one lowercase letter');
  if (opts.requireUppercase) parts.push('at least one uppercase letter');
  if (opts.requireSymbols) parts.push('at least one symbol');
  if (opts.charset) parts.push(`only characters from '${opts.charset}'`);
  if (opts.pattern) parts.push(`matching pattern '${opts.pattern}'`);

  return parts.length > 0
    ? `String must contain ${parts.join(', ')}.`
    : 'Invalid string format.';
}
