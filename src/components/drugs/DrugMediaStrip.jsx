/**
 * src/components/drugs/DrugMediaStrip.jsx
 *
 * 2026-10-18 (header tidy-up, Omar): picture, Arabic name and the price
 * button moved out of the drug header into this strip, which sits above the
 * first section and scrolls away with the page (so the header is shorter and
 * more room is left for scrolling). Replaces D13 (Arabic in the header),
 * D25 (price and picture icons in the header) and keeps D24 (offline).
 *
 * Layout: one card. Upper part (only when the drug has an Arabic name) is the
 * Arabic title with a small language icon, then a divider, then the lower part:
 * two equal action tiles, Pictures (small preview inside) and Check price.
 * No Arabic name = lower part only.
 *
 * Picture, every case:
 *   - looking up / loading : soft pulsing placeholder
 *   - picture and online   : small preview; tap opens the full-screen viewer,
 *                            titled with the drug's full title
 *   - preview file fails (or takes over 8 s) / no picture address:
 *                            pill tile with a small search badge, no text;
 *                            tap opens Google Images
 *   - offline              : dimmed no-picture tile; tap shows a message
 * The picture address comes from the database function brand_image_url
 * (unchanged); it returns nothing while the DawaaGate fallback switch is on.
 */

import { useEffect, useState } from 'react'
import { Pill, Search, ImageOff, Languages } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { openInAppBrowser } from '../../utils/openInAppBrowser'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useToast } from '../../context/ToastContext'
import { formatArabicFullName } from '../../utils/arabicName'
import { toTitleCase, getDrugTitleSuffix, TITLE_HIDDEN_MODIFIER_TAGS } from '../../utils/drugTitleFormat'
import Lightbox from '../ui/Lightbox'
import CheckPriceButton from './CheckPriceButton'

const THUMB = 40 // px
const OFFLINE_PICTURE_MSG = 'Pictures need an internet connection. Connect and try again.'
const noop = () => {}

export default function DrugMediaStrip({ drug }) {
  const { isOnline } = useOnlineStatus()
  const { toast } = useToast()

  // undefined = not looked up yet, null = no picture, string = address
  const [picture, setPicture] = useState(undefined)
  const [imgState, setImgState] = useState('loading') // loading | loaded | error
  const [viewerOpen, setViewerOpen] = useState(false)

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

  let pictureSub = 'Pack photo'
  if (offline) pictureSub = 'Offline'
  else if (lookingUp || (showImage && imgState === 'loading')) pictureSub = 'Loading'
  else if (!showLoadedImage) pictureSub = 'Search online'

  let placeholder = null
  if (!showLoadedImage) {
    if (offline) {
      placeholder = { icon: <ImageOff size={20} strokeWidth={1.6} />, dim: true }
    } else if (lookingUp || (showImage && imgState === 'loading')) {
      placeholder = { icon: <Pill size={20} strokeWidth={1.6} />, dim: true, pulse: true }
    } else {
      placeholder = { icon: <Pill size={20} strokeWidth={1.6} />, dim: false, searchBadge: true }
    }
  }

  return (
    <>
      <div style={{
        marginTop: -12, marginBottom: 'var(--space-4)',
        borderRadius: 16, border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)', overflow: 'hidden',
      }}>
        {arabicFull && (
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>
            <div
              dir="rtl"
              lang="ar"
              style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}
            >
              <Languages
                size={16}
                strokeWidth={1.8}
                aria-hidden="true"
                style={{ flexShrink: 0, marginTop: 4, color: 'var(--color-text-secondary)' }}
              />
              <div
                style={{
                  flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, lineHeight: 1.5, textAlign: 'right',
                  color: 'var(--color-text-primary)', overflowWrap: 'anywhere',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}
              >
                {arabicFull}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, padding: 8 }}>
          <button
            type="button"
            onClick={handleThumbClick}
            aria-label={showLoadedImage ? `Open picture of ${drug.tradenameClean}` : `Search pictures of ${drug.tradenameClean}`}
            style={{
              flex: '1 1 0', minWidth: 0, boxSizing: 'border-box', cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 8, padding: 6,
              borderRadius: 12, border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface-muted)',
              fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)',
              WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
            }}
          >
            <span style={{
              position: 'relative', width: THUMB, height: THUMB, flexShrink: 0, borderRadius: 8, overflow: 'hidden',
              backgroundColor: showImage ? '#fff' : 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {showImage && (
                <img
                  src={picture}
                  alt={`${drug.tradenameClean} pack`}
                  onLoad={() => setImgState('loaded')}
                  onError={() => setImgState('error')}
                  style={{
                    width: '100%', height: '100%', objectFit: 'contain',
                    opacity: imgState === 'loaded' ? 1 : 0,
                    position: imgState === 'loaded' ? 'static' : 'absolute',
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
                    position: 'absolute', right: 1, bottom: 1, width: 14, height: 14, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <Search size={8} strokeWidth={2.6} />
                </span>
              )}
            </span>
            <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1, opacity: offline ? 0.55 : 1 }}>
              <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.2, whiteSpace: 'nowrap' }}>Pictures</span>
              <span style={{ fontSize: 11, lineHeight: 1.2, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pictureSub}
              </span>
            </span>
          </button>

          <CheckPriceButton drug={drug} />
        </div>
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
