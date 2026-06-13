/**
 * ImageGalleryBlock.jsx — Renderer for `image_gallery` block type.
 *
 * Thin wrapper around ImageCarousel. Data shape per Section 3.1:
 *   block.data.images: [{ url, caption? }]
 *
 * Renders nothing if images array is empty (per 3.1 spec).
 */
import ImageCarousel from './ImageCarousel'

export default function ImageGalleryBlock({ block }) {
  const images = block?.data?.images ?? []
  if (!images.length) return null
  return <ImageCarousel images={images} />
}
