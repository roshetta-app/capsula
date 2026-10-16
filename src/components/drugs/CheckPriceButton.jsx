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
 *   - DawaaGate drug page: jumps to the FIRST price card, the one with
 *     "السعر الحالي للعلبة" near the top (not the second price section lower
 *     down, which is what the page's own #price anchor points to, so that
 *     anchor is deliberately not used). The address ends with
 *     #:~:text=A&text=B&text=C : browsers that support text fragments (Chrome
 *     and Chrome Custom Tabs, Safari 16.1+) scroll to the first text found.
 *     Three single words that appear only in that card ("للعلبة" from
 *     "السعر الحالي للعلبة", "الشريط", "الكبرى") are listed, so one missing
 *     match does not lose the jump.
 *   - DawaaGate search: jumps to the first result card (the first
 *     "التفاصيل", from the "عرض التفاصيل" button), past the filters that fill
 *     the first screen on a phone.
 *   Phone test 2026-10-16: no highlight appeared on the matched text, so the
 *     hints probably did not take effect. Next attempt: single words only
 *     (a phrase can fail on an invisible non-breaking space inside it).
 *   Both are only scroll hints: an unsupported browser, or text that is not
 *   found, just opens the page at the top as before. The Google fallback has
 *   no anchor.
 *
 * The button is greyed for a moment while the link lookup runs, so a quick
 * tap cannot open a search for a drug that does have a page.
 *
 * Opens through openInAppBrowser (same helper as the image-search icon in
 * DrugHeader.jsx). Nothing is stored; nothing is shown as our price.
 */

import { useEffect, useState } from 'react'
import { Tag } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { openInAppBrowser } from '../../utils/openInAppBrowser'

// Scroll hints (see the header). The Arabic text is what DawaaGate prints on
// the page: three labels inside the first price card, and the button on each
// result card.
const PRICE_CARD_HASH = '#:~:text=' + [
  'للعلبة',
  'الشريط',
  'الكبرى',
].map(encodeURIComponent).join('&text=')
const FIRST_RESULT_HASH = `#:~:text=${encodeURIComponent('التفاصيل')}`

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
    openInAppBrowser(link ? withPriceCardHash(link) : buildDawaaGateSearchUrl(drug, true))
  }

  const handleNameSearch = () => {
    openInAppBrowser(buildDawaaGateSearchUrl(drug, false))
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
