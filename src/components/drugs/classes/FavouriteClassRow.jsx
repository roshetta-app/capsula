/**
 * src/components/drugs/classes/FavouriteClassRow.jsx
 *
 * 2026-10-08 (refactor, phase 2b): one row of the saved classes sheet, moved
 * here from FavouriteClassesSheet.jsx. It is now the shared ClassCard in its
 * 'saved' look, with the heart as the trailing button. Same look. No
 * behaviour change.
 *
 * Props: item { className, familyName }, onOpen(item), onRemove(item)
 */
import { Layers } from 'lucide-react'
import RowStarButton from '../../ui/RowStarButton'
import ClassCard from './ClassCard.jsx'
import { MoleculeIcon } from './ClassIcons.jsx'
import { titleCaseWords } from '../../../utils/classSearch'

export default function FavouriteClassRow({ item, onOpen, onRemove }) {
  const isFamily = !!item.familyName
  return (
    <ClassCard
      variant="saved"
      tone="class"
      name={titleCaseWords(isFamily ? item.familyName : item.className)}
      subline={isFamily ? titleCaseWords(item.className) : null}
      Icon={isFamily ? MoleculeIcon : Layers}
      onClick={() => onOpen(item)}
      trailing={<RowStarButton isFavourited onPress={() => onRemove(item)} />}
    />
  )
}
