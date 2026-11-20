// One way to open a drug from a list (Roshetta plan, Phase K, step 12.7a; cases K5, K7).
//
// Plain code with no React so the checks can run it with fakes. The door gives it the drug and
// three small things: openPage (the tap guard's open, which returns false when it ignored a double
// tap), addRecent (the "recently viewed" writer of that screen, or nothing) and pathFor (the
// address builder). The drug is opened as one plain new step, with no flags: Back returns to the
// door at the same place. A drug is added to "recently viewed" only when the open really happened,
// so a double tap does not count twice. A drug with no slug and no id opens nothing.
export function openDrugWith(drug, { openPage, addRecent, pathFor }) {
  if (!drug) return false
  const key = drug.slug || drug.id
  if (key === undefined || key === null || key === '') return false
  const opened = openPage(pathFor(key))
  if (!opened) return false
  if (addRecent) addRecent({ id: drug.id, name: drug.genericName, slug: key })
  return true
}
