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
 * labels. Price button as a side block at the left end, the Arabic name in the
 * middle (right-to-left, 2 lines at most) and the picture at the right end,
 * next to where the right-to-left name starts (price and picture swapped, Omar).
 * The Arabic name is split in two: the trade name on the first line, the rest
 * (strength and pack) on the second, smaller and in a lighter colour. Each
 * stays on one line while it can: the letters shrink (16 px down to 12 px for
 * the trade name, 3 px smaller for the second line, never below 11 px) until
 * both fit. A name too long even then is NEVER cut with dots: it wraps onto as
 * many lines as it needs and the strip grows taller (Omar, option B), so the
 * full name is always readable. With no second part, the trade name alone
 * shrinks to fit 2 lines, then wraps further the same way.
 * No Arabic name: the name area is dropped and the price button stretches
 * across the rest of the strip. No generic name or other wording fills the gap.
 *
 * 2026-10-18 (drug picture offline, Omar): a picture that was opened before
 * on this phone still shows when the phone is offline (or goes offline while
 * the page is open), exactly like online, with no offline icon. The picture
 * address and the picture file are saved on the phone the first time the
 * drug is opened online (utils/cache.js, 'drug-pictures'). A drug never
 * opened online before still shows the crossed-out icon while offline.
 *
 * Picture, every case:
 *   - looking up / loading : picture icon, dimmed and pulsing
 *   - picture and online   : small preview on a blurred copy of itself (so
 *                            pictures of any shape fill the square); tap opens
 *                            the full-screen viewer (a small zoom badge sits in
 *                            the corner); the drug's full title is
 *                            the caption under the picture (no top title)
 *   - preview file fails (or takes over 8 s) / no picture address:
 *                            picture icon with a small magnifier badge;
 *                            tap opens Google Images
 *   - offline, nothing saved: dimmed crossed-out picture icon; tap shows a message
 * The picture address comes from the database function brand_image_url
 * (unchanged); it returns nothing while the DawaaGate fallback switch is on.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Image as ImageIcon, Search, ImageOff, ZoomIn } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { openInAppBrowser } from '../../utils/openInAppBrowser'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useCachedImage } from '../../hooks/useCachedImage'
import { getDrugPictureAddress, saveDrugPictureAddress, deleteDrugPicture } from '../../utils/cache'
import { useToast } from '../../context/ToastContext'
import { usePressed } from '../../hooks/usePressed'
import { splitArabicName } from '../../utils/arabicName'
import { toTitleCase, getDrugTitleSuffix, TITLE_HIDDEN_MODIFIER_TAGS } from '../../utils/drugTitleFormat'
import Lightbox from '../ui/Lightbox'
import CheckPriceButton from './CheckPriceButton'

const THUMB = 46 // px
const NAME_MAX = 16 // px, Arabic name size when it is short
const NAME_MIN = 12 // px, smallest size before a very long name is cut with dots
const NAME_LINE = 1.45 // line height of the Arabic name
const REST_MIN = 11 // px, smallest size of the second line (strength and pack)
const OFFLINE_PICTURE_MSG = 'Pictures need an internet connection. Connect and try again.'
const noop = () => {}

export default function DrugMediaStrip({ drug }) {
  const { isOnline } = useOnlineStatus()
  const { toast } = useToast()

  // undefined = not looked up yet, null = no picture, string = address
  const [picture, setPicture] = useState(undefined)
  const [imgState, setImgState] = useState('loading') // loading | loaded | error
  const [viewerOpen, setViewerOpen] = useState(false)
  const [addrReady, setAddrReady] = useState(false) // saved address read finished
  const pictureRef = useRef(undefined) // always the latest picture value
  const lookedUpRef = useRef(null) // drug id whose address came from the server
  pictureRef.current = picture
  const { pressed, handlers: pressHandlers } = usePressed()
  const boxRef = useRef(null)
  const nameRef = useRef(null)
  const restRef = useRef(null)

  // Saved address first (works offline, instant), so a picture opened before
  // shows at once. The server answer below always wins when it arrives.
  useEffect(() => {
    let cancelled = false
    setPicture(undefined)
    setImgState('loading')
    setAddrReady(false)
    getDrugPictureAddress(drug.id).then(saved => {
      if (cancelled) return
      if (saved !== undefined && lookedUpRef.current !== drug.id) setPicture(saved)
      setAddrReady(true)
    })
    return () => { cancelled = true }
  }, [drug.id])

  useEffect(() => {
    if (!isOnline) return undefined
    let cancelled = false
    Promise.resolve(supabase.rpc('brand_image_url', { p_brand_id: drug.id }))
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          // Keep a saved address if there is one; otherwise treat as no picture.
          if (pictureRef.current === undefined) setPicture(null)
          return
        }
        const fresh = typeof data === 'string' && data ? data : null
        const before = pictureRef.current
        lookedUpRef.current = drug.id
        if (before !== fresh) {
          setPicture(fresh)
          setImgState('loading')
          // Picture replaced or removed: drop the old saved file.
          if (typeof before === 'string') deleteDrugPicture(before)
        }
        saveDrugPictureAddress(drug.id, fresh)
      })
      .catch(() => { if (!cancelled && pictureRef.current === undefined) setPicture(null) })
    return () => { cancelled = true }
  }, [drug.id, isOnline])

  // Picture file: saved copy first, then network (and a copy is saved).
  const cachedImg = useCachedImage(typeof picture === 'string' ? picture : undefined, { store: 'drugs' })
  const imgSrc = typeof picture === 'string' && cachedImg.status === 'ready' ? cachedImg.src : null

  // Back online after a failed offline load: try the picture again.
  const wasOnlineRef = useRef(isOnline)
  useEffect(() => {
    if (isOnline && !wasOnlineRef.current && imgState === 'error' && typeof picture === 'string') {
      setImgState('loading')
      cachedImg.retry()
    }
    wasOnlineRef.current = isOnline
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline])

  useEffect(() => {
    if (typeof picture !== 'string' || imgState !== 'loading') return undefined
    const t = setTimeout(() => setImgState('error'), 8000)
    return () => clearTimeout(t)
  }, [picture, imgState])

  const { brand: arabicBrand, rest: arabicRest } = splitArabicName(drug.nameAr, drug.nameArFull)
  const viewerTitle = [
    toTitleCase(drug.tradenameClean),
    getDrugTitleSuffix(drug, { omitModifierTags: TITLE_HIDDEN_MODIFIER_TAGS }),
  ].filter(Boolean).join(' ')

  // Picks the largest letter size at which the name fits on single lines
  // (trade name 16 down to 12 px, second line 3 px smaller, min 11 px; with no
  // second part, up to 2 lines). A name that still does not fit at the smallest
  // size is never cut: its lines wrap onto as many lines as it needs and the
  // strip grows taller. All sizing is written straight onto the elements so a
  // re-render never undoes it; it re-runs when the name changes or the strip
  // changes width.
  useLayoutEffect(() => {
    const box = boxRef.current
    const el = nameRef.current
    const sub = restRef.current
    if (!box || !el) return undefined
    let lastWidth = -1
    const fit = () => {
      lastWidth = box.clientWidth
      if (sub) {
        el.style.whiteSpace = 'nowrap'
        sub.style.whiteSpace = 'nowrap'
        let size = NAME_MAX
        for (; size > NAME_MIN; size -= 1) {
          el.style.fontSize = `${size}px`
          sub.style.fontSize = `${Math.max(REST_MIN, size - 3)}px`
          if (el.scrollWidth <= el.clientWidth && sub.scrollWidth <= sub.clientWidth) break
        }
        el.style.fontSize = `${size}px`
        sub.style.fontSize = `${Math.max(REST_MIN, size - 3)}px`
        if (el.scrollWidth > el.clientWidth || sub.scrollWidth > sub.clientWidth) {
          el.style.whiteSpace = 'normal'
          sub.style.whiteSpace = 'normal'
        }
        return
      }
      el.style.whiteSpace = 'normal'
      let size = NAME_MAX
      for (; size > NAME_MIN; size -= 1) {
        el.style.fontSize = `${size}px`
        if (el.scrollHeight <= size * NAME_LINE * 2 + 1) break
      }
      el.style.fontSize = `${size}px`
    }
    fit()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(() => {
      if (box.clientWidth !== lastWidth) fit()
    })
    ro.observe(box)
    return () => ro.disconnect()
  }, [arabicBrand, arabicRest])

  const lookingUp = picture === undefined && (isOnline || !addrReady)
  const showImage = typeof picture === 'string' && imgState !== 'error'
  const showLoadedImage = showImage && imgState === 'loaded'
  const loadingNow = lookingUp || (showImage && imgState === 'loading')
  // Offline state only when there is no picture to show and nothing is loading.
  const offline = !isOnline && !showLoadedImage && !loadingNow

  // Tap feedback only where a tap does something (not while still looking up).
  const thumbTappable = showLoadedImage || offline || !loadingNow

  function handleThumbClick() {
    if (showLoadedImage) { setViewerOpen(true); return }
    if (offline) { toast.info(OFFLINE_PICTURE_MSG); return }
    if (loadingNow) return
    const query = [drug.tradenameClean, drug.concentration, drug.form, 'Egypt']
      .filter(Boolean)
      .join(' ')
    openInAppBrowser(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`)
  }

  let placeholder = null
  if (!showLoadedImage) {
    if (offline) {
      placeholder = { icon: <ImageOff size={22} strokeWidth={1.6} />, dim: true }
    } else if (loadingNow) {
      placeholder = { icon: <ImageIcon size={22} strokeWidth={1.6} />, dim: true, pulse: true }
    } else {
      placeholder = { icon: <ImageIcon size={22} strokeWidth={1.6} />, dim: false, searchBadge: true }
    }
  }

  // Small round badge in the picture's corner: a magnifier with a plus (zoom)
  // on a loaded picture, a magnifier on the no-picture tile (search).
  const cornerIcon = showLoadedImage
    ? <ZoomIn size={9} strokeWidth={2.6} />
    : placeholder?.searchBadge ? <Search size={9} strokeWidth={2.6} /> : null

  return (
    <>
      <div style={{
        marginTop: -12, marginBottom: 'var(--space-4)',
        borderRadius: 14, border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        {arabicBrand ? (
          <>
            <CheckPriceButton drug={drug} />
            <div ref={boxRef} style={{ flex: 1, minWidth: 0 }}>
              <div
                ref={nameRef}
                dir="rtl"
                lang="ar"
                style={{
                  textAlign: 'right', fontWeight: 500, lineHeight: NAME_LINE,
                  color: 'var(--color-text-primary)', overflowWrap: 'anywhere',
                }}
              >
                {arabicBrand}
              </div>
              {arabicRest && (
                <div
                  ref={restRef}
                  dir="rtl"
                  lang="ar"
                  style={{
                    textAlign: 'right', fontWeight: 400, lineHeight: 1.4,
                    color: 'var(--color-text-secondary)', overflowWrap: 'anywhere',
                  }}
                >
                  {arabicRest}
                </div>
              )}
            </div>
          </>
        ) : (
          <CheckPriceButton drug={drug} wide />
        )}

        <button
          type="button"
          onClick={handleThumbClick}
          {...pressHandlers}
          aria-label={showLoadedImage ? `Open picture of ${drug.tradenameClean}` : `Search pictures of ${drug.tradenameClean}`}
          style={{
            position: 'relative', width: THUMB, height: THUMB, flexShrink: 0, padding: 0,
            boxSizing: 'border-box', cursor: 'pointer', borderRadius: 12, overflow: 'hidden',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
            transform: pressed && thumbTappable ? 'scale(0.94)' : 'scale(1)',
            transition: 'transform var(--motion-fast) var(--ease-settle)',
          }}
        >
          {showLoadedImage && imgSrc && (
            <img
              src={imgSrc}
              alt=""
              aria-hidden="true"
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', filter: 'blur(10px)', transform: 'scale(1.4)',
                pointerEvents: 'none',
              }}
            />
          )}
          {showImage && imgSrc && (
            <img
              src={imgSrc}
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
          {cornerIcon && (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute', right: 3, bottom: 3, width: 16, height: 16, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {cornerIcon}
            </span>
          )}
        </button>
      </div>

      {viewerOpen && typeof picture === 'string' && (
        <Lightbox
          images={[{ id: drug.id, url: picture, caption: viewerTitle }]}
          activeIndex={0}
          onClose={() => setViewerOpen(false)}
          onGo={noop}
          imageStore="drugs"
        />
      )}
    </>
  )
}
