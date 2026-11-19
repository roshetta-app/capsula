/**
 * src/utils/roshettaFailedText.js
 * Phase J, step 11.8: plain words for the "Changes not saved" sheet of roshettas (the roshetta
 * twin of describeFailedChange in groupSyncStatus.js). Plain functions, no screen.
 *
 *   describeFailedRoshettaChange(change, { roshettaName })  { title, reason }
 *   discardMessage(failedList)   the question text for Discard; says so when a roshetta that was
 *                                never saved will disappear with its failed create
 */

const REASON_TEXT = {
  drug_limit: 'Too many drugs for your plan.',
  roshetta_limit: "You've reached the roshetta limit.",
  read_only: 'Your roshettas are read only.',
  roshetta_gone: 'It was deleted on another device.',
  error: 'Something went wrong. Try again.',
}

const quote = t => `\u201c${t}\u201d`

export function describeFailedRoshettaChange(change, { roshettaName = null } = {}) {
  const raw = roshettaName ?? change?.data?.name ?? null
  const name = typeof raw === 'string' && raw.trim() ? quote(raw.trim()) : 'a roshetta'
  let title
  switch (change?.type) {
    case 'create': title = `New roshetta ${name}`; break
    case 'save': title = `Changes to ${name}`; break
    case 'delete': title = `Deleting ${name}`; break
    default: title = `A change to ${name}`
  }
  return { title, reason: REASON_TEXT[change?.failed?.reason] ?? REASON_TEXT.error }
}

export function discardMessage(failedList = []) {
  const lostNew = Array.isArray(failedList) && failedList.some(c => c?.type === 'create')
  return lostNew
    ? "They won't be saved, and a roshetta that was never saved is removed. Your other roshettas go back to how they were last saved."
    : "They won't be saved. Your roshettas go back to how they were last saved."
}
