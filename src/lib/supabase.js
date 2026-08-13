import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

// flowType explicitly set to 'pkce' (Stage 3, F6) rather than left on the
// library default. PKCE is Supabase's documented recommendation for
// mobile/deep-link OAuth flows (native sign-in exchanges an auth code for
// a session, rather than parsing tokens out of a redirect URL's hash) and
// works identically for the existing web flow, so this is a safe default
// for both build targets, not just native.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    flowType: 'pkce',
  },
})
