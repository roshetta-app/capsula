/**
 * src/utils/imageUpload.js
 * Phase 3I — Image Upload & Gallery Manager utilities
 *
 * Handles all Supabase Storage and condition_images table operations.
 * NEVER stores base64 in the database — always uploads file to Storage first.
 *
 * Exports:
 *   uploadConditionImage(supabase, conditionId, file)  → { data: imageRow, error }
 *   deleteConditionImage(supabase, imageId, storagePath) → { error }
 *   updateImageCaption(supabase, imageId, caption)       → { error }
 *   fetchConditionImages(supabase, conditionId)          → { data: imageRow[], error }
 */

const BUCKET        = 'condition-images'
const MAX_SIZE_MB   = 5
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateImageFile(file) {
  if (!file) return 'No file provided.'
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Unsupported file type "${file.type}". Use JPG, PNG, or WebP.`
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is ${MAX_SIZE_MB} MB.`
  }
  return null // valid
}

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Uploads an image file and inserts a row into condition_images.
 * Returns { data: { id, condition_id, url, caption, sort_order }, error }.
 */
export async function uploadConditionImage(supabase, conditionId, file) {
  // 1. Validate
  const validationError = validateImageFile(file)
  if (validationError) return { data: null, error: { message: validationError } }

  // 2. Build storage path: {conditionId}/{uuid}.{ext}
  const ext       = file.name.split('.').pop().toLowerCase()
  const uuid      = crypto.randomUUID()
  const storagePath = `${conditionId}/${uuid}.${ext}`

  // 3. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: false, contentType: file.type })

  if (uploadError) return { data: null, error: uploadError }

  // 4. Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath)

  const publicUrl = urlData?.publicUrl
  if (!publicUrl) {
    // Clean up orphaned storage file
    await supabase.storage.from(BUCKET).remove([storagePath])
    return { data: null, error: { message: 'Failed to get public URL after upload.' } }
  }

  // 5. Get current max sort_order for this condition
  const { data: existingRows } = await supabase
    .from('condition_images')
    .select('sort_order')
    .eq('condition_id', conditionId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = existingRows?.length ? (existingRows[0].sort_order ?? 0) + 1 : 0

  // 6. Insert row into condition_images
  const { data: insertedRow, error: insertError } = await supabase
    .from('condition_images')
    .insert({
      condition_id: conditionId,
      url:          publicUrl,
      caption:      null,
      sort_order:   nextOrder,
    })
    .select()
    .single()

  if (insertError) {
    // Clean up orphaned storage file
    await supabase.storage.from(BUCKET).remove([storagePath])
    return { data: null, error: insertError }
  }

  return { data: { ...insertedRow, _storagePath: storagePath }, error: null }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Deletes an image from condition_images table AND from Supabase Storage.
 * storagePath is derived from the public URL if not provided separately.
 *
 * @param {object} supabase
 * @param {string} imageId      — UUID from condition_images.id
 * @param {string} imageUrl     — Public URL (used to extract storage path)
 */
export async function deleteConditionImage(supabase, imageId, imageUrl) {
  // 1. Delete DB row first
  const { error: dbError } = await supabase
    .from('condition_images')
    .delete()
    .eq('id', imageId)

  if (dbError) return { error: dbError }

  // 2. Extract storage path from the public URL
  // URL format: https://<project>.supabase.co/storage/v1/object/public/condition-images/<path>
  try {
    const storagePath = extractStoragePath(imageUrl)
    if (storagePath) {
      await supabase.storage.from(BUCKET).remove([storagePath])
    }
  } catch {
    // Non-fatal: DB row already deleted. Log but don't surface to user.
    console.warn('[imageUpload] Storage delete failed for URL:', imageUrl)
  }

  return { error: null }
}

// ─── Caption update ───────────────────────────────────────────────────────────

export async function updateImageCaption(supabase, imageId, caption) {
  const { error } = await supabase
    .from('condition_images')
    .update({ caption: caption || null })
    .eq('id', imageId)

  return { error }
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchConditionImages(supabase, conditionId) {
  const { data, error } = await supabase
    .from('condition_images')
    .select('id, condition_id, url, caption, sort_order')
    .eq('condition_id', conditionId)
    .order('sort_order', { ascending: true })

  return { data: data ?? [], error }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function extractStoragePath(publicUrl) {
  if (!publicUrl) return null
  // Extract everything after "/condition-images/"
  const marker = `/object/public/${BUCKET}/`
  const idx    = publicUrl.indexOf(marker)
  if (idx === -1) return null
  return publicUrl.slice(idx + marker.length)
}
