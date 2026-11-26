// Google branding review: plain public pages that need no script and no sign-in.
// The app itself is one page that draws everything with JavaScript and starts with a welcome
// screen, so a checker that reads the raw page saw almost nothing. These three pages are written
// at build time from the same words the app shows (src/utils/legalText.js), so they cannot drift:
//   /about              what Capsula is, what it asks Google for, who runs it
//   /account/privacy    the Privacy Policy
//   /account/terms      the Terms of Use
// Written as about.html, account/privacy.html and account/terms.html so Cloudflare Pages serves
// them at exactly those addresses (no trailing-slash redirect). Called from prepareDist.
import fs from 'node:fs'
import path from 'node:path'
import { legalDocument, OPERATOR_NAME, CONTACT_EMAIL, updatedLine } from '../src/utils/legalText.js'

// Google Search Console ownership tag (also in index.html, the root page Google reads).
export const GOOGLE_SITE_VERIFICATION = 'cKxJuE8kDjeQ0VtXQ20BjB4PxH6G5WcymS91CY2Q5V4'

export const STATIC_PAGES = ['about.html', 'account/privacy.html', 'account/terms.html']

export function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const CSS = `
:root{color-scheme:light dark;--bg:#fff;--fg:#1a1d21;--muted:#5b6470;--line:#e3e6ea;--accent:#0b6e6e}
@media (prefers-color-scheme:dark){:root{--bg:#14171a;--fg:#eceef0;--muted:#a3abb4;--line:#2a2f35;--accent:#5cc7c7}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header,main,footer{max-width:42rem;margin:0 auto;padding:1rem 1.25rem}
header{display:flex;align-items:center;gap:.75rem;border-bottom:1px solid var(--line)}
header img{width:40px;height:40px;border-radius:9px}
header a{color:var(--fg);font-weight:700;text-decoration:none;font-size:1.15rem}
h1{font-size:1.7rem;line-height:1.25;margin:1rem 0 .25rem}
h2{font-size:1.15rem;margin:1.75rem 0 .4rem}
p,li{margin:.4rem 0}
ul{padding-left:1.25rem}
.muted{color:var(--muted);font-size:.9rem}
a{color:var(--accent)}
.btn{display:inline-block;margin:.75rem 0;padding:.65rem 1.1rem;border-radius:10px;background:var(--accent);color:var(--bg);font-weight:600;text-decoration:none}
footer{border-top:1px solid var(--line);margin-top:2rem;font-size:.9rem}
footer a{margin-right:1rem}
`.replace(/\n/g, '')

export function renderPage({ site, pathname, title, description, bodyHtml }) {
  const url = `${site}${pathname}`
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATION}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Capsula</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Capsula">
<meta property="og:title" content="${esc(title)} · Capsula">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(site)}/icons/icon-512.png">
<style>${CSS}</style>
</head>
<body>
<header><img src="/icons/icon-192.png" alt="" width="40" height="40"><a href="/about">Capsula</a></header>
<main>
${bodyHtml}
</main>
<footer>
<a href="/about">About</a><a href="/account/privacy">Privacy Policy</a><a href="/account/terms">Terms of Use</a>
</footer>
</body>
</html>
`
}

function sectionsHtml(sections) {
  return sections.map(s => {
    const paras = (s.paragraphs || []).map(p => `<p>${esc(p)}</p>`).join('\n')
    const list = s.list && s.list.length ? `<ul>\n${s.list.map(i => `<li>${esc(i)}</li>`).join('\n')}\n</ul>` : ''
    return `<h2>${esc(s.title)}</h2>\n${paras}${paras && list ? '\n' : ''}${list}`
  }).join('\n')
}

export function legalPageHtml(kind, site) {
  const doc = legalDocument(kind)
  if (!doc) throw new Error(`Unknown legal page: ${kind}`)
  const description = kind === 'privacy'
    ? 'What Capsula keeps about you, what is public, and what happens when you delete your account.'
    : 'The rules for using Capsula, a reference app about medicines and medical topics.'
  const bodyHtml = `<h1>${esc(doc.title)}</h1>\n<p class="muted">${esc(doc.updated)}</p>\n${sectionsHtml(doc.sections)}\n<p><a class="btn" href="/">Open Capsula</a></p>`
  return renderPage({
    site,
    pathname: kind === 'privacy' ? '/account/privacy' : '/account/terms',
    title: doc.title,
    description,
    bodyHtml,
  })
}

// Every sentence here was checked against the app on 2026-11-27: browsing needs no account
// (only groups, roshettas, notes and notifications ask for sign-in) and sign-in asks Google only
// for the default basic details (no extra permissions are requested in the code).
export function aboutPageHtml(site) {
  const contact = CONTACT_EMAIL
    ? `<p>Capsula is run by ${esc(OPERATOR_NAME)}. Questions or requests: <a href="mailto:${esc(CONTACT_EMAIL)}">${esc(CONTACT_EMAIL)}</a>.</p>`
    : `<p>Capsula is run by ${esc(OPERATOR_NAME)}.</p>`
  const bodyHtml = `<h1>Capsula: a medicines reference for healthcare students and professionals</h1>
<p>Capsula is a reference app about medicines and medical topics. It is made for people who work or study in healthcare and want a drug library and clear topic pages on their phone, including when they are offline.</p>
<p><a class="btn" href="/">Open Capsula</a></p>
<h2>What you can do</h2>
<ul>
<li>Look up medicines and browse them by category and class.</li>
<li>Read medical topic pages.</li>
<li>Keep favourites, personal notes, drug groups and roshettas (prescription drafts) in your own account.</li>
<li>Share a roshetta or a drug group with a link. Anyone with the link can view it without an account.</li>
</ul>
<h2>Do I need an account?</h2>
<p>No. You can browse the drug library and the topic pages without signing in. An account is only needed for things that are saved for you: favourites, notes, drug groups, roshettas and notifications.</p>
<h2>Sign in with Google</h2>
<p>When you choose to sign in, Capsula uses Google Sign-In. Capsula receives only your email address, your name and your profile photo from your Google account. They are used to create and recognise your account, and the photo is shown only to you. Capsula does not ask Google for access to your mail, contacts, files or anything else. The Privacy Policy lists everything Capsula keeps and how to delete it.</p>
<h2>Information only, not medical advice</h2>
<p>What Capsula shows is for information. It can contain mistakes or be out of date and does not replace the product label, official guidelines or a qualified professional.</p>
<h2>Who runs Capsula</h2>
${contact}
<p class="muted">${esc(updatedLine())}</p>
<p><a href="/account/privacy">Privacy Policy</a> · <a href="/account/terms">Terms of Use</a></p>`
  return renderPage({
    site,
    pathname: '/about',
    title: 'About',
    description: 'Capsula is a reference app about medicines and medical topics for healthcare students and professionals.',
    bodyHtml,
  })
}

export function buildStaticPages(distDir, site) {
  const root = String(site).replace(/\/+$/, '')
  const files = {
    'about.html': aboutPageHtml(root),
    'account/privacy.html': legalPageHtml('privacy', root),
    'account/terms.html': legalPageHtml('terms', root),
  }
  for (const [rel, html] of Object.entries(files)) {
    const target = path.join(distDir, rel)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, html, 'utf8')
  }
  return Object.keys(files)
}
