/**
 * src/constants/drugCategories.js
 * Phase 2F — Drug category icon and color mapping.
 * Used by DrugCategoryRow on the Drugs screen.
 * Icons: FontAwesome class names (fa-* strings).
 */

export const DRUG_CATEGORY_META = {
  'antibiotic':               { icon: 'fa-bacteria',        color: '#FEF3C7', textColor: '#92400E' },
  'antifungal':               { icon: 'fa-circle-radiation', color: '#EDE9FE', textColor: '#5B21B6' },
  'antiviral':                { icon: 'fa-virus',            color: '#DBEAFE', textColor: '#1E40AF' },
  'antiparasitic':            { icon: 'fa-bug',              color: '#D1FAE5', textColor: '#065F46' },
  'analgesic-nsaid':          { icon: 'fa-pills',            color: '#FFF7ED', textColor: '#9A3412' },
  'cardiovascular':           { icon: 'fa-heart-pulse',      color: '#FFF1F2', textColor: '#9F1239' },
  'respiratory':              { icon: 'fa-lungs',            color: '#F0F9FF', textColor: '#0C4A6E' },
  'gastrointestinal':         { icon: 'fa-stomach',          color: '#FDF4FF', textColor: '#6B21A8' },
  'endocrine-metabolic':      { icon: 'fa-dna',              color: '#ECFDF5', textColor: '#064E3B' },
  'neurological-psychiatric': { icon: 'fa-brain',            color: '#F5F3FF', textColor: '#4C1D95' },
  'musculoskeletal':          { icon: 'fa-bone',             color: '#FFF7ED', textColor: '#9A3412' },
  'vitamins-minerals':        { icon: 'fa-capsules',         color: '#F7FEE7', textColor: '#3F6212' },
  'dermatological':           { icon: 'fa-hand-dots',        color: '#FDF4FF', textColor: '#6B21A8' },
  'ophthalmic-otic':          { icon: 'fa-eye',              color: '#ECFEFF', textColor: '#164E63' },
  'urological':               { icon: 'fa-kidneys',          color: '#EFF6FF', textColor: '#1E40AF' },
  'obstetric-gynecological':  { icon: 'fa-venus',            color: '#FDF2F8', textColor: '#831843' },
  'other':                    { icon: 'fa-pills',            color: '#F3F4F6', textColor: '#374151' },
}

export function getCategoryMeta(category) {
  return DRUG_CATEGORY_META[category] ?? { icon: 'fa-pills', color: '#F3F4F6', textColor: '#374151' }
}
