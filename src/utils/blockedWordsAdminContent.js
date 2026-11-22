/**
 * src/utils/blockedWordsAdminContent.js
 * 2026-11-22 (step 14.9c-3): binds the real database, the Audit Log and the computer's online signal to the CMS
 * Blocked words rules (blockedWordsAdmin.js). Same pattern as reportsAdminContent.js. Every call needs an admin
 * account: the row rules on both tables let nobody else read or write them.
 */

import { supabase } from '../lib/supabase'
import { logAudit } from './auditLogger'
import { loadBlockedWords, addBlockedWord, removeBlockedWord, dismissFlags } from './blockedWordsAdmin'

const deps = () => ({
  listWords: () => supabase.from('blocked_words').select('id, word').order('created_at', { ascending: false }),
  listFlags: () => supabase.from('profile_name_flags').select('profile_id, word_id, created_at, profiles(full_name, handle)'),
  addWord: (word) => supabase.from('blocked_words').insert({ word }).select('id, word').single(),
  removeWord: (id) => supabase.from('blocked_words').delete().eq('id', id).select('id'),
  dismissFlags: (profileId) => supabase.from('profile_name_flags').delete().eq('profile_id', profileId).select('profile_id'),
  audit: logAudit,
  isOnline: () => !(typeof navigator !== 'undefined' && navigator.onLine === false),
})

export const fetchBlockedWords = () => loadBlockedWords(deps())
export const addWord = (raw) => addBlockedWord(raw, deps())
export const removeWord = (word) => removeBlockedWord(word, deps())
export const clearFlags = (flag) => dismissFlags(flag, deps())
