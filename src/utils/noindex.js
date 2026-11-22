// src/utils/noindex.js
// 14.7b (2026-11-22): asks search engines not to list a page, by adding one robots tag while the page is
// shown and removing it when the page goes away. A request, not a lock. Used by profile pages (shared
// pages join in 14.8). Returns the function that removes the tag.
export function setNoIndex(doc = typeof document !== 'undefined' ? document : null) {
  if (!doc || !doc.head) return () => {}
  const tag = doc.createElement('meta')
  tag.setAttribute('name', 'robots')
  tag.setAttribute('content', 'noindex')
  doc.head.appendChild(tag)
  return () => { if (tag.parentNode) tag.parentNode.removeChild(tag) }
}
