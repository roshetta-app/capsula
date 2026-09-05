/**
 * src/lib/noteQueries.js
 *
 * Uploads a Pro user's note photo to its own storage space (the
 * 'note-images' bucket) and returns its public URL. One photo per note,
 * overwrite-in-place: the storage path is fixed per user+condition
 * ('{userId}/{conditionId}.jpg'), so attaching a new photo to the same
 * note always writes over the previous one instead of piling up old
 * files (notes-pro-image-and-char-cap decision).
 *
 * notes-photo-uploader-redesign (2026-09-05):
 *   Added deleteNoteImage, called from PersonalNotes.jsx once the delete
 *   confirm sheet (ConfirmSheet) is confirmed. Removes the file from
 *   Storage immediately using the exact same fixed path convention as
 *   uploadNoteImage above, rather than only nulling out the DB's
 *   image_url column — no separate storage policy needed, the
 *   note-images bucket's owner-only delete policy already exists.
 *
 * A cache-busting query string is appended to the returned URL, since the
 * path itself never changes on a re-upload - without it, a browser or CDN
 * could keep showing the old cached image after a swap.
 *
 * Storage bucket + its owner-only (own-file) policies were already
 * created directly against the live database this task - nothing to set
 * up here.
 *
 * Mirrors the shape of uploadConditionImage in src/lib/adminQueries.js,
 * but kept in its own file since Personal Notes is a user-facing feature
 * that shouldn't depend on admin-only code.
 *
 * notes-pro-image-and-char-cap (this task):
 *   Called from src/hooks/useNotes.js once a photo has been resized by
 *   src/utils/imageResize.js's resizeAndCompressImage.
 */

import { supabase } from './supabase'

/**
 * @param {File} file - already resized/compressed by imageResize.js's
 *   resizeAndCompressImage, always a .jpg
 * @param {string} userId
 * @param {string} conditionId
 * @returns {Promise<{ url: string|null, error: object|null }>}
 */
export async function uploadNoteImage(file, userId, conditionId) {
  const path = `${userId}/${conditionId}.jpg`

  const { error: uploadError } = await supabase.storage
    .from('note-images')
    .upload(path, file, { cacheControl: '3600', upsert: true })

  if (uploadError) return { url: null, error: uploadError }

  const { data } = supabase.storage
    .from('note-images')
    .getPublicUrl(path)

  // Cache-bust: the path is reused on every re-upload (overwrite-in-place),
  // so without a changing query string a browser/CDN could keep serving
  // the previous photo under the same URL.
  return { url: `${data.publicUrl}?v=${Date.now()}`, error: null }
}

/**
 * Deletes a Pro user's note photo from storage. Same fixed path convention
 * as uploadNoteImage above, so this always targets the one photo that
 * could exist for a given user+condition.
 * @param {string} userId
 * @param {string} conditionId
 * @returns {Promise<{ error: object|null }>}
 */
export async function deleteNoteImage(userId, conditionId) {
  const path = `${userId}/${conditionId}.jpg`

  const { error } = await supabase.storage
    .from('note-images')
    .remove([path])

  return { error }
}
