// Abbreviation lookup for formulations.route_details (drug_card_title_suffix
// plan, follow-up decision, 2026-07-20) — used to show IV/IM/SC etc. at the
// end of an injection formulation's card title.
//
// NOTE: INJECTION_ROUTE_DETAILS in config/forms.js (the admin picker's option
// list) uses 'subcutaneous' as its value, but the live data was found to
// store the short form 'sc' instead — 118 published rows use 'sc', none use
// 'subcutaneous'. Both keys are included below so the suffix renders
// correctly regardless of which one a given row (old or new) actually has.
export const ROUTE_DETAIL_ABBREVIATIONS = {
  iv:            'IV',
  im:            'IM',
  sc:            'SC',
  subcutaneous:  'SC',
  intrathecal:   'Intrathecal',   // no widely-recognized short form (4.36 philosophy)
  intravascular: 'Intravascular', // no widely-recognized short form (4.36 philosophy)
}
