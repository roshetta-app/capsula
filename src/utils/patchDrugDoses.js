// Swaps the doses of one library drug (formulation) inside the app's drug list.
// Every brand of that formulation carries its own copy of the doses, so all of
// them are changed; every other drug is returned as it was (same object), and
// an unknown id returns the same list. Pure, never changes its input.
export function patchDrugDoses(drugs, formulationId, populations) {
  if (!Array.isArray(drugs) || !formulationId) return drugs
  const doses = Array.isArray(populations) ? populations : []
  let changed = false
  const next = drugs.map(d => {
    if (d?.formulationId !== formulationId) return d
    changed = true
    return { ...d, doses }
  })
  return changed ? next : drugs
}
