// The order of Back (Roshetta plan, Phase K, step 12.9a; cases K3, K20 to K22).
//
// One Back press does exactly one thing, the first that applies in this order:
//   1. keyboard  an open on-screen keyboard closes (the phone does this itself); nothing else moves
//   2. layer     a layer inside a sheet (a second page, a filter pop-up) closes
//   3. sheet     an open sheet or picture viewer closes
//   4. unsaved   unsaved work asks Leave or Stay (the leave guard does the asking)
//   5. screen    the screen goes back one step
//   6. home      a main screen (Topics, Drugs, Favourites, Account) goes Home
//   7. exit      Home leaves the app (website: leaves the page)
// 'screen' is the plain case, and a main screen answers 'home' or 'exit' instead of 'screen'.
//
// Plain code with no React so the checks can run it. BottomNav.jsx and useBackClose.js ask it what
// this press is for. It only decides; the doing stays where it was. A layer only counts when a sheet
// is open under it (a layer does nothing on its own).
export const BACK_ORDER = ['keyboard', 'layer', 'sheet', 'unsaved', 'screen', 'home', 'exit']

export function decideBack(state = {}) {
  const { keyboardOpen, layerOpen, sheetOpen, unsavedPending, onTabScreen, onHome } = state
  if (keyboardOpen) return 'keyboard'
  if (sheetOpen && layerOpen) return 'layer'
  if (sheetOpen) return 'sheet'
  if (unsavedPending) return 'unsaved'
  if (onTabScreen && onHome) return 'exit'
  if (onTabScreen) return 'home'
  return 'screen'
}
