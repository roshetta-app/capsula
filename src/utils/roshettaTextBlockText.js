/**
 * src/utils/roshettaTextBlockText.js
 * 2026-11-14 (Roshetta plan, step 5.1b): the small rules of a text block card in the editor,
 * kept in a plain file so they are checked without a screen (roshettaTextBlockText.check.js).
 *
 *   textBlockCounter(value)       "12/1000", counted as people count (an emoji is one)
 *   typedTextBlock(value)         what typing leaves: cut to the text block limit, line breaks kept
 *   moveState(index, count)       { canUp, canDown } for the card at `index` among `count` entries
 */

import { ROSHETTA_TEXT_BLOCK_MAX } from './roshettaRows.js';
import { countText, limitText } from './roshettaDetailsText.js';

export function textBlockCounter(value) {
  return `${countText(value)}/${ROSHETTA_TEXT_BLOCK_MAX}`;
}

export function typedTextBlock(value) {
  return limitText(value, ROSHETTA_TEXT_BLOCK_MAX);
}

export function moveState(index, count) {
  const i = Number.isInteger(index) ? index : 0;
  const n = Number.isInteger(count) ? count : 0;
  return { canUp: i > 0, canDown: i < n - 1 };
}
