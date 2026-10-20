/**
 * src/utils/groupSignOutNote.js
 * 2026-10-20 (Drug groups plan, step 17.6c): the one sentence shown before
 * someone signs out while some of their group changes have not reached
 * their account yet (waiting to be sent, or refused by the server).
 *
 * The changes are NOT lost on sign-out: the saved list stays on the phone for
 * that account and is sent the next time the same account signs in here. The
 * sentence says so plainly. Returns '' when there is nothing to say.
 */

export function signOutGroupNote({ waitingCount = 0, failedCount = 0 } = {}) {
  const total = (Number(waitingCount) || 0) + (Number(failedCount) || 0)
  if (total <= 0) return ''
  const what = total === 1 ? '1 group change hasn\u2019t' : `${total} group changes haven\u2019t`
  return `${what} reached your account yet. ${total === 1 ? 'It stays' : 'They stay'} on this phone and ${total === 1 ? 'is' : 'are'} sent when you sign back in.`
}
