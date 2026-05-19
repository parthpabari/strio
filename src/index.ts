/**
 * @ppabari/strio
 *
 * Cryptographically secure string generation for Node.js and browsers.
 * Zero dependencies. Fully typed. Bias-free.
 */

import type { RandomStringOptions } from './types.js';
import { generateOne, generateBatch } from './generator.js';

export function generateRandomString(options?: RandomStringOptions & { count?: 1 }): string;
export function generateRandomString(options: RandomStringOptions & { count: number }): string[];
export function generateRandomString(options: RandomStringOptions = {}): string | string[] {
  const { count = 1, ...rest } = options;
  if (count === 1) return generateOne(rest);
  return generateBatch(rest, count);
}

export async function generateRandomStringAsync(
  options: RandomStringOptions = {}
): Promise<string | string[]> {
  await Promise.resolve();
  const { count = 1, ...rest } = options;
  if (count === 1) return generateOne(rest);
  return generateBatch(rest, count);
}

export {
  generateId,
  validateId,
  type ShortIdOptions,
  type ShortIdValidateOptions,
  type ShortIdValidateResult,
} from './short-id.js';

export {
  generateExpiringToken,
  verifyToken,
  type ExpiringTokenOptions,
  type ExpiringTokenResult,
  type TokenVerifyResult,
} from './expiring-token.js';

export {
  randomStringStream,
  uniqueRandomStringStream,
  take,
  takeWhere,
} from './stream.js';

export {
  generatePassphrase,
  BUILT_IN_WORD_LIST,
  type PassphraseOptions,
  type PassphraseResult,
} from './passphrase.js';

export { estimateEntropy } from './entropy.js';
export { validateRandomString } from './validate.js';

export {
  CHARSET_ALIASES,
  resolveCharsetAlias,
  type CharsetAlias,
} from './charset-aliases.js';

export { PRESETS, type PresetName } from './presets.js';

export {
  randomStringSchema,
  type RandomStringSchemaOptions,
} from './zod.js';

export type {
  RandomStringOptions,
  RandomStringResult,
  StartWith,
  ValidateOptions,
  ValidationResult,
  EntropyResult,
} from './types.js';
// ---------------------------------------------------------------------------
// Secrets & key generation
// ---------------------------------------------------------------------------
export {
  generateBytes,
  generateHexKey,
  generateBase64Key,
  generateJwtSecret,
  generateApiKey,
  generateOtp,
  maskSecret,
  timingSafeEqual,
  generateCookieSecret,
  generateAesKey,
  generateNextAuthSecret,
  generateDjangoSecretKey,
  generateRailsSecretKeyBase,
  type Base64Variant,
  type JwtAlgorithm,
  type JwtSecretFormat,
  type JwtSecretOptions,
  type JwtSecretResult,
  type ApiKeyOptions,
  type ApiKeyResult,
  type OtpOptions,
  type OtpResult,
  type MaskSecretOptions,
} from './secrets.js';
