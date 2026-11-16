// Plain rules for the featured card on Home (Phase H, steps 9.2 and 9.3).
// One row of the home_featured table = one topic or one drug. The table stores ids only;
// the title and the label always come from the library row that is joined to it.
// Used by the CMS screen "Home card" now, and by the Home screen later.

export const TAGLINE_MAX = 80

const TOPIC_DEFAULT_LINE = 'Overview and key points'
const DRUG_DEFAULT_LINE  = 'Brands, strengths and doses'

// The joined library row of an item (a topic or a drug), or null when it is gone.
function target(item) {
  if (!item) return null
  return item.kind === 'brand' ? (item.brands ?? null) : (item.conditions ?? null)
}

// First related row whether the database gave an object or a one-item list.
function one(value) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null)
}

export function cardTitle(item) {
  const t = target(item)
  if (!t) return ''
  const raw = item.kind === 'brand' ? t.tradename_clean : t.name
  return typeof raw === 'string' ? raw.trim() : ''
}

// "Topic · Gastroenterology" or "Drug · Antibiotic". Just "Topic" / "Drug" when there is no more to say.
export function cardLabel(item) {
  const word = item?.kind === 'brand' ? 'Drug' : 'Topic'
  const t = target(item)
  if (!t) return word
  const extra = item.kind === 'brand'
    ? (one(one(t.formulations)?.generics)?.class ?? '')
    : (one(t.specialties)?.name_en ?? '')
  const text = typeof extra === 'string' ? extra.trim() : ''
  return text ? `${word} \u00b7 ${text}` : word
}

// The short line: the admin's own line when there is one, else the default for the kind.
export function cardLine(item) {
  const own = typeof item?.tagline === 'string' ? item.tagline.trim() : ''
  if (own) return own
  return item?.kind === 'brand' ? DRUG_DEFAULT_LINE : TOPIC_DEFAULT_LINE
}

export function cardButton(item) {
  return item?.kind === 'brand' ? 'Open drug' : 'Open topic'
}

// The path the card opens in the app.
export function cardPath(item) {
  const t = target(item)
  if (!t) return null
  if (item.kind === 'brand') return t.slug ? `/drugs/${t.slug}` : (t.id ? `/drugs/${t.id}` : null)
  return t.slug ? `/conditions/${t.slug}` : null
}

// Why an item cannot show on Home right now, or null when it can.
// Order: switched off, gone, unpublished.
export function blockedReason(item) {
  if (!item || item.is_active !== true) return 'Switched off'
  const t = target(item)
  if (!t) return item.kind === 'brand' ? 'This drug is no longer in the library' : 'This topic is no longer in the library'
  if (t.is_published !== true) return item.kind === 'brand' ? 'This drug is not published' : 'This topic is not published'
  if (item.kind === 'brand') {
    const f = one(t.formulations)
    if (!f || f.is_published !== true || one(f.generics)?.is_published !== true) return 'This drug is not published'
  }
  if (!cardPath(item)) return 'This item cannot be opened'
  return null
}

export function canShow(item) {
  return blockedReason(item) === null
}

// { total, showing } for the "N of M can show now" line.
export function countSummary(items) {
  const list = Array.isArray(items) ? items : []
  return { total: list.length, showing: list.filter(canShow).length }
}

export function summaryText(items) {
  const { total, showing } = countSummary(items)
  if (total === 0) return 'Nothing on the list yet'
  return `${showing} of ${total} can show now`
}

// The random pick for Home: only items that can show, never the same as last time when there is a choice.
// `random` is a function returning 0 up to (not including) 1, so tests can control it.
export function pickFeatured(items, lastId = null, random = Math.random) {
  const ok = (Array.isArray(items) ? items : []).filter(canShow)
  if (ok.length === 0) return null
  const pool = ok.length > 1 && lastId ? ok.filter(i => i.id !== lastId) : ok
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length))
  return pool[index]
}

// What the admin typed, trimmed; empty becomes null (no line). Returns { value, error }.
export function cleanTagline(text) {
  const t = typeof text === 'string' ? text.trim() : ''
  if (!t) return { value: null, error: null }
  if (t.length > TAGLINE_MAX) return { value: null, error: `Keep it to ${TAGLINE_MAX} characters or fewer` }
  return { value: t, error: null }
}

// ─── Home screen side (step 9.3) ─────────────────────────────────────────────
// The public table rows carry ids only. Titles, labels and links come from the library saved on the
// phone (topics and drugs), so the card also works offline. An item missing from the saved library
// gets no joined row and so cannot show.

// Turns plain table rows into items shaped like the CMS list, using the saved library.
export function resolveFromLibrary(rows, conditions, drugs) {
  const topicById = new Map((Array.isArray(conditions) ? conditions : []).map(c => [c.id, c]))
  const drugById  = new Map((Array.isArray(drugs) ? drugs : []).map(d => [d.id, d]))
  return (Array.isArray(rows) ? rows : []).map(row => {
    if (row.kind === 'brand') {
      const d = drugById.get(row.brand_id)
      return {
        ...row, conditions: null,
        brands: d ? {
          id: d.id, slug: d.slug, tradename_clean: d.tradenameClean, is_published: true,
          formulations: { is_published: true, generics: { class: d.class ?? null, is_published: true } },
        } : null,
      }
    }
    const c = topicById.get(row.condition_id)
    return {
      ...row, brands: null,
      conditions: c ? {
        id: c.id, slug: c.slug, name: c.name, is_published: true,
        specialties: c.specialtyName ? { name_en: c.specialtyName } : null,
      } : null,
    }
  })
}
