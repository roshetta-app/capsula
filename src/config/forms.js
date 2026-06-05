export const DRUG_FORMS = [
  { value: 'tablet' },
  { value: 'capsule' },
  { value: 'syrup' },
  { value: 'suspension' },
  { value: 'drops' },
  { value: 'injection' },
  { value: 'cream' },
  { value: 'ointment' },
  { value: 'gel' },
  { value: 'suppository' },
  { value: 'inhaler' },
  { value: 'patch' },
  { value: 'sachet' },
  { value: 'solution' },
  { value: 'other' },
].map(f => ({
  ...f,
  label: f.value.charAt(0).toUpperCase() + f.value.slice(1),
}))

export const DRUG_ROUTES = [
  { value: 'oral',     label: 'Oral' },
  { value: 'iv',       label: 'IV' },
  { value: 'im',       label: 'IM' },
  { value: 'topical',  label: 'Topical' },
  { value: 'inhaled',  label: 'Inhaled' },
  { value: 'rectal',   label: 'Rectal' },
  { value: 'ocular',   label: 'Ocular' },
  { value: 'otic',     label: 'Otic' },
  { value: 'other',    label: 'Other' },
]
