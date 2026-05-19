/**
 * @ppabari/strio CLI
 *
 * Usage:
 *   npx @ppabari/strio [options]
 *
 * Examples:
 *   npx @ppabari/strio
 *   npx @ppabari/strio --length 32
 *   npx @ppabari/strio --preset TOKEN
 *   npx @ppabari/strio --preset PASSWORD --count 5
 *   npx @ppabari/strio --pattern "####-AAAA-####"
 *   npx @ppabari/strio --charset base58 --length 22
 *   npx @ppabari/strio --passphrase --words 5
 *   npx @ppabari/strio --id --prefix usr
 *   npx @ppabari/strio --expiring --ttl 900
 *   npx @ppabari/strio --entropy --length 32 --charset base62
 *   npx @ppabari/strio --help
 */

import { generateRandomString } from '../src/index.js';
import { PRESETS } from '../src/presets.js';
import { generatePassphrase } from '../src/passphrase.js';
import { generateId } from '../src/short-id.js';
import { generateExpiringToken } from '../src/expiring-token.js';
import { estimateEntropy } from '../src/entropy.js';
import { CHARSET_ALIASES } from '../src/charset-aliases.js';

const args = process.argv.slice(2);

function getFlag(name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

if (hasFlag('help') || hasFlag('h')) {
  console.log(`
  @ppabari/strio — cryptographically secure string generation

  USAGE
    npx @ppabari/strio [options]

  GENERATION OPTIONS
    --length <n>          String length (default: 16)
    --count <n>           Generate N strings (one per line)
    --preset <name>       Use a named preset (see PRESETS below)
    --pattern <str>       Pattern mode: # digit, A uppercase, a lowercase, * any, ? alnum
    --charset <name|str>  Named alias or raw charset string
    --no-numeric          Exclude digits
    --no-lowercase        Exclude lowercase letters
    --no-uppercase        Exclude uppercase letters
    --symbols             Include symbols
    --readable            Exclude ambiguous chars (0 O l I 1)
    --exclude <chars>     Exclude specific characters
    --prefix <str>        Prepend a fixed string
    --suffix <str>        Append a fixed string
    --start-with <type>   First char: alphabet | numeric | any

  SPECIAL MODES
    --passphrase          Generate a passphrase instead
      --words <n>         Number of words (default: 4)
      --separator <str>   Word separator (default: -)
      --capitalize        Capitalize each word
      --append-digit      Append a random digit

    --id                  Generate a short ID with checksum
      --prefix <str>      ID prefix (e.g. usr → usr_...)
      --id-length <n>     Random portion length (default: 12)

    --expiring            Generate a self-expiring token
      --ttl <seconds>     Token TTL in seconds (default: 900)
      --payload <n>       Payload length (default: 24)

    --entropy             Show entropy estimate only (no string generated)

  PRESETS
    TOKEN       32-char alphanumeric API token
    PASSWORD    20-char with symbols
    READABLE    16-char, no ambiguous chars
    SLUG        12-char lowercase, starts with letter
    HEX         32-char hex
    PIN         6-digit PIN
    SHORT_ID    8-char uppercase, starts with letter
    INVITE_CODE AAAA-AAAA-AAAA-AAAA

  CHARSET ALIASES
    base16 base32 base36 base58 base62 base64url hex alphanumeric crockford32

  EXAMPLES
    npx @ppabari/strio --length 32
    npx @ppabari/strio --preset TOKEN --count 5
    npx @ppabari/strio --pattern "####-AAAA-####"
    npx @ppabari/strio --charset base58 --length 22
    npx @ppabari/strio --passphrase --words 6 --capitalize
    npx @ppabari/strio --id --prefix usr
    npx @ppabari/strio --expiring --ttl 300
    npx @ppabari/strio --entropy --preset PASSWORD
`);
  process.exit(0);
}

// --- Passphrase mode ---
if (hasFlag('passphrase')) {
  const words = parseInt(getFlag('words') ?? '4', 10);
  const separator = getFlag('separator') ?? '-';
  const capitalize = hasFlag('capitalize');
  const appendDigit = hasFlag('append-digit');
  const count = parseInt(getFlag('count') ?? '1', 10);

  for (let i = 0; i < count; i++) {
    const { passphrase, entropyBits } = generatePassphrase({ words, separator, capitalize, appendDigit });
    if (hasFlag('verbose')) {
      console.log(`${passphrase}  [${entropyBits} bits]`);
    } else {
      console.log(passphrase);
    }
  }
  process.exit(0);
}

// --- Short ID mode ---
if (hasFlag('id')) {
  const prefix = getFlag('prefix');
  const randomLength = parseInt(getFlag('id-length') ?? '12', 10);
  const charset = getFlag('charset') ?? 'base58';
  const count = parseInt(getFlag('count') ?? '1', 10);

  for (let i = 0; i < count; i++) {
    console.log(generateId({ prefix, randomLength, charset }));
  }
  process.exit(0);
}

// --- Expiring token mode ---
if (hasFlag('expiring')) {
  const ttlSeconds = parseInt(getFlag('ttl') ?? '900', 10);
  const payloadLength = parseInt(getFlag('payload') ?? '24', 10);
  const count = parseInt(getFlag('count') ?? '1', 10);

  for (let i = 0; i < count; i++) {
    const { token, expiresAt } = generateExpiringToken({ ttlSeconds, payloadLength });
    if (hasFlag('verbose')) {
      console.log(`${token}  [expires: ${expiresAt.toISOString()}]`);
    } else {
      console.log(token);
    }
  }
  process.exit(0);
}

// --- Build options ---
const presetName = getFlag('preset') as keyof typeof PRESETS | undefined;
const preset = presetName ? PRESETS[presetName] : undefined;

if (presetName && !preset) {
  console.error(`Unknown preset: ${presetName}. Available: ${Object.keys(PRESETS).join(', ')}`);
  process.exit(1);
}

const charsetArg = getFlag('charset');
const resolvedCharset = charsetArg
  ? (CHARSET_ALIASES[charsetArg] ?? charsetArg)
  : undefined;

const options = {
  ...(preset ?? {}),
  ...(getFlag('length') ? { length: parseInt(getFlag('length')!, 10) } : {}),
  ...(hasFlag('no-numeric') ? { numeric: false } : {}),
  ...(hasFlag('no-lowercase') ? { lowercase: false } : {}),
  ...(hasFlag('no-uppercase') ? { uppercase: false } : {}),
  ...(hasFlag('symbols') ? { symbols: true } : {}),
  ...(hasFlag('readable') ? { readable: true } : {}),
  ...(getFlag('exclude') ? { exclude: getFlag('exclude') } : {}),
  ...(getFlag('prefix') ? { prefix: getFlag('prefix') } : {}),
  ...(getFlag('suffix') ? { suffix: getFlag('suffix') } : {}),
  ...(getFlag('start-with') ? { startWith: getFlag('start-with') as 'alphabet' | 'numeric' | 'any' } : {}),
  ...(getFlag('pattern') ? { pattern: getFlag('pattern') } : {}),
  ...(resolvedCharset ? { charset: resolvedCharset } : {}),
};

// --- Entropy-only mode ---
if (hasFlag('entropy')) {
  const e = estimateEntropy(options);
  console.log(`Charset size : ${e.charsetSize} characters`);
  console.log(`Length       : ${e.effectiveLength} chars (random portion)`);
  console.log(`Entropy      : ${e.bits} bits`);
  console.log(`Strength     : ${e.strength}`);
  console.log(`Combinations : ${e.combinations}`);
  process.exit(0);
}

// --- Generate ---
const count = parseInt(getFlag('count') ?? '1', 10);

try {
  if (count === 1) {
    console.log(generateRandomString(options));
  } else {
    const results = generateRandomString({ ...options, count });
    results.forEach((s: string) => console.log(s));
  }
} catch (err) {
  console.error(`Error: ${(err as Error).message}`);
  process.exit(1);
}
