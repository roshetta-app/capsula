// Checks for utils/profileView.js, noindex.js and the 14.7b files (step 14.7b): the rules behind the
// public profile page and the lists on the Profile tab.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  PROFILE_WORDS, shortDate, profileLinkFor, profileShareMessage, profileCopyText, defaultTab, tabsFor,
  capLine, itemLine, emptyLine, profilePageState, problemText, forwardTarget, safeColor,
} from './profileView.js'
import { setNoIndex } from './noindex.js'

const section = (total, n) => ({ total, items: Array.from({ length: n }, (_, i) => ({ name: `x${i}`, drugCount: 1, createdAt: null, code: `c${i}` })) })

test('the link is <site>/u/<username>, with or without a closing slash on the site', () => {
  assert.equal(profileLinkFor('https://a.io/capsula/', 'sara-ahmed'), 'https://a.io/capsula/u/sara-ahmed')
  assert.equal(profileLinkFor('https://a.io/capsula', 'sara-ahmed'), 'https://a.io/capsula/u/sara-ahmed')
})

test('the share message carries the name and username only, and falls back to the username', () => {
  const m = profileShareMessage('  Dr   Sara ', 'sara-ahmed', 'https://x/u/sara-ahmed')
  assert.equal(m.title, 'Dr Sara on Capsula')
  assert.ok(m.text.includes('Dr Sara') && !/roshetta|drug group/i.test(m.text.replace('the drug reference', '')))
  assert.equal(profileShareMessage('', 'sara-ahmed', 'u').title, '@sara-ahmed on Capsula')
  assert.ok(profileCopyText(m).endsWith('https://x/u/sara-ahmed'))
})

test('Roshettas is the default tab; Drug groups only when it is the only public thing', () => {
  assert.equal(defaultTab({ roshettas: section(2, 2), groups: section(5, 5) }), 'roshettas')
  assert.equal(defaultTab({ roshettas: section(0, 0), groups: section(1, 1) }), 'groups')
  assert.equal(defaultTab({ roshettas: section(0, 0), groups: section(0, 0) }), 'roshettas')
  assert.equal(defaultTab(null), 'roshettas')
})

test('the tabs carry the true totals', () => {
  assert.deepEqual(tabsFor({ roshettas: section(73, 50), groups: section(0, 0) }).map(t => [t.key, t.total]), [['roshettas', 73], ['groups', 0]])
})

test('the cap line appears only when the list is cut short, and says the true total', () => {
  assert.equal(capLine(section(73, 50)), 'Showing the newest 50 of 73')
  assert.equal(capLine(section(50, 50)), '')
  assert.equal(capLine(section(0, 0)), '')
  assert.equal(capLine(null), '')
})

test('an item line gives the drug count (singular too) and a short date', () => {
  assert.equal(itemLine({ drugCount: 1, createdAt: null }), '1 drug')
  assert.equal(itemLine({ drugCount: 0, createdAt: 'nonsense' }), '0 drugs')
  assert.match(itemLine({ drugCount: 5, createdAt: '2026-11-12T12:00:00Z' }), /^5 drugs \u00B7 1[12] Nov$/)
  assert.equal(shortDate(''), '')
  assert.equal(shortDate(undefined), '')
})

test('empty lists: a visitor and the owner read different lines', () => {
  assert.equal(emptyLine('roshettas', false), 'Nothing public yet')
  assert.equal(emptyLine('groups', false), 'Nothing public yet')
  assert.equal(emptyLine('roshettas', true), 'Nothing public yet. Make a roshetta public to show it here.')
  assert.equal(emptyLine('groups', true), 'Nothing public yet. Make a drug group public to show it here.')
})

test('every answer maps to one page state, and every problem state has words', () => {
  for (const s of ['ok', 'not_found', 'hidden', 'too_many', 'offline', 'error']) assert.equal(profilePageState({ status: s }), s)
  assert.equal(profilePageState(undefined), 'loading')
  assert.equal(profilePageState({ status: 'weird' }), 'loading')
  assert.equal(problemText('too_many').title, 'Too many tries')
  assert.equal(problemText('not_found').title, 'Profile not found')
  assert.equal(problemText('offline').action, 'retry')
  assert.equal(problemText('error').action, 'retry')
  assert.equal(problemText('too_many').action, 'open')
  for (const s of ['too_many', 'not_found', 'offline', 'error']) {
    const t = problemText(s)
    assert.ok(t.title && t.body && t.actionLabel && !/undefined|null/.test(t.title + t.body))
  }
})

test('an old username forwards to the current one, never loops, never forwards a failure', () => {
  assert.equal(forwardTarget({ status: 'ok', profile: { handle: 'sara-new' } }, 'sara-old'), 'sara-new')
  assert.equal(forwardTarget({ status: 'ok', profile: { handle: 'Sara-New' } }, 'sara-new'), null)
  assert.equal(forwardTarget({ status: 'not_found' }, 'x'), null)
  assert.equal(forwardTarget(null, 'x'), null)
})

test('a group colour is used only when it is a plain hex colour', () => {
  assert.equal(safeColor('#1a2b3c'), '#1a2b3c')
  assert.equal(safeColor('red; background:url(x)'), null)
  assert.equal(safeColor(null), null)
})

test('the safety line and the owner line match the plan', () => {
  assert.equal(PROFILE_WORDS.safety, 'Titles are written by the person and are not checked by Capsula.')
  assert.equal(PROFILE_WORDS.ownerTitle, 'This is your profile')
})

test('noindex adds one robots tag and removes it again', () => {
  const head = { children: [], appendChild(n) { n.parentNode = this; this.children.push(n) }, removeChild(n) { this.children = this.children.filter(c => c !== n); n.parentNode = null } }
  const doc = { head, createElement: () => ({ attrs: {}, setAttribute(k, v) { this.attrs[k] = v } }) }
  const undo = setNoIndex(doc)
  assert.equal(head.children.length, 1)
  assert.deepEqual(head.children[0].attrs, { name: 'robots', content: 'noindex' })
  undo()
  assert.equal(head.children.length, 0)
  assert.doesNotThrow(() => setNoIndex(null)())
})

test('new public profile code never writes to the phone (no local storage, session storage, browser database or cache)', () => {
  const files = [
    'profileView.js', 'noindex.js', 'shareProfileLink.js', 'publicProfileFetch.js', 'publicProfile.js',
    '../pages/PublicProfileScreen.jsx', '../components/profile/PublicProfileView.jsx',
  ]
  for (const f of files) {
    const code = readFileSync(new URL(f, import.meta.url), 'utf8')
    assert.ok(!/localStorage|sessionStorage|indexedDB|caches\.|Preferences\.set/.test(code), f)
  }
})

test('14.9: a hidden profile reads Not available, different from Profile not found, and offers Open Capsula', () => {
  const t = problemText('hidden');
  assert.equal(t.title, 'Not available');
  assert.notEqual(t.title, problemText('not_found').title);
  assert.equal(t.action, 'open');
});
