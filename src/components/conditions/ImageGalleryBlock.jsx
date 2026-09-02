/**
 * ImageGalleryBlock.jsx — Renderer for `image_gallery` block type.
 *
 * Thin wrapper around ImageCarousel. Data shape per Section 3.1, title
 * added 2026-09-02:
 *   block.data.title:  string (optional — carousel renders without a
 *                       heading when absent, e.g. for galleries saved
 *                       before this field existed)
 *   block.data.images: [{ url, caption? }]
 *
 * Renders nothing if images array is empty (per 3.1 spec).
 */
import ImageCarousel from './ImageCarousel'

export default function ImageGalleryBlock({ block }) {
  const images = block?.data?.images ?? []
  const title = block?.data?.title ?? ''
  if (!images.length) return null
  return <ImageCarousel images={images} title={title} />
}
