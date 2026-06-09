/**
 * src/admin/ImageManager.jsx
 * Phase 3I — Image Upload & Gallery Manager
 *
 * Embedded inside a condition's editor as a tab / section.
 * Shows all images for the condition, supports upload, caption edit, delete.
 *
 * Props:
 *   conditionId   string   — UUID of the condition being managed
 *   onClose       () => void  — optional; renders a close button if provided
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Upload, Trash2, X, ImageOff, Loader } from 'lucide-react'
import { supabase }            from '../../lib/supabase'
import { useToast }            from '../../context/ToastContext'
import ConfirmModal            from '../../components/admin/ConfirmModal'
import {
  uploadConditionImage,
  deleteConditionImage,
  updateImageCaption,
  fetchConditionImages,
  validateImageFile,
} from '../../utils/imageUpload'

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ImageManager({ conditionId, onClose }) {
  const { toast } = useToast()

  const [images,      setImages]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [uploading,   setUploading]   = useState(false)
  const [dragOver,    setDragOver]    = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)  // { id, url }
  const [deleting,    setDeleting]    = useState(false)

  const fileInputRef = useRef(null)

  // ── Load images ─────────────────────────────────────────────────────────────

  const loadImages = useCallback(async () => {
    setLoading(true)
    const { data, error } = await fetchConditionImages(supabase, conditionId)
    if (error) {
      toast.error(error.message ?? 'Failed to load images')
    } else {
      setImages(data)
    }
    setLoading(false)
  }, [conditionId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadImages() }, [loadImages])

  // ── Upload handler ──────────────────────────────────────────────────────────

  async function handleFiles(files) {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)

    // Pre-validate all files before uploading any
    for (const file of fileArray) {
      const err = validateImageFile(file)
      if (err) { toast.error(err); return }
    }

    setUploading(true)
    let successCount = 0

    for (const file of fileArray) {
      const { data, error } = await uploadConditionImage(supabase, conditionId, file)
      if (error) {
        toast.error(`Upload failed for "${file.name}": ${error.message}`)
      } else {
        setImages(prev => [...prev, data])
        successCount++
      }
    }

    if (successCount > 0) {
      toast.success(
        successCount === 1
          ? '1 image uploaded'
          : `${successCount} images uploaded`
      )
    }

    setUploading(false)
    // Reset file input so same file can be re-uploaded if needed
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  function onDragOver(e) {
    e.preventDefault()
    setDragOver(true)
  }
  function onDragLeave(e) {
    // Only clear when leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false)
  }
  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await deleteConditionImage(supabase, deleteTarget.id, deleteTarget.url)
    setDeleting(false)
    if (error) {
      toast.error(error.message ?? 'Delete failed')
    } else {
      setImages(prev => prev.filter(img => img.id !== deleteTarget.id))
      toast.success('Image deleted')
      setDeleteTarget(null)
    }
  }

  // ── Caption update ───────────────────────────────────────────────────────────

  async function handleCaptionSave(imageId, caption) {
    const { error } = await updateImageCaption(supabase, imageId, caption)
    if (error) {
      toast.error(error.message ?? 'Caption save failed')
    } else {
      setImages(prev => prev.map(img =>
        img.id === imageId ? { ...img, caption } : img
      ))
      toast.success('Caption saved')
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 'var(--space-4)',
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Image Gallery
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            JPG, PNG, WebP · Max 5 MB per image
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={iconBtnStyle}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Drop Zone ───────────────────────────────────────────────────────── */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--color-accent)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-lg)',
          backgroundColor: dragOver
            ? 'var(--color-accent-light)'
            : 'var(--color-bg)',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-2)',
          cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          marginBottom: 'var(--space-4)',
          minHeight: 110,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />

        {uploading ? (
          <>
            <Loader size={22} color="var(--color-accent)" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              Uploading…
            </span>
          </>
        ) : (
          <>
            <Upload size={22} color={dragOver ? 'var(--color-accent)' : 'var(--color-text-tertiary)'} />
            <span style={{ fontSize: 13, color: dragOver ? 'var(--color-accent)' : 'var(--color-text-secondary)', fontWeight: 500 }}>
              {dragOver ? 'Drop to upload' : 'Drag & drop images here, or click to browse'}
            </span>
          </>
        )}
      </div>

      {/* ── Image grid ──────────────────────────────────────────────────────── */}
      {loading ? (
        <LoadingSkeleton />
      ) : images.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 'var(--space-3)',
        }}>
          {images.map(img => (
            <ImageTile
              key={img.id}
              image={img}
              onDelete={() => setDeleteTarget({ id: img.id, url: img.url })}
              onCaptionSave={caption => handleCaptionSave(img.id, caption)}
            />
          ))}
        </div>
      )}

      {/* ── Count bar ───────────────────────────────────────────────────────── */}
      {!loading && images.length > 0 && (
        <div style={{
          marginTop: 'var(--space-3)',
          fontSize: 12, color: 'var(--color-text-tertiary)',
          textAlign: 'right',
        }}>
          {images.length} image{images.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* ── Delete confirm ──────────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete image?"
        message="This image will be permanently deleted from storage. This cannot be undone."
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        confirmVariant="danger"
      />

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── ImageTile ────────────────────────────────────────────────────────────────

function ImageTile({ image, onDelete, onCaptionSave }) {
  const [caption,  setCaption]  = useState(image.caption ?? '')
  const [editing,  setEditing]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const inputRef = useRef(null)

  // Keep local state in sync if parent refreshes
  useEffect(() => { setCaption(image.caption ?? '') }, [image.caption])

  function startEdit() {
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 10)
  }

  async function handleBlur() {
    setEditing(false)
    const trimmed = caption.trim()
    // Only save if changed
    if (trimmed === (image.caption ?? '').trim()) return
    setSaving(true)
    await onCaptionSave(trimmed)
    setSaving(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter')  { e.preventDefault(); inputRef.current?.blur() }
    if (e.key === 'Escape') { setCaption(image.caption ?? ''); setEditing(false) }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      borderRadius: 'var(--radius-md)',
      border: '1.5px solid var(--color-border)',
      overflow: 'hidden',
      backgroundColor: 'var(--color-surface)',
      boxShadow: 'var(--shadow-card)',
    }}>
      {/* Thumbnail */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', overflow: 'hidden', backgroundColor: 'var(--color-bg)' }}>
        <img
          src={image.url}
          alt={image.caption || 'Condition image'}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          loading="lazy"
        />

        {/* Delete button — top right overlay */}
        <button
          onClick={onDelete}
          title="Delete image"
          style={{
            position: 'absolute', top: 4, right: 4,
            width: 26, height: 26,
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            backgroundColor: 'rgba(220,38,38,0.85)',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(2px)',
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Caption area */}
      <div
        style={{ padding: '6px 8px', minHeight: 32 }}
        onClick={!editing ? startEdit : undefined}
        title={editing ? undefined : 'Click to edit caption'}
      >
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="Add caption…"
            style={{
              width: '100%', boxSizing: 'border-box',
              border: '1.5px solid var(--color-accent)',
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: 11,
              fontFamily: 'var(--font-body)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
          />
        ) : (
          <span style={{
            fontSize: 11,
            color: saving
              ? 'var(--color-text-tertiary)'
              : caption
                ? 'var(--color-text-secondary)'
                : 'var(--color-text-tertiary)',
            cursor: 'text',
            display: 'block',
            lineHeight: 1.4,
            fontStyle: caption ? 'normal' : 'italic',
          }}>
            {saving ? 'Saving…' : caption || 'Add caption…'}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 'var(--space-2)',
      padding: 'var(--space-8) var(--space-4)',
      color: 'var(--color-text-tertiary)',
    }}>
      <ImageOff size={32} strokeWidth={1.5} />
      <span style={{ fontSize: 13 }}>No images yet</span>
      <span style={{ fontSize: 12, opacity: 0.7 }}>Upload images using the area above</span>
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
      gap: 'var(--space-3)',
    }}>
      {[1, 2, 3].map(i => (
        <div
          key={i}
          style={{
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--color-border)',
            overflow: 'hidden',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <div style={{
            width: '100%', aspectRatio: '4/3',
            backgroundColor: 'var(--color-bg)',
            animation: 'shimmer 1.4s ease-in-out infinite',
          }} />
          <div style={{ height: 32, backgroundColor: 'var(--color-bg)', margin: 6, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const iconBtnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32,
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'transparent',
  color: 'var(--color-text-tertiary)',
  cursor: 'pointer',
}
