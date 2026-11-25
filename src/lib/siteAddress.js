// The public address of the website, in one place (S3.1). Used for share links made inside the
// Android app, where the app's own address is not a public page. A build can set
// VITE_PUBLIC_SITE to change it; without it this is today's address, so nothing changes.
// (The path prefix of the website itself is a separate build setting, SITE_BASE; see
// scripts/siteBase.mjs and vite.config.js.)
const FALLBACK = 'https://roshetta-app.github.io/capsula'

const fromBuild = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.VITE_PUBLIC_SITE
  : undefined

export const PUBLIC_SITE = String(fromBuild || FALLBACK).trim().replace(/\/+$/, '')
