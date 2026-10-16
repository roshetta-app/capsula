/**
 * src/utils/openPriceBrowser.js
 *
 * 2026-10-16 (plan v9 S15d follow-up, Omar's choice): opens a DawaaGate page
 * from the "Check price" button and scrolls it to the part the user came for,
 * instead of leaving it at the top of the page.
 *
 * Why a second browser helper: the helper used everywhere else
 * (openInAppBrowser.js, @capacitor/browser) opens Chrome's built-in tab, which
 * ignored every "jump to this text" hint in the address (phone tests
 * 2026-10-16, drug page and search page). @capgo/capacitor-inappbrowser opens
 * the page in the app's own web view and can run a small script after the page
 * has loaded and before it is shown; that script finds the right spot by its
 * printed Arabic label and scrolls there. Only the "Check price" button uses
 * this helper; the image-search icons and everything else stay on
 * openInAppBrowser.
 *
 * target:
 *   'price'  : a DawaaGate drug page; scrolls to the first price card, the one
 *              labelled "السعر الحالي للعلبة" (the page's own #price anchor is
 *              a second, lower price section, so it is not used).
 *   'result' : a DawaaGate search page; scrolls to the first result card (the
 *              first "عرض التفاصيل" button), past the filters that fill the
 *              first phone screen.
 *
 * Safe fallbacks (the page then simply opens at the top, as before):
 *   - not the native app (browser/PWA): openInAppBrowser;
 *   - the phone has an app build without this plugin, or the plugin refuses:
 *     openInAppBrowser;
 *   - the label is not found on the page: the script does nothing.
 * While one page is being opened, further taps are ignored so two windows
 * cannot open at once.
 */

import { Capacitor } from '@capacitor/core'
import { InAppBrowser, ToolBarType } from '@capgo/capacitor-inappbrowser'
import { openInAppBrowser } from './openInAppBrowser'

// How long further taps are ignored if the plugin never answers (the page
// load itself can take several seconds on a slow connection).
const BUSY_MAX_MS = 15000

let busy = false

// The script runs inside the DawaaGate page, so it must be plain, self-
// contained JavaScript in a string. It tries for about 2.5 seconds to find the
// label, scrolls to it, and repeats the scroll twice shortly after in case the
// page shifts while images load; the repeats stop as soon as the user touches
// the screen.
function scrollScript(target) {
  return String.raw`
const target = ${JSON.stringify(target)};
const LABEL = target === 'price' ? 'السعر الحالي للعلبة' : 'عرض التفاصيل';
const norm = s => (s || '').replace(/[\s\u00a0]+/g, ' ');
let touched = false;
window.addEventListener('touchstart', () => { touched = true; }, { once: true, passive: true });

function findLabel() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (norm(node.nodeValue).indexOf(LABEL) === -1) continue;
    const el = node.parentElement;
    if (el && el.getBoundingClientRect().width > 0) return el;
  }
  return null;
}

// For a result list: climb from the button up to the whole result card, but
// stop before the wrapper that holds several cards.
function cardOf(el) {
  let card = el;
  for (let i = 0; i < 6; i++) {
    const parent = card.parentElement;
    if (!parent || parent === document.body) break;
    if (parent.getBoundingClientRect().height > 520) break;
    card = parent;
  }
  return card;
}

function go() {
  const label = findLabel();
  if (!label) return false;
  const el = target === 'price' ? label : cardOf(label);
  const top = el.getBoundingClientRect().top + window.scrollY - (target === 'price' ? 72 : 16);
  window.scrollTo(0, Math.max(0, top));
  return true;
}

for (let i = 0; i < 10 && !go(); i++) {
  await new Promise(r => setTimeout(r, 250));
}
setTimeout(() => { if (!touched) go(); }, 700);
setTimeout(() => { if (!touched) go(); }, 1400);
`
}

export async function openPriceBrowser(url, target) {
  if (!Capacitor.isNativePlatform()) {
    openInAppBrowser(url)
    return
  }
  if (busy) return
  busy = true
  const release = setTimeout(() => { busy = false }, BUSY_MAX_MS)
  try {
    await InAppBrowser.openWebView({
      url,
      title: 'DawaaGate',
      toolbarType: ToolBarType.NAVIGATION,
      isPresentAfterPageLoad: true,
      preShowScript: scrollScript(target),
    })
  } catch (err) {
    console.warn('[openPriceBrowser] plugin unavailable, using the standard browser', err)
    openInAppBrowser(url)
  } finally {
    clearTimeout(release)
    busy = false
  }
}
