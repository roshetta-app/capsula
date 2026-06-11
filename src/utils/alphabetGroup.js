/**
 * src/utils/alphabetGroup.js
 *
 * Groups a pre-sorted ConditionFull[] by first letter of condition.name.
 * Returns an array of { letter: string, items: ConditionFull[] }.
 * Non-alpha names (numbers, Arabic) are grouped under '#'.
 *
 * Input must already be sorted A–Z. This function only groups, not sorts.
 *
 * @param {ConditionFull[]} conditions
 * @returns {{ letter: string, items: ConditionFull[] }[]}
 */
export function alphabetGroup(conditions) {
  const map = new Map()

  for (const condition of conditions) {
    const firstChar = condition.name?.trim()[0]?.toUpperCase() ?? '#'
    const letter = /^[A-Z]$/.test(firstChar) ? firstChar : '#'

    if (!map.has(letter)) map.set(letter, [])
    map.get(letter).push(condition)
  }

  // Sort groups: A–Z first, then '#' at the end
  const sorted = [...map.entries()].sort(([a], [b]) => {
    if (a === '#') return 1
    if (b === '#') return -1
    return a.localeCompare(b)
  })

  return sorted.map(([letter, items]) => ({ letter, items }))
}
