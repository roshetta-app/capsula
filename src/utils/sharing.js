/**
 * src/utils/sharing.js
 * Phase 2J — Sharing
 *
 * shareConditionPrescription(condition, prescription, cardRef)
 *
 *   1. Captures the off-screen <ShareCard> via html2canvas → PNG blob
 *   2. Tries navigator.share (Web Share API) for native share sheet (WhatsApp, Telegram …)
 *   3. Falls back to direct download if Web Share API is unavailable or unsupported
 *
 * Requires: html2canvas  (npm install html2canvas)
 *
 * Usage in ConditionDetailScreen:
 *   import { shareConditionPrescription } from '../utils/sharing'
 *   import ShareCard from '../components/ui/ShareCard'
 *
 *   const shareCardRef = useRef(null)
 *   ...
 *   <ShareCard ref={shareCardRef} condition={condition} prescription={activePrescription} />
 *   ...
 *   <button onClick={() => shareConditionPrescription(condition, activePrescription, shareCardRef)}>Share</button>
 */

/**
 * Captures a React ref as a PNG and shares or downloads it.
 *
 * @param {object} condition     - { name } — used for the filename
 * @param {object} prescription  - { label } — used for the filename
 * @param {React.RefObject} cardRef - ref pointing to the rendered <ShareCard> DOM node
 */
export async function shareConditionPrescription(condition, prescription, cardRef) {
  if (!cardRef?.current) {
    console.warn('[sharing] cardRef is null — ShareCard not mounted')
    return
  }

  // Dynamically import html2canvas so it is only loaded when sharing is triggered
  let html2canvas
  try {
    html2canvas = (await import('html2canvas')).default
  } catch (err) {
    console.error('[sharing] html2canvas not installed. Run: npm install html2canvas', err)
    alert('Sharing is unavailable. Please try again later.')
    return
  }

  let blob
  try {
    const canvas = await html2canvas(cardRef.current, {
      scale:              2,          // 2× for retina sharpness
      useCORS:            true,       // needed if card loads remote images
      backgroundColor:    '#FFFFFF',  // force white — card is always light
      logging:            false,
    })
    blob = await new Promise(resolve =>
      canvas.toBlob(resolve, 'image/png')
    )
  } catch (err) {
    console.error('[sharing] html2canvas capture failed', err)
    alert('Could not generate the share image. Please try again.')
    return
  }

  if (!blob) {
    console.error('[sharing] toBlob returned null')
    return
  }

  const conditionName   = condition?.name    ?? 'condition'
  const prescriptionLabel = prescription?.label ?? 'prescription'
  const filename = `capsula-${slugify(conditionName)}-${slugify(prescriptionLabel)}.png`

  // ── Try Web Share API ──────────────────────────────────────────────────────
  const canShare = typeof navigator.share === 'function'
  const file     = new File([blob], filename, { type: 'image/png' })

  if (canShare && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `${conditionName} — Capsula`,
        text:  'Prescription from Capsula — Clinical reference only. Verify before prescribing.',
      })
      return
    } catch (err) {
      // User cancelled or share failed — fall through to download
      if (err.name === 'AbortError') return   // user cancelled — don't download
      console.warn('[sharing] navigator.share failed, falling back to download', err)
    }
  }

  // ── Fallback: direct download ─────────────────────────────────────────────
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
