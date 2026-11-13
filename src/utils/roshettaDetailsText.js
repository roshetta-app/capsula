/**
 * src/utils/roshettaDetailsText.js
 * 2026-11-13 (Roshetta plan, step 4.1b): the small rules and words of the roshetta
 * details sheet (name and description), kept in a plain file so they are checked
 * without a screen (roshettaDetailsText.check.js).
 *
 *   limitText(value, max)      cuts typed text to `max` characters, counting as people
 *                              do (an emoji is one), like the database and checkName
 *   countText(value)           how many characters, counted the same way (for 12/40)
 *   nameProblem(name)          '' when the name is fine, else the words to show under it
 *   saveFailureMessage(reason, isPro)
 *                              the words when the hook refuses a create or a save
 */

import { roshettaCap, roshettaDrugCap } from './roshettaLimits.js';

export function countText(value) {
  return typeof value === 'string' ? Array.from(value).length : 0;
}

export function limitText(value, max) {
  if (typeof value !== 'string') return '';
  const chars = Array.from(value);
  return chars.length <= max ? value : chars.slice(0, max).join('');
}

export function nameProblem(name) {
  return typeof name === 'string' && name.trim() !== '' ? '' : 'Enter a roshetta name';
}

// `reason` is the hook's answer: guest, not_loaded, read_only, limit, drug_limit,
// invalid, missing, error (anything else counts as error).
export function saveFailureMessage(reason, isPro) {
  switch (reason) {
    case 'guest':
      return 'Sign in to save roshettas.';
    case 'not_loaded':
      return 'Your roshettas are still loading. Try again in a moment.';
    case 'read_only':
      return 'Your roshettas are read only. Delete a roshetta or upgrade to edit.';
    case 'limit':
      return isPro
        ? `You've reached the limit of ${roshettaCap(true)} roshettas. Delete one to make another.`
        : `You've reached the free limit of ${roshettaCap(false)} roshettas. Delete one or upgrade to make another.`;
    case 'drug_limit':
      return isPro
        ? `This roshetta is over the limit of ${roshettaDrugCap(true)} drugs.`
        : `This roshetta is over the free limit of ${roshettaDrugCap(false)} drugs. Remove some or upgrade.`;
    case 'invalid':
      return 'Check the name and description, then try again.';
    case 'missing':
      return 'This roshetta is no longer here. It may have been deleted on another device.';
    default:
      return "Couldn't save your roshetta. Try again.";
  }
}
