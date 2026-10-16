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
 *     search for the brand name (https://www.dawaagate.com/search?q=<name>),
 *     which lists every strength and pack it has. The caption says to check
 *     strength and pack. Updated 2026-10-16 (Omar): this replaces the Google
 *     search as the main fallback.
 *   - Only in that fallback case, a small "Search the web instead" link under
 *     the caption opens the old Google search (Arabic full title + "سعر", else
 *     name + strength + form + pack + "سعر"), because DawaaGate does not list
 *     every brand and its search can come back empty.
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

function buildDawaaGateSearchUrl(drug) {
  const name = (drug.tradenameClean || drug.nameAr || '').trim()
  return `https://www.dawaagate.com/search?q=${encodeURIComponent(name)}`
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
    openInAppBrowser(link ?? buildDawaaGateSearchUrl(drug))
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
        <button
          type="button"
          onClick={handleWebSearch}
          style={{
            display: 'block',
            margin: 'var(--space-1) auto 0',
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
          Search the web instead
        </button>
      )}
    </div>
  )
}
