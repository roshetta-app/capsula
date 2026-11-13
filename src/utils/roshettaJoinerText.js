/**
 * src/utils/roshettaJoinerText.js
 * 2026-11-14 (Roshetta plan, step 5.1a): the words of the or / plus chip in the editor, kept in
 * a plain file so they are checked without a screen (roshettaJoinerText.check.js).
 *
 *   joinerChipInfo(joiner) -> { word, isPlus, label }
 *
 * The saved value 'and' is shown as "plus" (the data is not changed); anything that is not
 * 'and' counts as 'or', the same as the sheet viewer. label is what a screen reader says.
 */

export function joinerChipInfo(joiner) {
  if (joiner === 'and') return { word: 'plus', isPlus: true, label: 'plus. Tap to change to or' };
  return { word: 'or', isPlus: false, label: 'or. Tap to change to plus' };
}
