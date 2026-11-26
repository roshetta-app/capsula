/**
 * src/lib/moderationQueries.js
 *
 * S11 (2026-11-26): the table calls of the blocked-words screen and the takedown screen, moved out of
 * blockedWordsAdminContent.js and takedownAdminContent.js. Same query objects as before.
 */

import { supabase } from './supabase'

export const listBlockedWords = () => supabase.from('blocked_words').select('id, word').order('created_at', { ascending: false })
export const listProfileNameFlags = () => supabase.from('profile_name_flags').select('profile_id, word_id, created_at, profiles(full_name, handle)')
export const insertBlockedWord = (word) => supabase.from('blocked_words').insert({ word }).select('id, word').single()
export const deleteBlockedWord = (id) => supabase.from('blocked_words').delete().eq('id', id).select('id')
export const deleteProfileNameFlags = (profileId) => supabase.from('profile_name_flags').delete().eq('profile_id', profileId).select('profile_id')
export const listProfilesByIds = (ids) => supabase.from('profiles').select('id, full_name, handle').in('id', ids)
