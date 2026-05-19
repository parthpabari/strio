/**
 * secrets.ts
 * Cryptographic secret and key generation utilities.
 *
 * Covers the full lifecycle of secrets used in real applications:
 *   - Raw bytes                   → generateBytes()
 *   - Hex keys (AES, ChaCha20)    → generateHexKey()
 *   - Base64 keys (cloud imports) → generateBase64Key()
 *   - JWT secrets (HS256/384/512) → generateJwtSecret()
 *   - Structured API keys         → generateApiKey()
 *   - Numeric OTP codes           → generateOtp()
 *   - Secret masking for logs     → maskSecret()
 *   - Constant-time comparison    → timingSafeEqual()
 *   - Framework secret helpers    → generateCookieSecret() etc.
 *
 * All functions use crypto.getRandomValues() — the same bias-free
 * engine as the rest of strio.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Fill a Uint8Array with cryptographically secure random bytes. */
function randomBytes(length: number): Uint8Array {
  if (length <= 0 || !Number.isInteger(length)) {
    throw new RangeError(`length must be a positive integer, got ${length}.`);
  }
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  return buf;
}

/** Encode a Uint8Array to a lowercase hex string. */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/** Encode a Uint8Array to standard base64 (with +/= padding). */
function bytesToBase64(bytes: Uint8Array): string {
  // btoa works on binary strings; works in Node 16+ and all browsers
  return btoa(String.fromCharCode(...bytes));
}

/** Encode a Uint8Array to base64url (RFC 4648 §5 — URL-safe, no padding). */
function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. generateBytes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate `n` cryptographically secure random bytes.
 * Returns a `Uint8Array` — the native format accepted by Web Crypto,
 * Node's `crypto`, and virtually every encryption library.
 *
 * @example
 * const key = generateBytes(32);           // 32-byte (256-bit) key material
 * await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);
 *
 * const iv = generateBytes(12);            // AES-GCM initialisation vector
 * const nonce = generateBytes(24);         // XSalsa20 nonce
 */
export function generateBytes(length: number): Uint8Array {
  return randomBytes(length);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. generateHexKey
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a random key of `bits` length, returned as a lowercase hex string.
 * The standard format for raw key material in most Node.js crypto libraries,
 * Redis ACL passwords, database encryption keys, and many cloud services.
 *
 * @param bits - Key size in bits. Must be a positive multiple of 8.
 *               Common values: 128, 192, 256 (AES), 512 (HMAC-SHA512).
 *
 * @example
 * generateHexKey(256)   // → 64-char hex  (AES-256 key)
 * generateHexKey(128)   // → 32-char hex  (AES-128 key)
 * generateHexKey(512)   // → 128-char hex (HMAC-SHA512 key)
 *
 * // Use directly with Node crypto:
 * const key = generateHexKey(256);
 * const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
 */
export function generateHexKey(bits: number = 256): string {
  if (bits <= 0 || bits % 8 !== 0) {
    throw new RangeError(`bits must be a positive multiple of 8, got ${bits}.`);
  }
  return bytesToHex(randomBytes(bits / 8));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. generateBase64Key
// ─────────────────────────────────────────────────────────────────────────────

export type Base64Variant = 'standard' | 'url-safe' | 'url-safe-no-pad';

/**
 * Generate a random key of `bits` length, returned as a base64 string.
 *
 * Three variants:
 * - `'standard'`          — includes `+`, `/`, `=` padding (AWS, most CLIs)
 * - `'url-safe'`          — replaces `+`→`-`, `/`→`_`, keeps `=` (cookies, headers)
 * - `'url-safe-no-pad'`   — same but no `=` padding (JWT, URL query params)
 *
 * @param bits - Key size in bits. Must be a positive multiple of 8.
 * @param variant - Output encoding variant. Default: `'url-safe-no-pad'`.
 *
 * @example
 * generateBase64Key(256)                          // → url-safe, no padding (default)
 * generateBase64Key(256, 'standard')              // → standard base64 with padding
 * generateBase64Key(256, 'url-safe')              // → url-safe with padding
 *
 * // AWS KMS / GCP import format:
 * const keyMaterial = generateBase64Key(256, 'standard');
 *
 * // Cookie signing secret (express-session, iron-session):
 * const secret = generateBase64Key(256, 'url-safe-no-pad');
 */
export function generateBase64Key(bits: number = 256, variant: Base64Variant = 'url-safe-no-pad'): string {
  if (bits <= 0 || bits % 8 !== 0) {
    throw new RangeError(`bits must be a positive multiple of 8, got ${bits}.`);
  }
  const bytes = randomBytes(bits / 8);

  switch (variant) {
    case 'standard':
      return bytesToBase64(bytes);
    case 'url-safe':
      return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_');
    case 'url-safe-no-pad':
      return bytesToBase64Url(bytes);
    default:
      throw new TypeError(`Unknown variant '${variant}'. Use 'standard', 'url-safe', or 'url-safe-no-pad'.`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. generateJwtSecret
// ─────────────────────────────────────────────────────────────────────────────

export type JwtAlgorithm = 'HS256' | 'HS384' | 'HS512';
export type JwtSecretFormat = 'base64url' | 'hex' | 'utf8-like';

/**
 * Minimum key sizes mandated by RFC 7518 §3.2:
 * The key must be at least as long as the hash output.
 */
const JWT_MIN_BITS: Record<JwtAlgorithm, number> = {
  HS256: 256,
  HS384: 384,
  HS512: 512,
};

export interface JwtSecretOptions {
  /**
   * HMAC algorithm this secret will be used with.
   * Determines the minimum key length enforced automatically.
   * @default 'HS256'
   */
  algorithm?: JwtAlgorithm;
  /**
   * Output format.
   * - `'base64url'`   — RFC 4648 §5, no padding. Default. Works with jsonwebtoken,
   *                     jose, @auth/core, NextAuth, Fastify JWT, Lucia.
   * - `'hex'`         — lowercase hex. Works with jose when you import as `'oct'`.
   * - `'utf8-like'`   — base62 string. Usable directly as a string secret in older
   *                     libraries that accept plain strings (not recommended for new code).
   * @default 'base64url'
   */
  format?: JwtSecretFormat;
  /**
   * Override the key size in bits. Must be ≥ the algorithm minimum.
   * Defaults to the algorithm's minimum (256 / 384 / 512).
   */
  bits?: number;
}

export interface JwtSecretResult {
  /** The secret value — pass this to your JWT library. */
  secret: string;
  /** Algorithm this secret was generated for. */
  algorithm: JwtAlgorithm;
  /** Actual key size in bits. */
  bits: number;
  /** Output format. */
  format: JwtSecretFormat;
  /**
   * Usage example string for the most common library (jsonwebtoken).
   * Handy for logging/debugging during setup.
   */
  example: string;
}

/**
 * Generate a cryptographically secure JWT signing secret.
 *
 * Enforces RFC 7518 minimum key lengths:
 *   - HS256 → minimum 256 bits (32 bytes)
 *   - HS384 → minimum 384 bits (48 bytes)
 *   - HS512 → minimum 512 bits (64 bytes)
 *
 * @example
 * // Default — HS256, base64url
 * const { secret } = generateJwtSecret();
 * jwt.sign(payload, secret, { algorithm: 'HS256' });
 *
 * // HS512 for maximum security
 * const { secret } = generateJwtSecret({ algorithm: 'HS512' });
 *
 * // For jose / @auth/core
 * const { secret } = generateJwtSecret({ algorithm: 'HS256', format: 'base64url' });
 * // Set as AUTH_SECRET env var for NextAuth v5
 *
 * // For libraries expecting hex
 * const { secret } = generateJwtSecret({ format: 'hex' });
 */
export function generateJwtSecret(options: JwtSecretOptions = {}): JwtSecretResult {
  const {
    algorithm = 'HS256',
    format = 'base64url',
    bits: bitsOverride,
  } = options;

  const minBits = JWT_MIN_BITS[algorithm];

  if (!minBits) {
    throw new TypeError(
      `Unknown algorithm '${algorithm}'. Supported: ${Object.keys(JWT_MIN_BITS).join(', ')}.`
    );
  }

  if (bitsOverride !== undefined && bitsOverride < minBits) {
    throw new RangeError(
      `${algorithm} requires at least ${minBits} bits. Got ${bitsOverride}. ` +
      `Use bits >= ${minBits} or omit the bits option.`
    );
  }

  const bits = bitsOverride ?? minBits;

  if (bits % 8 !== 0) {
    throw new RangeError(`bits must be a multiple of 8, got ${bits}.`);
  }

  const bytes = randomBytes(bits / 8);
  let secret: string;

  switch (format) {
    case 'base64url':
      secret = bytesToBase64Url(bytes);
      break;
    case 'hex':
      secret = bytesToHex(bytes);
      break;
    case 'utf8-like': {
      // Produce a base62 string of equivalent length — readable but high entropy
      const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      // Re-draw using crypto (simpler than reusing bytes with bias correction here)
      const charsNeeded = Math.ceil(bits / Math.log2(62));
      const resultChars: string[] = [];
      const maxValid = 256 - (256 % 62);
      const drawBuf = new Uint8Array(charsNeeded * 2); // over-allocate
      crypto.getRandomValues(drawBuf);
      for (const b of drawBuf) {
        if (b < maxValid) {
          resultChars.push(B62[b % 62]!);
          if (resultChars.length >= charsNeeded) break;
        }
      }
      secret = resultChars.join('');
      break;
    }
    default:
      throw new TypeError(`Unknown format '${format}'.`);
  }

  const example = format === 'base64url'
    ? `jwt.sign(payload, '${secret.slice(0, 8)}...', { algorithm: '${algorithm}' })`
    : `jwt.sign(payload, Buffer.from('${secret.slice(0, 8)}...', '${format === 'hex' ? 'hex' : 'utf8'}'), { algorithm: '${algorithm}' })`;

  return { secret, algorithm, bits, format, example };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. generateApiKey
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiKeyOptions {
  /**
   * Key type prefix, e.g. `'sk'` (secret key), `'pk'` (public key), `'tok'`.
   * @default 'sk'
   */
  type?: string;
  /**
   * Environment prefix, e.g. `'live'`, `'test'`, `'dev'`.
   * Omit to produce a key with no environment segment.
   */
  environment?: 'live' | 'test' | 'dev' | string;
  /**
   * Entropy of the random portion in bits.
   * @default 256
   */
  bits?: number;
  /**
   * Charset for the random portion.
   * @default 'base62'
   */
  charset?: 'base62' | 'base58' | 'hex' | string;
  /**
   * Separator between segments.
   * @default '_'
   */
  separator?: string;
}

export interface ApiKeyResult {
  /** The full API key string. */
  key: string;
  /** The prefix segment, e.g. `'sk_live'`. */
  prefix: string;
  /** Character count of the random portion (not including prefix or separator). */
  randomLength: number;
  /** Entropy of the random portion in bits. */
  bits: number;
}

/**
 * Generate a structured API key in the style of Stripe, GitHub, or OpenAI.
 *
 * Format: `{type}_{environment}_{randomPortion}`
 * e.g.    `strio_live_K3xP9mQr2LzYw7NvTq8sHfGbJ5cD4eAK3xP9mQr2LzY`
 *
 * @example
 * generateApiKey()
 * // → { key: 'strio_live_K3xP9mQr2LzYw7Nv...',  prefix: 'sk_live', ... }
 *
 * generateApiKey({ type: 'sk', environment: 'test', bits: 256 })
 * // → 'strio_test_K3xP9mQr...'
 *
 * generateApiKey({ type: 'tok', bits: 128 })
 * // → 'tok_K3xP9mQr2LzYw7Nv'
 *
 * generateApiKey({ type: 'pk', environment: 'live', charset: 'hex' })
 * // → 'pub_live_a3f7c2b9...'
 */
export function generateApiKey(options: ApiKeyOptions = {}): ApiKeyResult {
  const {
    type = 'sk',
    environment,
    bits = 256,
    charset = 'base62',
    separator = '_',
  } = options;

  if (bits <= 0 || bits % 8 !== 0) {
    throw new RangeError(`bits must be a positive multiple of 8, got ${bits}.`);
  }

  // Resolve charset
  const CHARSETS: Record<string, string> = {
    base62: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    base58: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
    hex:    '0123456789abcdef',
  };
  const cs = CHARSETS[charset] ?? charset;

  if (cs.length < 2) throw new TypeError(`charset '${charset}' resolves to fewer than 2 unique characters.`);

  // Calculate how many characters we need for the requested entropy
  const charsNeeded = Math.ceil(bits / Math.log2(cs.length));
  const maxValid = 256 - (256 % cs.length);

  // Draw characters with rejection sampling
  const randomChars: string[] = [];
  const buf = new Uint8Array(charsNeeded * 2 + 64); // generous over-allocation
  while (randomChars.length < charsNeeded) {
    crypto.getRandomValues(buf);
    for (const b of buf) {
      if (b < maxValid) {
        randomChars.push(cs[b % cs.length]!);
        if (randomChars.length >= charsNeeded) break;
      }
    }
  }
  const randomPortion = randomChars.join('');

  const prefixParts = [type, environment].filter(Boolean);
  const prefix = prefixParts.join(separator);
  const key = prefix + separator + randomPortion;

  return { key, prefix, randomLength: charsNeeded, bits };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. generateOtp
// ─────────────────────────────────────────────────────────────────────────────

export interface OtpOptions {
  /**
   * Number of digits in the OTP.
   * @default 6
   */
  digits?: number;
  /**
   * Whether to allow a leading zero.
   * Set to `false` to ensure the first digit is 1–9 (e.g. for display in SMS).
   * @default true
   */
  allowLeadingZero?: boolean;
}

export interface OtpResult {
  /** The OTP as a zero-padded string (e.g. `'048392'`). */
  code: string;
  /** The OTP as a number (e.g. `48392`). */
  value: number;
  /** Number of digits. */
  digits: number;
}

/**
 * Generate a cryptographically secure numeric OTP (one-time password).
 * Uses modular arithmetic on a secure random integer — no modulo bias
 * for digit counts up to 9 (10^9 < 2^30 < 2^32, safe in float64).
 *
 * @example
 * generateOtp()              // → { code: '483920', value: 483920, digits: 6 }
 * generateOtp({ digits: 8 }) // → { code: '04839201', value: 4839201, digits: 8 }
 *
 * // SMS-friendly (no leading zero)
 * generateOtp({ allowLeadingZero: false })
 *
 * // Use just the code string
 * const { code } = generateOtp();
 * await sms.send(phone, `Your code is ${code}`);
 */
export function generateOtp(options: OtpOptions = {}): OtpResult {
  const { digits = 6, allowLeadingZero = true } = options;

  if (digits < 1 || digits > 10) {
    throw new RangeError(`digits must be between 1 and 10, got ${digits}.`);
  }

  const max = Math.pow(10, digits);

  // Use float64 division to avoid 32-bit overflow.
  // digits <= 9: max <= 10^9 < 2^32 — single 32-bit sample is sufficient.
  // digits == 10: max = 10^10 > 2^32 — use 5 bytes (40 bits, 2^40 > 10^10).
  let n: number;

  if (digits <= 9) {
    const maxValid = Math.floor(4294967296 / max) * max; // float64, no overflow
    const buf = new Uint8Array(4);
    do {
      crypto.getRandomValues(buf);
      n = ((buf[0]! << 24) | (buf[1]! << 16) | (buf[2]! << 8) | buf[3]!) >>> 0;
    } while (n >= maxValid);
  } else {
    // digits === 10: 2^40 = 1_099_511_627_776 > 10_000_000_000
    const RANGE40 = 1099511627776;
    const maxValid40 = Math.floor(RANGE40 / max) * max;
    const buf = new Uint8Array(5);
    do {
      crypto.getRandomValues(buf);
      n = buf[0]! * 4294967296 +
          (((buf[1]! << 24) | (buf[2]! << 16) | (buf[3]! << 8) | buf[4]!) >>> 0);
    } while (n >= maxValid40);
  }

  let value = n % max;

  // If leading zeros are not allowed, re-draw until first digit is non-zero.
  // Much simpler and provably unbiased — rejection probability ≤ 1/10 per draw.
  if (!allowLeadingZero && digits > 1) {
    const minValue = Math.pow(10, digits - 1); // e.g. 100000 for 6 digits
    // Re-use the same sampling path to draw a fresh value in [minValue, max)
    if (value < minValue) {
      const range = max - minValue; // e.g. 900000 for 6 digits
      if (digits <= 9) {
        const maxValid = Math.floor(4294967296 / range) * range;
        const buf2 = new Uint8Array(4);
        let m: number;
        do {
          crypto.getRandomValues(buf2);
          m = ((buf2[0]! << 24) | (buf2[1]! << 16) | (buf2[2]! << 8) | buf2[3]!) >>> 0;
        } while (m >= maxValid);
        value = minValue + (m % range);
      } else {
        const RANGE40 = 1099511627776;
        const maxValid40 = Math.floor(RANGE40 / range) * range;
        const buf2 = new Uint8Array(5);
        let m: number;
        do {
          crypto.getRandomValues(buf2);
          m = buf2[0]! * 4294967296 +
              (((buf2[1]! << 24) | (buf2[2]! << 16) | (buf2[3]! << 8) | buf2[4]!) >>> 0);
        } while (m >= maxValid40);
        value = minValue + (m % range);
      }
    }
  }

  const code = value.toString().padStart(digits, '0');

  return { code, value, digits };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. maskSecret
// ─────────────────────────────────────────────────────────────────────────────

export interface MaskSecretOptions {
  /**
   * Number of characters to reveal at the start of the secret.
   * `0` reveals nothing (prefix only).
   * @default 0 (show prefix only, mask everything else)
   */
  visibleStart?: number;
  /**
   * Number of characters to reveal at the end.
   * @default 4
   */
  visibleEnd?: number;
  /**
   * Character used to mask the hidden portion.
   * @default '*'
   */
  maskChar?: string;
  /**
   * Minimum number of mask characters shown, regardless of secret length.
   * Prevents inferring length from short secrets.
   * @default 4
   */
  minMaskLength?: number;
  /**
   * Maximum mask characters shown (caps a very long mask).
   * @default 8
   */
  maxMaskLength?: number;
  /**
   * Known prefix segments to preserve literally before masking begins.
   * e.g. `['strio_live_', 'strio_test_']` — the prefix is kept, the rest is masked.
   * If the secret starts with one of these, the prefix is shown and
   * `visibleStart` is counted from after the prefix.
   */
  knownPrefixes?: string[];
}

/**
 * Mask a secret string for safe logging, display, or debugging.
 * Preserves enough context to identify the key without exposing it.
 *
 * @example
 * maskSecret('myapp_live_K3xP9mQr2LzYw7NvTq8sHfGb')
 * // → 'strio_live_****...w7Nv'  (auto-detects 'strio_live_' prefix)
 *
 * maskSecret('supersecretpassword')
 * // → '****...word'
 *
 * maskSecret('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.abc123')
 * // → '****...123'
 *
 * // Custom reveal
 * maskSecret('myapp_live_K3xP9mQr2LzY', { visibleEnd: 6 })
 * // → 'strio_live_****...LzY'
 */
export function maskSecret(secret: string, options: MaskSecretOptions = {}): string {
  if (!secret) return '';

  const {
    visibleStart = 0,
    visibleEnd = 4,
    maskChar = '*',
    minMaskLength = 4,
    maxMaskLength = 8,
    knownPrefixes = [
      'strio_live_', 'strio_test_', 'strio_dev_',
      'myapp_live_', 'myapp_test_', 'myapp_dev_',
      'tok_', 'api_', 'key_',
    ],
  } = options;

  let prefix = '';
  let payload = secret;

  // Check for known prefixes
  for (const kp of knownPrefixes) {
    if (secret.startsWith(kp)) {
      prefix = kp;
      payload = secret.slice(kp.length);
      break;
    }
  }

  const totalLen = payload.length;
  const showStart = Math.min(visibleStart, totalLen);
  const showEnd = Math.min(visibleEnd, totalLen - showStart);
  const hiddenLen = totalLen - showStart - showEnd;

  if (hiddenLen <= 0) {
    // Secret too short to meaningfully mask — show prefix + full mask
    return prefix + maskChar.repeat(minMaskLength);
  }

  const maskLen = Math.max(minMaskLength, Math.min(maxMaskLength, hiddenLen));
  const mask = maskChar.repeat(maskLen);

  const startPart = showStart > 0 ? payload.slice(0, showStart) : '';
  const endPart = showEnd > 0 ? payload.slice(totalLen - showEnd) : '';

  return `${prefix}${startPart}${mask}...${endPart}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. timingSafeEqual
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compare two strings or byte arrays in constant time.
 * Prevents timing attacks where an attacker infers secret content by
 * measuring how long a comparison takes.
 *
 * **Always use this instead of `===` when comparing tokens, secrets,
 * HMAC signatures, or any security-sensitive value.**
 *
 * The comparison time is proportional to `max(a.length, b.length)` —
 * it does not short-circuit on mismatch.
 *
 * @returns `true` if the values are identical, `false` otherwise.
 *
 * @example
 * // Comparing incoming token against stored token
 * if (!timingSafeEqual(incomingToken, storedToken)) {
 *   throw new Error('Invalid token');
 * }
 *
 * // Also works with Uint8Array (e.g. HMAC comparison)
 * const valid = timingSafeEqual(computedHmac, expectedHmac);
 */
export function timingSafeEqual(
  a: string | Uint8Array,
  b: string | Uint8Array
): boolean {
  // Normalise to Uint8Array using UTF-8 encoding for strings
  const encoder = new TextEncoder();
  const bufA: Uint8Array = typeof a === 'string' ? encoder.encode(a) : a;
  const bufB: Uint8Array = typeof b === 'string' ? encoder.encode(b) : b;

  const len = Math.max(bufA.length, bufB.length);

  // Pad both to equal length to prevent length-based timing leaks
  const padA = new Uint8Array(len);
  const padB = new Uint8Array(len);
  padA.set(bufA);
  padB.set(bufB);

  // XOR every byte — accumulate differences with OR
  let diff = bufA.length === bufB.length ? 0 : 1; // length mismatch = fail
  for (let i = 0; i < len; i++) {
    diff |= (padA[i]! ^ padB[i]!);
  }

  return diff === 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Framework-specific convenience helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a cookie signing secret for session libraries.
 *
 * Compatible with:
 *   - express-session (`secret` option)
 *   - iron-session (`password` option)
 *   - lucia (`sessionCookieOptions.password`)
 *   - cookie-signature
 *
 * Returns a 256-bit base64url string by default — long enough to resist
 * brute force while remaining pasteable in .env files.
 *
 * @example
 * // express-session
 * app.use(session({ secret: generateCookieSecret() }));
 *
 * // iron-session
 * const sessionOptions = { password: generateCookieSecret(), cookieName: 'session' };
 *
 * // .env usage
 * console.log(`COOKIE_SECRET="${generateCookieSecret()}"`);
 */
export function generateCookieSecret(bits: number = 256): string {
  if (bits < 128) throw new RangeError('Cookie secret should be at least 128 bits.');
  return generateBase64Key(bits, 'url-safe-no-pad');
}

/**
 * Generate an encryption key suitable for AES-GCM or AES-CBC.
 *
 * @param keySize - `128`, `192`, or `256` bits. Default: 256.
 * @param format  - `'hex'` (default) or `'base64'` or `'bytes'`.
 *
 * @example
 * generateAesKey()             // → 64-char hex (AES-256)
 * generateAesKey(128)          // → 32-char hex (AES-128)
 * generateAesKey(256, 'base64') // → base64url string
 * generateAesKey(256, 'bytes') // → Uint8Array
 */
export function generateAesKey(keySize: 128 | 192 | 256 = 256, format: 'hex' | 'base64' | 'bytes' = 'hex'): string | Uint8Array {
  const bytes = randomBytes(keySize / 8);
  if (format === 'bytes') return bytes;
  if (format === 'hex') return bytesToHex(bytes);
  return bytesToBase64Url(bytes);
}

/**
 * Generate a secret for Next.js / NextAuth / Auth.js.
 * Sets AUTH_SECRET in your .env file — used to sign JWTs and cookies.
 * Output matches what `npx auth secret` generates.
 *
 * @example
 * const secret = generateNextAuthSecret();
 * console.log(`AUTH_SECRET="${secret}"`);
 */
export function generateNextAuthSecret(): string {
  return generateBase64Key(256, 'url-safe-no-pad');
}

/**
 * Generate a Django SECRET_KEY compatible string.
 * Django expects a long random string of printable ASCII characters —
 * at least 50 characters, no restrictions beyond that.
 *
 * @example
 * const key = generateDjangoSecretKey();
 * console.log(`SECRET_KEY="${key}"`);
 */
export function generateDjangoSecretKey(): string {
  // Django uses a broad ASCII charset in its own generator
  const DJANGO_CHARS =
    'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*(-_=+)ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const length = 64; // matches Django's default
  const maxValid = 256 - (256 % DJANGO_CHARS.length);
  const chars: string[] = [];
  const buf = new Uint8Array(length * 2);
  while (chars.length < length) {
    crypto.getRandomValues(buf);
    for (const b of buf) {
      if (b < maxValid) {
        chars.push(DJANGO_CHARS[b % DJANGO_CHARS.length]!);
        if (chars.length >= length) break;
      }
    }
  }
  return chars.join('');
}

/**
 * Generate a Rails / rack secret_key_base compatible string.
 * Rails expects a 128+ character hex string for its key base.
 *
 * @example
 * const key = generateRailsSecretKeyBase();
 * console.log(`SECRET_KEY_BASE="${key}"`);
 */
export function generateRailsSecretKeyBase(): string {
  return generateHexKey(512); // 128-char hex = 512-bit key
}
