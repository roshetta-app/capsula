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
 * Arabic title, then a divider, then the lower part: picture preview on the
 * left and the price button filling the rest. No Arabic name = lower part only.
 *
 * Picture, every case:
 *   - looking up / loading : soft pulsing placeholder
 *   - picture and online   : small preview; tap opens the full-screen viewer,
 *                            titled with the drug's full title
 *   - preview file fails   : "Find pictures" placeholder; tap opens Google Images
 *   - no picture address   : same "Find pictures" placeholder
 *   - offline              : dimmed "Offline" placeholder; tap shows a message
 * The picture address comes from the database function brand_image_url
 * (unchanged); it returns nothing while the DawaaGate fallback switch is on.
 */

import { useEffect, useState } from 'react'
import { Pill, ScanSearch, ImageOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { openInAppBrowser } from '../../utils/openInAppBrowser'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useToast } from '../../context/ToastContext'
import { formatArabicFullName } from '../../utils/arabicName'
import { toTitleCase, getDrugTitleSuffix, TITLE_HIDDEN_MODIFIER_TAGS } from '../../utils/drugTitleFormat'
import Lightbox from '../ui/Lightbox'
import CheckPriceButton from './CheckPriceButton'

const THUMB = 72 // px
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

  let placeholder = null
  if (!showLoadedImage) {
    if (offline) {
      placeholder = { icon: <ImageOff size={26} strokeWidth={1.6} />, label: 'Offline', dim: true }
    } else if (lookingUp || (showImage && imgState === 'loading')) {
      placeholder = { icon: <Pill size={26} strokeWidth={1.6} />, label: '', dim: true, pulse: true }
    } else {
      placeholder = { icon: <ScanSearch size={26} strokeWidth={1.6} />, label: 'Find pictures', dim: false }
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
              style={{
                fontSize: 14, fontWeight: 500, lineHeight: 1.5, textAlign: 'right',
                color: 'var(--color-text-primary)', overflowWrap: 'anywhere',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}
            >
              {arabicFull}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 8 }}>
          <button
            type="button"
            onClick={handleThumbClick}
            aria-label={showLoadedImage ? `Open picture of ${drug.tradenameClean}` : `Search pictures of ${drug.tradenameClean}`}
            style={{
              position: 'relative', width: THUMB, height: THUMB, flexShrink: 0, padding: 0,
              borderRadius: 10, overflow: 'hidden', cursor: 'pointer', border: 'none',
              backgroundColor: showImage ? '#fff' : 'var(--color-surface-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
            }}
          >
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
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  color: 'var(--color-text-secondary)',
                  opacity: placeholder.dim ? 0.55 : 1,
                  background: 'none',
                }}
              >
                {placeholder.icon}
                {placeholder.label && <span style={{ fontSize: 11, lineHeight: 1.2 }}>{placeholder.label}</span>}
              </span>
            )}
          </button>

          <CheckPriceButton drug={drug} fullWidth />
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
