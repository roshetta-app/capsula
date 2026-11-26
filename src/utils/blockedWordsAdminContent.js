/**
 * src/utils/blockedWordsAdminContent.js
 * 2026-11-22 (step 14.9c-3): binds the real database, the Audit Log and the computer's online signal to the CMS
 * Blocked words rules (blockedWordsAdmin.js). Same pattern as reportsAdminContent.js. Every call needs an admin
 * account: the row rules on both tables let nobody else read or write them.
 */

import {
  listBlockedWords, listProfileNameFlags, insertBlockedWord, deleteBlockedWord, deleteProfileNameFlags,
} from '../lib/moderationQueries'
import { logAudit } from './auditLogger'
import { loadBlockedWords, addBlockedWord, removeBlockedWord, dismissFlags } from './blockedWordsAdmin'

const deps = () => ({
  listWords: listBlockedWords,
  listFlags: listProfileNameFlags,
  addWord: insertBlockedWord,
  removeWord: deleteBlockedWord,
  dismissFlags: deleteProfileNameFlags,
  audit: logAudit,
  isOnline: () => !(typeof navigator !== 'undefined' && navigator.onLine === false),
})

export const fetchBlockedWords = () => loadBlockedWords(deps())
export const addWord = (raw) => addBlockedWord(raw, deps())
export const removeWord = (word) => removeBlockedWord(word, deps())
export const clearFlags = (flag) => dismissFlags(flag, deps())
