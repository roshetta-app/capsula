// The navigation rulebook (Roshetta plan, Phase K, step 12.2).
//
// One plain table with every public screen of the app: its address pattern, what kind of screen
// it is, which screen sits behind it, the short name the Back arrow shows for it, and whether it
// needs a signed-in person. Before this file each of 12 screens named its own parent and a second
// list held the names; now they all read from here, so they can never disagree.
//
// Nothing here draws anything or changes behaviour. It is plain data and small helpers with no
// React and no router in them, so the checks (navRules.check.js) can run it on its own.
// homePaths.js keeps its old exports and now reads from this file.
//
// Fields of a rule:
//   pattern     the address, with :name for a changing part (same text as in router.jsx)
//   kind        'main' (the five top screens), 'page' (a page opened from somewhere),
//               'edit' (a screen where you change or add something)
//   parent      the pattern of the screen that belongs behind it, or null for Home only
//   label       the short name the Back arrow of the NEXT screen shows for this one, and the
//               screen's name in the page title (step 12.11). Step 12.8 named the five screens
//               that had none (roshetta page, its Add and Edit screens, Account edit and FAQ).
//   signIn      true when the screen is for signed-in people only (a guest sees a sign-in card)
//   laysBehind  true when a page opened from outside (link, notification, refresh) gets its
//               parent placed behind it. Shared pages stand alone: they have their own
//               "Open Capsula" button instead.
//
// Admin screens (/admin/...) are a separate tree with their own layout and are not part of this.

export const HOME_PATH = '/'
export const TOPICS_PATH = '/conditions'
export const ACCOUNT_PATH = '/account'

// The tabs in the bottom bar, in order, as paths.
export const TAB_PATHS = ['/', '/conditions', '/drugs', '/favourites']

export const SCREENS = [
  // ── The five main screens. Back from any of them goes Home; Back from Home exits.
  { pattern: '/',                          kind: 'main', parent: null,                       label: 'Home',         signIn: false, laysBehind: true },
  { pattern: '/conditions',                kind: 'main', parent: '/',                        label: 'Topics',       signIn: false, laysBehind: true },
  { pattern: '/drugs',                     kind: 'main', parent: '/',                        label: 'Drugs',        signIn: false, laysBehind: true },
  { pattern: '/favourites',                kind: 'main', parent: '/',                        label: 'Favourites',   signIn: false, laysBehind: true },
  { pattern: '/account',                   kind: 'main', parent: '/',                        label: 'Profile',      signIn: false, laysBehind: true },

  // ── Topics side
  { pattern: '/conditions/:slug',          kind: 'page', parent: '/conditions',              label: 'Topic',        signIn: false, laysBehind: true },

  // ── Drugs side
  { pattern: '/drugs/:slug',               kind: 'page', parent: '/drugs',                   label: 'Drug',         signIn: false, laysBehind: true },
  { pattern: '/drugs/generic/:slug',       kind: 'page', parent: '/drugs',                   label: 'Generic',      signIn: false, laysBehind: true },
  { pattern: '/drugs/category/:categorySlug', kind: 'page', parent: '/drugs',                label: 'Category',     signIn: false, laysBehind: true },
  { pattern: '/drugs/browse/category',     kind: 'page', parent: '/drugs',                   label: 'Categories',   signIn: false, laysBehind: true },
  { pattern: '/drugs/browse/class',        kind: 'page', parent: '/drugs',                   label: 'Classes',      signIn: false, laysBehind: true },

  // ── My drug groups (they live on Home, so Home is behind them)
  { pattern: '/drugs/browse/groups',       kind: 'page', parent: '/',                        label: 'My groups',    signIn: false, laysBehind: true },
  { pattern: '/drugs/group/:groupId',      kind: 'page', parent: '/',                        label: 'Group',        signIn: true,  laysBehind: true },
  { pattern: '/drugs/group/:groupId/add',  kind: 'edit', parent: '/drugs/group/:groupId',    label: 'Add drugs',    signIn: true,  laysBehind: true },

  // ── My roshettas (they live on Home too)
  { pattern: '/roshettas',                 kind: 'page', parent: '/',                        label: 'My roshettas', signIn: true,  laysBehind: true },
  { pattern: '/roshetta/:id',              kind: 'page', parent: '/',                        label: 'Roshetta',           signIn: true,  laysBehind: true },
  { pattern: '/roshetta/:id/add',          kind: 'edit', parent: '/roshetta/:id',            label: 'Add drugs',           signIn: true,  laysBehind: true },
  { pattern: '/roshetta/:id/edit',         kind: 'edit', parent: '/roshetta/:id',            label: 'Editor',           signIn: true,  laysBehind: true },

  // ── Notifications (opened from the bell on Home and Topics; Home is behind it). 2026-11-24, step 1c.
  { pattern: '/notifications',             kind: 'page', parent: '/',                        label: 'Notifications', signIn: true,  laysBehind: true },

  // ── Shared pages: public, stand alone (no screen is placed behind them)
  { pattern: '/g/:code',                   kind: 'page', parent: '/',                        label: 'Group',        signIn: false, laysBehind: false },
  { pattern: '/r/:code',                   kind: 'page', parent: '/',                        label: 'Roshetta',     signIn: false, laysBehind: false },
  // 14.7b (2026-11-22): a public profile stands alone like the shared pages (Open Capsula instead of a parent).
  { pattern: '/u/:handle',                 kind: 'page', parent: '/',                        label: 'Profile',      signIn: false, laysBehind: false },

  // ── Account pages. Today no screen places Account behind them on a link arrival; the rule
  // says it should (plan rule 3), and step 12.3 is where that gets built.
  // 14.7a (2026-11-22): the Account tab is now the Profile tab. What used to be the Account screen is
  // Settings, a page opened from Profile; the FAQ is opened from Settings, so Settings is behind it.
  { pattern: '/account/settings',          kind: 'page', parent: '/account',                 label: 'Settings',      signIn: false, laysBehind: true },
  { pattern: '/account/edit',              kind: 'edit', parent: '/account',                 label: 'Edit profile',           signIn: true,  laysBehind: true },
  { pattern: '/account/faq',               kind: 'page', parent: '/account/settings',        label: 'FAQ',           signIn: false, laysBehind: true },
  // 14.10 (2026-11-22): the two legal pages are opened from Settings, like the FAQ.
  { pattern: '/account/terms',             kind: 'page', parent: '/account/settings',        label: 'Terms of Use',  signIn: false, laysBehind: true },
  { pattern: '/account/privacy',           kind: 'page', parent: '/account/settings',        label: 'Privacy Policy', signIn: false, laysBehind: true },
]

// ─── Matching an address to its rule ──────────────────────────────────────────

const parts = (path) => path.split('/').filter(Boolean)

// Every rule with its address split once, and how many fixed (not changing) parts it has.
const COMPILED = SCREENS.map((rule) => {
  const segs = parts(rule.pattern)
  return { rule, segs, fixed: segs.filter((s) => !s.startsWith(':')).length }
})

// Which rule an address belongs to, the way the router reads it: same number of parts, fixed
// parts equal (upper or lower case), and the rule with the most fixed parts wins.
// Returns { rule, params } or null (an unknown address).
export function matchScreen(pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith('/')) return null
  const segs = parts(pathname.split(/[?#]/)[0])
  let best = null
  for (const c of COMPILED) {
    if (c.segs.length !== segs.length) continue
    const params = {}
    let ok = true
    for (let i = 0; i < segs.length; i++) {
      const p = c.segs[i]
      if (p.startsWith(':')) params[p.slice(1)] = segs[i]
      else if (p.toLowerCase() !== segs[i].toLowerCase()) { ok = false; break }
    }
    if (ok && (!best || c.fixed > best.fixed)) best = { fixed: c.fixed, rule: c.rule, params }
  }
  return best ? { rule: best.rule, params: best.params } : null
}

// Put the real values into a pattern: ('/roshetta/:id', { id: '7' }) -> '/roshetta/7'.
// Returns null when a value is missing.
export function fillPattern(pattern, params) {
  let missing = false
  const out = pattern.replace(/:(\w+)/g, (_, name) => {
    if (params[name] === undefined) { missing = true; return '' }
    return params[name]
  })
  return missing ? null : out
}

// ─── Questions the rest of the app can ask ────────────────────────────────────

export function isMainScreen(pathname) {
  const m = matchScreen(pathname)
  return !!m && m.rule.kind === 'main'
}

// The screen that belongs behind this one, as a real address, or null (Home, or an unknown address).
export function parentPath(pathname) {
  const m = matchScreen(pathname)
  if (!m || m.rule.parent === null) return null
  return fillPattern(m.rule.parent, m.params)
}

// Short name of a screen, for the Back arrow of the screen opened after it (null = no name).
export function labelForPath(pathname) {
  if (!pathname) return null
  const m = matchScreen(pathname)
  return m ? m.rule.label : null
}

export function kindOf(pathname) {
  const m = matchScreen(pathname)
  return m ? m.rule.kind : null
}

export function needsSignIn(pathname) {
  const m = matchScreen(pathname)
  return !!m && m.rule.signIn
}

export function laysBehind(pathname) {
  const m = matchScreen(pathname)
  return !!m && m.rule.laysBehind
}

// The whole stack of an address, from the page up to Home: ['/roshetta/7/edit', '/roshetta/7', '/'].
// Returns null for an unknown address, a loop, or a chain that does not end at Home.
export function parentChain(pathname) {
  const chain = []
  let cur = pathname
  for (let i = 0; i < 8; i++) {
    const m = matchScreen(cur)
    if (!m || chain.includes(cur)) return null
    chain.push(cur)
    if (m.rule.parent === null) return cur === HOME_PATH ? chain : null
    cur = fillPattern(m.rule.parent, m.params)
    if (cur === null) return null
  }
  return null
}
