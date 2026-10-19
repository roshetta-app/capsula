/**
 * src/components/drugs/groups/AddToGroupSheet.jsx
 * 2026-10-19 (Drug groups plan, step 5.1): the bottom sheet opened by the
 * Add to group icon on the drug page. Every group of the account with a tick
 * box and its count ("8 of 20 drugs"), then a New group row. Ticking a group
 * adds this drug to it, unticking removes it, each tap saved on the spot.
 *
 * Props:
 *   isOpen   boolean
 *   onClose  () => void
 *   drug     the drug being added (flat drug object, needs id)
 *
 * States (plan section 5, Add to group sheet):
 *   - guest: the drug page asks to sign in before the sheet can open, and
 *     opens it after sign-in. Defensive: if opened signed out anyway, the
 *     sheet shows the sign-in message.
 *   - loading: three placeholder rows.
 *   - could not load, no saved copy: message with Retry.
 *   - no groups yet: "No groups yet" with Create group (the new group already
 *     holds this drug).
 *   - groups: tick boxes. A drug already in a group shows ticked. A full
 *     group (and the drug not in it) shows "Full"; a tap shows the limit
 *     message (limit sheet in Phase 7).
 *   - free account with 1 group: the New group row carries a PRO tag.
 *   - lapsed (read only): warning banner; taps show the same message.
 *   - save fails or offline: the tick goes back and a short message shows
 *     (setGroupDrugs already undoes the change and tells the person).
 *
 * New group closes this sheet and opens the group editor with this drug
 * already in it; saving shows "Added to <name>". The two sheets are never open
 * together (stacked sheets fight over focus and outside taps).
 * Rows and numbers follow the Drugs home: same sort order (groupsSortMode),
 * same colours and left-aligned names.
 */

import { useMemo, useState } from 'react'
import { Check, Folder, Plus, X } from 'lucide-react'
import SheetShell from '../../ui/SheetShell'
import GroupStateMessage from './GroupStateMessage'
import GroupEditorSheet from './GroupEditorSheet'
import { shimmer } from '../home/shimmer'
import { useDrugContext } from '../../../context/DrugContext'
import { useFavouritesContext } from '../../../context/FavouritesContext'
import { useToast } from '../../../context/ToastContext'
import { useAuth } from '../../../hooks/useAuth'
import { useIsPro } from '../../../hooks/useIsPro'
import { resolveToken } from '../../../utils/specialtyTokens'
import { useIsDark } from '../../../utils/specialtyIcon'
import {
  DRUG_GROUPS_CAP_FREE, DRUG_GROUP_DRUGS_CAP_FREE, DRUG_GROUP_DRUGS_CAP_PRO,
} from '../../../constants/features'
import { drugRowTitle } from './groupDrugText'
import {
  OFFLINE_MESSAGE, READ_ONLY_MESSAGE, groupsLimitMessage, drugsLimitMessage,
} from './groupMessages'

const ROW_STYLE = {
  width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
  padding: '10px var(--space-1)', background: 'none', border: 'none',
  borderBottom: '1px solid var(--color-border)', textAlign: 'start', cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent', outline: 'none', boxSizing: 'border-box',
}

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '10px var(--space-1)' }}>
      <div style={shimmer({ width: 22, height: 22, borderRadius: 6, flexShrink: 0 })} />
      <div style={shimmer({ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 })} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={shimmer({ width: '50%', height: 13 })} />
        <div style={shimmer({ width: '30%', height: 11 })} />
      </div>
    </div>
  )
}

function TickBox({ checked }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: checked ? 'var(--color-accent)' : 'transparent',
        border: checked ? '2px solid var(--color-accent)' : '2px solid var(--color-text-tertiary)',
        transition: 'background-color var(--motion-fast) var(--ease-settle)',
      }}
    >
      {checked && <Check size={14} strokeWidth={3} color="#fff" />}
    </div>
  )
}

export default function AddToGroupSheet({ isOpen, onClose, drug }) {
  const {
    groups, groupsStatus, isReadOnly, canCreateGroup, reloadGroups, setGroupDrugs, promptSignIn,
  } = useFavouritesContext()
  const { groupsSortMode } = useDrugContext()
  const { user } = useAuth()
  const isPro = useIsPro()
  const isDark = useIsDark()
  const { toast } = useToast()
  const [busy, setBusy] = useState(() => new Set())
  const [editorOpen, setEditorOpen] = useState(false)

  const drugId = drug?.id
  const drugsCap = isPro ? DRUG_GROUP_DRUGS_CAP_PRO : DRUG_GROUP_DRUGS_CAP_FREE

  const sorted = useMemo(() => {
    const list = groups.slice()
    if (groupsSortMode === 'az') {
      return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    }
    return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
  }, [groups, groupsSortMode])

  async function handleToggle(g) {
    if (!drugId || busy.has(g.id)) return
    const has = g.brandIds.includes(drugId)
    if (isReadOnly) { toast.info(READ_ONLY_MESSAGE); return }
    if (!has && g.brandIds.length >= drugsCap) { toast.info(drugsLimitMessage(isPro)); return }
    setBusy(prev => new Set(prev).add(g.id))
    const next = has ? g.brandIds.filter(b => b !== drugId) : [...g.brandIds, drugId]
    try {
      // The hook changes the tick at once, puts it back if the save fails, and
      // shows the offline or error message itself.
      await setGroupDrugs(g.id, next)
    } finally {
      setBusy(prev => { const s = new Set(prev); s.delete(g.id); return s })
    }
  }

  function handleNewGroup() {
    if (!user) { promptSignIn('groups', drugId ?? 'new'); return }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { toast.info(OFFLINE_MESSAGE); return }
    if (isReadOnly) { toast.info(READ_ONLY_MESSAGE); return }
    if (!canCreateGroup) { toast.info(groupsLimitMessage(isPro)); return }
    setEditorOpen(true)
    onClose()
  }

  const showProTag = !isPro && groups.length >= DRUG_GROUPS_CAP_FREE && !isReadOnly

  let body
  if (!user) {
    body = (
      <GroupStateMessage
        title="Sign in to use groups"
        body="Collect drugs into your own lists and reach them in one tap."
        actionLabel="Sign in"
        onAction={() => promptSignIn('groups', drugId ?? 'new')}
      />
    )
  } else if (groupsStatus === 'loading') {
    body = <div><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
  } else if (groupsStatus === 'error' && groups.length === 0) {
    body = (
      <GroupStateMessage
        title="Couldn't load your groups"
        actionLabel="Retry"
        onAction={reloadGroups}
      />
    )
  } else if (groups.length === 0) {
    body = (
      <GroupStateMessage
        title="No groups yet"
        body="Make a group and this drug is added to it."
        actionLabel="Create group"
        onAction={handleNewGroup}
      />
    )
  } else {
    body = (
      <div>
        {isReadOnly && (
          <div style={{ marginBottom: 'var(--space-2)' }}>
            <GroupStateMessage variant="banner" tone="warning" title={READ_ONLY_MESSAGE} />
          </div>
        )}
        {sorted.map(g => {
          const has = g.brandIds.includes(drugId)
          const full = !has && g.brandIds.length >= drugsCap
          const tone = resolveToken(g.color, isDark)
          return (
            <button
              key={g.id}
              role="checkbox"
              aria-checked={has}
              aria-label={`${g.name}, ${g.brandIds.length} of ${drugsCap} drugs`}
              onClick={() => handleToggle(g)}
              style={{ ...ROW_STYLE, opacity: busy.has(g.id) ? 0.7 : 1 }}
            >
              <TickBox checked={has} />
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                backgroundColor: tone.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Folder size={16} color={tone.fg} aria-hidden="true" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div dir="ltr" style={{
                  fontSize: 14, fontWeight: 600, lineHeight: 1.3, color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {g.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)' }}>
                  {g.brandIds.length} of {drugsCap} drugs
                </div>
              </div>
              {full && (
                <div style={{
                  flexShrink: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                  color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-surface-muted)',
                  borderRadius: 8, padding: '3px 8px', fontFamily: 'var(--font-body)',
                }}>
                  Full
                </div>
              )}
            </button>
          )
        })}

        {!isReadOnly && (
          <button onClick={handleNewGroup} style={{ ...ROW_STYLE, borderBottom: 'none' }}>
            <div
              aria-hidden="true"
              style={{
                width: 22, height: 22, flexShrink: 0,
              }}
            />
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              border: '1.5px dashed var(--color-text-tertiary)', boxSizing: 'border-box',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Plus size={17} color="var(--color-text-secondary)" aria-hidden="true" />
            </div>
            <div style={{
              flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
            }}>
              New group
            </div>
            {showProTag && (
              <div style={{
                flexShrink: 0, fontSize: 10, fontWeight: 800, letterSpacing: '0.06em',
                color: 'var(--color-accent)', backgroundColor: 'var(--color-accent-light)',
                borderRadius: 6, padding: '2px 6px', fontFamily: 'var(--font-body)',
              }}>
                PRO
              </div>
            )}
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <SheetShell isOpen={isOpen} onClose={onClose} ariaLabel="Add to group">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)',
          padding: '0 var(--space-4) var(--space-3)', flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}>
              Add to group
            </div>
            {drug && (
              <div style={{
                fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {drugRowTitle(drug)}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 36, height: 36, borderRadius: '50%', border: 'none', flexShrink: 0,
              backgroundColor: 'var(--color-surface-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent', outline: 'none',
            }}
          >
            <X size={18} color="var(--color-text-secondary)" aria-hidden="true" />
          </button>
        </div>

        <div style={{
          flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain',
          padding: '0 var(--space-4) var(--space-4)',
        }}>
          {body}
        </div>
      </SheetShell>

      <GroupEditorSheet
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        group={null}
        initialBrandIds={drugId ? [drugId] : []}
        onSaved={g => { if (g?.name) toast.success(`Added to "${g.name}"`) }}
      />
    </>
  )
}
