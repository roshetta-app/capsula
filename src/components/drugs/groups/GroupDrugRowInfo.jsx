/**
 * src/components/drugs/groups/GroupDrugRowInfo.jsx
 * 2026-10-19 (Drug groups plan, step 4.3): the text part of a drug row in the
 * group editor, shared by the search results and the group's own list so the
 * two look the same: brand name with its pack suffix, the generic line, and
 * the Arabic name when the drug has one (left-aligned, decision 2026-10-19).
 * The same wording rules as the drug card (SharedDrugCard.jsx).
 */

import { formatArabicFullName } from '../../../utils/arabicName'
import { drugRowTitle, drugGenericLine } from './groupDrugText'

export default function GroupDrugRowInfo({ drug }) {
  const generic = drugGenericLine(drug)
  const arabic = formatArabicFullName(drug.nameAr, drug.nameArFull)
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: 14, fontWeight: 600, lineHeight: 1.3, color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-body)', overflowWrap: 'anywhere',
      }}>
        {drugRowTitle(drug)}
      </div>
      {generic && (
        <div style={{
          fontSize: 12, lineHeight: 1.35, color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-body)', overflowWrap: 'anywhere',
        }}>
          {generic}
        </div>
      )}
      {arabic && (
        <div dir="ltr" style={{
          fontSize: 12, lineHeight: 1.35, color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-body)', overflowWrap: 'anywhere',
        }}>
          {arabic}
        </div>
      )}
    </div>
  )
}
