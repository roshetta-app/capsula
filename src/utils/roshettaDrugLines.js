/**
 * src/utils/roshettaDrugLines.js
 * 2026-11-14 (Roshetta plan, step 5.1c): the small rules of the drug group card in the editor,
 * kept in a plain file so they are checked without a screen (roshettaDrugLines.check.js).
 *
 *   drugLines(row, libraryIds)     the name lines of a drug group, main drug first, then partners
 *   cleanBrandName(name, strength) the brand name without the strength and pack the library adds
 *                                  ("Tussistop 60mg \u2014 20 Tablets" -> "Tussistop")
 *   drugDetail(line)               the grey line under a name: the generic name only, first letter capital
 *   sheetRowsForDisplay(rows)      the rows with clean brand names, for the sheet viewer
 *   switchChip(row, partnerIndex)  the group with that chip switched, or null for a bad index
 *   removeDrugAction(row, pos)     what removing the drug at `pos` means for the editor
 *   doseCounter(value)             "12/600", counted as people count (an emoji is one)
 *   withDose(row, value)           the group with the typed dose (cut to the limit, line breaks kept)
 *
 * libraryIds is a Set of the brand ids in the drug library, or null / undefined while the library
 * is not loaded. A drug is only "no longer available" when the library IS loaded and its id is not
 * in it (plan assumption H and I): the roshetta keeps the name it had when the drug was added.
 */

import { ROSHETTA_DOSE_MAX, removeDrug, switchJoiner } from './roshettaRows.js';
import { countText, limitText } from './roshettaDetailsText.js';

const NO_NAME = 'Unnamed drug';

function textOrNull(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

// The library's full name is "Brand strength \u2014 pack"; a topic drug block shows the clean brand name,
// then the strength and form after it. Older roshettas saved the full name, so it is cut here at read
// time; a name that is already clean comes back unchanged.
export function cleanBrandName(name, concentration) {
  const full = textOrNull(name);
  if (!full) return null;
  const cut = full.search(/\s[\u2014\u2013]\s/);
  let clean = (cut > 0 ? full.slice(0, cut) : full).trim();
  const strength = textOrNull(concentration);
  if (strength) {
    const pattern = strength.replace(/\s+/g, '').split('')
      .map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
    clean = clean.replace(new RegExp(`\\s*${pattern}\\s*$`, 'i'), '').trim();
  }
  return clean || full;
}

function sentenceCase(value) {
  const text = textOrNull(value);
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : null;
}

function lineFrom(source, position, joiner, libraryIds) {
  const id = source?.brand_id ?? null;
  const available = libraryIds instanceof Set ? libraryIds.has(id) : true;
  return {
    position,
    id,
    name: textOrNull(source?.brand_name) ?? NO_NAME,
    // What the screens show: the clean brand name (the strength and form are drawn after it).
    shownName: cleanBrandName(source?.brand_name, source?.concentration) ?? NO_NAME,
    genericName: textOrNull(source?.generic_name),
    concentration: textOrNull(source?.concentration),
    form: textOrNull(source?.form),
    // The chip drawn in front of this line: null for the main drug.
    joiner,
    available,
  };
}

export function drugLines(row, libraryIds) {
  if (!row || typeof row !== 'object') return [];
  const lines = [lineFrom(row, 0, null, libraryIds)];
  const partners = Array.isArray(row.alternatives) ? row.alternatives : [];
  partners.forEach((alt, i) => {
    lines.push(lineFrom(alt, i + 1, alt?.joiner === 'and' ? 'and' : 'or', libraryIds));
  });
  return lines;
}

export function drugDetail(line) {
  if (!line) return '';
  return sentenceCase(line.genericName) ?? '';
}

// The rows of a roshetta for the sheet viewer: every drug (and partner) with its clean brand name.
export function sheetRowsForDisplay(rows) {
  if (!Array.isArray(rows)) return rows;
  const tidy = d => (d && typeof d === 'object' && typeof d.brand_name === 'string'
    ? { ...d, brand_name: cleanBrandName(d.brand_name, d.concentration) ?? d.brand_name }
    : d);
  return rows.map(row => {
    const next = tidy(row);
    return next && Array.isArray(next.alternatives) ? { ...next, alternatives: next.alternatives.map(tidy) } : next;
  });
}

export function switchChip(row, partnerIndex) {
  try {
    return switchJoiner(row, partnerIndex);
  } catch {
    return null;
  }
}

// kind 'change': the group after the removal (the first partner takes over when the main drug goes).
// kind 'delete_group': the only drug was removed, so the caller deletes the whole group.
// kind 'none': no such drug, nothing to do.
export function removeDrugAction(row, position) {
  try {
    const next = removeDrug(row, position);
    if (next === null) return { kind: 'delete_group' };
    return { kind: 'change', row: next };
  } catch {
    return { kind: 'none' };
  }
}

export function doseCounter(value) {
  return `${countText(value)}/${ROSHETTA_DOSE_MAX}`;
}

// Only the dose text changes. The other dose fields stay as they are (empty on purpose, plan decision 5).
export function withDose(row, value) {
  return { ...row, dose: limitText(value, ROSHETTA_DOSE_MAX) };
}
