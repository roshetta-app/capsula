/**
 * src/components/admin/AdminPageHeader.jsx
 *
 * Shared page frame for admin CMS screens — title + optional action row +
 * the standard width/padding wrapper.
 *
 * Reintroduces the page titles that were stripped out when every admin
 * screen lost its own header/back-button/width wrapper during the
 * AdminLayout shell migration (D4). Rather than hand-copying that fix into
 * each screen separately, this extracts the one wrapper+title pattern
 * UsersManager.jsx and AdminSummary.jsx had already converged on
 * independently — same "shared primitive" approach already used for
 * adminSectionPrimitives.jsx, instead of relocating the duplication D5
 * already caught and fixed once (DrugCMS's fake local AdminShell).
 *
 * - No margin: '0 auto' centering — left-aligned, matching both reference
 *   screens.
 * - Every screen fills the full content area width (no per-screen
 *   `maxWidth` cap) — only padding and title style were ever meant to be
 *   identical; width being capped per-screen was the original approach,
 *   revised once the narrow list screens (Categories etc.) visibly
 *   trailed off short of the content area once left-aligned instead of
 *   centered. `maxWidth` stays as an optional prop, unused by any screen
 *   today, in case a future screen genuinely needs a cap.
 * - `title` accepts a node, not just a string — DrugEditor's title is the
 *   live drug name, not fixed text.
 * - `actions` is optional — each screen's existing Add/Refresh/Export
 *   button slots in next to the title instead of sitting alone above it.
 */

export default function AdminPageHeader({ title, actions, maxWidth, children }) {
  return (
    <div style={{
      padding: 'var(--space-6) var(--space-5)',
      maxWidth,
      width: '100%',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-5)',
      }}>
        <div style={{
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {title}
        </div>

        {actions && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            flexShrink: 0,
          }}>
            {actions}
          </div>
        )}
      </div>

      {children}
    </div>
  )
}
