/**
 * src/lib/proQueries.js
 *
 * Stage 3, step 3 (2026-11-24) — everything the Upgrade screen asks the database.
 * Talks only to the functions and the one small table that Migration 14 (pro_requests_s3_2) made:
 *   pro_plan_prices (read), my_pro_reference(), pro_request_create(plan, sender),
 *   pro_request_attach_receipt(id, path), pro_request_cancel(id), my_pro_requests(limit)
 * and the private storage folder `pro-receipts` (upload only to <my id>/<my waiting request id>.<ext>).
 *
 * Nothing here decides anything about money. A request is only a note that says "I paid";
 * Pro switches on when the owner approves it (step 4, in the CMS).
 */

import { supabase } from './supabase'
import { resizeAndCompressImage } from '../utils/imageResize'

// Plan order and the length of each plan in months (used only for the "about N EGP a month" line).
export const PLAN_ORDER = ['monthly', 'six_months', 'yearly']
export const PLAN_MONTHS = { monthly: 1, six_months: 6, yearly: 12 }
export const PLAN_LABEL = { monthly: 'Monthly', six_months: '6 months', yearly: 'Yearly' }
export const DEFAULT_PLAN = 'yearly'

// Open question for the owner (plan, Stage 3 step 3): is the receipt photo required to press "I paid"?
// The drawing shows it as step 4. The database accepts a request without one, so this is one switch.
export const RECEIPT_REQUIRED = true

// The fixed promise (decision 29). One place, so the wording can change without touching the screens.
export const PROMISE_TEXT = 'Pro turns on within 24 hours of your request, once we see your payment.'

// Plain wording for the six reasons the database allows (pro_requests.reject_reason).
export const REJECT_REASON_TEXT = {
  not_found: 'We could not find your payment.',
  wrong_amount: 'The amount we received does not match the plan.',
  wrong_reference: 'Your code was missing or wrong in the transfer note.',
  unclear_receipt: 'The receipt photo was not clear.',
  duplicate: 'This receipt was already used.',
  other: null,
}

// Where the person sends the money, and whether payments are open, are set in the CMS (Pro settings, Migration 19).
export async function fetchProSettings() {
  // A failure here must not break the whole page: no settings simply means "payment details are coming soon".
  const { data, error } = await supabase.from('pro_settings').select('wallet_name, wallet_number, payments_open').maybeSingle()
  if (error) return null
  return data ?? null
}

export async function fetchPlanPrices() {
  const { data, error } = await supabase.from('pro_plan_prices').select('plan, amount_egp, sort').order('sort')
  if (error) throw error
  return data ?? []
}

export async function fetchMyProReference() {
  const { data, error } = await supabase.rpc('my_pro_reference')
  if (error) throw error
  return data ?? null
}

export async function fetchMyProRequests() {
  const { data, error } = await supabase.rpc('my_pro_requests', { p_limit: 10 })
  if (error) throw error
  return data ?? []
}

/** @returns {Promise<{status: string, id?: string, reference?: string, amount?: number, plan?: string}>} */
export async function createProRequest(plan, sender) {
  const { data, error } = await supabase.rpc('pro_request_create', { p_plan: plan, p_sender: sender })
  if (error) throw error
  return data ?? { status: 'error' }
}

/**
 * Shrinks the photo, uploads it to the person's own slot and attaches it to the request.
 * @returns {Promise<'ok'|string>} 'ok' or the database's answer (no_file, bad_path, already, not_found)
 */
export async function uploadAndAttachReceipt(userId, requestId, file) {
  const small = await resizeAndCompressImage(file)
  const path = `${userId}/${requestId}.jpg`
  const { error: upErr } = await supabase.storage
    .from('pro-receipts')
    .upload(path, small, { contentType: 'image/jpeg', upsert: false })
  if (upErr) throw upErr
  const { data, error } = await supabase.rpc('pro_request_attach_receipt', { p_id: requestId, p_path: path })
  if (error) throw error
  return data
}

/** @returns {Promise<'ok'|string>} */
export async function cancelProRequest(id) {
  const { data, error } = await supabase.rpc('pro_request_cancel', { p_id: id })
  if (error) throw error
  return data
}
