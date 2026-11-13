/**
 * src/utils/roshettaDrugLines.js
 * 2026-11-14 (Roshetta plan, step 5.1c): the small rules of the drug group card in the editor,
 * kept in a plain file so they are checked without a screen (roshettaDrugLines.check.js).
 *
 *   drugLines(row, libraryIds)     the name lines of a drug group, main drug first, then partners
 *   drugDetail(line)               the grey line under a name (generic, strength, form)
 *   switchChip(row, partnerIndex)  the group with that chip switched, or null for a bad index
 *   removeDrugAction(row, pos)     what removing the drug at `pos` means for the editor
 *
 * libraryIds is a Set of the brand ids in the drug library, or null / undefined while the library
 * is not loaded. A drug is only "no longer available" when the library IS loaded and its id is not
 * in it (plan assumption H and I): the roshetta keeps the name it had when the drug was added.
 */

import { removeDrug, switchJoiner } from './roshettaRows.js';

const NO_NAME = 'Unnamed drug';

function textOrNull(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function lineFrom(source, position, joiner, libraryIds) {
  const id = source?.brand_id ?? null;
  const available = libraryIds instanceof Set ? libraryIds.has(id) : true;
  return {
    position,
    id,
    name: textOrNull(source?.brand_name) ?? NO_NAME,
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
  return [line.genericName, line.concentration, line.form].filter(Boolean).join(' \u00B7 ');
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
