/**
 * src/lib/serverCalls.js
 *
 * S11 (2026-11-26): the one place for plain "call a database function by name" requests that many small
 * content helpers make (reports, views, stars, takedowns, shared links...). They used to each import the
 * server client and wrap its rpc call the same way.
 */

import { supabase } from './supabase'

/** Call a database function. With no arguments the request is sent without a body, as before. */
export function callRpc(fn, args) {
  return args === undefined ? supabase.rpc(fn) : supabase.rpc(fn, args)
}
