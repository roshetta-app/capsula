/**
 * src/utils/proSettingsAdmin.js
 *
 * Stage 3 step 4c (2026-11-24) - rules and words for the CMS Pro settings screen (/admin/pro-settings).
 * Pure functions, no React, no network. The database side is Migration 19 (admin_save_pro_settings).
 */

export const PLAN_KEYS = ['monthly', 'six_months', 'yearly']
export const PLAN_NAMES = { monthly: 'Monthly', six_months: '6 months', yearly: 'Yearly' }
export const MAX_WALLET_TEXT = 60
export const MAX_PRICE = 100000

// Turns the screen's text boxes into what the database function takes, or says what is wrong.
// form: { walletName, walletNumber, paymentsOpen, prices: { monthly: '49', ... } } (prices are text from the boxes)
export function checkProSettings(form) {
  const walletName = (form.walletName ?? '').trim()
  const walletNumber = (form.walletNumber ?? '').trim()
  if (walletName.length > MAX_WALLET_TEXT) return { ok: false, message: `The wallet name can be at most ${MAX_WALLET_TEXT} letters.` }
  if (walletNumber.length > MAX_WALLET_TEXT) return { ok: false, message: `The wallet number can be at most ${MAX_WALLET_TEXT} characters.` }
  if (form.paymentsOpen && (!walletName || !walletNumber)) {
    return { ok: false, message: 'Payments are on, so fill in both the wallet name and the number, or switch payments off.' }
  }
  const prices = {}
  for (const key of PLAN_KEYS) {
    const text = String(form.prices?.[key] ?? '').trim()
    if (!/^[0-9]+$/.test(text)) return { ok: false, message: `${PLAN_NAMES[key]}: type the price as a whole number of EGP.` }
    const value = Number(text)
    if (value < 1 || value > MAX_PRICE) return { ok: false, message: `${PLAN_NAMES[key]}: the price must be between 1 and ${MAX_PRICE} EGP.` }
    prices[key] = value
  }
  return { ok: true, args: { p_wallet_name: walletName, p_wallet_number: walletNumber, p_payments_open: Boolean(form.paymentsOpen), p_prices: prices } }
}

// What the person sees on the Upgrade page for the payment step: ready, paused, or not filled in yet.
export function payState(settings) {
  if (!settings) return 'missing'
  if (!settings.payments_open) return 'paused'
  if (!settings.wallet_name || !settings.wallet_number) return 'missing'
  return 'ready'
}

export function saveErrorText(error) {
  const text = String(error?.message ?? error ?? '')
  if (text.includes('forbidden')) return 'Only an admin can change this.'
  if (text.includes('bad_prices')) return 'One of the prices is not allowed.'
  if (text.includes('bad_wallet')) return 'The wallet name or number has a character that is not allowed.'
  return 'Could not save. Check your connection and try again.'
}
