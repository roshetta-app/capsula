// Static mirror of the live `form_modifier_lookup` database table
// (drug_card_title_suffix plan, step B.2 / plan §2) — hardcoded rather than
// fetched, matching how forms.js / categories.js already work as static
// config. These are the only form_modifier tags with a known abbreviation;
// any tag not listed here (e.g. "scored") has no entry and is dropped
// silently by the card title formula (decision 4.41) — do not add a
// fallback entry for it here.
export const FORM_MODIFIERS = [
  { tag: 'chewable',            displayName: 'Chewable',           abbreviation: 'Chew' },
  { tag: 'controlled_release',  displayName: 'Controlled release', abbreviation: 'CR' },
  { tag: 'delayed_release',     displayName: 'Delayed release',    abbreviation: 'DR' },
  { tag: 'effervescent',        displayName: 'Effervescent',       abbreviation: 'Eff' },
  { tag: 'enteric_coated',      displayName: 'Enteric-coated',     abbreviation: 'EC' },
  { tag: 'extended_release',    displayName: 'Extended release',   abbreviation: 'ER' },
  { tag: 'film_coated',         displayName: 'Film-coated',        abbreviation: 'FC' },
  { tag: 'modified_release',    displayName: 'Modified release',   abbreviation: 'MR' },
  { tag: 'prolonged_release',   displayName: 'Prolonged release',  abbreviation: 'PR' },
  { tag: 'soft_gel',            displayName: 'Soft gel',           abbreviation: 'SG' },
  { tag: 'sugar_free',          displayName: 'Sugar-free',         abbreviation: 'SF' },
  { tag: 'sustained_release',   displayName: 'Sustained release',  abbreviation: 'SR' },
]

// Quick tag → abbreviation lookup for the card title formula, so callers
// don't have to .find() the array above on every render.
export const FORM_MODIFIER_ABBREVIATIONS = FORM_MODIFIERS.reduce((acc, m) => {
  acc[m.tag] = m.abbreviation
  return acc
}, {})
