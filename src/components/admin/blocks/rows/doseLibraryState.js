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

// ── Several drugs sharing one dose ──────────────────────────────────────────
// A group on a sheet can hold several drugs that share one dose. The library
// keeps doses per drug (per formulation), so each drug has its own entry.
// Brands of the same formulation count as ONE drug.

// A short name for a drug option, e.g. 'Rocephin 1 g vial'. The brand name comes
// first (it is what the doctor recognises); the generic name is only the fallback
// for a drug that has no brand name.
export function optionLabel(o) {
  const name = norm(o?.brand_name) || norm(o?.generic_name) || norm(o?._formulationMeta?.name_en)
  if (!name) return ''
  const extra = [o?._formulationMeta?.concentration, o?._formulationMeta?.form].map(norm).filter(Boolean).join(' ')
  return extra ? `${name} ${extra}` : name
}

// The distinct library drugs of a group (in order) and the names of the
// options that are not in the library (free text).
export function groupDrugs(options) {
  const seen = new Map()
  const unlinked = []
  for (const o of Array.isArray(options) ? options : []) {
    const fid = o?.formulation_id
    if (!fid) {
      const label = optionLabel(o)
      if (label) unlinked.push(label)
      continue
    }
    if (!seen.has(fid)) seen.set(fid, { formulationId: fid, label: optionLabel(o) || 'This drug' })
  }
  return { drugs: [...seen.values()], unlinked }
}

// The drug the sheet's patient group is linked to: the first option's library
// entry, or else the first drug of the group that has one.
export function primaryFormulationId(group) {
  const opts = Array.isArray(group?.options) ? group.options : []
  return opts[0]?.formulation_id || opts.find(o => o?.formulation_id)?.formulation_id || null
}

// How the sheet's patient group compares with ONE drug's library entry, and
// what saving to it would do. The sheet's link ids (patient group id, band ids,
// remembered copy) belong to the primary drug only; for any other drug they
// are ignored and the library group is found by patient group name.
//   state     as groupLibraryState (null when not loaded or nothing typed)
//   libPop    that drug's library group for this patient group, or null
//   summary   plain words for what saving would change ('' if nothing)
//   canSave / canUse   which buttons the state offers
//   ticked    saving is ticked by default: the group is new to that drug, or
//             only the sheet changed since it was copied from there
export function drugSaveStatus(group, libraryPops, isPrimary) {
  const g = isPrimary
    ? group
    : {
        ...group,
        dose_max_population_id: null,
        dose_library_base: null,
        dose_lines: (group?.dose_lines ?? []).map(l => ({ ...l, bracket_id: null })),
      }
  const state = groupLibraryState(g, libraryPops)
  const libPop = Array.isArray(libraryPops) ? findLibraryPopulation(g, libraryPops) : null
  const summary = libPop && state && state !== 'saved'
    ? summarizeDifferences(describeDifferences(g, libPop, 'save'))
    : ''
  const actions = stateActions(state)
  return {
    state,
    libPop,
    summary,
    canSave: actions.save,
    canUse: actions.useLibrary,
    ticked: state === 'new' || state === 'you_changed',
  }
}

// One plain sentence for a drug's line in the save list.
export function drugSaveNote(state, summary) {
  const detail = summary ? ` (${summary})` : ''
  if (state === 'new') return 'Not in the library yet. It will be added.'
  if (state === 'you_changed') return `Updates the library with your changes${detail}.`
  if (state === 'both') return `Also changed in the library; those changes are replaced${detail}.`
  if (state === 'differs') return `The library has a different dose${detail}. Saving replaces it for everyone.`
  if (state === 'saved') return 'Already the same. No change.'
  return 'Checking the library…'
}

// The dose fields of a library pick without any link to that library entry
// (used when a dose is copied from a drug the sheet is not linked to).
export function withoutLibraryLinks(fields) {
  return {
    ...fields,
    dose_max_population_id: null,
    dose_library_base: null,
    dose_lines: (fields?.dose_lines ?? []).map(l => ({ ...l, bracket_id: null })),
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

// ── What would change? ──────────────────────────────────────────────────────
// Short name for a dose band, used in messages.
export function bandLabel(b) {
  const title = norm(b.bracket_title ?? b.bracket ?? b.title)
  const text = norm(b.instruction ?? b.text)
  const label = title || text
  return label.length > 28 ? `${label.slice(0, 27)}…` : label
}

// Pairs the sheet's bands with the library group's bands: first by library id,
// then by identical wording. Returns the pairs and whatever is left over on
// each side.
function pairBands(group, libPop) {
  const sheet = (group?.dose_lines ?? [])
    .map(l => ({ title: norm(l.bracket_title), instruction: norm(l.instruction ?? l.text), note: norm(l.note), id: l.bracket_id ?? null }))
    .filter(l => l.instruction !== '')
  const lib = (Array.isArray(libPop?.brackets) ? libPop.brackets : [])
    .map(b => ({ title: norm(b.bracket), instruction: norm(b.instruction), note: norm(b.note), id: b.id ?? null }))
    .filter(b => b.instruction !== '')
  const pairs = []
  const sheetLeft = []
  const libLeft = [...lib]
  for (const l of sheet) {
    const i = l.id ? libLeft.findIndex(b => b.id === l.id) : -1
    if (i >= 0) { pairs.push([l, libLeft[i]]); libLeft.splice(i, 1) } else sheetLeft.push(l)
  }
  const sheetOnly = []
  for (const l of sheetLeft) {
    const i = libLeft.findIndex(b => b.title === l.title && b.instruction === l.instruction && b.note === l.note)
    if (i >= 0) { pairs.push([l, libLeft[i]]); libLeft.splice(i, 1) } else sheetOnly.push(l)
  }
  return { pairs, sheetOnly, libOnly: libLeft }
}

// What saving ('save': the library becomes the sheet) or replacing ('use': the
// sheet becomes the library) would change, from the point of view of whatever
// is being overwritten. Lists hold short band names.
export function describeDifferences(group, libPop, direction) {
  const { pairs, sheetOnly, libOnly } = pairBands(group, libPop)
  const changed = pairs
    .filter(([s, l]) => s.title !== l.title || s.instruction !== l.instruction || s.note !== l.note)
    .map(([s]) => bandLabel(s))
  const save = direction === 'save'
  return {
    added: (save ? sheetOnly : libOnly).map(bandLabel),
    removed: (save ? libOnly : sheetOnly).map(bandLabel),
    changed,
    max: norm(group?.dose_max) !== norm(libPop?.max_dose),
    name: norm(group?.dose_who) !== norm(libPop?.population),
  }
}

// One plain sentence for a confirmation, e.g.
// "adds 1 dose band, removes 1 (“>50kg”), changes the max dose". '' if nothing.
export function summarizeDifferences(d) {
  const quoted = list => (list.length > 0 && list.length <= 2 ? ` (${list.map(x => `“${x}”`).join(', ')})` : '')
  const count = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`
  const parts = []
  if (d.added.length) parts.push(`adds ${count(d.added.length, 'dose band')}${quoted(d.added)}`)
  if (d.removed.length) parts.push(`removes ${count(d.removed.length, 'dose band')}${quoted(d.removed)}`)
  if (d.changed.length) parts.push(`changes ${count(d.changed.length, 'dose band')}${quoted(d.changed)}`)
  if (d.max) parts.push('changes the max dose')
  if (d.name) parts.push('changes the patient group name')
  return parts.join(', ')
}

// ── Near-duplicate dose bands ───────────────────────────────────────────────
const squash = v => norm(v).toLowerCase().replace(/[–—]/g, '-').replace(/[^\p{L}\p{N}/.<>=≤≥+-]+/gu, '')
// The numbers and comparison signs in a text. Two bands can only look the same
// when these are identical: 500mg and 600mg, or >50kg and <50kg, are different.
const signature = v => (norm(v).replace(/[–—]/g, '-').match(/[<>=≤≥]|\d+(?:\.\d+)?/g) ?? []).join(' ')

function similarity(a, b) {
  if (a === b) return 1
  if (!a || !b) return 0
  const m = a.length, n = b.length
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return 1 - prev[n] / Math.max(m, n)
}

// For each dose band that looks the same as an EARLIER band, the number of that
// earlier band: { [lineId]: bandNumber }. 'Looks the same' = same title and the
// wording is identical once case, spaces and punctuation are ignored, or at
// least 90% alike. Bands without a dose written are ignored.
export function findNearDuplicateBands(lines) {
  const out = {}
  const list = Array.isArray(lines) ? lines : []
  for (let i = 0; i < list.length; i++) {
    const a = list[i]
    const ai = squash(a.instruction ?? a.text)
    if (!ai) continue
    for (let j = 0; j < i; j++) {
      const b = list[j]
      const bi = squash(b.instruction ?? b.text)
      if (!bi) continue
      if (squash(a.bracket_title) !== squash(b.bracket_title)) continue
      if (signature(a.bracket_title) !== signature(b.bracket_title)) continue
      if (signature(a.instruction ?? a.text) !== signature(b.instruction ?? b.text)) continue
      if (ai === bi || similarity(ai, bi) >= 0.9) { out[a.id] = j + 1; break }
    }
  }
  return out
}
