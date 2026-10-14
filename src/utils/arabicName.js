/**
 * src/utils/arabicName.js
 *
 * 2026-10-14 (plan v9 Session 13 follow-up): display text for a brand's Arabic
 * name. Takes the stored full Arabic title (name_ar_full, e.g.
 * "دانست 4 مجم/2 مل 3 امبولات") and puts " - " between its parts:
 * brand name - strength - pack  →  "دانست - 4 مجم/2 مل - 3 امبولات".
 * For display only. Search never uses this; it matches the stored text.
 *
 * How the parts are found:
 *  - Brand part: the stored Arabic brand name when the title starts with it,
 *    else everything before the first number.
 *  - Pack part: the last "number + words" group at the end (e.g. "3 امبولات").
 *    The strength is whatever sits between the brand and the pack.
 *  - If a part cannot be found (no number, a title that ends in a number), the
 *    parts that were found are joined and the rest is left as stored.
 * With no full title, the Arabic brand name alone is returned; with neither, ''.
 */
export function formatArabicFullName(nameAr, nameArFull) {
  const full = (nameArFull ?? '').replace(/\s+/g, ' ').trim()
  const brandOnly = (nameAr ?? '').trim()
  if (!full) return brandOnly

  let brand = ''
  let rest = ''
  if (brandOnly && full.startsWith(brandOnly + ' ')) {
    brand = brandOnly
    rest = full.slice(brandOnly.length).trim()
  } else {
    const m = full.match(/^(.*?)\s+(\d.*)$/)
    if (!m) return full
    brand = m[1].trim()
    rest = m[2].trim()
  }
  // A stray " -" inside the brand part ("ايزوميبرازول -ايفا") becomes a plain space.
  brand = brand.replace(/\s+-(?=\S)/g, ' ')
  if (!rest) return brand

  // Pack = last "number + non-number words" at the end; strength = what precedes.
  const p = rest.match(/^(.*?)\s*(?:^|\s)(\d+(?:\.\d+)?\s+[^\d/]+)$/)
  if (p && p[1].trim()) {
    return `${brand} - ${p[1].trim()} - ${p[2].trim()}`
  }
  return `${brand} - ${rest}`
}
