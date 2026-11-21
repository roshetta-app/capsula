// src/components/drugs/groups/GroupPageSkeleton.jsx
// 2026-11-21 (polish step 8.6a): the loading placeholder of the group page and the shared group page,
// shaped like the real page (a grey folder with a name, a bar and a line, then three drug rows), so
// nothing jumps when it loads. The page draws its own top row (Back, or the logo) above it.

import FolderShell from './FolderShell'
import { FOLDER_GREY_WASH } from './folderStyles'
import { shimmer } from '../home/shimmer'

export default function GroupPageSkeleton() {
  return (
    <div aria-hidden="true">
      <FolderShell wash={FOLDER_GREY_WASH} padding={16} gap={12}>
        <div style={shimmer({ width: '58%', height: 24 })} />
        <div style={shimmer({ width: '100%', height: 6, borderRadius: 3 })} />
        <div style={shimmer({ width: '78%', height: 13 })} />
      </FolderShell>
      <div style={{ marginTop: 'var(--space-4)' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '14px var(--space-1)' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={shimmer({ width: '55%', height: 14 })} />
              <div style={shimmer({ width: '35%', height: 11 })} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
