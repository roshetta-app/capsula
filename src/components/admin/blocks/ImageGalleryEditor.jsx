/**
 * ImageGalleryEditor — src/components/admin/blocks/ImageGalleryEditor.jsx
 *
 * Phase 3.3: CMS editor for image_gallery blocks.
 *
 * Props:
 *   data     { title?, images: { url, caption }[] }  — block.data (read-only; patch via onChange)
 *   onChange (dataPatch) => void                      — call with { title } or { images: nextImages };
 *                                                        the parent merges each patch into the full
 *                                                        block.data, so a title patch and an images
 *                                                        patch never need to be sent together
 *   disabled Boolean                                  — freeze all controls during parent save
 *
 * Features:
 *   - Gallery title field — optional; shown above the whole carousel in the app,
 *     left blank the carousel simply renders without a heading (2026-09-02)
 *   - Thumbnail strip of existing images with caption field below each
 *   - ↑ ↓ 🗑 per image
 *   - Upload button (calls uploadConditionImage from adminQueries) — single or multiple files
 *   - Shows upload progress / error inline
 *   - Empty state when images: []
 *
 * Data shape (Section 3.1 of masterplan, title added 2026-09-02):
 *   { title: "", images: [{ url: "https://...", caption: "" }] }
 *   (No id field at the block level — id is only on condition_images rows, which are legacy)
 *
 * Image System Refinement Plan, Part C, Step 1 (2026-09-02):
 *   Every selected photo is resized and re-compressed client-side, before
 *   it ever reaches uploadConditionImage/Storage — see
 *   resizeAndCompressImage below. Nothing downstream (adminQueries.js,
 *   the app's display components) needed to change; they already just
 *   handle whatever URL/file they're given.
 */

import { useRef, useState } from 'react'
import { ChevronUp, ChevronDown, Trash2, Upload, ImageIcon } from 'lucide-react'
import { uploadConditionImage } from '../../../lib/adminQueries'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function swap(arr, i, j) {
  if (i < 0 || j >= arr.length) return arr
  const next = [...arr]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

// ─── Image resize + compress (Part C, Step 1) ─────────────────────────────────
//
// Runs entirely in the browser before a photo reaches uploadConditionImage.
// Shrinks anything larger than maxDimension on its longer edge and
// re-encodes as a standard-quality JPEG — this keeps stored/downloaded
// file sizes reasonable (directly benefits the Part A offline cache,
// which downloads every gallery photo to every device) and standardizes
// format, which also fixes photos uploaded in a format some browsers
// can't display (e.g. an iPhone's default HEIC).
//
// maxDimension of 1800px and quality of 0.8 were chosen to hold up under
// the lightbox's up to 4x pinch/double-tap zoom (Image System
// Refinement Plan §12.3) while cutting a typical modern phone photo
// (often 3000-4000px+) down substantially.

const MAX_DIMENSION = 1800
const JPEG_QUALITY = 0.8

function resizeAndCompressImage(file, { maxDimension = MAX_DIMENSION, quality = JPEG_QUALITY } = {}) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(new Error('Image compression produced no output'))
            return
          }
          // Standardize to .jpg regardless of the original extension —
          // this is what resolves the HEIC-display risk, since every
          // upload now leaves the browser as a plain JPEG.
          const baseName = file.name.replace(/\.[^./\\]+$/, '') || 'photo'
          resolve(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not read selected image'))
    }

    img.src = objectUrl
  })
}

// ─── Single image row ─────────────────────────────────────────────────────────

function ImageRow({ image, index, total, onMoveUp, onMoveDown, onDelete, onCaptionChange, disabled }) {
  return (
    <div style={{
      display: 'flex',
      gap: 'var(--space-3)',
      alignItems: 'flex-start',
      padding: 'var(--space-3)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      backgroundColor: 'var(--color-bg)',
    }}>
      {/* Thumbnail */}
      <div style={{
        flexShrink: 0,
        width: 80,
        height: 80,
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
        backgroundColor: 'var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {image.url ? (
          <img
            src={image.url}
            alt={image.caption || `Image ${index + 1}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <ImageIcon size={24} color="var(--color-text-tertiary)" />
        )}
      </div>

      {/* Caption field */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <label style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-body)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 4,
        }}>
          Caption
        </label>
        <input
          type="text"
          value={image.caption ?? ''}
          onChange={e => onCaptionChange(e.target.value)}
          disabled={disabled}
          placeholder="Optional caption…"
          style={{
            width: '100%',
            fontSize: 13,
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-primary)',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
            outline: 'none',
            boxSizing: 'border-box',
            opacity: disabled ? 0.6 : 1,
          }}
        />
      </div>

      {/* ↑ ↓ 🗑 controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <button
          onClick={onMoveUp}
          disabled={disabled || index === 0}
          aria-label="Move image up"
          style={iconBtnStyle({ disabled: disabled || index === 0 })}
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={disabled || index === total - 1}
          aria-label="Move image down"
          style={iconBtnStyle({ disabled: disabled || index === total - 1 })}
        >
          <ChevronDown size={14} />
        </button>
        <button
          onClick={onDelete}
          disabled={disabled}
          aria-label="Remove image"
          style={iconBtnStyle({ disabled, danger: true })}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

function iconBtnStyle({ disabled, danger } = {}) {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28,
    borderRadius: 'var(--radius-sm)',
    border: danger ? '1px solid #FECACA' : '1px solid var(--color-border)',
    backgroundColor: danger ? '#FEF2F2' : 'var(--color-surface)',
    color: danger ? '#DC2626' : 'var(--color-text-secondary)',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    padding: 0,
    flexShrink: 0,
    transition: 'opacity 0.1s',
  }
}

// ─── Upload button ─────────────────────────────────────────────────────────────

function UploadButton({ onUpload, disabled, uploading }) {
  const fileRef = useRef(null)

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => {
          if (e.target.files?.length) onUpload(Array.from(e.target.files))
          // Reset so same file can be re-selected
          e.target.value = ''
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={disabled || uploading}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)',
          padding: '8px 14px',
          fontSize: 13, fontWeight: 600,
          fontFamily: 'var(--font-body)',
          borderRadius: 'var(--radius-md)',
          border: '1.5px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
          cursor: disabled || uploading ? 'default' : 'pointer',
          opacity: disabled || uploading ? 0.6 : 1,
          transition: 'opacity 0.1s',
        }}
      >
        <Upload size={14} />
        {uploading ? 'Uploading…' : 'Upload Images'}
      </button>
    </>
  )
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 'var(--space-2)',
      padding: 'var(--space-6) var(--space-4)',
      border: '1.5px dashed var(--color-border)',
      borderRadius: 'var(--radius-md)',
      backgroundColor: 'var(--color-bg)',
      color: 'var(--color-text-tertiary)',
      textAlign: 'center',
    }}>
      <ImageIcon size={28} strokeWidth={1.5} />
      <span style={{ fontSize: 13, fontFamily: 'var(--font-body)' }}>
        No images yet. Upload one or more images above.
      </span>
    </div>
  )
}

// ─── Main export ───────────────────────────────────────────────────────────────

/**
 * ImageGalleryEditor
 *
 * @param {{ title?: string, images: { url: string, caption: string }[] }} data
 * @param {Function} onChange   — (dataPatch) => void; receives { title } or { images: nextImages }
 * @param {Boolean}  disabled   — freeze controls during parent save
 */
export default function ImageGalleryEditor({ data, onChange, disabled = false }) {
  const images = data?.images ?? []

  const [uploading,    setUploading]    = useState(false)
  const [uploadError,  setUploadError]  = useState(null)

  // ── Mutations ────────────────────────────────────────────────────────────────

  function patch(nextImages) {
    onChange({ images: nextImages })
  }

  function handleTitleChange(title) {
    onChange({ title })
  }

  function handleCaptionChange(index, caption) {
    patch(images.map((img, i) => i === index ? { ...img, caption } : img))
  }

  function handleMoveUp(index) {
    patch(swap(images, index - 1, index))
  }

  function handleMoveDown(index) {
    patch(swap(images, index, index + 1))
  }

  function handleDelete(index) {
    patch(images.filter((_, i) => i !== index))
  }

  async function handleUpload(files) {
    setUploading(true)
    setUploadError(null)

    // Part C, Step 1: resize + compress every selected photo before it
    // ever reaches uploadConditionImage. A failure here (e.g. a
    // corrupted file that can't be decoded) is reported the same way an
    // upload failure already is, rather than falling back to uploading
    // the original untouched.
    let processedFiles
    try {
      processedFiles = await Promise.all(files.map(f => resizeAndCompressImage(f)))
    } catch {
      setUploadError('Could not process one or more images. Please try again.')
      setUploading(false)
      return
    }

    const results = await Promise.all(processedFiles.map(f => uploadConditionImage(f)))

    const errors = results.filter(r => r.error)
    if (errors.length) {
      setUploadError(
        errors.length === 1
          ? 'Upload failed. Please try again.'
          : `${errors.length} of ${files.length} uploads failed.`
      )
    }

    const newImages = results
      .filter(r => r.url)
      .map(r => ({ url: r.url, caption: '' }))

    if (newImages.length) {
      patch([...images, ...newImages])
    }

    setUploading(false)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Gallery title — optional; shown as a bold heading above the whole
          carousel in the app. Left blank, the carousel renders without one. */}
      <div>
        <label style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-body)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 4,
        }}>
          Gallery title
        </label>
        <input
          type="text"
          value={data?.title ?? ''}
          onChange={e => handleTitleChange(e.target.value)}
          disabled={disabled}
          placeholder="e.g. Rash progression"
          style={{
            width: '100%',
            fontSize: 13,
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-primary)',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
            outline: 'none',
            boxSizing: 'border-box',
            opacity: disabled ? 0.6 : 1,
          }}
        />
      </div>

      {/* Upload row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <UploadButton onUpload={handleUpload} disabled={disabled} uploading={uploading} />
        {uploadError && (
          <span style={{
            fontSize: 12,
            color: '#DC2626',
            fontFamily: 'var(--font-body)',
          }}>
            {uploadError}
          </span>
        )}
      </div>

      {/* Image list */}
      {images.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {images.map((img, index) => (
            <ImageRow
              key={img.url + index}
              image={img}
              index={index}
              total={images.length}
              disabled={disabled}
              onMoveUp={() => handleMoveUp(index)}
              onMoveDown={() => handleMoveDown(index)}
              onDelete={() => handleDelete(index)}
              onCaptionChange={caption => handleCaptionChange(index, caption)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
