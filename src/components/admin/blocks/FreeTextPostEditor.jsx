/**
 * FreeTextPostEditor — src/components/admin/blocks/FreeTextPostEditor.jsx
 *
 * Phase 3.4: CMS editor for free_text_post blocks.
 * Phase 5:   Upgraded preview to render ::: directive cards (matches app renderer).
 * Phase 6:   Added "Copy AI Prompt" button — fetches directive_ai_prompt from
 *            cms_config on mount, copies to clipboard on click.
 *
 * Title + formatting toolbar pass:
 *   - Separate optional Title field above the body (plain text, shown bold in the
 *     app). Title and body can each be used without the other.
 *   - Formatting toolbar for the body (bold, italic, underline, font color, font
 *     size, clear formatting) with Ctrl/Cmd+B/I/U shortcuts — see RichTextToolbar.jsx.
 *   - (Split view was replaced by the Write / Code / Preview views, see below.)
 *   - The old 'Title' button (turned a line into a heading) was replaced by the
 *     Title field; '# ' headings in older text still render as before.
 *
 * Word-style editing (2026-11-10):
 *   - The body is now edited in a Word-style box (RichTextEditorBox) that looks like
 *     the finished text, with no code visible. The saved text format is unchanged.
 *   - Views: Write (default), Code (the old plain text box + toolbar, kept as a
 *     safety net and for pasting) and Preview (exactly what the app shows).
 *   - A block whose text cannot be shown safely in the Write view (the check in
 *     richTextConvert.canEditVisually) opens in Code view instead.
 *
 * Smart paste + Clean up (2026-11-11):
 *   - Pasting into the Write view tidies the text first (src/lib/markdownRepair.js):
 *     tables with no divider line, lists stuck under a paragraph, "•" bullets, etc.
 *   - A "Clean up formatting" button applies the same tidy-up to text already in the
 *     block, with a one-step Undo. Nothing changes until the button is clicked.
 *
 * Props:
 *   data     { title?: string, markdown: string } — block.data (read-only; patch via onChange)
 *   onChange (dataPatch) => void    — called with { markdown } or { title }
 *   disabled Boolean                — freeze all controls during parent save
 *
 * Features:
 *   - Auto-growing textarea for markdown input
 *   - Live preview panel — renders title + directive cards + markdown (matches app exactly)
 *   - Toggle between Write / Code / Preview views
 *   - Character count
 *   - Copy AI Prompt button — one-click clipboard copy of the stored system prompt
 *   - RTL-aware: dir="auto" on both textarea and preview (Arabic/English mixed content)
 *
 * Data shape (Section 3.2 of masterplan):
 *   { "title": "string (optional)", "markdown": "string" }
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { renderTitledMarkdown } from '../../../lib/directiveRenderer'
import { fixDrugLinkNames } from '../../../lib/textLinks'
import RichTextToolbar, { applyFormat, getActiveFormats, EMPTY_ACTIVE } from './RichTextToolbar'
import RichTextEditorBox from './RichTextEditorBox'
import StickyBar from './StickyBar'
import { canEditVisually } from '../../../lib/richTextConvert'
import { repairMarkdown } from '../../../lib/markdownRepair'
import { supabase } from '../../../lib/supabase'
import { fetchCmsConfig } from '../../../lib/queries'

// ─── View mode toggle ──────────────────────────────────────────────────────────

const MODES = ['Write', 'Code', 'Preview']

function ModeToggle({ mode, onChange, modes = MODES }) {
  return (
    <div style={{
      display: 'flex',
      backgroundColor: 'var(--color-bg)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: 2,
      gap: 2,
    }}>
      {modes.map(m => {
        const isActive = mode === m
        return (
          <button
            key={m}
            onClick={() => onChange(m)}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: isActive ? 600 : 400,
              fontFamily: 'var(--font-body)',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: isActive ? 'var(--color-surface)' : 'transparent',
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.12s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {m}
          </button>
        )
      })}
    </div>
  )
}

// ─── Copy AI Prompt button ─────────────────────────────────────────────────────

// status: idle | loading | copied | error
function CopyPromptButton({ onCopy, status }) {
  const label = {
    idle:    '⚡ Copy AI Prompt',
    loading: 'Loading…',
    copied:  '✓ Copied!',
    error:   'Failed — try again',
  }[status] ?? '⚡ Copy AI Prompt'

  const color = {
    idle:    'var(--color-text-secondary)',
    loading: 'var(--color-text-tertiary)',
    copied:  'var(--color-success)',
    error:   'var(--color-danger)',
  }[status] ?? 'var(--color-text-secondary)'

  return (
    <button
      onClick={onCopy}
      style={{
        padding: '4px 10px',
        fontSize: 11,
        fontWeight: 500,
        fontFamily: 'var(--font-body)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--color-border)',
        cursor: status === 'loading' ? 'default' : 'pointer',
        backgroundColor: 'var(--color-surface)',
        color,
        transition: 'color 0.15s',
        whiteSpace: 'nowrap',
        opacity: status === 'loading' ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  )
}

// ─── Clean up formatting button ────────────────────────────────────────────────

function CleanUpButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Fix tables, lists and line spacing in this text"
      style={{
        padding: '4px 10px',
        fontSize: 11,
        fontWeight: 500,
        fontFamily: 'var(--font-body)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--color-border)',
        cursor: disabled ? 'default' : 'pointer',
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text-secondary)',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      ✨ Clean up formatting
    </button>
  )
}

// ─── Clear all text button ─────────────────────────────────────────────────────

function ClearButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Remove all the text in this block (you can undo)"
      style={{
        padding: '4px 10px',
        fontSize: 11,
        fontWeight: 500,
        fontFamily: 'var(--font-body)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--color-border)',
        cursor: disabled ? 'default' : 'pointer',
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text-secondary)',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      🗑 Clear
    </button>
  )
}

// ─── Auto-growing textarea ─────────────────────────────────────────────────────

function AutoTextarea({ value, onChange, disabled, placeholder, textareaRef, onKeyDown }) {
  const innerRef = useRef(null)
  const ref = textareaRef ?? innerRef

  useEffect(() => {
    if (!ref.current) return
    ref.current.style.height = 'auto'
    ref.current.style.height = `${ref.current.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      disabled={disabled}
      placeholder={placeholder}
      dir="auto"
      rows={6}
      style={{
        width: '100%',
        minHeight: 140,
        resize: 'none',
        overflow: 'hidden',
        fontSize: 13,
        lineHeight: 1.6,
        fontFamily: 'var(--font-mono, monospace)',
        color: 'var(--color-text-primary)',
        backgroundColor: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3)',
        outline: 'none',
        boxSizing: 'border-box',
        opacity: disabled ? 0.6 : 1,
        transition: 'border-color 0.15s',
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
    />
  )
}

// ─── Title field ───────────────────────────────────────────────────────────────

function TitleField({ value, onChange, disabled }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      placeholder="Title (optional)"
      aria-label="Title"
      dir="auto"
      style={{
        width: '100%',
        fontSize: 15,
        fontWeight: 700,
        fontFamily: 'var(--font-body)',
        color: 'var(--color-text-primary)',
        backgroundColor: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '8px var(--space-3)',
        outline: 'none',
        boxSizing: 'border-box',
        opacity: disabled ? 0.6 : 1,
        transition: 'border-color 0.15s',
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
    />
  )
}

// ─── Preview panel ─────────────────────────────────────────────────────────────

function PreviewPanel({ title, markdown }) {
  if (!markdown?.trim() && !title?.trim()) {
    return (
      <div style={{
        fontSize: 14,
        lineHeight: 1.7,
        color: 'var(--color-text-tertiary)',
        fontFamily: 'var(--font-body)',
        fontStyle: 'italic',
        padding: 'var(--space-3)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-bg)',
        minHeight: 140,
      }}>
        Nothing to preview.
      </div>
    )
  }

  return (
    <div
      dir="auto"
      className="dir-prose"
      style={{
        padding: 'var(--space-3)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-bg)',
        minHeight: 140,
        overflowY: 'auto',
      }}
      dangerouslySetInnerHTML={{ __html: fixDrugLinkNames(renderTitledMarkdown(title, markdown)) }}
    />
  )
}

// ─── Main export ───────────────────────────────────────────────────────────────

/**
 * FreeTextPostEditor
 *
 * @param {{ title?: string, markdown: string }} data
 * @param {Function} onChange   — (dataPatch) => void; receives { markdown } or { title }
 * @param {Boolean}  disabled   — freeze controls during parent save
 */
export default function FreeTextPostEditor({ data, onChange, disabled = false }) {
  const markdown = data?.markdown ?? ''
  const title = data?.title ?? ''
  // Write (Word-style) unless this block's text cannot be shown safely that way.
  const [visualOk] = useState(() => canEditVisually(data?.markdown ?? ''))
  const [mode, setModeRaw]          = useState(visualOk ? 'Write' : 'Code')
  const [codeNote, setCodeNote]     = useState(!visualOk)
  const viewMode = mode

  function setMode(next) {
    if (next === 'Write' && !canEditVisually(markdown)) {
      setCodeNote(true)
      return
    }
    setCodeNote(false)
    setModeRaw(next)
  }
  const [aiPrompt, setAiPrompt]     = useState(null)   // null = not yet fetched
  const [copyStatus, setCopyStatus] = useState('idle') // idle | loading | copied | error
  const [cleanNote, setCleanNote]   = useState(null)   // null | { kind: 'none' } | { kind: 'done', before: string }

  const charCount = markdown.length
  const textareaRef = useRef(null)
  const [active, setActive] = useState(EMPTY_ACTIVE)

  // Keeps the toolbar's highlighted buttons in step with the selected text.
  const refreshActive = useCallback(() => {
    const el = textareaRef.current
    if (!el || document.activeElement !== el) return
    const next = getActiveFormats(el.value, el.selectionStart, el.selectionEnd)
    setActive(prev => (Object.keys(next).every(k => prev[k] === next[k]) ? prev : next))
  }, [])

  useEffect(() => {
    document.addEventListener('selectionchange', refreshActive)
    return () => document.removeEventListener('selectionchange', refreshActive)
  }, [refreshActive])

  // Fetch the AI prompt once on mount — cached in state for the session.
  useEffect(() => {
    fetchCmsConfig(supabase, 'directive_ai_prompt')
      .then(value => setAiPrompt(value ?? ''))
      .catch(() => setAiPrompt(''))   // silent fail — button will show error on click
  }, [])

  // One history for the whole block, shared by the Write box and the Code view, so Undo /
  // Redo also take back toolbar choices. Typing is grouped: a pause of about 0.7 s starts
  // a new step; a toolbar choice, a paste or a card is always its own step.
  const hist = useRef({ past: [], future: [], cur: markdown, at: 0 })
  hist.current.cur = markdown
  const [, bumpHistory] = useState(0)

  function handleChange(val, opts = {}) {
    setCleanNote(null)
    const h = hist.current
    if (val !== h.cur) {
      const now = Date.now()
      if (opts.step || !h.past.length || now - h.at > 700) {
        h.past.push(h.cur)
        if (h.past.length > 100) h.past.shift()
      }
      h.at = opts.step ? 0 : now
      h.future = []
      h.cur = val
      bumpHistory(n => n + 1)
    }
    onChange({ markdown: val })
  }

  function stepHistory(from, to) {
    const h = hist.current
    if (!h[from].length) return
    const target = h[from].pop()
    h[to].push(h.cur)
    h.cur = target
    h.at = 0
    setCleanNote(null)
    bumpHistory(n => n + 1)
    onChange({ markdown: target })
  }

  const history = {
    canUndo: hist.current.past.length > 0,
    canRedo: hist.current.future.length > 0,
    undo: () => stepHistory('past', 'future'),
    redo: () => stepHistory('future', 'past'),
  }

  // Fixes tables with no divider line, lists stuck under a paragraph, bullets, and
  // line spacing in the text already saved. The first version is kept for one Undo.
  function handleCleanUp() {
    if (disabled) return
    const fixed = repairMarkdown(markdown)
    if (fixed === markdown) {
      setCleanNote({ kind: 'none' })
      return
    }
    handleChange(fixed, { step: true })
    if (viewMode === 'Write' && !canEditVisually(fixed)) {
      setModeRaw('Code')
      setCodeNote(true)
    }
    setCleanNote({ kind: 'done', before: markdown })
  }

  // Empties the text of this block (the title field is left alone). The old text is
  // kept for one Undo, the same way as Clean up formatting.
  function handleClearAll() {
    if (disabled || !markdown.trim()) return
    const before = markdown
    handleChange('', { step: true })
    setCleanNote({ kind: 'cleared', before })
  }

  function handleUndoCleanUp() {
    if (cleanNote?.kind !== 'done' && cleanNote?.kind !== 'cleared') return
    handleChange(cleanNote.before, { step: true })
  }

  async function handleCopyPrompt() {
    if (copyStatus === 'loading') return

    // Prompt not yet loaded — fetch on demand then copy
    if (aiPrompt === null) {
      setCopyStatus('loading')
      try {
        const value = await fetchCmsConfig(supabase, 'directive_ai_prompt')
        setAiPrompt(value ?? '')
        await navigator.clipboard.writeText(value ?? '')
        setCopyStatus('copied')
      } catch {
        setCopyStatus('error')
      }
      setTimeout(() => setCopyStatus('idle'), 2000)
      return
    }

    // Prompt already cached — copy immediately
    try {
      await navigator.clipboard.writeText(aiPrompt)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('error')
    }
    setTimeout(() => setCopyStatus('idle'), 2000)
  }

  // Applies one toolbar choice to the selected text (or the word at the cursor)
  // and keeps that text selected so the next choice builds on it.
  function runFormat(action) {
    const el = textareaRef.current
    if (!el || disabled) return
    if (action.type === 'undo') { history.undo(); return }
    if (action.type === 'redo') { history.redo(); return }
    const res = applyFormat(el.value, el.selectionStart, el.selectionEnd, action)
    if (!res) return
    handleChange(res.value, { step: true })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(res.selStart, res.selEnd)
      setActive(getActiveFormats(res.value, res.selStart, res.selEnd))
    })
  }

  // Enter on a bullet line starts the next bullet; Enter on an empty bullet
  // ends the list (removes that empty bullet).
  function handleEnterInList(e) {
    const el = textareaRef.current
    if (!el || el.selectionStart !== el.selectionEnd) return false
    const pos = el.selectionStart
    const v = el.value
    const lineStart = v.lastIndexOf('\n', pos - 1) + 1
    const m = v.slice(lineStart, pos).match(/^(\s*)([-*+])\s+(.*)$/)
    if (!m) return false
    e.preventDefault()
    let next, caret
    if (m[3].trim() === '') {
      next = v.slice(0, lineStart) + v.slice(pos)
      caret = lineStart
    } else {
      const ins = '\n' + m[1] + '- '
      next = v.slice(0, pos) + ins + v.slice(pos)
      caret = pos + ins.length
    }
    handleChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(caret, caret)
      setActive(getActiveFormats(next, caret, caret))
    })
    return true
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && !e.nativeEvent?.isComposing) {
      if (handleEnterInList(e)) return
    }
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return
    const k = e.key.toLowerCase()
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); history.undo(); return }
    if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); history.redo(); return }
    if (e.shiftKey) return
    const id = { b: 'b', i: 'i', u: 'u' }[k]
    if (!id) return
    e.preventDefault()
    runFormat({ type: 'toggle', id })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-2)',
        flexWrap: 'wrap',
      }}>
        <ModeToggle mode={viewMode} onChange={setMode} modes={MODES} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', minWidth: 0 }}>
          <span style={{
            fontSize: 11,
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-body)',
          }}>
            {charCount > 0 ? `${charCount.toLocaleString()} chars` : ''}
          </span>
          {viewMode !== 'Preview' && <CleanUpButton onClick={handleCleanUp} disabled={disabled || !markdown.trim()} />}
          {viewMode !== 'Preview' && <ClearButton onClick={handleClearAll} disabled={disabled || !markdown.trim()} />}
          <CopyPromptButton onCopy={handleCopyPrompt} status={copyStatus} />
        </div>
      </div>

      {/* Title (optional) */}
      <TitleField value={title} onChange={val => onChange({ title: val })} disabled={disabled} />

      {cleanNote && (
        <div style={{
          fontSize: 12, lineHeight: 1.5, color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-body)', background: 'var(--color-bg)',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
          padding: '6px var(--space-3)', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 'var(--space-2)',
        }}>
          <span>
            {cleanNote.kind === 'done'
              ? 'Formatting cleaned up. Check the result, or undo it.'
              : cleanNote.kind === 'cleared'
                ? 'Text cleared. Undo if that was a mistake.'
                : 'Nothing to fix: the formatting already looks right.'}
          </span>
          {(cleanNote.kind === 'done' || cleanNote.kind === 'cleared') && (
            <button
              type="button"
              onClick={handleUndoCleanUp}
              style={{
                padding: '2px 8px', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-body)',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}

      {codeNote && (
        <div style={{
          fontSize: 12, lineHeight: 1.5, color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-body)', background: 'var(--color-bg)',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
          padding: '6px var(--space-3)',
        }}>
          This text has formatting the Write view can't show safely, so it is open in Code view. Nothing was changed.
        </div>
      )}

      {/* Write view: Word-style box with its own toolbar */}
      {viewMode === 'Write' && (
        <div className="rx-prose-tight">
          <RichTextEditorBox
            value={markdown}
            onChange={handleChange}
            disabled={disabled}
            history={history}
          />
        </div>
      )}

      {/* Code view: formatting toolbar for the plain text box */}
      {viewMode === 'Code' && (
        <StickyBar>
          <RichTextToolbar active={active} onAction={runFormat} disabled={disabled}
            canUndo={history.canUndo} canRedo={history.canRedo} />
        </StickyBar>
      )}

      {/* Editor area */}
      {viewMode === 'Code' && (
        <AutoTextarea
          value={markdown}
          onChange={handleChange}
          disabled={disabled}
          textareaRef={textareaRef}
          onKeyDown={handleKeyDown}
          placeholder="Write here… select text and use the toolbar. Use :::warning, :::dose, :::redflags etc. for cards"
        />
      )}

      {viewMode === 'Preview' && (
        <div className="rx-prose-tight">
          <PreviewPanel title={title} markdown={markdown} />
        </div>
      )}
    </div>
  )
}
