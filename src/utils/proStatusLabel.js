// Settings card for a person who is already Pro: what to say and whether the card opens the Upgrade page.
// Lifetime (or no end date) says just "plan" and is not tappable. A trial says how many days are left.
// A paid plan says when it ends. Both can open the Upgrade page, where paying early adds time.
const DAY_MS = 24 * 60 * 60 * 1000

export function proStatusLabel(profile, now = new Date()) {
  const plan = profile?.pro_plan
  const end = profile?.pro_end ? new Date(profile.pro_end) : null
  if (!plan || plan === 'lifetime' || !end || Number.isNaN(end.getTime())) {
    return { text: 'plan', tappable: false }
  }
  if (plan === 'trial') {
    const days = Math.max(1, Math.ceil((end.getTime() - now.getTime()) / DAY_MS))
    return { text: days === 1 ? 'free trial \u00b7 1 day left' : `free trial \u00b7 ${days} days left`, tappable: true }
  }
  const date = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Cairo' })
  return { text: `plan \u00b7 until ${date}`, tappable: true }
}
