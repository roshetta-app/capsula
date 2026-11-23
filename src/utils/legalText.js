/**
 * src/utils/legalText.js
 * 2026-11-22 (Public profile plan, step 14.10): the words of the Terms of Use, the Privacy Policy
 * and the delete-account warning, as plain data. Nothing here touches the phone, the network or
 * the screen: LegalScreen.jsx draws it and DeleteAccountSheet.jsx shows the warning.
 *
 * EVERY CLAIM BELOW WAS CHECKED AGAINST THE LIVE DATABASE AND THE APP ON 2026-11-22 (what is stored,
 * what deleting an account removes, what is public). When the app changes, this text changes with it:
 * the plan keeps the list of things to re-read (Track E1). It is NOT lawyer-reviewed yet (plan E2).
 * 2026-11-23 (Track I, step I6): the lines about reports on Topic and drug pages and their optional note
 * (checked against the live reports table: the note stays after the report is closed and after the reporter
 * deletes the account; only the name is removed). No keeping time is stated because none is decided yet.
 *
 * 2026-11-23 (Track H, step H5): the lines about anonymous unique view counts (checked against the live database:
 * view_counts holds item, day and a number only; today's visitor codes are one-way hashes with a server secret, hold
 * no account, and are cleared nightly; day numbers older than 90 days are added into one total per item; deleting a
 * roshetta, a drug group or an account removes its counts). They replace the idea of "no visitor tracking".
 *
 * 2026-11-23 (Track H, step H7c): the lines about stars (checked against Migration 10 and its test: a star is kept as
 * account + item + time, one per person, never readable by the app, removed on un-star, account deletion and item deletion,
 * hidden while the item is private and back when it is public again, the count is public).
 *
 * 2026-11-23 (Track H, step H6c): the lines about the saved-copy count (checked against the live database and Migration 9:
 * a copy stores the code of the link it came from; one copy per person per link; the owner gets a number only through
 * owner_item_views, never a name or id; a deleted copy or account stops counting).
 *
 * Who runs Capsula and how to reach them are not known to the app. Fill in OPERATOR_NAME and
 * CONTACT_EMAIL below; while they are empty their lines are simply left out (nothing invented).
 */

export const LEGAL_UPDATED = '2026-11-23'
export const OPERATOR_NAME = ''
export const CONTACT_EMAIL = ''

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// '2026-11-22' -> '22 November 2026'. Anything else comes back unchanged.
export function updatedLine(iso = LEGAL_UPDATED) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso))
  if (!m) return String(iso)
  const month = MONTHS[Number(m[2]) - 1]
  if (!month) return String(iso)
  return `Last updated ${Number(m[3])} ${month} ${m[1]}`
}

// The one line about who is behind the app; empty facts leave it out.
function whoLines({ operator = OPERATOR_NAME, email = CONTACT_EMAIL } = {}) {
  const lines = []
  if (operator) lines.push(`Capsula is run by ${operator}.`)
  if (email) lines.push(`You can contact us at ${email}.`)
  return lines
}

// What the delete-account sheet says. Checked to match what the database really does on deletion.
export const DELETE_ACCOUNT_WARNING =
  'This permanently deletes your profile, roshettas and drug groups with their links, favourites, notes, search history and recent views. '
  + 'Your username stays reserved and is never given to anyone else. Usage records stay, without your account attached. '
  + "This can't be undone. Type DELETE below to confirm."

// A section is { title, paragraphs: [text], list?: [text] }.
export function termsSections(facts) {
  return [
    {
      title: 'About Capsula',
      paragraphs: [
        'Capsula is a reference app about medicines and medical topics, mainly for people who work or study in healthcare. By signing in or using it you agree to these terms.',
        ...whoLines(facts),
      ],
    },
    {
      title: 'Information only, not medical advice',
      paragraphs: [
        'What Capsula shows is for information. It can contain mistakes or be out of date. It does not replace your own judgement, the product label, official guidelines or a qualified professional. You are responsible for how you use it.',
      ],
    },
    {
      title: 'Your account',
      paragraphs: [
        'You sign in with your Google account. Keep it secure. You are responsible for what is done with your account.',
      ],
    },
    {
      title: 'What you write',
      paragraphs: [
        'Your roshettas, drug groups and notes are yours. Doses and text in a roshetta are written by you. Capsula does not check them.',
        'Write plain text only. Do not put patient names or anything else that identifies a patient.',
      ],
    },
    {
      title: 'Public items and your public profile',
      paragraphs: [
        'Everything is private unless you make it public. A public roshetta or drug group has a link and appears on your public profile with your name and username. Your profile also has its own link.',
        'Anyone with a link can view the item, save their own copy and change that copy. A copy belongs to whoever saved it, and changes they make do not change your original.',
        'The person who made a public item can see an approximate count of how many visitors opened it, with repeat visits on the same day counted once. Capsula does not show who visited.',
        'The person who made a public item can also see how many other people saved a copy from its link. Capsula does not show who saved it.',
        'A signed-in person can star a public item they did not make. The number of stars is public: anyone who opens the link sees it. Capsula does not show who starred.',
        'Links you shared before public profiles existed keep working until you stop sharing them.',
        'Titles such as "Dr" are written by the person and are not checked by Capsula. You can use a nickname instead of your real name.',
        'When you make an item private, its link stops working for new visits at once. Someone who already opened it may still see what they loaded, and anyone who saved a copy keeps their copy.',
      ],
    },
    {
      title: 'Rules',
      paragraphs: ['Do not use Capsula to:'],
      list: [
        'pretend to be another person or organisation, or choose a name or username that does so',
        'post wrong or dangerous medical content, spam, advertising, or offensive material',
        'put web addresses or phone numbers in a name, bio, or the name or description of a public item',
        'guess or collect other people\'s usernames, or try to break or overload the app',
      ],
    },
    {
      title: 'Reports and removal',
      paragraphs: [
        'Anyone who is signed in can report a public roshetta, drug group or profile. The person who made it is never told who reported.',
        'You can also report a problem on a Topic or a drug page: wrong information, something missing or something broken. You may add a short note in plain text. Do not put patient details or other personal information in it. A report about one of our own pages never hides it. It only reaches us, and we may not reply.',
        'A public roshetta or drug group is hidden automatically when enough different accounts report it. We can also hide any item or profile ourselves. A hidden item\'s link reads "Not available".',
        'If something of yours is hidden, your own page tells you and you can ask for one review. Our answer after that review is final.',
        'We may turn off public sharing for an account, or take a username back for good, without telling you first. Your account and your private things keep working.',
      ],
    },
    {
      title: 'Deleting your account',
      paragraphs: [
        'You can delete your account at any time from Edit profile. It is permanent. The Privacy Policy lists what is removed and what stays.',
      ],
    },
    {
      title: 'Changes',
      paragraphs: [
        'We may change the app or these terms. The date at the top shows when they last changed. If you keep using Capsula after a change, you accept it.',
      ],
    },
  ]
}

export function privacySections(facts) {
  return [
    {
      title: 'About this policy',
      paragraphs: [
        'This explains what Capsula keeps about you, what is public, and what happens when you delete your account.',
        ...whoLines(facts),
      ],
    },
    {
      title: 'What we keep',
      paragraphs: [],
      list: [
        'Sign-in: your email address, name and photo come from your Google account. The photo is only shown to you in the app.',
        'Your details: your name, occupation and specialty, country, gender, and phone number if you add one (the phone number is optional), and your theme choice.',
        'Your public profile: your username, a short bio and an avatar. Your name is also shown there.',
        'Your content: favourites, favourite classes, notes, roshettas, drug groups and their share links.',
        'Your activity: your drug search history and recently viewed items, and a usage record of what you open in the app, with a device code, a session code and the type of device.',
        'Notifications: a code that lets us send notifications to your device, with the type of device.',
        'Reports you send: which item or page, the reason and the day. The person who made the item never sees who reported. The people who run Capsula see how old the reporting accounts are, not who they are.',
        'Notes on page reports: when you report a problem on a Topic or drug page, the optional note (up to 300 letters) is kept with the report. Only the people who run Capsula see it. It is kept after the report is closed and after you delete your account, without your name.',
        'Alerts to our team: when a report arrives, a short alert is sent by email, through Resend, an email service, to the people who run Capsula. It says the kind of page or item, the reason, how many reports and a link to the review screen. It holds no names, notes or account details.',
        'View counts: for each public roshetta and drug group, how many visitors opened it each day, as a number only. The day by day numbers are held for 90 days and then added into one running total for that item. Only the person who made the item sees them. Your own visits while signed in are not counted.',
        'Saved copies: a copy you save remembers which link it came from, so the same link cannot be saved twice by you. The person who made the original sees only how many other people hold a copy, never who. If you delete your copy or your account, you are no longer counted.',
        'Stars: when you star a public roshetta or drug group, Capsula keeps your account, the item and the time, so one account can star an item only once and your star can be taken back. Only the people who run Capsula can see this record; the app never shows who starred, and everyone sees only the number. Taking back your star, deleting your account or deleting the item removes the star. If the item is made private, its stars are not shown, and they show again if it becomes public again.',
        'Crash records: the technical error and the app version. They are not linked to your account.',
        'Username checks: how many times you check whether a username is free, so that guessing can be stopped.',
      ],
    },
    {
      title: 'What is public',
      paragraphs: [
        'Only what you make public: the items you choose, your name, your username, your bio and your avatar. Everything else stays private.',
        'The number of stars on a public item is public. Who starred it is not shown in the app.',
        'The people who run Capsula can see your account details, including your phone number if you gave one.',
        'Opening a public link needs no account. We keep no list of who opened what. When someone looks up a username that does not exist, the lookup is counted under a scrambled code made from their address and the day, and this is cleared every night. It is used only to stop guessing.',
        'We count visits without knowing who visited. After a public page has stayed open for a couple of seconds, one is added to its count for the day. To avoid counting the same visitor twice in a day, we keep a scrambled code made from the visitor\'s address, the item and the day, and a scrambled form of the address that limits how many items one address can add in a day. These codes cannot be turned back into the address, are not linked to any account, and are cleared every night. Nothing about the count is saved on the visitor\'s phone. The numbers are approximate: people on one shared network can count as one.',
      ],
    },
    {
      title: 'How we use it',
      paragraphs: [
        'To run the app and keep your things in your account, to review reports, to show owners how many visitors opened their public items, how many people saved a copy and how many starred it, and to understand how the app is used.',
        'Your phone number is used to reach you about your plan. It is not used for offers unless you tick "Send me offers and deals", which is off until you choose it. We record the date you ticked it, and you can untick it at any time.',
      ],
    },
    {
      title: 'Deleting your account',
      paragraphs: [
        'You can delete your account at any time from Edit profile. It is permanent.',
        'Removed: your profile, roshettas and drug groups with their links, view counts and stars, the stars you gave, favourites, favourite classes, notes, search history, recent views and notification codes.',
        'Stays: usage records, without your account attached (the device code and session code stay on them). Reports you sent, with any note you wrote, without your name. Your username, which stays reserved so nobody else can take it and old links never lead to someone else.',
        'If someone saved a copy of one of your public roshettas or drug groups, they keep their copy.',
      ],
    },
    {
      title: 'Your choices',
      paragraphs: [],
      list: [
        'Change your details and public profile in Edit profile.',
        'Make any public item private from its share sheet or your profile.',
        'Remove your public profile in Edit profile. Your items stay private.',
        'Untick offers and deals in Edit profile.',
        'Delete your account.',
      ],
    },
    {
      title: 'Changes',
      paragraphs: [
        'We may change this policy. The date at the top shows when it last changed.',
      ],
    },
  ]
}

// kind: 'terms' | 'privacy'. Anything else gives null.
export function legalDocument(kind, facts) {
  if (kind === 'terms') return { title: 'Terms of Use', updated: updatedLine(), sections: termsSections(facts) }
  if (kind === 'privacy') return { title: 'Privacy Policy', updated: updatedLine(), sections: privacySections(facts) }
  return null
}
