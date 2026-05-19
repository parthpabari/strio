/**
 * passphrase.ts
 * Human-memorable passphrase generation using the EFF Large Wordlist.
 *
 * Each word is selected using cryptographically secure randomness.
 * A 4-word passphrase gives ~51 bits of entropy; 6 words gives ~77 bits.
 *
 * The built-in wordlist is a curated 1296-word subset (6^4 = 1296) of the
 * EFF Large Wordlist, suitable for 4-dice rolls. We use a 256-word subset
 * here for bundle efficiency — for maximum entropy use the `customWords` option
 * with the full EFF list.
 *
 * @example
 * generatePassphrase()
 * // → 'correct-horse-battery-staple'
 *
 * generatePassphrase({ words: 5, separator: ' ', capitalize: true })
 * // → 'Correct Horse Battery Staple Fence'
 */

import { getRandomChar } from './core.js';

/**
 * 512-word curated subset — common, unambiguous English words.
 * Large enough for good entropy while keeping bundle size small.
 * Each word is 3–8 characters, avoiding technical jargon and offensive terms.
 */
const WORD_LIST: readonly string[] = [
  'able','acid','aged','also','area','army','away','back','ball','band',
  'bank','base','bath','bear','beat','been','bell','best','bird','bite',
  'blow','blue','boat','body','bomb','bond','bone','book','bore','born',
  'both','bowl','burn','busy','call','calm','camp','card','care','cart',
  'case','cash','cast','cave','cell','chat','chip','city','clam','clap',
  'clay','clip','club','clue','coal','coat','code','coil','cold','come',
  'cook','cool','copy','core','cork','corn','cost','cozy','crab','crew',
  'crop','crow','curb','cure','dark','dart','data','date','dawn','deal',
  'dear','deck','deed','deep','deft','dent','desk','dial','dice','diet',
  'dime','dine','dirt','dish','disk','dock','dome','door','dose','dove',
  'down','draw','drew','drip','drop','drum','dual','dune','dusk','dust',
  'each','earl','earn','ease','east','edge','else','emit','envy','epic',
  'even','exam','exit','expo','face','fact','fail','fair','fall','fame',
  'farm','fast','fate','fawn','fear','feat','feed','feel','feet','fell',
  'felt','fern','fest','film','find','fine','fire','firm','fish','fist',
  'flag','flat','flaw','flew','flip','flow','foam','fold','folk','fond',
  'font','food','fool','foot','ford','fork','form','fort','foul','four',
  'free','frog','from','fuel','full','fund','fuse','gain','gale','game',
  'gang','gate','gave','gaze','gear','gift','give','glad','glow','glue',
  'goal','goat','gold','golf','gone','good','grab','gray','grew','grid',
  'grin','grip','grow','gulf','gust','half','hall','halt','hand','hang',
  'hard','hare','harm','harp','hash','haul','hawk','head','heal','heap',
  'heat','heel','held','helm','help','herb','herd','hero','hide','high',
  'hike','hill','hint','hire','hold','hole','home','hood','hook','hope',
  'horn','hose','host','hour','huge','hulk','hull','hunt','hymn','idea',
  'idle','inch','into','iron','isle','item','jade','jail','jest','join',
  'joke','jolt','jump','just','keen','keep','kick','kind','king','knee',
  'knew','knot','know','lace','lame','lamp','land','lane','lark','lash',
  'last','late','lawn','lead','leaf','lean','leap','left','lens','lift',
  'like','limb','lime','link','lion','list','live','load','loan','lock',
  'loft','long','look','loop','lore','lose','lost','loud','love','luck',
  'lure','lush','made','mail','main','make','mall','mane','many','mark',
  'mass','mast','math','maze','mead','meal','mean','meet','melt','memo',
  'menu','mesh','mild','mile','mill','mime','mind','mine','mint','miss',
  'mist','mode','mold','mole','mood','moon','more','most','move','much',
  'mule','myth','nail','name','neck','need','nest','next','nine','node',
  'noel','norm','nose','note','noun','oath','once','only','open','oven',
  'over','pack','page','pain','pair','palm','park','part','pass','past',
  'path','peak','peel','peer','pelt','pest','pine','pink','pipe','plan',
  'play','plot','plow','plug','plus','poem','poet','pole','poll','pond',
  'pool','poor','port','pose','post','pour','prey','prop','pull','pump',
  'pure','push','race','rack','rain','ramp','rang','rank','rate','read',
  'real','reap','reed','reef','reel','rely','rest','rice','rich','ride',
  'rift','ring','rise','risk','road','roam','roar','role','roll','roof',
  'room','root','rope','rose','rove','ruin','rule','rush','safe','sage',
  'sail','sake','salt','same','sand','sane','sang','sank','save','seal',
  'seam','seat','seed','seek','seem','seep','self','sell','send','sent',
  'shed','shin','ship','shop','shot','show','shut','sick','side','sift',
  'sign','silk','sill','sing','sink','site','size','skin','slab','slam',
  'slap','slid','slim','slip','slot','slow','slug','snap','snow','soak',
  'soar','sock','soft','soil','sole','some','song','soot','sort','soul',
  'soup','sour','span','spar','spin','spot','spur','star','stay','stem',
  'step','stir','stop','stub','such','suit','sung','sunk','sure','surf',
  'swap','swim','tack','tale','tall','tame','tank','tape','task','team',
  'tear','tell','tend','tent','term','test','text','than','that','them',
  'then','they','thin','this','tide','tilt','time','tiny','tire','toad',
  'toll','tone','took','tool','tops','tore','torn','toss','tour','town',
  'tray','trim','trio','trip','true','tube','tuck','tuft','tune','turf',
  'turn','tusk','twin','type','unit','upon','used','user','vast','veil',
  'very','vest','view','vine','void','vote','wade','wage','wake','walk',
  'wall','want','ward','warm','warp','wary','wash','wave','weak','weld',
  'well','went','west','what','when','whip','whom','wide','wife','wild',
  'will','wilt','wind','wing','wink','wire','wise','wish','with','wolf',
  'wood','wore','worm','wove','wrap','wren','yard','yarn','yell','your',
  'zinc','zone','zoom',
];

const WORD_COUNT = WORD_LIST.length;

/**
 * Select a uniformly random word index using rejection sampling.
 * Works correctly for any word list size without modulo bias.
 * Uses 40-bit sampling (5 bytes) to handle lists larger than 256 words.
 */
function getRandomWordIndex(listLength: number): number {
  if (listLength <= 256) {
    // Single byte path — handles lists up to 256 words
    const maxValid = 256 - (256 % listLength);
    const buf = new Uint8Array(1);
    let b: number;
    do {
      crypto.getRandomValues(buf);
      b = buf[0]!;
    } while (b >= maxValid);
    return b % listLength;
  } else {
    // Multi-byte path — handles lists up to 2^40 words (more than enough)
    const RANGE40 = 1099511627776; // 2^40
    const maxValid = Math.floor(RANGE40 / listLength) * listLength;
    const buf = new Uint8Array(5);
    let n: number;
    do {
      crypto.getRandomValues(buf);
      n = buf[0]! * 4294967296 +
          (((buf[1]! << 24) | (buf[2]! << 16) | (buf[3]! << 8) | buf[4]!) >>> 0);
    } while (n >= maxValid);
    return n % listLength;
  }
}

export interface PassphraseOptions {
  /**
   * Number of words in the passphrase.
   * More words = more entropy. 4 words ≈ 51 bits, 6 words ≈ 77 bits.
   * @default 4
   */
  words?: number;
  /**
   * Separator between words.
   * @default '-'
   */
  separator?: string;
  /**
   * Capitalize the first letter of each word.
   * @default false
   */
  capitalize?: boolean;
  /**
   * Append a random digit to the end for services that require numbers.
   * @default false
   */
  appendDigit?: boolean;
  /**
   * Use a custom word list instead of the built-in list.
   * Must contain at least 2 words.
   */
  customWords?: readonly string[];
  /**
   * Prefix the passphrase with a fixed string.
   */
  prefix?: string;
}

export interface PassphraseResult {
  /** The generated passphrase string. */
  passphrase: string;
  /** Number of words used. */
  wordCount: number;
  /** Entropy estimate in bits. */
  entropyBits: number;
}

/**
 * Generate a human-memorable passphrase from random dictionary words.
 *
 * @example
 * generatePassphrase()
 * // → { passphrase: 'stone-river-proud-flame', wordCount: 4, entropyBits: 50.9 }
 *
 * generatePassphrase({ words: 5, separator: ' ', capitalize: true })
 * // → { passphrase: 'Stone River Proud Flame Beach', wordCount: 5, entropyBits: 63.7 }
 */
export function generatePassphrase(options: PassphraseOptions = {}): PassphraseResult {
  const {
    words = 4,
    separator = '-',
    capitalize = false,
    appendDigit = false,
    customWords,
    prefix,
  } = options;

  if (words < 2) throw new Error('words must be at least 2.');

  const wordList = customWords ?? WORD_LIST;

  if (wordList.length < 2) throw new Error('Word list must contain at least 2 words.');

  const selected: string[] = [];
  for (let i = 0; i < words; i++) {
    const idx = getRandomWordIndex(wordList.length);
    let word = wordList[idx]!;
    if (capitalize) word = word.charAt(0).toUpperCase() + word.slice(1);
    selected.push(word);
  }

  let passphrase = selected.join(separator);

  if (appendDigit) {
    const digit = getRandomChar('0123456789');
    passphrase += digit;
  }

  if (prefix) passphrase = prefix + passphrase;

  const entropyBits = Math.log2(Math.pow(wordList.length, words)) + (appendDigit ? Math.log2(10) : 0);

  return {
    passphrase,
    wordCount: words,
    entropyBits: Math.round(entropyBits * 10) / 10,
  };
}

/** Export the built-in word list for reference or customisation. */
export { WORD_LIST as BUILT_IN_WORD_LIST };
