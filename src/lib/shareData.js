/**
 * src/lib/shareData.js
 *
 * S11 (2026-11-26): the roshetta list, roshetta and group sharing, and the public profile card. Their
 * helper functions take the server client as their first argument; here they are bound to it, so the
 * hooks (useRoshettas, usePublicProfile) no longer import the client. The originals are unchanged.
 */

import { supabase } from './supabase'
import { fetchRoshettas as fetchRoshettasWith } from '../utils/roshettaLoad'
import { sendChange as sendRoshettaChangeWith } from '../utils/roshettaSync'
import {
  readShareCode as readShareCodeWith, createShare as createShareWith, removeShare as removeShareWith,
  setShareName as setShareNameWith, setOnProfile as setOnProfileWith,
} from '../utils/roshettaShare'
import {
  fetchProfile as fetchProfileWith, savePublicCardOrWait as savePublicCardOrWaitWith,
  saveDetails as sendDetailsWith, removePublicCard as removePublicCardWith,
} from '../utils/profileData'
import { readSharedIds as readSharedIdsWith } from '../utils/addToProfile'

export const fetchRoshettas = (limit) => fetchRoshettasWith(supabase, limit)
export const sendRoshettaChange = (change, limit) => sendRoshettaChangeWith(supabase, change, limit)
export const readShareCode = (id, limit) => readShareCodeWith(supabase, id, limit)
export const createShare = (id, limit, showName, onProfile) => createShareWith(supabase, id, limit, showName, onProfile)
export const setOnProfile = (id, limit) => setOnProfileWith(supabase, id, limit)
export const setShareName = (id, show, limit) => setShareNameWith(supabase, id, show, limit)
export const removeShare = (id, limit) => removeShareWith(supabase, id, limit)

export const fetchProfile = (userId, opts) => fetchProfileWith(supabase, userId, opts)
export const savePublicCardOrWait = (userId, fields, opts) => savePublicCardOrWaitWith(supabase, userId, fields, opts)
export const sendDetails = (userId, updates, opts) => sendDetailsWith(supabase, userId, updates, opts)
export const removePublicCard = (opts) => removePublicCardWith(supabase, opts)
export const readSharedIds = (table, column, limit) => readSharedIdsWith(supabase, table, column, limit)
