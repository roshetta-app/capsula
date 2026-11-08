// Compares one patient group on a sheet with the drug library's version of it.
// No screen code in here, so it can be tested on its own.
//
// A patient group on a sheet remembers the library version it was copied from
// (dose_library_base, a short fingerprint). With that, a difference can be
// explained: did the sheet change, did the library change, or both?

const norm = v => (v ?? '').toString().trim()

// Short, stable text for a piece of text (not secret, just compact).
function shortHash(text) {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

// A dose is: who it is for, the max dose, and its dose bands in order.
// Only bands that have a dose written count (the library never holds others).
function fingerprint(who, max, bands) {
  const kept = bands
    .map(b => [norm(b.title), norm(b.instruction), norm(b.note)])
    .filter(b => b[1] !== '')
  return shortHash(JSON.stringify([norm(who), norm(max), kept]))
}

// Fingerprint of a patient group as it stands on the sheet.
export function fingerprintGroup(group) {
  const bands = (group?.dose_lines ?? []).map(l => ({
    title: l.bracket_title,
    instruction: l.instruction ?? l.text,
    note: l.note,
  }))
  return fingerprint(group?.dose_who, group?.dose_max, bands)
}

// Fingerprint of a patient group as the library holds it.
export function fingerprintLibraryPopulation(population) {
  const brackets = Array.isArray(population?.brackets) ? population.brackets : []
  const bands = brackets.map(b => ({ title: b.bracket, instruction: b.instruction, note: b.note }))
  return fingerprint(population?.population, population?.max_dose, bands)
}

// True when there is something on the sheet for this group.
export function groupHasDose(group) {
  return (group?.dose_lines ?? []).some(l =>
    norm(l.bracket_title) || norm(l.instruction ?? l.text) || norm(l.note)
  ) || norm(group?.dose_max) !== ''
}

// True when the library already holds a dose (a band or a max dose) for the drug.
export function libraryHasDose(libraryPops) {
  return Array.isArray(libraryPops) && libraryPops.some(p =>
    (Array.isArray(p.brackets) && p.brackets.length > 0) || norm(p.max_dose) !== '')
}

// The state of a patient group compared with the library:
//   null            nothing to say (library not loaded yet, or nothing typed)
//   'new'           not in the library
//   'saved'         same as the library
//   'you_changed'   the sheet changed, the library still has the version it was copied from
//   'library_newer' the library changed, the sheet still has what it copied
//   'both'          both changed since the copy
//   'differs'       different, and the copied version is not remembered (older sheets)
export function groupLibraryState(group, libraryPops) {
  if (!Array.isArray(libraryPops)) return null
  if (!groupHasDose(group)) return null
  const libPop = group?.dose_max_population_id
    ? libraryPops.find(p => p.id === group.dose_max_population_id)
    : null
  if (!libPop) return 'new'
  const sheetFp = fingerprintGroup(group)
  const libFp = fingerprintLibraryPopulation(libPop)
  if (sheetFp === libFp) return 'saved'
  const base = group?.dose_library_base
  if (!base) return 'differs'
  if (sheetFp === base) return 'library_newer'
  if (libFp === base) return 'you_changed'
  return 'both'
}

export const STATE_WORDS = {
  new: 'Not in library',
  saved: 'In library',
  you_changed: 'You changed this',
  library_newer: 'Library has a newer version',
  both: 'Both changed',
  differs: 'Differs from library',
}

// Which buttons a state offers.
export function stateActions(state) {
  return {
    save: state === 'new' || state === 'you_changed' || state === 'both' || state === 'differs',
    useLibrary: state === 'library_newer' || state === 'both' || state === 'differs',
  }
}
