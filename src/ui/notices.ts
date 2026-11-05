/**
 * Turns the simulation's terse SHOUTING · DOT · SEPARATED messages into ordinary sentences.
 * Display only: the simulation, its saves and its tests keep their original text.
 *
 * - ALL-CAPS words become lowercase; the first word of each sentence is capitalised.
 * - Key letters (K, E, A/D…) and key names (Space, Shift…) keep their capitals.
 * - Names (Selene, Nacre) and units (kg, m/s, kJ) are preserved.
 * - Parts separated by " · " become separate sentences.
 */

const KEY_NAMES: Record<string, string> = {
  SPACE: 'Space',
  SHIFT: 'Shift',
  ENTER: 'Enter',
  BACKSPACE: 'Backspace',
  ESC: 'Esc',
  TAB: 'Tab',
};

const NAMES: Record<string, string> = { SELENE: 'Selene', NACRE: 'Nacre' };

/** Internal words that mean nothing to a player. */
const REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bNEW RUNTIME\b/g, 'NEW GAME'],
  [/\bRUNTIME\b/g, 'GAME'],
  [/\bPAID SITE\b/g, 'BUILDING SITE'],
  [/\bFUNDING COLONY\b/g, 'OUTPOST'],
];

const isKeyToken = (token: string): boolean => /^[A-Z](\/[A-Z])*$/.test(token);

function plainWord(word: string): string {
  // Split off leading/trailing punctuation so "(HULL)" or "RESUME," are handled.
  const match = /^([^A-Za-z0-9#]*)(.*?)([^A-Za-z0-9%]*)$/.exec(word);
  if (!match) return word;
  const [, lead, core, tail] = match;
  if (!core) return word;
  if (isKeyToken(core)) return word;
  if (KEY_NAMES[core]) return lead + KEY_NAMES[core] + tail;
  if (NAMES[core]) return lead + NAMES[core] + tail;
  // Only all-caps words are rewritten. Anything with lowercase already reads fine (kg, kJ, m/s, Selene).
  if (/[a-z]/.test(core) || !/[A-Z]/.test(core)) return word;
  return lead + core.toLowerCase() + tail;
}

function sentence(part: string): string {
  const text = part
    .trim()
    .split(/\s+/)
    // The only key pair containing A is "A/D", so a lone "A" after the first word is the article.
    .map((word, i) => (i > 0 && word === 'A' ? 'a' : plainWord(word)))
    .join(' ');
  if (!text) return '';
  const first = text[0];
  const capped = first >= 'a' && first <= 'z' ? first.toUpperCase() + text.slice(1) : text;
  return /[.!?:]$/.test(capped) ? capped : `${capped}.`;
}

export function plainNotice(message: string): string {
  let text = message;
  for (const [pattern, replacement] of REPLACEMENTS) text = text.replace(pattern, replacement);
  return text
    .split(' · ')
    .map(sentence)
    .filter(Boolean)
    .join(' ');
}
