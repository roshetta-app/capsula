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

// The library group a patient group on the sheet belongs to: the one it is
// linked to by id, or else the one with the same patient group name (a blank
// name matches the library's unnamed group). A dose typed by hand, copied from
// an older sheet, or whose link was lost is still recognised this way, so it is
// not wrongly treated as 'not in library' and saved a second time.
export function findLibraryPopulation(group, libraryPops) {
  if (!Array.isArray(libraryPops)) return null
  if (group?.dose_max_population_id) {
    const byId = libraryPops.find(p => p.id === group.dose_max_population_id)
    if (byId) return byId
  }
  const wanted = norm(group?.dose_who).toLowerCase()
  return libraryPops.find(p => norm(p.population).toLowerCase() === wanted) ?? null
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
  const libPop = findLibraryPopulation(group, libraryPops)
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

// Builds the library group's bands when saving a patient group from the sheet.
// The result is exactly the sheet's bands, in the sheet's order. A band keeps
// its library id when the sheet line is linked to one, or when it has the same
// wording as a library band that no other line has claimed; only genuinely new
// wording gets a new id. So saving can never add the same band twice.
// Returns { nextBrackets, stamped } where stamped maps sheet line id -> library band id.
export function mergeBandsForSave(existingBrackets, lines, makeId) {
  const existing = Array.isArray(existingBrackets) ? existingBrackets : []
  const used = new Set()
  const nextBrackets = []
  const stamped = {}
  const same = (b, l) =>
    norm(b.bracket) === norm(l.bracket_title) &&
    norm(b.instruction) === norm(l.instruction) &&
    norm(b.note) === norm(l.note)
  for (const line of lines) {
    const match =
      (line.bracket_id && !used.has(line.bracket_id)
        ? existing.find(b => b.id === line.bracket_id) : null)
      ?? existing.find(b => !used.has(b.id) && same(b, line))
    const fields = { bracket: line.bracket_title ?? '', instruction: line.instruction ?? '', note: line.note ?? '' }
    if (match) {
      used.add(match.id)
      nextBrackets.push({ ...match, ...fields })
      stamped[line.id] = match.id
    } else {
      const id = makeId()
      used.add(id)
      nextBrackets.push({ id, ...fields })
      stamped[line.id] = id
    }
  }
  return { nextBrackets, stamped }
}
