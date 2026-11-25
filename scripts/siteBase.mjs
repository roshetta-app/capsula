// S3.1: where the website lives, as one setting.
//
// The website's address prefix used to be written by hand in several files ('/capsula/' on
// GitHub Pages). It now comes from ONE build setting, SITE_BASE (default '/capsula/', so
// today's build is byte for byte what it was). Files that Vite does not process (public/sw.js
// and public/manifest.json) keep their '/capsula/' text in the source and get the real prefix
// written in at build time by rewriteSitePrefix() below.
//
// Used by vite.config.js and checked by scripts/siteBase.check.mjs.

export const DEFAULT_SITE_BASE = '/capsula/'
export const DEFAULT_PUBLIC_SITE = 'https://roshetta-app.github.io/capsula'

// Always starts and ends with '/'. Empty, missing or '/' mean "the root of the host".
export function normalizeBase(raw) {
  const text = String(raw ?? '').trim()
  if (text === '') return DEFAULT_SITE_BASE
  let base = text
  if (!base.startsWith('/')) base = '/' + base
  if (!base.endsWith('/')) base += '/'
  return base.replace(/\/{2,}/g, '/')
}

// The public address without a closing slash, for chat previews (must be absolute).
export function normalizePublicSite(raw) {
  const text = String(raw ?? '').trim()
  if (text === '') return DEFAULT_PUBLIC_SITE
  return text.replace(/\/+$/, '')
}

// Writes the real prefix into text that holds the old one. Only the path form is touched: a
// '/capsula/' that follows a letter, digit, dot or dash is part of an address such as
// 'roshetta-app.github.io/capsula/icons' and is left alone.
export function rewriteSitePrefix(text, base) {
  const target = normalizeBase(base)
  if (target === DEFAULT_SITE_BASE) return text
  return String(text).replace(/(?<![A-Za-z0-9.\-])\/capsula\//g, target)
}

// Link-preview pictures in index.html are absolute addresses.
export function rewritePublicSite(text, site) {
  const target = normalizePublicSite(site)
  if (target === DEFAULT_PUBLIC_SITE) return text
  return String(text).split(DEFAULT_PUBLIC_SITE).join(target)
}
