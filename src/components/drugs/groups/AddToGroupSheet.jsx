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
 *
 * 2026-10-21 (Drug groups plan, step 13.1, findings F7 to F11 and F14): redrawn.
 *   - The drug being added shows at the top as its normal drug card (display only,
 *     not tappable, no chevron), in place of the plain name line.
 *   - Each row: the group's colour tile at the left, name and "4 of 50" in the middle,
 *     one round control at the right (plus when the drug is not in the group, tick when
 *     it is). "Changes save as you tap" sits under the title; there is no Save step.
 *   - A full group (drug not in it) is dimmed, shows "Full" instead of the plus and says
 *     "Full. Remove a drug from it to add another." under the count. Tapping it still
 *     opens the limit sheet (13.3 redraws that sheet).
 *   - New group is a fixed button under the list (always in view, however many groups).
 *     With no groups yet the sheet says "No groups yet" and the same fixed button reads
 *     "Create a group". A group made from here receives this drug (initialBrandIds).
 *   - Close button is 44 px. Saving, limits, offline and analytics are untouched
 *     (setGroupDrugs still does every write; a second tap on a row that is saving is ignored).
 *
 * 2026-10-23 (UI refresh): the close X is gone; a round plus at the top right makes a new group (it
 * carries a small PRO tag when it would need PRO). The bottom button is a full-width Done that closes
 * the sheet. The drug being added sits in its own framed card under an 'Adding this drug' caption.
 * A group made from here now receives the drug in the same save (the hook's list is updated at once).
 */

import { useMemo, useState } from 'react'
import { Check, Folder, Plus } from 'lucide-react'
import SheetShell from '../../ui/SheetShell'
import SharedDrugCard from '../../SharedDrugCard'
import GroupStateMessage from './GroupStateMessage'
import GroupEditorSheet from './GroupEditorSheet'
import { shimmer } from '../home/shimmer'
import { useDrugContext } from '../../../context/DrugContext'
import { useFavouritesContext } from '../../../context/FavouritesContext'
import { useToast } from '../../../context/ToastContext'
import { useAuth } from '../../../hooks/useAuth'
import { useCategories } from '../../../hooks/useCategories'
import { useIsPro } from '../../../hooks/useIsPro'
import { resolveToken } from '../../../utils/specialtyTokens'
import { useIsDark } from '../../../utils/specialtyIcon'
import {
  DRUG_GROUPS_CAP_FREE, DRUG_GROUP_DRUGS_CAP_FREE, DRUG_GROUP_DRUGS_CAP_PRO,
} from '../../../constants/features'
import {
  READ_ONLY_MESSAGE,
} from './groupMessages'

const ROW_STYLE = {
  width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
  padding: '12px 0', minHeight: 68, background: 'none', border: 'none',
  borderBottom: '1px solid var(--color-border)', textAlign: 'start', cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent', outline: 'none', boxSizing: 'border-box',
}

const NO_TAP = () => {}

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '12px 0', minHeight: 68, boxSizing: 'border-box' }}>
      <div style={shimmer({ width: 44, height: 44, borderRadius: 14, flexShrink: 0 })} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={shimmer({ width: '50%', height: 13 })} />
        <div style={shimmer({ width: '25%', height: 11 })} />
      </div>
      <div style={shimmer({ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 })} />
    </div>
  )
}

// The one round control at the right of a row: a plus when this drug is not in the
// group, a tick when it is. Only a picture; the whole row is the tap target.
function RoundMark({ inGroup }) {
  return (
    <span aria-hidden="true" style={{
      width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{
        width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: inGroup ? 'var(--color-accent-light)' : 'var(--color-accent-solid)',
        color: inGroup ? 'var(--color-accent)' : '#fff',
        transition: 'background-color var(--motion-fast) var(--ease-settle)',
      }}>
        {inGroup
          ? <Check size={18} strokeWidth={2.75} />
          : <Plus size={18} strokeWidth={2.75} />}
      </span>
    </span>
  )
}

export default function AddToGroupSheet({ isOpen, onClose, drug }) {
  const {
    groups, groupsStatus, isReadOnly, canCreateGroup, reloadGroups, setGroupDrugs, promptSignIn, showGroupLimit, showGroupReadOnly,
  } = useFavouritesContext()
  const { groupsSortMode } = useDrugContext()
  const { user } = useAuth()
  const isPro = useIsPro()
  const isDark = useIsDark()
  const { toast } = useToast()
  const { categories } = useCategories()
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
    if (isReadOnly) { showGroupReadOnly(); return }
    if (!has && g.brandIds.length >= drugsCap) { showGroupLimit('drugs'); return }
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
    if (isReadOnly) { showGroupReadOnly(); return }
    if (!canCreateGroup) { showGroupLimit('groups'); return }
    setEditorOpen(true)
    onClose()
  }

  const showProTag = !isPro && groups.length >= DRUG_GROUPS_CAP_FREE && !isReadOnly

  const loading = !!user && groupsStatus === 'loading'
  const loadFailed = !!user && !loading && groupsStatus === 'error' && groups.length === 0
  const noGroups = !!user && !loading && !loadFailed && groups.length === 0
  const hasList = !!user && !loading && !loadFailed && groups.length > 0
  // The plus button at the top right (it replaced the close X): in view whenever groups can be made from here.
  const showPlus = !!user && !isReadOnly && !loading && !loadFailed

  let body
  if (!user) {
    body = (
      <GroupStateMessage
        flat
        title="Sign in to use groups"
        body="Collect drugs into your own lists and reach them in one tap."
        actionLabel="Sign in"
        onAction={() => promptSignIn('groups', drugId ?? 'new')}
      />
    )
  } else if (loading) {
    body = <div><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
  } else if (loadFailed) {
    body = (
      <GroupStateMessage
        flat
        title="Couldn't load your groups"
        actionLabel="Try again"
        onAction={reloadGroups}
      />
    )
  } else if (noGroups) {
    body = (
      <div>
        {isReadOnly && (
          <div style={{ marginBottom: 'var(--space-2)' }}>
            <GroupStateMessage variant="banner" tone="warning" title={READ_ONLY_MESSAGE} />
          </div>
        )}
        <GroupStateMessage
          flat
          title="No groups yet"
          body="Make a group and this drug is added to it."
          actionLabel={isReadOnly ? undefined : 'Create a group'}
          actionIcon={Plus}
          onAction={handleNewGroup}
        />
      </div>
    )
  } else {
    body = (
      <div>
        {isReadOnly && (
          <div style={{ marginBottom: 'var(--space-2)' }}>
            <GroupStateMessage variant="banner" tone="warning" title={READ_ONLY_MESSAGE} />
          </div>
        )}
        {sorted.map((g, i) => {
          const has = g.brandIds.includes(drugId)
          const full = !has && g.brandIds.length >= drugsCap
          const tone = resolveToken(g.color, isDark)
          return (
            <button
              key={g.id}
              role="checkbox"
              aria-checked={has}
              aria-label={full
                ? `${g.name}, ${g.brandIds.length} of ${drugsCap}, full`
                : `${g.name}, ${g.brandIds.length} of ${drugsCap}`}
              onClick={() => handleToggle(g)}
              style={{
                ...ROW_STYLE,
                borderBottom: i === sorted.length - 1 ? 'none' : ROW_STYLE.borderBottom,
                opacity: busy.has(g.id) ? 0.7 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1, minWidth: 0, opacity: full ? 0.55 : 1 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14, flexShrink: 0, boxSizing: 'border-box',
                  backgroundColor: tone.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Folder size={20} color={tone.fg} aria-hidden="true" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div dir="ltr" style={{
                    textAlign: 'start', fontSize: 15, fontWeight: 600, lineHeight: 1.3, color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {g.name}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
                    {g.brandIds.length} of {drugsCap}
                  </div>
                  {full && (
                    <div style={{ marginTop: 2, fontSize: 12, lineHeight: 1.35, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
                      Full. Remove a drug from it to add another.
                    </div>
                  )}
                </div>
              </div>
              {full ? (
                <div style={{
                  flexShrink: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                  color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-surface-muted)',
                  borderRadius: 8, padding: '3px 8px', fontFamily: 'var(--font-body)',
                }}>
                  Full
                </div>
              ) : (
                <RoundMark inGroup={has} />
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <SheetShell isOpen={isOpen} onClose={onClose} ariaLabel="Add to group">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)',
          padding: '0 var(--space-4) var(--space-2)', flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}>
              Add to group
            </div>
            {hasList && !isReadOnly && (
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
                Changes save as you tap
              </div>
            )}
          </div>
          {showPlus && (
            <button
              onClick={handleNewGroup}
              aria-label={showProTag ? 'Create new group (PRO)' : 'Create new group'}
              style={{
                position: 'relative', width: 44, height: 44, borderRadius: '50%', border: 'none', flexShrink: 0,
                backgroundColor: 'var(--color-accent-solid)', color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                WebkitTapHighlightColor: 'transparent', outline: 'none',
              }}
            >
              <Plus size={22} strokeWidth={2.75} aria-hidden="true" />
              {showProTag && (
                <span aria-hidden="true" style={{
                  position: 'absolute', top: -4, insetInlineEnd: -6,
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.05em', lineHeight: 1,
                  backgroundColor: 'var(--color-text-primary)', color: 'var(--color-surface)',
                  borderRadius: 6, padding: '3px 5px',
                }}>
                  PRO
                </span>
              )}
            </button>
          )}
        </div>

        {/* The drug being added: its normal card, display only (no tap, no chevron). */}
        {drug && (
          <div style={{ flexShrink: 0, padding: 'var(--space-2) var(--space-4) var(--space-3)' }}>
            <div style={{
              marginBottom: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
            }}>
              Adding this drug
            </div>
            <div style={{
              padding: '2px var(--space-3)', borderRadius: 'var(--radius-lg, 16px)',
              backgroundColor: 'var(--color-surface-muted)', border: '1px solid var(--color-border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
            <SharedDrugCard
              drug={drug}
              categories={categories}
              isDark={isDark}
              onTap={NO_TAP}
              disableTap
              showChevron={false}
              isLast
            />
            </div>
          </div>
        )}

        <div style={{
          flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain',
          padding: '0 var(--space-4)',
        }}>
          {body}
        </div>

        <div style={{
          flexShrink: 0, padding: 'var(--space-3) var(--space-4)',
          borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
        }}>
          <button
            onClick={onClose}
            style={{
              width: '100%', minHeight: 48, borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
              backgroundColor: 'var(--color-accent-solid)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-body)',
              WebkitTapHighlightColor: 'transparent', outline: 'none',
            }}
          >
            Done
          </button>
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
