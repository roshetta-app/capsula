/**
 * src/lib/remoteConfig.js
 *
 * Track S, step S10 (2026-11-26) - the remote address book. The app starts with the server
 * address and public key built into it, unless the phone has saved a newer pair that was read
 * from a tiny file on the static host (config.json, published by the catalog workflow). So a
 * move to another server needs no new app release for installed phones.
 *
 * Rules (decided with the owner, plan 2026-11-26):
 *   - The app never waits for the network. The choice at start is made from what is already
 *     saved on the phone (a quick read), never from a download.
 *   - The file is fetched in the background after the app is up. A valid, changed copy is saved
 *     and used from the NEXT start, never switched mid-session.
 *   - Any problem (host down, wrong format, bad address, no storage) keeps what the phone had:
 *     the saved pair, or the built-in one.
 *   - Only the public key is ever in the file. Never a secret.
 *   - The file may carry a short message (maintenance notice), shown once as a pop-up box.
 *
 * Plain functions with the storage and fetch passed in, so they can be checked with node.
 */

/** Where the file lives: the same static host as the catalog. */
export const CONFIG_URL = 'https://capsula-catalog.pages.dev/config.json'

export const CONFIG_FORMAT = 1
export const CONFIG_STORAGE_KEY = 'capsula_remote_config_v1'
export const CONFIG_SEEN_KEY = 'capsula_remote_message_seen_v1'
export const CONFIG_EVENT = 'capsula-remote-config'

const FETCH_TIMEOUT_MS = 4000
const MAX_MESSAGE_LENGTH = 300

/** A usable pair, or null. Needs format 1, an https address without credentials, a plain key. */
export function validateConfig(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (raw.v !== CONFIG_FORMAT) return null
  if (typeof raw.url !== 'string' || typeof raw.anon !== 'string') return null
  let parsed
  try { parsed = new URL(raw.url) } catch { return null }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null
  const anon = raw.anon.trim()
  if (anon.length < 20 || /\s/.test(anon)) return null
  const message = typeof raw.message === 'string' ? raw.message.trim().slice(0, MAX_MESSAGE_LENGTH) : ''
  return { url: parsed.origin + parsed.pathname.replace(/\/+$/, ''), anon, message }
}

function readStorage(storage) {
  try { return storage?.getItem(CONFIG_STORAGE_KEY) ?? null } catch { return null }
}

/** The pair saved on the phone from an earlier fetch, or null. */
export function readSavedConfig(storage) {
  const text = readStorage(storage)
  if (!text) return null
  try { return validateConfig(JSON.parse(text)) } catch { return null }
}

/** What the app starts with: the saved pair if there is one, else the built-in one. */
export function chooseServer(builtIn, storage) {
  const saved = readSavedConfig(storage)
  if (saved) return { url: saved.url, anon: saved.anon, source: 'saved' }
  return { url: builtIn.url, anon: builtIn.anon, source: 'built-in' }
}

function sameServer(a, b) {
  return !!a && !!b && a.url === b.url && a.anon === b.anon
}

function stripSlash(url) {
  return String(url ?? '').replace(/\/+$/, '')
}

/**
 * Ask the static host for the file and save what is good. Never throws.
 * Returns { changed, reason } - 'changed' means a different pair was saved for the next start.
 */
export async function refreshRemoteConfig({ fetchFn, storage, builtIn, url = CONFIG_URL, timeoutMs = FETCH_TIMEOUT_MS }) {
  try {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null
    let res
    try {
      res = await fetchFn(`${url}?t=${Date.now()}`, { cache: 'no-store', signal: ctrl?.signal })
    } finally {
      if (timer) clearTimeout(timer)
    }
    if (!res || !res.ok) return { changed: false, reason: 'unreachable' }
    const incoming = validateConfig(await res.json())
    if (!incoming) return { changed: false, reason: 'invalid' }

    const saved = readSavedConfig(storage)
    // The file says the built-in pair again: drop the override so the phone follows the build.
    const isBuiltIn = stripSlash(incoming.url) === stripSlash(builtIn?.url) && incoming.anon === builtIn?.anon
    let changed = false
    try {
      if (isBuiltIn) {
        if (saved) { storage.removeItem(CONFIG_STORAGE_KEY); changed = true }
        // Keep the message even when the pair is the built-in one.
        storage.setItem(CONFIG_STORAGE_KEY + '_msg', incoming.message)
      } else {
        storage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ v: CONFIG_FORMAT, url: incoming.url, anon: incoming.anon, message: incoming.message }))
        storage.setItem(CONFIG_STORAGE_KEY + '_msg', incoming.message)
        changed = !sameServer(saved, incoming)
      }
    } catch {
      return { changed: false, reason: 'no-storage' }
    }
    return { changed, reason: 'ok', message: incoming.message }
  } catch {
    return { changed: false, reason: 'unreachable' }
  }
}

/** The message to show now, or '' when there is none or this exact message was already shown. */
export function messageToShow(storage) {
  try {
    const msg = (storage.getItem(CONFIG_STORAGE_KEY + '_msg') ?? '').trim()
    if (!msg) return ''
    return storage.getItem(CONFIG_SEEN_KEY) === msg ? '' : msg
  } catch {
    return ''
  }
}

/** Remember that this message was shown, so it is not shown again until the text changes. */
export function markMessageSeen(storage, message) {
  try { storage.setItem(CONFIG_SEEN_KEY, message) } catch { /* nothing to do */ }
}
