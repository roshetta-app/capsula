/**
 * src/components/drugs/groups/FolderShell.jsx
 * 2026-10-22 (UI refresh plan, steps 8.10 and 8.11): the folder shape as a plain box. A small tab
 * at the top left (rounded top-left corner, slanted right edge) on a body with a square top-left
 * corner and 20 on the other three, both the same opaque colour so they read as one piece, no
 * border. Used by the group state messages, the group page header and the shared group page
 * header. Props: wash (a colour), minHeight (body), padding (body, default 14), gap (default 10),
 * children. The group card itself (GroupTile.jsx) draws the same shape with its own tap handling.
 */

import { FOLDER_TAB_WIDTH, FOLDER_TAB_HEIGHT, FOLDER_BODY_RADIUS } from './folderStyles'

export default function FolderShell({ wash, minHeight = 0, padding = 14, gap = 10, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        aria-hidden="true"
        style={{
          width: FOLDER_TAB_WIDTH, height: FOLDER_TAB_HEIGHT + 1, marginBottom: -1, flexShrink: 0, alignSelf: 'flex-start',
          backgroundColor: wash, borderTopLeftRadius: 12,
          clipPath: 'polygon(0 0, 74% 0, 100% 100%, 0 100%)',
        }}
      />
      <div style={{
        backgroundColor: wash, borderRadius: FOLDER_BODY_RADIUS, padding, minHeight, boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', gap,
      }}>
        {children}
      </div>
    </div>
  )
}
