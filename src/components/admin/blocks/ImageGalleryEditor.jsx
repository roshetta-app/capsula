/**
 * ImageGalleryEditor — src/components/admin/blocks/ImageGalleryEditor.jsx
 *
 * Phase 3.3: CMS editor for image_gallery blocks.
 *
 * Props:
 *   data     { images: { url, caption }[] }  — block.data (read-only; patch via onChange)
 *   onChange (dataPatch) => void             — call with { images: nextImages }
 *   disabled Boolean                         — freeze all controls during parent save
 *
 * Features:
 *   - Thumbnail strip of existing images with caption field below each
 *   - ↑ ↓ 🗑 per image
 *   - Upload button (calls uploadConditionImage from adminQueries) — single or multiple files
 *   - Shows upload progress / error inline
 *   - Empty state when images: []
 *
 * Data shape (Section 3.1 of masterplan):
 *   { images: [{ url: "https://...", caption: "" }] }
 *   (No id field at the block level — id is only on condition_images rows, which are legacy)
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
 * @param {{ images: { url: string, caption: string }[] }} data
 * @param {Function} onChange   — (dataPatch) => void; receives { images: nextImages }
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

    const results = await Promise.all(files.map(f => uploadConditionImage(f)))

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
