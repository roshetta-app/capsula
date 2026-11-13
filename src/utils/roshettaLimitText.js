/**
 * src/utils/roshettaLimitText.js
 * 2026-11-14 (Roshetta plan, step 4.1c): the words of the roshetta limit and read
 * only sheet, kept in a plain file so they are checked without a screen
 * (roshettaLimitText.check.js). Same wording rules as the groups sheet.
 *
 *   limitSheetWords(kind, isPro)   -> { headline, countLabel, message, dismissLabel }
 *       kind: 'roshettas' | 'drugs' | 'readonly' (anything else counts as 'roshettas')
 *       message is a list of pieces, { text, strong? }, so the screen can bold "Pro"
 *   notSavedLine(names)            -> '' or "Not saved: A, B and 2 more."
 */

import {
  ROSHETTAS_CAP_FREE,
  ROSHETTA_DRUGS_CAP_FREE,
  ROSHETTA_DRUGS_CAP_PRO,
} from '../constants/features.js';

const roshettaWord = n => (n === 1 ? 'roshetta' : 'roshettas');
const drugWord = n => (n === 1 ? 'drug' : 'drugs');

export function limitSheetWords(kind, isPro = false) {
  if (kind === 'readonly') {
    return {
      headline: 'Your roshettas are read only',
      countLabel: undefined,
      message: [
        { text: 'Delete a roshetta or upgrade to ' },
        { text: 'Pro', strong: true },
        { text: ' to edit them.' },
      ],
      dismissLabel: 'Not now',
    };
  }

  if (kind === 'drugs') {
    const cap = isPro ? ROSHETTA_DRUGS_CAP_PRO : ROSHETTA_DRUGS_CAP_FREE;
    return {
      headline: 'This roshetta is full',
      countLabel: `${cap} of ${cap} ${drugWord(cap)} used`,
      message: isPro
        ? [{ text: `A roshetta can hold up to ${ROSHETTA_DRUGS_CAP_PRO} drugs. Remove one to add another.` }]
        : [
            { text: `Free accounts can have ${ROSHETTA_DRUGS_CAP_FREE} drugs in a roshetta. ` },
            { text: 'Pro', strong: true },
            { text: ` lets you have up to ${ROSHETTA_DRUGS_CAP_PRO}.` },
          ],
      dismissLabel: 'Not now',
    };
  }

  // 'roshettas' (and anything unknown). A Pro account's roshetta cap is a safety cap
  // that is never shown as a number, so it gets no count line.
  return {
    headline: 'Roshetta limit reached',
    countLabel: isPro ? undefined : `${ROSHETTAS_CAP_FREE} of ${ROSHETTAS_CAP_FREE} ${roshettaWord(ROSHETTAS_CAP_FREE)} used`,
    message: isPro
      ? [{ text: "You've reached the most roshettas an account can have. Delete one to add another." }]
      : [
          { text: `Free accounts can have ${ROSHETTAS_CAP_FREE} ${roshettaWord(ROSHETTAS_CAP_FREE)}. ` },
          { text: 'Pro', strong: true },
          { text: ' lets you add many more.' },
        ],
    dismissLabel: 'Not now',
  };
}

// The names of roshettas that were not saved, as one short line. Shows up to three
// names, then "and N more". Names come from the person, so they are returned as
// typed (the screen draws them as plain text). Blank and repeated names are left out.
export function notSavedLine(names) {
  if (!Array.isArray(names)) return '';
  const seen = [];
  for (const n of names) {
    if (typeof n === 'string' && n.trim() !== '' && !seen.includes(n)) seen.push(n);
  }
  if (seen.length === 0) return '';
  if (seen.length === 1) return `Not saved: ${seen[0]}.`;
  if (seen.length === 2) return `Not saved: ${seen[0]} and ${seen[1]}.`;
  if (seen.length === 3) return `Not saved: ${seen[0]}, ${seen[1]} and ${seen[2]}.`;
  return `Not saved: ${seen[0]}, ${seen[1]}, ${seen[2]} and ${seen.length - 3} more.`;
}
