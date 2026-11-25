/**
 * src/utils/launchSwitches.js
 *
 * Track S, step S4 (2026-11-25) - the rules behind the CMS "Launch switches" page and the
 * message shown to a person whose new sign-up was refused. Plain functions, no React, so
 * they can be checked with node.
 *
 * The switches are rows in the cms_config table (key, value text). 'true' means on; a missing
 * row or any other value means off.
 *   signups_paused         On: the database refuses to create NEW accounts (the rule
 *                          trg_block_signups_when_paused on auth.users). People who already
 *                          have an account sign in as usual.
 *   catalog_static_enabled On: full drug-list downloads come from the static host (Cloudflare).
 *                          Read by lib/catalogStatic.js.
 */

export const SIGNUPS_PAUSED_KEY = 'signups_paused'

export const SIGNUPS_PAUSED_MESSAGE = 'New sign-ups are paused right now. Please try again later.'

/** 'true' (any case, spaces ignored) is on. Anything else, including nothing, is off. */
export function isSwitchOn(value) {
  return String(value ?? '').trim().toLowerCase() === 'true'
}

/** The text stored for a switch. */
export function switchValue(on) {
  return on ? 'true' : 'false'
}

const RETURN_ERROR_PARAMS = ['error', 'error_code', 'error_description']

function paramsOf(text) {
  return new URLSearchParams(String(text ?? '').replace(/^[?#]/, ''))
}

/**
 * The sign-in error a Google sign-in leaves in the address when it comes back to the app,
 * from the query string or from the hash. Null when there is none.
 *
 * @param {string} href the full address, e.g. window.location.href
 * @returns {{ error: string|null, code: string|null, description: string } | null}
 */
export function readSignInReturnError(href) {
  let url
  try { url = new URL(href, 'https://app.invalid') } catch { return null }
  for (const source of [paramsOf(url.search), paramsOf(url.hash)]) {
    const description = source.get('error_description')
    const error = source.get('error')
    if (description || error) {
      return { error, code: source.get('error_code'), description: description ?? '' }
    }
  }
  return null
}

/**
 * Does this return error look like our database rule refusing a new account? The database
 * hands the auth service our exception, which comes back to the app as a generic
 * "Database error saving new user" (and our own word if it is ever passed through), so the
 * caller also checks that the switch is really on before telling the person sign-ups are paused.
 */
export function looksLikeRefusedSignup(description) {
  return /database error saving new user|signups_paused/i.test(String(description ?? ''))
}

/** The same address with the sign-in error words removed (query and hash), so a refresh does not repeat them. */
export function withoutSignInReturnError(href) {
  let url
  try { url = new URL(href, 'https://app.invalid') } catch { return href }
  const search = paramsOf(url.search)
  RETURN_ERROR_PARAMS.forEach(k => search.delete(k))
  const hash = paramsOf(url.hash)
  const hashHadError = RETURN_ERROR_PARAMS.some(k => hash.has(k))
  RETURN_ERROR_PARAMS.forEach(k => hash.delete(k))
  const s = search.toString()
  const h = hash.toString()
  const keepHash = url.hash && !hashHadError ? url.hash : (h ? `#${h}` : '')
  return `${url.pathname}${s ? `?${s}` : ''}${keepHash}`
}
