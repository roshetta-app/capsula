/**
 * src/components/profile/PublicProfileView.jsx
 * 14.7b (public profile plan, 2026-11-22): the pieces of a public profile, shared by the visitor page
 * (/u/<username>) and the person's own Profile tab so the two always look the same.
 *
 *   ProfileHeader   chosen avatar, name (its own direction, so Arabic reads right) and @username
 *                   (always left to right, on its own line), then the bio
 *   ShareProfileButton   the phone share sheet, or a copied link with a short note
 *   ProfileLists    two tabs (Roshettas, Drug groups) with the true totals, cards that open the shared page
 *                   (/r/<code>, /g/<code>), the "Showing the newest 50 of N" line and the empty lines
 *   SafetyLine      "Titles are written by the person and are not checked by Capsula."
 *
 * Everything shown is plain text written by the person; nothing is clickable except the cards and the
 * buttons. Nothing is kept on the phone. The rules and wording are in utils/profileView.js.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Share2, ChevronRight, ChevronLeft, MoreVertical } from 'lucide-react'
import ConfirmSheet from '../ui/ConfirmSheet'
import { MAKE_PRIVATE_MESSAGE } from '../../utils/publicShare'
import PublicAvatar from '../ui/PublicAvatar'
import { ROUTES } from '../../router'
import { shareProfile } from '../../utils/shareProfileLink'
import {
  PROFILE_WORDS, defaultTab, tabsFor, capLine, itemLine, emptyLine, safeColor,
} from '../../utils/profileView'

const BODY = { fontFamily: 'var(--font-body)' }

export function ProfileHeader({ profile, showAvatarAndName = true }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 'var(--space-4)' }}>
      {showAvatarAndName && (
        <>
          <PublicAvatar code={profile.avatarCode} name={profile.name} size={72} style={{ marginBottom: 'var(--space-2)' }} />
          <div dir="auto" style={{ fontSize: 19, fontWeight: 600, color: 'var(--color-text-primary)', overflowWrap: 'anywhere' }}>
            {profile.name || `@${profile.handle}`}
          </div>
          <div dir="ltr" style={{ marginTop: 2, fontSize: 14, color: 'var(--color-text-secondary)' }}>@{profile.handle}</div>
        </>
      )}
      {profile.bio && (
        <p dir="auto" style={{ margin: 'var(--space-3) 0 0', fontSize: 14, lineHeight: 1.55, color: 'var(--color-text-secondary)', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
          {profile.bio}
        </p>
      )}
    </div>
  )
}

export function ShareProfileButton({ name, handle }) {
  const [note, setNote] = useState('')
  async function onShare() {
    const result = await shareProfile(name, handle)
    if (result === 'copied') setNote(PROFILE_WORDS.copied)
    else if (result === 'failed') setNote(PROFILE_WORDS.shareFailed)
    else setNote('')
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <button
        type="button"
        onClick={onShare}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 var(--space-4)',
          borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
          color: 'var(--color-accent-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent', ...BODY,
        }}
      >
        <Share2 size={16} strokeWidth={2} aria-hidden="true" />
        {PROFILE_WORDS.share}
      </button>
      <div role="status" aria-live="polite" style={{ minHeight: 16, fontSize: 12, color: 'var(--color-text-tertiary)', ...BODY }}>{note}</div>
    </div>
  )
}

function Card({ item, tabKey, onOpen }) {
  const dot = tabKey === 'groups' ? safeColor(item.color) : null
  const Arrow = typeof document !== 'undefined' && document.dir === 'rtl' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 60, padding: '10px 14px', boxSizing: 'border-box',
        textAlign: 'start', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--color-surface)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', outline: 'none', ...BODY,
      }}
    >
      {tabKey === 'groups' && (
        <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, backgroundColor: dot || 'var(--color-accent)' }} />
      )}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span dir="auto" style={{ display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', overflowWrap: 'anywhere' }}>{item.name}</span>
        <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: 'var(--color-text-secondary)' }}>{itemLine(item)}</span>
      </span>
      <Arrow size={18} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} aria-hidden="true" />
    </button>
  )
}

// own: the person looking at their own list (empty lines differ). onAdd: optional, draws Add to profile.
export function ProfileLists({ profile, own = false, onAdd, onMakePrivate }) {
  const navigate = useNavigate()
  // The chosen tab lives only while the page is open (plain state, never stored).
  const [tab, setTab] = useState(() => defaultTab(profile))
  const tabs = tabsFor(profile)
  const section = tab === 'groups' ? profile.groups : profile.roshettas
  const cap = capLine(section)
  const [pending, setPending] = useState(null)

  return (
    <div>
      <div role="tablist" style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        {tabs.map((t) => {
          const active = t.key === tab
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, minHeight: 44, borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                border: active ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                backgroundColor: active ? 'var(--color-accent-light)' : 'var(--color-surface)',
                color: active ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
                WebkitTapHighlightColor: 'transparent', outline: 'none', ...BODY,
              }}
            >
              {t.label} {t.total}
            </button>
          )
        })}
      </div>

      {section.items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-5) var(--space-4)', fontSize: 14, lineHeight: 1.55, color: 'var(--color-text-secondary)', ...BODY }}>
          {emptyLine(tab, own)}
          {own && onAdd && (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <button
                type="button"
                onClick={() => onAdd(tab)}
                style={{
                  minHeight: 44, padding: '0 var(--space-4)', borderRadius: 'var(--radius-full)', border: 'none',
                  backgroundColor: 'var(--color-accent)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent', ...BODY,
                }}
              >
                {PROFILE_WORDS.addToProfile}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {section.items.map((item) => (
            <div key={item.code} style={{ display: 'flex', alignItems: 'stretch', gap: 4 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Card
                  item={item}
                  tabKey={tab}
                  onOpen={() => navigate(tab === 'groups' ? ROUTES.SHARED_GROUP(item.code) : ROUTES.SHARED_ROSHETTA(item.code))}
                />
              </div>
              {own && onMakePrivate && (
                <button
                  type="button"
                  aria-label="Make private"
                  onClick={() => setPending(item)}
                  style={{ flexShrink: 0, width: 44, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', WebkitTapHighlightColor: 'transparent' }}
                >
                  <MoreVertical size={20} strokeWidth={1.8} />
                </button>
              )}
            </div>
          ))}
          {cap && (
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-tertiary)', padding: 'var(--space-2) 0', ...BODY }}>{cap}</div>
          )}
        </div>
      )}
      <ConfirmSheet
        isOpen={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={() => onMakePrivate(tab, pending)}
        title="Make private?"
        message={MAKE_PRIVATE_MESSAGE}
        confirmLabel="Make private"
        destructive
      />
    </div>
  )
}

export function SafetyLine() {
  return (
    <p style={{ margin: 'var(--space-5) 0 var(--space-3)', textAlign: 'center', fontSize: 12, lineHeight: 1.5, color: 'var(--color-text-tertiary)', ...BODY }}>
      {PROFILE_WORDS.safety}
    </p>
  )
}
