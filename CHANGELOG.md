# Changelog

All notable changes to `@ppabari/strio` will be documented here.

This project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.0.0] — 2025

### Added

**Core generation**
- `generateRandomString(options)` — cryptographically secure string generation, sync
- `generateRandomStringAsync(options)` — non-blocking async variant
- `length`, `numeric`, `lowercase`, `uppercase`, `symbols`, `readable`, `exclude`, `charset`, `startWith`, `prefix`, `suffix`, `pattern`, `count` options
- `seed` option for deterministic/reproducible output (tests and fixtures)

**Named charset aliases**
- `charset: 'base58'` — Bitcoin alphabet, no ambiguous chars
- `charset: 'base62'` — max-density alphanumeric
- `charset: 'base64url'` — URL-safe, no padding
- `charset: 'base32'`, `'base36'`, `'crockford32'`, `'hex'`, `'alpha'`, `'numeric'`
- Full list exported as `CHARSET_ALIASES`

**Presets**
- `PRESETS.TOKEN` — 32-char API token
- `PRESETS.PASSWORD` — 20-char with symbols
- `PRESETS.READABLE` — no ambiguous characters
- `PRESETS.SLUG` — lowercase URL slug
- `PRESETS.HEX` — 32-char hex
- `PRESETS.PIN` — 6-digit, no leading zero
- `PRESETS.SHORT_ID` — 8-char uppercase
- `PRESETS.INVITE_CODE` — `AAAA-AAAA-AAAA-AAAA` format

**Short IDs**
- `generateId(options)` — prefixed IDs with Luhn-style checksum
- `validateId(id, options)` — detects single-character transcription errors

**Expiring tokens**
- `generateExpiringToken(options)` — self-expiring tokens with base62-encoded TTL
- `verifyToken(token)` — parse and validate expiry without a database

**Stream / iterator API**
- `randomStringStream(options)` — infinite async generator
- `uniqueRandomStringStream(options)` — deduplicating async generator
- `take(iterable, n)` — collect N items from any async iterable
- `takeWhere(iterable, n, predicate)` — filtered collection

**Passphrase generator**
- `generatePassphrase(options)` — 512-word built-in list, separator, capitalize, appendDigit
- `BUILT_IN_WORD_LIST` — exported for reference or customisation

**Secrets & key generation**
- `generateBytes(n)` — raw `Uint8Array` for Web Crypto and Node crypto
- `generateHexKey(bits)` — lowercase hex key (AES, HMAC, Redis)
- `generateBase64Key(bits, variant)` — standard / url-safe / url-safe-no-pad
- `generateJwtSecret(options)` — HS256/384/512 with RFC 7518 minimum enforcement
- `generateApiKey(options)` — structured `type_env_random` API keys
- `generateOtp(options)` — numeric OTP codes (1–10 digits), bias-free
- `maskSecret(secret, options)` — safe logging with prefix preservation
- `timingSafeEqual(a, b)` — constant-time comparison (prevents timing attacks)
- `generateCookieSecret()` — for express-session, iron-session, lucia
- `generateAesKey(keySize, format)` — AES-128/192/256 in hex, base64, or bytes
- `generateNextAuthSecret()` — `AUTH_SECRET` for Next.js / Auth.js
- `generateDjangoSecretKey()` — compatible with Django's `SECRET_KEY`
- `generateRailsSecretKeyBase()` — 512-bit hex for Rails

**Utilities**
- `estimateEntropy(options)` — bits, strength label, charset size, combinations
- `validateRandomString(str, options)` — length, charset, required types, pattern
- `randomStringSchema(options, z)` — Zod integration (optional peer dep)

**CLI**
- `npx @ppabari/strio` — generate strings from the terminal
- `--preset`, `--length`, `--count`, `--charset`, `--pattern` and more
- `--passphrase`, `--id`, `--expiring`, `--entropy` modes
- `--help` for full reference

**Infrastructure**
- Dual ESM + CJS build via tsup
- Full TypeScript types exported
- Vitest test suite
- GitHub Actions CI (Node 18 / 20 / 22)
- Zero runtime dependencies
