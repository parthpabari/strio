# @ppabari/strio

Cryptographically secure string generation for Node.js and browsers.  
Tokens · IDs · Passphrases · Patterns · Expiring tokens — bias-free, zero dependencies, fully typed.

[![npm](https://img.shields.io/npm/v/@ppabari/strio)](https://www.npmjs.com/package/@ppabari/strio)
[![license](https://img.shields.io/npm/l/@ppabari/strio)](./LICENSE)
[![tests](https://img.shields.io/github/actions/workflow/status/ppabari/strio/ci.yml?label=tests)](https://github.com/ppabari/strio/actions)

---

## Install

```bash
npm install @ppabari/strio
# or
pnpm add @ppabari/strio
# or
yarn add @ppabari/strio
```

## Quick Start

```ts
import {
  generateRandomString,
  generateId,
  generateExpiringToken,
  generatePassphrase,
  PRESETS,
} from '@ppabari/strio';

// 32-char API token
generateRandomString({ length: 32 });

// Named preset
generateRandomString(PRESETS.TOKEN);

// Prefixed record ID with checksum
generateId({ prefix: 'usr' }); // → 'usr_K3xP9mQr2L4Xc'

// Magic-link token, expires in 15 min
const { token, expiresAt } = generateExpiringToken({ ttlSeconds: 900 });

// Human-memorable passphrase
generatePassphrase({ words: 4 }); // → 'stone-river-proud-flame'
```

---

## CLI

```bash
npx @ppabari/strio                          # 16-char default
npx @ppabari/strio --length 32
npx @ppabari/strio --preset TOKEN
npx @ppabari/strio --preset PASSWORD --count 5
npx @ppabari/strio --pattern "####-AAAA-####"
npx @ppabari/strio --charset base58 --length 22
npx @ppabari/strio --passphrase --words 5 --capitalize
npx @ppabari/strio --id --prefix usr
npx @ppabari/strio --expiring --ttl 900
npx @ppabari/strio --entropy --preset PASSWORD
npx @ppabari/strio --help
```

---

## Core API

### `generateRandomString(options?)`

```ts
generateRandomString({
  length: 16,          // total length (default: 16)
  numeric: true,       // include 0–9
  lowercase: true,     // include a–z
  uppercase: true,     // include A–Z
  symbols: false,      // include !@#$%^&*...
  readable: false,     // exclude ambiguous: 0 O l I 1
  exclude: 'aeiou',    // exclude specific chars (string or array)
  charset: 'base62',   // named alias OR raw char string (overrides flags)
  startWith: 'any',    // 'any' | 'alphabet' | 'numeric'
  prefix: 'tok_',      // prepend fixed string (random portion shrinks)
  suffix: '_v2',       // append fixed string
  pattern: '####-AAAA',// pattern mode (see below)
  count: 1,            // >1 returns string[]
  seed: 'fixture-42',  // deterministic mode (NOT secure — tests only)
});
```

Returns `string` when `count` is 1; `string[]` when `count > 1`.

### `generateRandomStringAsync(options?)`

Same as above, returns a `Promise`. Non-blocking for server use.

---

## Named Charset Aliases

Pass any alias as the `charset` option — no need to copy-paste character sets:

```ts
generateRandomString({ charset: 'base58', length: 22 });
generateRandomString({ charset: 'base62', length: 32 });
generateRandomString({ charset: 'base64url', length: 24 });
```

| Alias | Characters | Use for |
|---|---|---|
| `base16` / `hex` | `0-9a-f` | Hashes, color codes |
| `base32` | `A-Z 2-7` | OTP secrets, case-insensitive tokens |
| `base36` | `0-9a-z` | Short URLs, number conversions |
| `base58` | No `0/O/I/l` | Bitcoin-style, human-safe tokens |
| `base62` | `0-9A-Za-z` | Max-density alphanumeric |
| `base64url` | `0-9A-Za-z-_` | JWT components, URL tokens |
| `crockford32` | No `I/L/O/U` | Serial numbers, redemption codes |
| `alphanumeric` | Alias for `base62` | |
| `alpha` | `A-Za-z` | Letters only |
| `numeric` | `0-9` | Digits only |

---

## Presets

```ts
import { generateRandomString, PRESETS } from '@ppabari/strio';

generateRandomString(PRESETS.TOKEN);        // 32-char alphanumeric
generateRandomString(PRESETS.PASSWORD);     // 20-char with symbols
generateRandomString(PRESETS.READABLE);     // 16-char, no ambiguous chars
generateRandomString(PRESETS.SLUG);         // 12-char lowercase slug
generateRandomString(PRESETS.HEX);          // 32-char hex
generateRandomString(PRESETS.PIN);          // 6-digit PIN, no leading zero
generateRandomString(PRESETS.SHORT_ID);     // 8-char uppercase, starts with letter
generateRandomString(PRESETS.INVITE_CODE);  // 'KXPZ-9MR2-LQ4Y-8WVN'
```

Spread to customise:

```ts
generateRandomString({ ...PRESETS.TOKEN, length: 64 });
generateRandomString({ ...PRESETS.TOKEN, count: 10 });
```

---

## Pattern Mode

```ts
// Placeholders: # digit  A uppercase  a lowercase  * any  ? alphanumeric
generateRandomString({ pattern: '####-AAAA-####' });   // '4821-KXPZ-0937'
generateRandomString({ pattern: '(###) ###-####' });   // '(415) 629-0837'
generateRandomString({ pattern: 'usr_************' }); // 'usr_k3Xp9mQr2LzY'
generateRandomString({ pattern: '\\#\\A-literal' });   // '#A-literal'
```

---

## Short IDs with Checksum

Collision-resistant IDs with a Luhn-style checksum character — detects single-character transcription errors without a database lookup.

```ts
import { generateId, validateId } from '@ppabari/strio';

const id = generateId({ prefix: 'usr' });
// → 'usr_K3xP9mQr2L4Xc'

const id2 = generateId({ prefix: 'inv', randomLength: 8 });
// → 'inv_K3xP9mQrc'

// Validate integrity
const result = validateId(id, { prefix: 'usr' });
result.valid;   // true

// Detect a typo
const typo = 'usr_K3xP9mQr2L4Xa';   // last char changed
validateId(typo, { prefix: 'usr' }).valid; // false — checksum mismatch

// Options
generateId({
  prefix: 'org',          // prepended with separator
  separator: '-',         // default '_'
  randomLength: 12,       // random portion length (default 12)
  charset: 'base58',      // alias or raw string (default 'base58')
  checksum: true,         // append checksum char (default true)
});
```

---

## Expiring Tokens

Self-expiring tokens for password resets, magic links, and OTP fallbacks.  
No HMAC — the expiry is encoded directly in the token. Combine with a server-side store if you need revocation.

```ts
import { generateExpiringToken, verifyToken } from '@ppabari/strio';

// Generate
const { token, expiresAt } = generateExpiringToken({
  ttlSeconds: 900,     // 15 minutes (default)
  payloadLength: 24,   // random portion length (default 24)
});

// Token format: [8-char base62 expiry][random payload]
// Total length: 8 + payloadLength

// Verify
const result = verifyToken(token);
result.valid;            // true / false
result.expired;          // boolean
result.expiresAt;        // Date | null
result.secondsRemaining; // number | null

if (!result.valid) {
  if (result.expired) throw new Error('Token expired');
  throw new Error('Invalid token format');
}
```

---

## Stream / Iterator API

Memory-efficient bulk generation — yields one string at a time without allocating everything upfront.

```ts
import { randomStringStream, uniqueRandomStringStream, take, takeWhere } from '@ppabari/strio';

// Infinite stream — use take() or break to stop
for await (const token of randomStringStream({ length: 24 })) {
  await db.insert({ token });
  if (done) break;
}

// Collect N items
const tokens = await take(randomStringStream({ length: 24 }), 10_000);

// Unique-only stream (deduplicates in memory)
const ids = await take(uniqueRandomStringStream({ length: 8, charset: 'base36' }), 1_000);

// Filter stream
const alphaStart = await takeWhere(
  randomStringStream({ length: 12 }),
  50,
  t => /^[a-zA-Z]/.test(t)
);
```

---

## Passphrase Generator

```ts
import { generatePassphrase } from '@ppabari/strio';

const { passphrase, wordCount, entropyBits } = generatePassphrase({
  words: 4,             // number of words (default 4)
  separator: '-',       // word separator (default '-')
  capitalize: false,    // capitalize first letter of each word
  appendDigit: false,   // append a random digit
  customWords: [...],   // custom word list (optional)
});

// Examples
generatePassphrase();
// → 'stone-river-proud-flame'   (~51 bits)

generatePassphrase({ words: 5, separator: ' ', capitalize: true });
// → 'Stone River Proud Flame Beach'   (~63 bits)

generatePassphrase({ words: 4, appendDigit: true });
// → 'stone-river-proud-flame7'
```

**Entropy by word count** (512-word list):

| Words | Entropy |
|-------|---------|
| 3 | ~27 bits |
| 4 | ~36 bits |
| 5 | ~45 bits |
| 6 | ~54 bits |

---

## Seeded / Deterministic Mode

For tests, snapshots, and demos. Same seed + options = same string every time.

```ts
generateRandomString({ length: 16, seed: 'test-fixture-42' });
// Always: 'N4fHqR7kVp2wXmYs'

// Great for snapshot tests:
expect(generateRandomString({ length: 12, seed: 'user-test' }))
  .toMatchInlineSnapshot('"7kVp2wXmYs4f"');
```

> ⚠️ **Not cryptographically secure.** Uses xoshiro128** PRNG. Never use seeded output as a real token, password, or secret.

---

## Zod Integration

```ts
import { z } from 'zod';
import { randomStringSchema } from '@ppabari/strio';
// or: import { randomStringSchema } from '@ppabari/strio/zod';

const tokenSchema = randomStringSchema({
  length: 32,
  charset: 'base62',
  description: 'API token',
}, z);

// In a Zod object schema
const UserSchema = z.object({
  id:     randomStringSchema({ length: 12, charset: 'base58' }, z),
  apiKey: randomStringSchema({ length: 32 }, z),
  pin:    randomStringSchema({ length: 6, requireNumeric: true }, z),
});

// Validates correctly
tokenSchema.parse('k3Xp9mQr2LzYw7NvTq8sHfGbJ5cD4eAK'); // ✓
tokenSchema.parse('short'); // ZodError: String must contain exactly 32 characters
```

> Zod is an optional peer dependency — install it separately: `npm install zod`

---

## Entropy Estimation

```ts
import { estimateEntropy } from '@ppabari/strio';

const e = estimateEntropy({ length: 32 });
e.bits;         // 190.54
e.strength;     // 'very-strong'
e.charsetSize;  // 62
e.combinations; // '2.27e+57'

estimateEntropy(PRESETS.PASSWORD).bits; // ~131
```

| Bits | Strength |
|------|----------|
| < 28 | `very-weak` |
| 28–49 | `weak` |
| 50–71 | `fair` |
| 72–99 | `strong` |
| ≥ 100 | `very-strong` |

---

## String Validation

```ts
import { validateRandomString } from '@ppabari/strio';

const result = validateRandomString('Token123!', {
  minLength: 8,
  requireNumeric: true,
  requireUppercase: true,
  requireSymbols: true,
  charset: '...',        // all chars must be in this set
  pattern: '####-AAAA',  // must match pattern
});

result.valid;  // true / false
result.errors; // string[] of failure messages
```

---

## Secrets & Key Generation

Everything you need to generate production-ready secrets for auth, encryption, and framework config.

### Raw Bytes

```ts
import { generateBytes } from '@ppabari/strio';

const key  = generateBytes(32);  // Uint8Array — 256-bit AES key material
const iv   = generateBytes(12);  // AES-GCM IV
const salt = generateBytes(16);  // bcrypt / PBKDF2 salt

// Use directly with Web Crypto:
await crypto.subtle.importKey('raw', generateBytes(32), 'AES-GCM', false, ['encrypt']);
```

### Hex Keys

```ts
import { generateHexKey } from '@ppabari/strio';

generateHexKey()        // → 64-char hex (256-bit, default)
generateHexKey(128)     // → 32-char hex (AES-128)
generateHexKey(512)     // → 128-char hex (HMAC-SHA512)

// Node.js crypto:
const cipher = createCipheriv('aes-256-gcm', Buffer.from(generateHexKey(256), 'hex'), iv);
```

### Base64 Keys

```ts
import { generateBase64Key } from '@ppabari/strio';

generateBase64Key()                        // url-safe, no padding (default)
generateBase64Key(256, 'standard')         // standard base64 with = padding
generateBase64Key(256, 'url-safe')         // url-safe with = padding
generateBase64Key(256, 'url-safe-no-pad')  // url-safe, no padding
```

### JWT Secrets

Enforces RFC 7518 minimum key lengths automatically.

```ts
import { generateJwtSecret } from '@ppabari/strio';

// HS256 (default) — 256-bit minimum
const { secret } = generateJwtSecret();
jwt.sign(payload, secret, { algorithm: 'HS256' });

// HS512 — 512-bit minimum
const { secret } = generateJwtSecret({ algorithm: 'HS512' });

// Hex format (for jose / @auth/core importing as oct key)
const { secret } = generateJwtSecret({ format: 'hex' });

// Returns: { secret, algorithm, bits, format, example }
```

| Algorithm | Min bits | Output chars (base64url) |
|-----------|----------|--------------------------|
| `HS256`   | 256      | 43                       |
| `HS384`   | 384      | 64                       |
| `HS512`   | 512      | 86                       |

### Structured API Keys

Stripe / GitHub / OpenAI style — `type_environment_randomPortion`.

```ts
import { generateApiKey } from '@ppabari/strio';

generateApiKey({ type: 'myapp', environment: 'live' })
// → { key: 'myapp_live_K3xP9mQr2LzYw7NvTq8sHfGbJ5cD4eAK3xP9...', prefix: 'sk_live', ... }

generateApiKey({ type: 'tok', bits: 128 })
// → { key: 'tok_K3xP9mQr2LzYw7Nv', ... }

generateApiKey({ type: 'pk', environment: 'test', charset: 'hex' })
// → { key: 'pub_test_a3f7c2b9...', ... }
```

### Numeric OTP

```ts
import { generateOtp } from '@ppabari/strio';

const { code } = generateOtp();                            // → '483920'
const { code } = generateOtp({ digits: 8 });               // → '04839201'
const { code } = generateOtp({ allowLeadingZero: false }); // → '583920' (never '0...')

// Returns: { code: string, value: number, digits: number }
await sms.send(phone, `Your verification code is ${code}`);
```

### Secret Masking

Safe for logs, UIs, and debug output.

```ts
import { maskSecret } from '@ppabari/strio';

maskSecret('strio_live_K3xP9mQr2LzYw7NvTq8sHfGb')
// → 'myapp_live_****...fGb'    (pass knownPrefixes option for your own prefixes)

maskSecret('supersecretpassword')
// → '****...word'

maskSecret('mytoken', { visibleEnd: 6, maskChar: '•' })
// → '••••...oken'
```

Pass your own prefixes via `knownPrefixes` option. Defaults include `strio_live_`, `strio_test_`, `tok_`, `api_`, `key_` and similar.

### Constant-Time Comparison

**Always use this instead of `===` when comparing tokens server-side.** Prevents timing attacks.

```ts
import { timingSafeEqual } from '@ppabari/strio';

// String comparison
if (!timingSafeEqual(incomingToken, storedToken)) {
  throw new Error('Invalid token');
}

// Uint8Array comparison (e.g. HMAC digests)
const valid = timingSafeEqual(computedHmac, expectedHmac);
```

### Framework Convenience Helpers

```ts
import {
  generateCookieSecret,
  generateAesKey,
  generateNextAuthSecret,
  generateDjangoSecretKey,
  generateRailsSecretKeyBase,
} from '@ppabari/strio';

// express-session / iron-session / lucia
app.use(session({ secret: generateCookieSecret() }));

// AES-GCM / AES-CBC key
const key = generateAesKey();           // → 64-char hex (256-bit)
const key = generateAesKey(128);        // → 32-char hex (128-bit)
const key = generateAesKey(256, 'bytes'); // → Uint8Array

// Next.js / NextAuth / Auth.js — paste into .env
console.log(`AUTH_SECRET="${generateNextAuthSecret()}"`);

// Django — paste into settings.py
console.log(`SECRET_KEY="${generateDjangoSecretKey()}"`);

// Rails — paste into credentials.yml
console.log(`secret_key_base: ${generateRailsSecretKeyBase()}`);
```

> All secret generation functions use `crypto.getRandomValues()` — the same cryptographically secure engine as the rest of strio.

---

## Security

**Why not `Math.random()`?** It's a PRNG — deterministic, predictable if seeded. Never use for tokens or secrets.

**Crypto source:** `crypto.getRandomValues()` (Web Crypto API) — draws from the OS CSPRNG (`/dev/urandom` on Linux, `CryptGenRandom` on Windows). Native in Node.js ≥18, all modern browsers, Deno, and Cloudflare Workers.

**Bias-free:** Naive `byte % charsetSize` introduces modulo bias when 256 isn't evenly divisible by the charset size. strio uses **rejection sampling** — bytes in the biased range are discarded and redrawn. Expected overhead: < 1 extra byte per character for any charset ≤128 chars.

---

## Requirements

- Node.js ≥ 18
- Modern browsers (Chrome 37+, Firefox 34+, Safari 11+)
- Deno, Bun, Cloudflare Workers, and other Web Crypto runtimes

---

## License

MIT © Parth Pabari