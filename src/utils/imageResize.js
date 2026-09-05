/**
 * src/utils/imageResize.js
 *
 * Shrinks a photo and re-encodes it as a standard-quality JPEG, entirely in
 * the browser, before it's uploaded anywhere. Mirrors the same approach
 * already used for CMS gallery photos (see
 * src/components/admin/blocks/ImageGalleryEditor.jsx's own
 * resizeAndCompressImage) - same maxDimension/quality defaults - so a
 * user-uploaded note photo behaves the same way a CMS-uploaded photo does
 * (reasonable file size, standardized format, fixes iPhone HEIC photos that
 * some browsers can't display).
 *
 * Kept as its own small shared file rather than importing from the
 * admin-only ImageGalleryEditor.jsx, since a user-facing feature (Personal
 * Notes) shouldn't depend on code that lives under components/admin.
 *
 * notes-pro-image-and-char-cap (this task):
 *   Used by src/lib/noteQueries.js's uploadNoteImage, ahead of the actual
 *   Storage upload.
 */

const MAX_DIMENSION = 1800
const JPEG_QUALITY = 0.8

/**
 * @param {File} file
 * @param {{ maxDimension?: number, quality?: number }} [options]
 * @returns {Promise<File>} - a new File, always .jpg / image/jpeg
 */
export function resizeAndCompressImage(file, { maxDimension = MAX_DIMENSION, quality = JPEG_QUALITY } = {}) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(new Error('Image compression produced no output'))
            return
          }
          // Standardize to .jpg regardless of the original extension - this
          // is what resolves the HEIC-display risk, since every upload now
          // leaves the browser as a plain JPEG.
          const baseName = file.name.replace(/\.[^./\\]+$/, '') || 'photo'
          resolve(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not read selected image'))
    }

    img.src = objectUrl
  })
}
