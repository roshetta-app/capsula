/**
 * src/components/drugs/DrugMediaStrip.jsx
 *
 * 2026-10-18 (header tidy-up, Omar): picture, Arabic name and the price
 * button moved out of the drug header into this strip, which sits above the
 * first section and scrolls away with the page (so the header is shorter and
 * more room is left for scrolling). Replaces D13 (Arabic in the header),
 * D25 (price and picture icons in the header) and keeps D24 (offline).
 *
 * Layout (Omar, after phone tests, option B): ONE horizontal strip, no text
 * labels. Picture on the left, the Arabic name next to it (right-to-left, 2
 * lines at most, the letters shrink from 16 px down to 12 px until the name
 * fits, and only at 12 px does a very long name get cut with dots), and the
 * price button as a side block at the right end.
 * No Arabic name: the name area is dropped and the price button stretches
 * across the rest of the strip. No generic name or other wording fills the gap.
 *
 * Picture, every case:
 *   - looking up / loading : picture icon, dimmed and pulsing
 *   - picture and online   : small preview on a blurred copy of itself (so
 *                            pictures of any shape fill the square); tap opens
 *                            the full-screen viewer, titled with the drug's
 *                            full title
 *   - preview file fails (or takes over 8 s) / no picture address:
 *                            picture icon with a small magnifier badge;
 *                            tap opens Google Images
 *   - offline              : dimmed crossed-out picture icon; tap shows a message
 * The picture address comes from the database function brand_image_url
 * (unchanged); it returns nothing while the DawaaGate fallback switch is on.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Image as ImageIcon, Search, ImageOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { openInAppBrowser } from '../../utils/openInAppBrowser'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useToast } from '../../context/ToastContext'
import { formatArabicFullName } from '../../utils/arabicName'
import { toTitleCase, getDrugTitleSuffix, TITLE_HIDDEN_MODIFIER_TAGS } from '../../utils/drugTitleFormat'
import Lightbox from '../ui/Lightbox'
import CheckPriceButton from './CheckPriceButton'

const THUMB = 52 // px
const NAME_MAX = 16 // px, Arabic name size when it is short
const NAME_MIN = 12 // px, smallest size before a very long name is cut with dots
const NAME_LINE = 1.45 // line height of the Arabic name
const OFFLINE_PICTURE_MSG = 'Pictures need an internet connection. Connect and try again.'
const noop = () => {}

export default function DrugMediaStrip({ drug }) {
  const { isOnline } = useOnlineStatus()
  const { toast } = useToast()

  // undefined = not looked up yet, null = no picture, string = address
  const [picture, setPicture] = useState(undefined)
  const [imgState, setImgState] = useState('loading') // loading | loaded | error
  const [viewerOpen, setViewerOpen] = useState(false)
  const boxRef = useRef(null)
  const nameRef = useRef(null)

  useEffect(() => {
    if (!isOnline) return undefined
    let cancelled = false
    Promise.resolve(supabase.rpc('brand_image_url', { p_brand_id: drug.id }))
      .then(({ data, error }) => {
        if (cancelled) return
        setPicture(!error && typeof data === 'string' && data ? data : null)
        setImgState('loading')
      })
      .catch(() => { if (!cancelled) setPicture(null) })
    return () => { cancelled = true }
  }, [drug.id, isOnline])

  useEffect(() => {
    if (!isOnline || typeof picture !== 'string' || imgState !== 'loading') return undefined
    const t = setTimeout(() => setImgState('error'), 8000)
    return () => clearTimeout(t)
  }, [picture, imgState, isOnline])

  const arabicFull = formatArabicFullName(drug.nameAr, drug.nameArFull)
  const viewerTitle = [
    toTitleCase(drug.tradenameClean),
    getDrugTitleSuffix(drug, { omitModifierTags: TITLE_HIDDEN_MODIFIER_TAGS }),
  ].filter(Boolean).join(' ')

  // Largest size (16 down to 12 px) at which the Arabic name fits in 2 lines.
  // All sizing is written straight onto the element so a re-render never
  // undoes it; it re-runs when the name changes or the strip changes width.
  useLayoutEffect(() => {
    const box = boxRef.current
    const el = nameRef.current
    if (!box || !el) return undefined
    const fit = () => {
      el.style.display = 'block'
      el.style.webkitLineClamp = ''
      el.style.maxHeight = 'none'
      let size = NAME_MAX
      for (; size > NAME_MIN; size -= 1) {
        el.style.fontSize = `${size}px`
        if (el.scrollHeight <= size * NAME_LINE * 2 + 1) break
      }
      el.style.fontSize = `${size}px`
      el.style.maxHeight = `${Math.ceil(size * NAME_LINE * 2)}px`
      if (el.scrollHeight > size * NAME_LINE * 2 + 1) {
        el.style.display = '-webkit-box'
        el.style.webkitBoxOrient = 'vertical'
        el.style.webkitLineClamp = '2'
      }
    }
    fit()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(fit)
    ro.observe(box)
    return () => ro.disconnect()
  }, [arabicFull])

  const lookingUp = picture === undefined && isOnline
  const showImage = isOnline && typeof picture === 'string' && imgState !== 'error'
  const showLoadedImage = showImage && imgState === 'loaded'
  const offline = !isOnline

  function handleThumbClick() {
    if (showLoadedImage) { setViewerOpen(true); return }
    if (offline) { toast.info(OFFLINE_PICTURE_MSG); return }
    if (lookingUp || (showImage && imgState === 'loading')) return
    const query = [drug.tradenameClean, drug.concentration, drug.form, 'Egypt']
      .filter(Boolean)
      .join(' ')
    openInAppBrowser(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`)
  }

  let placeholder = null
  if (!showLoadedImage) {
    if (offline) {
      placeholder = { icon: <ImageOff size={22} strokeWidth={1.6} />, dim: true }
    } else if (lookingUp || (showImage && imgState === 'loading')) {
      placeholder = { icon: <ImageIcon size={22} strokeWidth={1.6} />, dim: true, pulse: true }
    } else {
      placeholder = { icon: <ImageIcon size={22} strokeWidth={1.6} />, dim: false, searchBadge: true }
    }
  }

  return (
    <>
      <div style={{
        marginTop: -12, marginBottom: 'var(--space-4)',
        borderRadius: 14, border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          type="button"
          onClick={handleThumbClick}
          aria-label={showLoadedImage ? `Open picture of ${drug.tradenameClean}` : `Search pictures of ${drug.tradenameClean}`}
          style={{
            position: 'relative', width: THUMB, height: THUMB, flexShrink: 0, padding: 0,
            boxSizing: 'border-box', cursor: 'pointer', borderRadius: 12, overflow: 'hidden',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
          }}
        >
          {showLoadedImage && (
            <img
              src={picture}
              alt=""
              aria-hidden="true"
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', filter: 'blur(10px)', transform: 'scale(1.4)',
                pointerEvents: 'none',
              }}
            />
          )}
          {showImage && (
            <img
              src={picture}
              alt={`${drug.tradenameClean} pack`}
              onLoad={() => setImgState('loaded')}
              onError={() => setImgState('error')}
              style={{
                width: '100%', height: '100%', objectFit: 'contain',
                opacity: imgState === 'loaded' ? 1 : 0,
                position: imgState === 'loaded' ? 'relative' : 'absolute',
              }}
            />
          )}
          {placeholder && (
            <span
              className={placeholder.pulse ? 'shimmer' : undefined}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '100%', height: '100%', color: 'var(--color-text-secondary)',
                opacity: placeholder.dim ? 0.55 : 1, background: 'none',
              }}
            >
              {placeholder.icon}
            </span>
          )}
          {placeholder?.searchBadge && (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute', right: 3, bottom: 3, width: 16, height: 16, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <Search size={9} strokeWidth={2.6} />
            </span>
          )}
        </button>

        {arabicFull ? (
          <>
            <div ref={boxRef} style={{ flex: 1, minWidth: 0 }}>
              <div
                ref={nameRef}
                dir="rtl"
                lang="ar"
                style={{
                  textAlign: 'right', fontWeight: 500, lineHeight: NAME_LINE,
                  color: 'var(--color-text-primary)', overflowWrap: 'anywhere', overflow: 'hidden',
                }}
              >
                {arabicFull}
              </div>
            </div>
            <CheckPriceButton drug={drug} />
          </>
        ) : (
          <CheckPriceButton drug={drug} wide />
        )}
      </div>

      {viewerOpen && typeof picture === 'string' && (
        <Lightbox
          images={[{ id: drug.id, url: picture }]}
          activeIndex={0}
          onClose={() => setViewerOpen(false)}
          onGo={noop}
          title={viewerTitle}
        />
      )}
    </>
  )
}
