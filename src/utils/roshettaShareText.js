/**
 * src/utils/roshettaShareText.js
 * 2026-11-14 (Roshetta plan, step 6.1a): the plain rules for a roshetta's share
 * link and message. No browser, no Capacitor, so they can be checked with plain
 * Node. shareRoshettaLink.js adds the page address and the phone share sheet.
 *
 * The message carries the roshetta's name and nothing else from it: never a drug
 * or a dose (the author's own words are shown only on the page itself, with its
 * safety label).
 */

const DEFAULT_NAME = 'Roshetta';

// One clean line: line breaks and runs of spaces become one space.
function cleanName(name) {
  return String(name ?? '').replace(/\s+/g, ' ').trim();
}

// <base>/r/<code>. The base may end with a slash.
export function roshettaLinkFor(base, code) {
  return `${String(base).replace(/\/+$/, '')}/r/${encodeURIComponent(code)}`;
}

// { title, text, url } for the phone share sheet.
export function roshettaShareMessage(name, url) {
  const clean = cleanName(name);
  const shown = clean || DEFAULT_NAME;
  return {
    title: clean ? `${clean} on Capsula` : 'A roshetta on Capsula',
    text: `\u{1F4DD} ${shown}\nA roshetta on Capsula, the drug reference made for doctors \u{1FA7A}`,
    url,
  };
}

// What is copied when the phone has no share sheet.
export function roshettaCopyText(msg) {
  return `${msg.text}\n\u{1F449} ${msg.url}`;
}
