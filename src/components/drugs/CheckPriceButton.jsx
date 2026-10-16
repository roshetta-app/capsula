/**
 * src/components/drugs/CheckPriceButton.jsx
 *
 * 2026-10-16 (plan v9 Session 15, S15d, decision D21): one "Check price"
 * button on every drug page. The app shows no price anywhere; the button
 * sends the user to where the current price is.
 *
 * Where it goes:
 *   - Drug matched to a DawaaGate page (about 56% of drugs): that exact page,
 *     opened in the in-app browser. The link comes from the database function
 *     brand_price_link(brand id), which returns only the page link (no price,
 *     no barcode, no dates). Caption says it opens DawaaGate (credit to the
 *     source, as the permission request promised).
 *   - No matched page, or the lookup fails (offline, error): DawaaGate's own
 *     search (https://www.dawaagate.com/search?q=<name>+<strength number>),
 *     e.g. "panadol advance 500". Updated 2026-10-16 (Omar): this replaces
 *     the Google search as the main fallback, and the strength narrows it.
 *     Phone test the same day: "panadol advance 500mg" found nothing, while
 *     "panadol advance 500 mg" found the drug. DawaaGate's own names write the
 *     strength both ways ("500 mg", "400mg"), so only the NUMBER is used
 *     (no unit, no form): the site's search seems to match the last word as a
 *     prefix, so the number matches either way. This is a guess to confirm on
 *     the phone; the name-only link below is the way out if it finds nothing.
 *   - Only in that fallback case, two small links under the caption:
 *     "Search by name only" (DawaaGate, brand name only: lists every strength
 *     and pack it has) and "Search the web" (the old Google search, Arabic
 *     full title + "سعر", else name + strength + form + pack + "سعر"),
 *     because DawaaGate does not list every brand or strength.
 *
 * Where the page lands (2026-10-16, Omar): not at the top.
 *   Drug page: the address ends with #ddm-share, a named spot in DawaaGate's
 *   page code (found in a saved copy of one of their drug pages): the share
 *   box that sits just above the first price card. A named spot needs no
 *   highlight and no text matching, and works in every browser including the
 *   Android app. The price card has its own name (#price-card), but DawaaGate's
 *   top bar stays fixed over the page and would cover the first lines of the
 *   card; the share box is about 100 px higher, which leaves the whole card in
 *   view under the bar. The page's own #price anchor is a second, lower price
 *   section, so it is not used.
 *   Search page: the address ends with #results-grid, a named spot in
 *   DawaaGate's page code (found in saved copies of a results page): the box
 *   that holds the result cards, directly under the filters that fill the
 *   first phone screen. It jumps to the top of the first card, with no
 *   highlight. DawaaGate's top bar (about 66 px, fixed) may cover the top
 *   strip of that card's picture. A search with no results has no such spot,
 *   so the page just opens at the top, where "no results" is shown.
 *   (The earlier text hint on the card's details button is gone: it centred
 *   the button and painted it purple.)
 *   On the web the page is still opened with 'noopener'; harmless for named spots.
 *
 * The button is greyed for a moment while the link lookup runs, so a quick
 * tap cannot open a search for a drug that does have a page.
 *
 * Native app: openInAppBrowser (same helper as the image-search icon in
 * DrugHeader.jsx). Web/PWA: window.open with 'noopener' for DawaaGate pages
 * (see above). Nothing is stored; nothing is shown as our price.
 */

import { useEffect, useState } from 'react'
import { Tag } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Capacitor } from '@capacitor/core'
import { openInAppBrowser } from '../../utils/openInAppBrowser'

// Named spots in DawaaGate's page code (see the header).
const PRICE_CARD_HASH = '#ddm-share'
const FIRST_RESULT_HASH = '#results-grid'

// Opens a DawaaGate page. 'noopener' is what lets Chrome apply the scroll hint.
function openDawaaGate(url) {
  if (Capacitor.isNativePlatform()) openInAppBrowser(url)
  else window.open(url, '_blank', 'noopener')
}

// First number of the strength: "500mg" -> "500", "250mg/5ml" -> "250",
// "0.5%" -> "0.5". No unit: DawaaGate writes both "500 mg" and "400mg".
function strengthNumber(drug) {
  const m = String(drug.concentration ?? '').match(/\d+(?:[.,]\d+)?/)
  return m ? m[0].replace(',', '.') : ''
}

function buildDawaaGateSearchUrl(drug, withStrength) {
  const name = (drug.tradenameClean || drug.nameAr || '').trim()
  const query = withStrength ? [name, strengthNumber(drug)].filter(Boolean).join(' ') : name
  return `https://www.dawaagate.com/search?q=${encodeURIComponent(query)}${FIRST_RESULT_HASH}`
}

function withPriceCardHash(url) {
  return url.includes('#') ? url : `${url}${PRICE_CARD_HASH}`
}

function buildWebSearchUrl(drug) {
  const parts = drug.nameArFull
    ? [drug.nameArFull, 'سعر']
    : [drug.nameAr ?? drug.tradenameClean, drug.concentration, drug.form, drug.packSize, 'سعر']
  const query = parts.filter(Boolean).join(' ')
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}

export default function CheckPriceButton({ drug }) {
  // undefined = still looking, null = no page link, string = DawaaGate page
  const [link, setLink] = useState(undefined)

  useEffect(() => {
    // The drug page keys its sheet by drug id, so this component starts fresh
    // (link undefined) for every drug; no reset is needed here.
    let cancelled = false
    supabase
      .rpc('brand_price_link', { p_brand_id: drug.id })
      .then(({ data, error }) => {
        if (cancelled) return
        setLink(!error && typeof data === 'string' && data ? data : null)
      })
      .catch(() => {
        if (!cancelled) setLink(null)
      })
    return () => { cancelled = true }
  }, [drug.id])

  const ready = link !== undefined

  const handleClick = () => {
    if (!ready) return
    openDawaaGate(link ? withPriceCardHash(link) : buildDawaaGateSearchUrl(drug, true))
  }

  const handleNameSearch = () => {
    openDawaaGate(buildDawaaGateSearchUrl(drug, false))
  }

  const handleWebSearch = () => {
    openInAppBrowser(buildWebSearchUrl(drug))
  }

  const caption = !ready
    ? ' '
    : link
      ? 'Opens the DawaaGate page for this drug'
      : 'Searches DawaaGate: check the strength and pack size'

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={!ready}
        aria-label="Check price"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-2)',
          minHeight: 48,
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-accent)',
          backgroundColor: 'var(--color-accent-light)',
          color: 'var(--color-accent)',
          fontSize: 15,
          fontWeight: 600,
          cursor: ready ? 'pointer' : 'default',
          opacity: ready ? 1 : 0.6,
          touchAction: 'manipulation',
        }}
      >
        <Tag size={18} strokeWidth={1.8} color="currentColor" aria-hidden="true" />
        Check price
      </button>
      <p
        style={{
          margin: 'var(--space-2) 0 0',
          textAlign: 'center',
          fontSize: 12,
          lineHeight: 1.4,
          color: 'var(--color-text-tertiary)',
          minHeight: 17,
        }}
      >
        {caption}
      </p>
      {ready && !link && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 'var(--space-2)',
            marginTop: 'var(--space-1)',
          }}
        >
          {[
            ['Search by name only', handleNameSearch],
            ['Search the web', handleWebSearch],
          ].map(([label, onClick]) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                background: 'none',
                border: 'none',
                fontSize: 12,
                color: 'var(--color-text-tertiary)',
                textDecoration: 'underline',
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
