/**
 * src/pages/FavouritesScreen.jsx
 * Phase 2H — Favourites Screen rebuild
 *
 * Changes from stub:
 *  - Symmetric pill tabs: equal width, centered, Star icon, count badge
 *  - Empty state: Star icon (not Bookmark)
 *  - Drug card onTap → navigate to /drugs/:slug (FIX — was dead () => {})
 *  - Removing a favourite shows a brief snackbar: "Removed from favourites"
 *  - Snackbar is triggered by wrapping toggleDrug / toggleCondition
 *
 * Phase 2I — bug fix: condition card onTap was wired to remove-from-favourites
 *  instead of navigating (row tap silently un-favourited the condition and
 *  never opened it). ConditionCard's onTap is a single full-row tap target
 *  meant purely for navigation — mirrors DrugCard's onTap below.
 *  - Condition card onTap → navigate to /conditions/:slug (FIX)
 *  - Trailing star control added per row so removal is still possible
 *    from this screen.
 *
 * Phase 2J — polish pass on the 2I star row:
 *  - Removing a favourite now confirms first via ConfirmSheet (the
 *    consumer-facing confirm dialog — see src/components/ui/ConfirmSheet.jsx;
 *    NOT admin/ConfirmModal.jsx, which is CMS-only) instead of removing
 *    immediately on tap. toggleCondition is called from the sheet's
 *    onConfirm, which is also where the snackbar now fires.
 *
 * Phase 2K — the 2J star was rendered as a sibling before ConditionCard's
 *  outer div, which placed it before the specialty icon bubble too (wrong —
 *  it should sit right before the chevron) and top-aligned it instead of
 *  centering it on the row. Fixed by moving the star into ConditionCard's
 *  `trailing` slot (see ConditionCard Phase 16), which renders it
 *  immediately before the chevron and centers both together on the row's
 *  full height between the two divider lines.
 *
 * Phase 2L — header redesign to match ConditionsScreen's hero + sticky
 *  header pattern:
 *  - Plain "Favourites" <h1> replaced with a hero block (logo + heading),
 *    matching ConditionsScreen's BrandRow spacing/logo sizing. No tagline,
 *    no dark-mode toggle — this screen has neither in its existing in-page
 *    content, unlike Conditions.
 *  - Tab row now sits just below the hero and is tracked via a ref.
 *  - New StickyFavouritesHeader: a fixed, slide-down panel (logo row +
 *    the same two tabs) that appears once the hero scrolls out of view.
 *    Visual shell (position/zIndex/shadow/border-radius/transition) copied
 *    from ConditionsScreen's StickyLogoHeader; specialty-pill/search-icon/
 *    color-token logic from that component is NOT included — Favourites has
 *    no equivalent controls. Tab content is rendered via a shared renderTabs
 *    helper so the in-page and sticky tab rows never diverge.
 *  - This is a local, duplicated shell — not extracted into a shared
 *    component with ConditionsScreen (explicit decision: two occurrences
 *    don't yet justify the abstraction; avoids touching a working screen).
 *  - IntersectionObserver watches the hero ref (heroRef) the same way
 *    ConditionsScreen watches brandRowRef.
 *
 * Phase 2M — spec compliance pass (favourites-as-personal-library):
 *  - Logo removed from both the hero and the sticky header — this screen is
 *    title-first, not brand-first (logo stays reserved for Home). Hero is
 *    now: large "Favourites" title → small "Your saved references"
 *    subtitle → search → tabs. Sticky header is a compact text-only title
 *    bar ("Favourites", no logo, no back arrow — Favourites is a bottom-nav
 *    tab, there's no "back" destination that makes sense here).
 *  - Search added: reuses SearchBar as-is, placeholder "Search favourites…".
 *    Wired via useConditionSearch(savedConditions) — the hook's own pool is
 *    the FAVOURITED conditions array, not the full ConditionContext catalog,
 *    so results are scoped to the user's saved items automatically (the
 *    hook needs no new filtering logic for this). savedConditions/savedDrugs
 *    are now wrapped in useMemo — without it, .map().filter() built a new
 *    array reference every render, which would re-trigger
 *    useConditionSearch's internal "rebuild index" effect (keyed on that
 *    array reference) on every render.
 *  - Search is functionally scoped to the Conditions tab only this session —
 *    the Drugs tab has no star/remove control yet (explicit decision,
 *    deferred), and real filtering was deferred with it. The hero's
 *    SearchBar itself IS shown on both tabs (placeholder swaps between
 *    "Search favourite conditions…" / "Search favourite drugs…"); the Drugs
 *    variant is intentionally inert — its own local state (drugQuery) makes
 *    the input controlled/typeable but is not wired to any filtering.
 *    Placeholder box only, on purpose, until Drugs-tab search is picked up.
 *
 * Phase 2N — SearchBar now always visible regardless of active tab (was
 *  Conditions-only). Drugs tab gets its own local, unwired query state
 *  (drugQuery/setDrugQuery) purely so the input is controlled — no
 *  filtering, no highlight, no hook. Placeholder text is now per-tab:
 *  "Search favourite conditions…" on Conditions, "Search favourite drugs…"
 *  on Drugs (was a single generic "Search favourites…" for both).
 *  - Segmented control count badges de-emphasized (opacity ~0.7, weight 500)
 *    so tab labels stay the primary read.
 *  - RowStarButton icon 16px → 13px (already-44px tap target via padding is
 *    unaffected — only the icon shrinks).
 *  - Empty state redesigned: accent-tinted circular icon background + Star
 *    icon, "Nothing saved yet" headline, one-line body, verb-first CTA
 *    ("Browse conditions" / "Browse drugs") navigating to /conditions or
 *    /drugs. Separate, simpler empty state added for the Conditions tab
 *    when a search query matches none of the user's saved conditions:
 *    "No results for "{query}"" + "Clear search" — no browse CTA, since the
 *    user already has favourites.
 *  - Spacing tightened: hero top padding space-5 → space-4, hero-to-tabs gap
 *    reduced, sticky header internal padding reduced.
 *
 * Phase 2O — refinement pass on top of 2M/2N, per updated design brief
 *  (preserve design system, refine hierarchy/proportions, no reinvention):
 *  - Segmented control rebuilt from two independent pill buttons into a
 *    single unified capsule: one track (var(--color-border-subtle)), one
 *    sliding "elevated" indicator (var(--color-surface) + var(--shadow-card))
 *    that animates via CSS transform between the two segments. Selected
 *    segment's icon/label/count use var(--color-accent) (the app's primary
 *    blue); unselected uses var(--color-text-secondary). Reads as
 *    lightweight "switch views" navigation, not two primary actions.
 *  - Count badges further softened: neutral/tinted backgrounds
 *    (var(--color-border-subtle) unselected, var(--color-accent-light)
 *    selected) instead of the previous opacity-based dimming.
 *  - SearchBar rendered with the new `compact` prop (see SearchBar.jsx
 *    Phase 7) — 46px → 44px, corner radius/border/icon styling unchanged.
 *  - Header vertical rhythm tightened further: title→subtitle, subtitle→
 *    search, search→tabs, and tabs→first-list-item gaps each trimmed
 *    ~4–8dp. Title, subtitle copy, sticky-header trigger behavior, list row
 *    component, and star placement are unchanged — refinement only, per
 *    the "do not redesign" instruction in the brief.
 *
 * Phase 3 — tab bar upgraded from a lightweight underline filter to a
 *  first-class navigation component, matching ConditionDetailScreen's
 *  Treatment/Clinical tabs structurally and interactionally:
 *  - Tabs are full-width 50/50 cells again (flex: 1, width: 100% buttons)
 *    instead of content-sized columns — mirrors ConditionDetailScreen's TABS
 *    exactly. Tap target padding increased beyond ConditionDetailScreen's own
 *    (10px vs 7px) since this is Favourites' primary navigation.
 *  - Item counts removed entirely — label text only.
 *  - Underline thickened (3px) and unchanged in behavior: full width of the
 *    active cell, transparent when inactive, animates via CSS transition.
 *  - Active label: semibold + accent blue. Inactive: medium weight (500) +
 *    text-secondary gray.
 *  - Horizontal swipe added on the tab-content area, porting
 *    ConditionDetailScreen's exact touch-threshold + direction-aware CSS
 *    keyframe slide mechanism (touchStartX/Y refs, tabDirection ref,
 *    hasSwitchedRef so mount never animates, switchTab() computing direction
 *    from tab order). Deliberately NOT ported: ConditionDetailScreen's
 *    internal fixed-height scroll box + per-tab scrollTop memory — that's
 *    tied to that screen's whole-page layout architecture, and adopting it
 *    here would mean redesigning Favourites' overall scroll structure, which
 *    this task explicitly rules out. Favourites keeps ordinary page scroll;
 *    only the gesture + tab-switch + slide-transition parts are reused.
 *  - Tab content array hoisted to a module-level constant (FAVOURITES_TABS)
 *    since it no longer carries per-render count data — renderTabs and
 *    StickyFavouritesHeader no longer take a `tabs` prop.
 *
 * Phase 4 — the horizontal swipe-to-switch-tabs gesture (added in Phase 3,
 *  above) removed. It listened on the same wrapper div that every
 *  SwipeToRemoveRow now lives inside, so a swipe starting on a row fired
 *  both gesture systems at once — sometimes switching tabs mid swipe-to-
 *  reveal. Tab switching is tap-only now (switchTab, via the tab bar).
 *  tabDirection/hasSwitchedRef are unchanged — still needed for the slide
 *  animation, which switchTab still drives.
 *
 * Phase 4 — header/tab polish pass (premium, cohesive, own identity),
 *  interaction model from Phase 3 untouched:
 *  - Hero and StickyFavouritesHeader both gain a small filled Star icon
 *    beside the title, in accent color — a visual anchor distinguishing this
 *    screen from ConditionsScreen at a glance.
 *  - Vertical rhythm tightened ~15–20%: hero paddingBottom, subtitle
 *    marginBottom, tabs/search wrapper margins all trimmed.
 *  - Tab icons replaced: Star → BookOpen (Conditions) / Pill (Drugs) — the
 *    icons now represent content type rather than "favourited" status, which
 *    the Star icon never actually conveyed per-tab anyway. Icon size, gap,
 *    and label size all bumped up; button height fixed at 50px (within the
 *    48–52dp target) instead of padding-derived.
 *  - Underline: 3px → 3.5px, corners fully rounded (var(--radius-full)) for
 *    true rounded ends, still exactly matches the active cell's width.
 *  - No sort control added (none existed before — already compliant).
 *  - switchTab/touch handlers/slide-keyframe mechanism unchanged.
 *
 * Phase 5 — header composition/spacing/tab polish pass (refine, don't
 *  redesign), per updated design brief:
 *  - FavouritesHero rebuilt into one unified lockup: icon is now centered
 *    against the combined title+subtitle stack (previously centered against
 *    the title alone, with the subtitle sitting outside that row). Icon
 *    bumped 20→28px to read as the screen's visual identifier; hero
 *    paddingBottom trimmed 6→4.
 *  - Tabs-wrapper marginBottom trimmed 10→6 so the tab row sits closer to
 *    the hero. Search-wrapper spacing/order unchanged (search-bar sizing
 *    itself is explicitly out of scope this pass — lives in the shared
 *    SearchBar.jsx component).
 *  - renderTabs: active label weight 600→700 (labels stay the dominant
 *    element), icon-label gap 8→10.
 *  - renderTabs underline: height 3.5→2, added marginTop:4 for clearer
 *    separation below the label. This spec is now intentionally identical
 *    to ConditionDetailScreen's DetailHeader tab underline (also updated
 *    this pass, from 1.5px/square corners to the same 2px/rounded-full/
 *    marginTop:4 spec) — the brief required the two to match exactly, which
 *    the two screens' pre-existing specs did not.
 *  - StickyFavouritesHeader: icon 14→16, title fontSize 15→16, so page
 *    identity stays strong once scrolled. Tabs continue to render via the
 *    shared renderTabs, so they inherit the same underline change above
 *    automatically — no separate edit needed there.
 *
 * Phase 6 — amber identity + manage/bulk-remove, per updated design brief
 *  (Favourites needed its own visual identity distinct from Home/
 *  ConditionDetail's blue, plus a functional reason for a header utility
 *  icon):
 *  - New module-level FAV_ACCENT ('#F59E0B') replaces var(--color-accent)
 *    throughout this screen's icon, active tab, underline, and badge. Not
 *    an arbitrary new color — it's the exact hex RowStarButton already
 *    used for a favourited star, promoted to this screen's identity color.
 *    ConditionDetailScreen is untouched by this — it keeps var(--color-accent)
 *    blue; only the underline *geometry* (height/radius) stays shared
 *    between the two screens, per Phase 5's decision, not the color.
 *  - renderTabs takes a new `counts` param and shows each tab's live
 *    favourited count (e.g. "Conditions 8") next to its label.
 *  - New manage mode, Conditions-tab only (explicit scope decision —
 *    Drugs is being reworked in a separate upcoming session, see below):
 *    a ListChecks/X toggle button sits top-right of both header variants
 *    (same visual slot Home's dark-mode toggle occupies). While active,
 *    each ConditionCard's onTap toggles selection instead of navigating,
 *    and its trailing slot swaps RowStarButton for a Circle/CheckCircle2
 *    selection indicator. A fixed ManageActionBar (same bottom:80 "above
 *    bottom nav" offset Snackbar already used) appears once ≥1 item is
 *    selected, with a live count, "Select all"/"Deselect all", and
 *    "Remove". Remove reuses ConfirmSheet with a count-aware message;
 *    confirming loops toggleCondition (confirmed safe — useFavourites'
 *    setter uses a functional update, so N calls in one tick don't
 *    clobber each other) over the selected ids, fires the existing
 *    snackbar (now with a dynamic message — see below), clears
 *    selection, and exits manage mode.
 *  - Snackbar's message is no longer hardcoded — showSnack(message) now
 *    takes the string to display, so the existing single-item remove
 *    flow ("Removed from favourites") and the new bulk flow ("Removed 3
 *    favourites") can share one component.
 *  - Manage button only renders when savedConditions.length > 0 — no
 *    reason to offer a manage action over an empty list.
 *  - Drugs tab is completely unchanged by this phase: DrugCard isn't
 *    touched, gets no selection UI, and isManaging has no effect on its
 *    rendering — rows behave exactly as before regardless of manage
 *    state. This was an explicit decision, not an oversight: the Drugs
 *    screen/card is getting its own dedicated rework soon, and adding
 *    throwaway selection wiring here now would just be rebuilt then.
 *  - Known trade-off, not fixed this pass: ConditionCard always renders
 *    its own chevron after the trailing slot, so the chevron is still
 *    visible in manage mode even though tapping now selects instead of
 *    navigating. Removing it would mean editing ConditionCard.jsx's
 *    fixed markup, which was kept out of scope for this pass.
 *
 * Phase 7 — search redesign: icon-triggered, in-place header swap. The
 *  search input no longer overlays below the tabs; it swaps directly into
 *  the title/subtitle's own slot inside FavouritesHero/StickyFavouritesHeader
 *  when active. toggleSearch's old scroll-to-top-on-open call removed (dead
 *  code under this approach — the overlay it protected against no longer
 *  exists). Manage button hides while searching; badge stays visible.
 *  Crossfade keyframe (favHeaderCrossfade) added alongside the existing
 *  tab-slide keyframes.
 *
 * Phase 8 — follow-up fixes to Phase 7, from live-device feedback:
 *  - Header row given an explicit minHeight matching SearchBar's own height,
 *    so swapping title↔search never changes the row's height — previously
 *    the shorter/taller content shift pushed the tabs and list below it.
 *  - Star badge now hidden while searching (reverses Phase 7's "badge stays
 *    visible" call) — two adjacent filled-orange circles plus a compressed
 *    input read as cluttered on real phones, and hiding it gives the input
 *    the full width it needs for its placeholder to stay legible.
 *  - SearchBar's internal icon swapped from the generic magnifying glass to
 *    a Star via SearchBar's new optional `icon` prop (see SearchBar.jsx) —
 *    reads as "search favourites" rather than a generic search.
 *  - Close-search icon changed from X to ArrowLeft. SearchBar already
 *    renders its own inline clear-text X once there's a query; keeping the
 *    header's toggle as an X too put two visually-identical X icons right
 *    next to each other. ArrowLeft reads unambiguously as "exit search."
 *  - toggleSearch now clears both conditionQuery and drugQuery on close, so
 *    reopening search doesn't resurrect a stale query from last time.
 *  - StickyFavouritesHeader's slide-down transition is suppressed entirely
 *    while isSearching (visible={showStickyHeader && !isSearching}) — the
 *    header stays locked in place for the full duration of a search,
 *    regardless of what's technically driving the scroll/resize signal.
 *  - FavouritesHero and StickyFavouritesHeader's panel backgrounds changed
 *    from an amber tint to var(--color-accent-light) (globals.css for the
 *    sticky variant) — the app's existing blue design-system token, already
 *    dark-mode aware. FAV_ACCENT itself (badge/buttons/underline) is
 *    unchanged; this is a background-only recolor of the two header shells.
 *
 * Phase 9 — corrections to Phase 8, from further live-device feedback:
 *  - Sticky-header suppression during search reverted — StickyFavouritesHeader
 *    goes back to visible={showStickyHeader} with no isSearching gate; it
 *    behaves exactly as it did before Phase 8's "lock in place" change.
 *  - Root-caused the header height shift Phase 8 didn't actually fix:
 *    minHeight:44 is only a floor, and the title/subtitle text had no
 *    explicit lineHeight, so it rendered at the font's default line-height —
 *    taller than 44px — while the search state (SearchBar, height fixed at
 *    44px) stayed exactly 44px. Toggling into search still visibly shrank
 *    the row. Fixed by switching both header rows from minHeight to a hard
 *    height: 44, and giving the title/subtitle explicit lineHeight so their
 *    natural stack genuinely fits under 44px instead of overflowing it.
 *  - Title/subtitle sizes trimmed (22→19 / 13→12) as part of the same fix,
 *    both to make the height math work and to better match the visual
 *    weight of the 38px badge / 36px buttons beside them.
 *  - StickyFavouritesHeader's background changed again, amber→blue→white
 *    (var(--color-surface), globals.css) — the hero panel keeps its blue
 *    tint from Phase 8; only the sticky/collapsed variant is now white.
 *
 * Phase 10 — header restyle pass (surface/shadow/sizing refinement, per
 *  updated design brief):
 *  - Both header panels moved off tinted backgrounds onto
 *    var(--color-surface), with a hairline boxShadow (0 1px 2px
 *    rgba(0,0,0,0.04)) replacing the previous flat tint / heavier drop
 *    shadow — reads as a subtly elevated white shelf rather than a colored
 *    banner. FAV_ACCENT_BG constant removed (no remaining consumers).
 *  - StickyFavouritesHeader's title row grown 44→48 (padding-top 14→16) to
 *    fix the cramped badge/button spacing the old 44px box left almost no
 *    room for; clawed back partially by trimming the tab-row's own bottom
 *    padding 10→9 and the badge 26→25, so the panel's total footprint
 *    doesn't grow by the full 4px.
 *  - Sticky search-toggle button stays at its existing 28px idle size
 *    (previously slated to grow — reverted per the above clawback) and
 *    now animates to 32px only while isSearching, so it matches the
 *    compact SearchBar's height exactly without inflating idle chrome.
 *    Manage button is unaffected (hidden during search).
 *  - Hero action buttons: search-toggle grows 36→44 while searching
 *    (matches the hero's own compact SearchBar at 44); idle backgrounds on
 *    both hero buttons move from var(--color-surface) to
 *    var(--color-accent-light) so they read as soft filled pills instead of
 *    outline buttons; active search-button background moves from FAV_ACCENT
 *    to var(--color-accent). Manage button's active background is
 *    unaddressed by the brief and stays FAV_ACCENT.
 *  - New scoped classes (fav-search-micro / fav-sticky-search-height) trim
 *    the shared SearchBar's placeholder size, leading-icon size, and
 *    left-padding when it's rendered inside either header, and lock the
 *    sticky variant's input height to 32px to match the expanded back
 *    button — all via !important overrides since SearchBar's own sizing is
 *    inline. SearchBar.jsx itself is untouched.
 *  - Search-open transition swapped from the plain favHeaderCrossfade to a
 *    new favSearchExpand keyframe (opacity + scaleX from the left edge,
 *    transform-origin: left center) so the field visibly grows out of the
 *    icon instead of just fading in. The title side keeps the original
 *    favHeaderCrossfade.
 *  - renderTabs's bare count text is now a small rounded pill — accent-
 *    filled when its tab is active, var(--color-border-subtle) otherwise —
 *    instead of plain de-emphasized text.
 *
 * Phase 11 — single-anchor pass: the amber badge is this screen's one
 *  visual identity mark; everything else de-emphasized so it doesn't
 *  compete:
 *  - renderTabs: Phase 10's accent-filled count pill reverted — count is
 *    now plain muted text (var(--color-text-secondary)), no background,
 *    same look whether its tab is active or not.
 *  - FavouritesHero, idle state: search-toggle and manage buttons drop
 *    their var(--color-accent-light) circle fill entirely — bare icons,
 *    strokeWidth bumped (1.8→2.2) for boldness, tap area unchanged at
 *    36×36 so the touch target doesn't shrink. Idle icon color switched to
 *    var(--color-text-secondary) (the old #412402 was tuned to sit on a
 *    light-blue fill that no longer exists). This leaves the amber badge
 *    as the only filled color shape in the row. Manage's active
 *    (isManaging) amber-filled state is untouched — that's a real toggle
 *    state, not one of the idle circles being quieted here.
 *  - FavouritesHero, searching state: back button and the compact
 *    SearchBar both trimmed 44px → 40px (new height rule on
 *    .fav-search-micro input, see local <style> block). Blue fill on the
 *    back button is unchanged — it's a functional state, not decorative.
 *  - StickyFavouritesHeader: title bumped 16→18px so it clearly outranks
 *    the 14px tab labels at a glance. Badge grown 25→28px (icon 13→15).
 *    Idle search/manage icons grown 13→15px, strokeWidth 1.8→2.0 — no bg
 *    change needed since their idle background already matches the panel
 *    (var(--color-surface)). Idle button box grown 28→32px; the
 *    searching-state (back) button grown 32→36px and its background
 *    swapped FAV_ACCENT → var(--color-accent), matching the hero's blue
 *    instead of amber. .fav-sticky-search-height input grown 32px→36px to
 *    match the new back-button size. Manage's active box stays at the new
 *    32px idle size — it never had its own separate active size.
 *
 * Phase 12 — StickyFavouritesHeader height fix + match to ConditionsScreen's
 *  StickyLogoHeader, per report of excess whitespace:
 *  - Root cause: the title row set BOTH height:48 and paddingTop:16 with no
 *    boxSizing — content-box default meant these stacked, so the row
 *    actually rendered at 64px, not 48. Fixed with boxSizing:'border-box',
 *    height:44, paddingTop:8 (36px content area — exactly fits the
 *    searching-state 36px back button/SearchBar with no clipping; idle
 *    28px badge / 32px buttons center within it fine).
 *  - Tabs-row wrapper's marginTop (6→3) and bottom padding (9→5) trimmed
 *    further on top of that fix to close the remaining gap toward
 *    ConditionsScreen's total sticky-header height. The 50px tab button
 *    height itself (inside renderTabs) is untouched — kept intentionally
 *    identical to ConditionDetailScreen's DetailHeader tabs (see renderTabs
 *    comment) — so the wrapper's own spacing was the only lever available.
 *  - boxShadow changed from the Phase 10 hairline (0 1px 2px
 *    rgba(0,0,0,0.04)) to ConditionsScreen's StickyLogoHeader shadow exactly
 *    (0 4px 12px rgba(0, 0, 0, 0.06)), per explicit request to match it.
 *    FavouritesHero's own shadow is untouched — this is sticky-only.
 *  - Search/manage icons: size 15→17, color var(--color-text-secondary) →
 *    var(--color-text-primary), strokeWidth 2→2.2 — bigger and higher
 *    contrast, per feedback that they read as too faint. Idle button
 *    circle sizes (32px) are unchanged; only the icon inside grew.
 *
 * Phase 13 — spacing redistribution, shadow, and manage-mode color pass:
 *  - StickyFavouritesHeader: added marginTop:5 above the title row for
 *    breathing room under the panel's top edge, funded by removing it
 *    elsewhere rather than growing the panel — tabs-wrapper marginTop 3→0
 *    and its bottom padding 5→3 (net -5), so total sticky-header height is
 *    unchanged. The title row's own height:44/boxSizing:border-box content
 *    math from Phase 12 is untouched.
 *  - renderTabs underline: marginTop 3→2, tightening the label-to-indicator
 *    gap in both headers (shared function). This breaks the previous
 *    explicit pixel-parity with ConditionDetailScreen's DetailHeader
 *    underline — that file wasn't in this task's context, so it's now out
 *    of sync until updated to match, if still desired.
 *  - FavouritesHero card shadow: 0 1px 2px rgba(0,0,0,0.04) → 0 8px 24px
 *    rgba(0, 0, 0, 0.06) — a softer, more diffused blur with more visual
 *    weight, so the card reads as lifted off the page background rather
 *    than nearly flush with it.
 *  - Manage mode recolored amber → blue for its interactive controls:
 *    both headers' manage-button active background (FAV_ACCENT → var(
 *    --color-accent)), and the row checkbox's checked-state fill (FAV_ACCENT
 *    → var(--color-accent)). The Star identity badge stays amber — FAV_ACCENT
 *    remains this screen's identity color, this pass only touches manage
 *    mode's own interactive color.
 *  - Row checkbox height fix: the trailing checkbox's padding (14px top/
 *    bottom) was a copy of RowStarButton's padding, but paired with a
 *    bigger icon (20px vs the star's 13px) — so despite the comment saying
 *    it "matches RowStarButton's footprint," it actually rendered 7px
 *    taller (48px vs 41px), which is what visibly changed the condition
 *    card's row height when manage mode toggled on. Fixed by recalculating
 *    the padding for the checkbox's actual icon size (10.5px, not 14px) so
 *    both controls render at the same 41px total footprint.
 *
 * Phase 14 — Conditions-tab sort + specialty filter, grouped behind one
 *  manager entry point (Conditions tab only — Drugs deferred, same scope as
 *  manage mode):
 *  - FavouritesHero/StickyFavouritesHeader's standalone Manage button
 *    replaced with a single SlidersHorizontal trigger (showManagerButton/
 *    hasActiveFilters/onOpenManager props) that opens the new
 *    FavouritesManagerSheet (src/components/conditions/FavouritesManagerSheet.jsx)
 *    — a bottom sheet grouping Sort, Specialty, and Manage, matching the
 *    existing SpecialtiesBottomSheet/ConfirmSheet visual idiom. A small dot
 *    badge appears on the trigger when a non-default sort or specialty is
 *    active, so filter state is never silently invisible.
 *  - Sort: useSortToggle (src/hooks/useSortToggle.js) generalized to accept
 *    an optional (storageKey, labels, defaultMode) so this screen can run
 *    its own instance under 'capsula_favourites_sort' — separate from
 *    ConditionsScreen's 'capsula_conditions_sort' key, since 'recent' means
 *    "recently added" here vs "recently viewed" there. Defaults to 'recent'
 *    on this screen per explicit product decision (ConditionsScreen still
 *    defaults to 'az', unaffected). "Recently added" ordering reuses
 *    favourites.conditions' existing append-only insertion order (reversed)
 *    as the id-priority array useConditionSearch's sort step already
 *    accepts — no changes to useConditionSearch.js were needed.
 *  - Specialty: useConditionSearch's existing (unused until now) specialty
 *    filter step is wired up via activeSpecialty/setActiveSpecialty; the
 *    existing SpecialtySelector/SpecialtiesBottomSheet components are reused
 *    as-is (opened by the manager sheet's Specialty row) — no new specialty
 *    UI built from scratch.
 *
 * Phase 15 — SwipeToRemoveRow's swipe-to-delete on condition rows removed
 *  (component deleted, nothing else used it). Removing a favourite is
 *  tap-only again: star → ConfirmSheet, same as it's always been for the
 *  Drugs tab. That gesture was the reason the Phase 3 swipe-to-switch-tabs
 *  gesture got pulled in Phase 4 — a touch starting on a row fired both
 *  gesture systems at once. With rows no longer capturing their own
 *  horizontal drag, swipe-to-switch-tabs is reinstated on the tab-content
 *  wrapper (handleTabTouchStart/Move/End), reusing the same dx-vs-dy
 *  axis-lock approach SwipeToRemoveRow used, and driving the existing
 *  switchTab/tabDirection/hasSwitchedRef slide-animation machinery exactly
 *  as tap already did.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Favourites Screen Refactor plan — this file rewritten in this pass.
 * ─────────────────────────────────────────────────────────────────────────
 * Phases 1–2 (pure extraction, no behavior change): Snackbar, the three
 *  empty-state components (NoSearchResultsState redesigned per Decision 12),
 *  SpecialtyFilterBanner, FAVOURITES_TABS + renderTabs, FavouritesHero,
 *  FavouritesStickyHeader, and ManageActionBar all moved to their own files
 *  under src/components/ui/ and src/components/conditions/ — this file now
 *  imports them instead of defining them inline. SkeletonRow/shimmer/
 *  SKELETON_ROW_COUNT stay local — not part of the extraction list.
 * Phase 3: FavouritesManagerSheet gained a showSpecialty prop (edited in
 *  place, not moved); the one call site below now passes
 *  showSpecialty={activeTab === 'conditions'}.
 * Phase 4: Drugs tab gets its own sort — a small local sortDrugs() helper
 *  (mirrors useConditionSearch's applySortMode, keyed on tradenameClean
 *  instead of name) plus recentlyAddedDrugsOrder/sortedDrugs — sharing the
 *  screen's one useSortToggle instance with Conditions, not a second one.
 * Phase 5: Drugs tab gets manage mode — toggleSelectCondition renamed to
 *  the now tab-generic toggleSelectId; the Drugs render loop gained the
 *  same isManaging ternary + row-exit-animation wrapping (rowNodeRefs/
 *  exitingRows/favRowEnter) the Conditions loop already had.
 *  handleConfirmBulkRemove is now tab-aware (branches on activeTab for its
 *  source array/toggle fn/restore fn) and — per the plan's flagged
 *  correction — bulk-remove on BOTH tabs now plays the row-exit animation,
 *  which neither tab previously had. ManageActionBar's count/allSelected/
 *  onToggleSelectAll are tab-aware. switchTab() cancels manage mode on any
 *  tab change (tap or swipe), matching what the Cancel button already did.
 * Phase 6: showManagerButton is no longer gated on activeTab or item
 *  count — the manager (sliders) icon is now always shown, on both tabs,
 *  even with zero saved items.
 * Phase 7: the swipe-gesture wrapper around the tab content now measures
 *  and applies a minHeight so it spans the full remaining viewport height
 *  (viewport height minus its own top offset minus BottomNav's fixed
 *  height, same BOTTOM_NAV_HEIGHT=60 constant/technique ConditionsScreen's
 *  own available-height math already uses) — so swiping over blank space
 *  below a short/empty tab still switches tabs, not just over rows.
 * Phase 8: Drugs tab gets real search — drugQuery (already existed as an
 *  inert placeholder) now drives drugSearchResults, a local filter over
 *  sortedDrugs matching on tradenameClean. The Drugs render loop maps
 *  drugSearchResults instead of savedDrugs directly.
 * Phase 9: NoSearchResultsState (redesigned in FavouritesEmptyStates.jsx)
 *  is now wired to the Drugs tab too, keyed on drugQuery/setDrugQuery.
 * Phase 11: handleConfirmRemoveDrug now plays the same row-exit animation
 *  handleConfirmRemoveCondition already used, instead of removing instantly.
 *
 * Favourites empty-state sign-in banner (this session) — both tabs' call
 * to NothingSavedEmptyState now pass showSignIn={!user}. `user` was
 * already read here via useAuth() for other purposes, so no new context
 * read was needed.
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Circle, CheckCircle2 } from 'lucide-react'
import BackToTopButton from '../components/ui/BackToTopButton'
import ConditionCard from '../components/ConditionCard'
import SharedDrugCard from '../components/SharedDrugCard'
import RowStarButton from '../components/ui/RowStarButton'
import ConfirmSheet from '../components/ui/ConfirmSheet'
import Snackbar from '../components/ui/Snackbar'
import SpecialtiesBottomSheet from '../components/conditions/SpecialtiesBottomSheet'
import FavouritesManagerSheet from '../components/conditions/FavouritesManagerSheet'
import ManageActionBar from '../components/conditions/ManageActionBar'
import SpecialtyFilterBanner from '../components/conditions/SpecialtyFilterBanner'
import { NothingSavedEmptyState, NoSearchResultsState, SpecialtyEmptyState } from '../components/conditions/FavouritesEmptyStates'
import { FAVOURITES_TABS, renderTabs } from '../components/conditions/FavouritesTabBar'
import FavouritesHero from '../components/conditions/FavouritesHero'
import FavouritesStickyHeader from '../components/conditions/FavouritesStickyHeader'
import { useIsDark } from '../utils/specialtyIcon'
import { useConditionContext } from '../context/ConditionContext'
import { useDrugContext } from '../context/DrugContext'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useConditionSearch } from '../hooks/useConditionSearch'
import { useCategories } from '../hooks/useCategories'
import { useSortToggle } from '../hooks/useSortToggle'
import { useBackToTop } from '../hooks/useBackToTop'
import { useBackClose } from '../hooks/useBackClose'
import { useAuth } from '../hooks/useAuth'
import { useIsPro } from '../hooks/useIsPro'
import ProUpsellBanner from '../components/ui/ProUpsellBanner'
import { FAVOURITES_CAP_DRUGS, FAVOURITES_CAP_CONDITIONS } from '../constants/features'

// Row remove/restore animation durations — must match the @keyframes
// durations declared in the local <style> block below exactly, since the
// setTimeout that actually mutates favourites (on remove) or clears the
// animation flag (on restore) is what keeps state changes in sync with what
// the animation visually shows.
const ROW_EXIT_MS  = 220
const ROW_ENTER_MS = 280

// Swipe-to-switch-tabs thresholds — mirror the values SwipeToRemoveRow used
// for its own axis-lock/drag detection.
const TAB_AXIS_LOCK_SLOP  = 6  // px of movement before we decide horizontal vs. vertical
const TAB_SWIPE_THRESHOLD = 50 // px of horizontal drag needed to switch tabs on release

// BottomNav's own fixed height — same literal Layout.jsx uses for its
// bottom-nav clearance, and the same constant/technique
// ConditionsScreen.jsx's skeleton-row-count effect already uses for its own
// "how much space is actually available" math (see Phase 7 below).
const BOTTOM_NAV_HEIGHT = 60

// Sort labels for this screen's own useSortToggle instance (separate
// storage key from ConditionsScreen — see Phase 14 note above). 'recent'
// means "recently added to favourites" here, not "recently viewed", so it
// gets its own label rather than reusing useSortToggle's exported default.
// Shared by both tabs (Decision 4) — Drugs' sort uses this same instance,
// not a second one.
const FAV_SORT_LABELS = {
  az:     'A – Z',
  recent: 'Recently added',
}

// ─── Drugs-tab sort (Favourites Screen Refactor plan, Decision 5) ──────────
// Mirrors useConditionSearch's existing applySortMode logic exactly (same
// two branches: 'recent' ranks by index in a reversed-favourites-order
// array with alphabetical fallback, 'az' is a straight alphabetical sort),
// parameterized to read tradenameClean instead of name. A small local
// helper, not a route through useConditionSearch — that hook hardcodes
// `.name` and carries search/specialty-filter machinery Drugs doesn't need;
// this keeps Conditions/ConditionsScreen behavior completely unaffected.

function sortDrugs(items, mode, recentIds) {
  if (mode === 'recent') {
    return [...items].sort((a, b) => {
      const ai = recentIds.indexOf(a.id)
      const bi = recentIds.indexOf(b.id)
      if (ai !== -1 && bi !== -1) return ai - bi
      if (ai !== -1) return -1
      if (bi !== -1) return 1
      return a.tradenameClean.localeCompare(b.tradenameClean)
    })
  }
  return [...items].sort((a, b) => a.tradenameClean.localeCompare(b.tradenameClean))
}

// ─── Loading skeleton: first-load guard ─────────────────────────────────────
// Phase 11 (Back-Button & State-Audit merged plan) — shown in place of
// NothingSavedEmptyState while a tab's underlying context is still on its
// very first load. Without this, a slow first load could show "Nothing
// saved yet" for a moment before the real (non-empty) list arrives, which
// reads as a false claim rather than a loading state.
//
// (drug-fav-loading-skeletons) — swapped the plain spinner
// (FavouritesLoadingPlaceholder, Loader2 + favLoadingSpin) for the same
// shimmer skeleton method ConditionsScreen.jsx / ConditionDetailScreen.jsx /
// DrugsScreen.jsx / DrugDetailScreen.jsx already use, so every loading
// moment in the app now reads the same way. SkeletonRow mirrors
// ConditionsScreen.jsx's own SkeletonCard exactly (icon bubble + name line)
// since that's the same row shape both ConditionCard and SharedDrugCard
// already render here — one shared skeleton row works for both tabs. Fixed
// row count, not measured against available height like ConditionsScreen's
// own skeletonRowCount, since this placeholder only needs to plausibly fill
// a first-load moment, not exactly match a scroll container's height.

function shimmer(extra = {}) {
  return {
    backgroundColor: 'var(--color-border)',
    borderRadius:    'var(--radius-sm)',
    animation:       'shimmer 1.4s ease-in-out infinite',
    ...extra,
  }
}

const SKELETON_ROW_COUNT = 5

function SkeletonRow() {
  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      gap:          'var(--space-3)',
      padding:      '8px 0',
      borderBottom: '0.5px solid var(--color-border-subtle)',
    }}>
      <div style={shimmer({ width: 36, height: 36, borderRadius: 'var(--radius-md)', flexShrink: 0 })} />
      <div style={{ flex: 1 }}>
        <div style={shimmer({ width: 60, height: 10, marginBottom: 6 })} />
        <div style={shimmer({ width: '60%', height: 15 })} />
      </div>
    </div>
  )
}

// ─── FavouritesScreen ─────────────────────────────────────────────────────────

export default function FavouritesScreen() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('conditions')
  const isDark = useIsDark()
  const { categories } = useCategories()

  // Back-to-top — shared with ConditionsScreen via useBackToTop/BackToTopButton
  // (see src/hooks/useBackToTop.js), same 400px threshold and easeOutCubic
  // smooth-scroll behavior, instead of duplicating that logic here.
  const { visible: showBackToTop, scrollToTop: handleBackToTop } = useBackToTop()

  // Snackbar state — message is dynamic (bulk-remove needs a count-aware
  // string; single-item remove keeps its original fixed message). Action
  // (actionLabel/onAction) is optional — only the swipe-to-remove flow uses
  // it, for Undo; the confirm-modal-based remove flows pass no action.
  const [snackVisible, setSnackVisible] = useState(false)
  const [snackMessage, setSnackMessage] = useState('')
  const [snackAction, setSnackAction]   = useState(null) // { label, onAction } | null
  const snackTimer = useRef(null)

  function showSnack(message, action = null) {
    if (snackTimer.current) clearTimeout(snackTimer.current)
    setSnackMessage(message)
    setSnackAction(action)
    setSnackVisible(true)
    snackTimer.current = setTimeout(() => setSnackVisible(false), 2000)
  }

  // Tapping Undo dismisses the snackbar immediately (clearing the auto-hide
  // timer) in addition to running the caller's restore logic — otherwise a
  // fast tap could still see the toast linger for its full 2s.
  function handleSnackAction() {
    if (!snackAction) return
    snackAction.onAction()
    if (snackTimer.current) clearTimeout(snackTimer.current)
    setSnackVisible(false)
  }

  // ── Search (icon-triggered, swaps in-place with the header title) ──────────
  const [isSearching, setIsSearching] = useState(false)

  function toggleSearch() {
    setIsSearching(prev => {
      const next = !prev
      if (!next) {
        setConditionQuery('')
        setDrugQuery('')
      }
      return next
    })
  }

  // Back-button handling (Phase 11, Back-Button & State-Audit merged plan) —
  // while searching, back closes the search first (same close action as the
  // header's own back-arrow) instead of leaving the screen. Same shared
  // hook already used below for manage mode.
  useBackClose(isSearching, toggleSearch)

  // ── Manage mode (Favourites Screen Refactor plan, Phase 5 — now covers
  // both tabs; was Conditions-only) ───────────────────────────────────────
  const [isManaging, setIsManaging] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())

  // Bug fix (2026-09-06): this used to hand-roll its own placeholder
  // history entry + popstate listener to make back close manage mode
  // instead of leaving the screen. Two problems with that: it only
  // handled the web/PWA back gesture and never registered an Android
  // hardware-back listener at all, and it had no way to tell BottomNav's
  // tab-level back handling "something of mine is open, step aside" —
  // so exiting manage mode (by back OR by tapping Done) could get
  // misread as a real tab-level back press and bounce you to Conditions.
  // Swapped for the same shared back-close hook every popup/sheet in the
  // app already uses, which covers both platforms and coordinates
  // correctly with everything else.
  useBackClose(isManaging, () => {
    setIsManaging(false)
    setSelectedIds(new Set())
  })

  function toggleManage() {
    if (isManaging) {
      setIsManaging(false)
      setSelectedIds(new Set())
    } else {
      setIsManaging(true)
    }
  }

  // Renamed from toggleSelectCondition (Favourites Screen Refactor plan,
  // Phase 5a) — body unchanged, already just Set add/remove; the new name
  // reflects that both tabs' rows call this now, not just Conditions'.
  function toggleSelectId(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Manager sheet (sort + specialty + manage entry point). Sort and
  // Manage are shared across both tabs; Specialty stays Conditions-only via
  // FavouritesManagerSheet's showSpecialty prop (Phase 3). The specialty
  // sheet is a separate piece of state so the two never render stacked/
  // simultaneously — opening one always closes the other first (see
  // handlers below).
  const [showManagerSheet, setShowManagerSheet] = useState(false)
  const [showSpecialtySheet, setShowSpecialtySheet] = useState(false)

  const [showBulkConfirm, setShowBulkConfirm] = useState(false)

  const { favourites, toggleDrug, toggleCondition, restoreConditionAt, restoreDrugAt } = useFavouritesContext()
  const { conditions, specialties, loading: conditionsLoading } = useConditionContext()
  const { drugs, loading: drugsLoading } = useDrugContext()
  const { user } = useAuth()
  const isPro = useIsPro()

  // Loading-flag fix (Phase 11, Back-Button & State-Audit merged plan) —
  // each flag latches to true the first time its context's own loading
  // flag resolves to false, and stays true from then on (a later refresh
  // going back to loading briefly shouldn't re-show the loading placeholder
  // over an already-known, possibly non-empty list). Read by
  // SkeletonRow's render guard below, per tab.
  const [conditionsEverLoaded, setConditionsEverLoaded] = useState(false)
  const [drugsEverLoaded, setDrugsEverLoaded] = useState(false)

  useEffect(() => {
    if (!conditionsLoading) setConditionsEverLoaded(true)
  }, [conditionsLoading])

  useEffect(() => {
    if (!drugsLoading) setDrugsEverLoaded(true)
  }, [drugsLoading])

  // Look up full objects from context. Memoized — without this, a new array
  // reference was created every render, which re-triggered
  // useConditionSearch's "rebuild index" effect (keyed on this array's
  // identity) on every render instead of only when favourites/catalog change.
  const savedConditions = useMemo(
    () => favourites.conditions.map(id => conditions.find(c => c.id === id)).filter(Boolean),
    [favourites.conditions, conditions]
  )

  const savedDrugs = useMemo(
    () => favourites.drugs.map(id => drugs.find(d => d.id === id)).filter(Boolean),
    [favourites.drugs, drugs]
  )

  // Phase 7 — tab counts show "8/20" style text only for a signed-in free
  // account; Pro and guests keep the bare number unchanged, since the cap
  // is a free-tier-only concept and showing it to Pro or guests would be
  // misleading. Same object feeds both the sticky header and the in-page
  // tab bar below, so the two never drift out of sync.
  const isFreeAccount = !!user && !isPro
  const conditionsAtCap = isFreeAccount && savedConditions.length >= FAVOURITES_CAP_CONDITIONS
  const drugsAtCap      = isFreeAccount && savedDrugs.length >= FAVOURITES_CAP_DRUGS
  const tabCounts = {
    conditions: isFreeAccount ? `${savedConditions.length}/${FAVOURITES_CAP_CONDITIONS}` : savedConditions.length,
    drugs:      isFreeAccount ? `${savedDrugs.length}/${FAVOURITES_CAP_DRUGS}`           : savedDrugs.length,
  }

  // Sort (Phase 14) — own storage key ('capsula_favourites_sort'), separate
  // from ConditionsScreen's 'capsula_conditions_sort' key, since 'recent'
  // means a different thing on each screen (viewed vs added). Defaults to
  // 'recent' here per explicit product decision, vs ConditionsScreen's 'az'.
  // Shared by both tabs (Decision 4) — Drugs' sortedDrugs below reads this
  // same sortMode, not a second per-tab instance.
  const { sortMode, setSortMode } = useSortToggle('capsula_favourites_sort', FAV_SORT_LABELS, 'recent')

  // favourites.conditions is append-only (toggleCondition always appends the
  // newly-favourited id to the end — see useFavourites.js), so it's already
  // in oldest-added → newest-added order. Reversed, it's a ready-made
  // "recently added first" ranking — exactly the shape useConditionSearch's
  // sort step already expects (it ranks by indexOf in whatever id array is
  // passed as its third argument), so no changes to that hook were needed.
  const recentlyAddedOrder = useMemo(
    () => [...favourites.conditions].reverse(),
    [favourites.conditions]
  )

  // Same "recently added first" shape as recentlyAddedOrder above, for
  // Drugs (Favourites Screen Refactor plan, Phase 4). favourites.drugs is
  // append-only the same way favourites.conditions is.
  const recentlyAddedDrugsOrder = useMemo(
    () => [...favourites.drugs].reverse(),
    [favourites.drugs]
  )

  const sortedDrugs = useMemo(
    () => sortDrugs(savedDrugs, sortMode, recentlyAddedDrugsOrder),
    [savedDrugs, sortMode, recentlyAddedDrugsOrder]
  )

  // Conditions-tab search — scoped to the user's saved conditions only (not
  // the full catalog). Own query state, independent of any other search on
  // the app. sortMode/recentlyAddedOrder (Phase 14) feed the hook's
  // existing sort step; activeSpecialty/setActiveSpecialty feed its
  // existing specialty filter step — both were already built into
  // useConditionSearch, just unused by this screen until now.
  const {
    query:   conditionQuery,
    setQuery: setConditionQuery,
    activeSpecialty,
    setActiveSpecialty,
    results: conditionResults,
  } = useConditionSearch(savedConditions, sortMode, recentlyAddedOrder, 'capsula_favourites_specialty')

  const isSearchingConditions = conditionQuery.trim().length > 0
  const conditionSearchEmpty  = isSearchingConditions && conditionResults.length === 0

  // Active specialty object + filter/sort summary for the manager button's
  // dot badge — same lookup pattern as ConditionsScreen.
  const activeSpecialtyObj = activeSpecialty !== 'all'
    ? specialties.find(s => s.id === activeSpecialty) ?? null
    : null

  // Sort is a standing list-order preference, not a temporary filter — it
  // shouldn't light the manager button's dot. Only an active specialty
  // (a genuine narrowing of what's shown) counts as a filter here.
  const hasActiveFilters = activeSpecialty !== 'all'

  // Drugs-tab search (Favourites Screen Refactor plan, Phase 8) — a small
  // local filter over sortedDrugs, matching on tradenameClean, NOT
  // DrugsScreen's full useDrugSearch engine (typo suggestions, brand/
  // generic mode, 100-result narrowing — built for the whole catalog, not
  // a short personal saved list). Sort is applied before filtering, same
  // order Conditions already uses.
  const [drugQuery, setDrugQuery] = useState('')

  const drugSearchResults = useMemo(() => {
    if (!drugQuery.trim()) return sortedDrugs
    const q = drugQuery.trim().toLowerCase()
    return sortedDrugs.filter(d => d.tradenameClean.toLowerCase().includes(q))
  }, [sortedDrugs, drugQuery])

  const isSearchingDrugs = drugQuery.trim().length > 0
  const drugSearchEmpty  = isSearchingDrugs && drugSearchResults.length === 0

  // Hero search box swaps value/handler/placeholder based on the active tab.
  const heroSearchValue = activeTab === 'conditions' ? conditionQuery : drugQuery
  const heroSearchOnChange = activeTab === 'conditions' ? setConditionQuery : setDrugQuery
  const heroSearchPlaceholder = activeTab === 'conditions'
    ? 'Search favourite conditions…'
    : 'Search favourite drugs…'

  // Condition removal confirms first — see ConfirmSheet below.
  const [confirmingCondition, setConfirmingCondition] = useState(null)

  // Drug removal: also confirms first, then Undo — mirrors the condition
  // flow below exactly.
  const [confirmingDrug, setConfirmingDrug] = useState(null)

  // Row exit animation tracking — id -> { height, collapsed }. 'height' is
  // the row's own measured height (via rowNodeRefs), captured the instant
  // removal starts; 'collapsed' flips to true one frame later so max-height
  // actually transitions from that exact measured value down to 0. Shared
  // by both tabs' rows — condition and drug ids never collide in the same
  // Map/Set, and this infrastructure was already generic per-id before the
  // Drugs-tab work (Favourites Screen Refactor plan, Phase 5a) started
  // registering drug rows into it too.
  //
  // This used to animate max-height from a fixed guessed value instead of
  // a measurement. A guess doesn't match every row's real height, so the
  // animated max-height crosses below the row's actual content height at a
  // different point in the animation depending on the row — either nothing
  // visibly happens for part of the duration and then it clips suddenly
  // (guess too tall), or the row is clipped immediately at the start before
  // any smooth shrink (guess too short). Either way that reads as glitchy.
  // Measuring the real height at trigger time removes the mismatch, so the
  // collapse is a uniform shrink for any row height.
  const rowNodeRefs = useRef(new Map())
  const [exitingRows, setExitingRows] = useState(() => new Map())
  const [restoredConditionIds, setRestoredConditionIds] = useState(() => new Set())

  function beginRowExit(id) {
    const el = rowNodeRefs.current.get(id)
    const height = el ? el.getBoundingClientRect().height : 0
    setExitingRows(prev => {
      const next = new Map(prev)
      next.set(id, { height, collapsed: false })
      return next
    })
    // One frame later: flip to collapsed. Setting height+collapsed in the
    // same render would give the transition no starting value to animate
    // from — it'd just render already-collapsed.
    requestAnimationFrame(() => {
      setExitingRows(prev => {
        if (!prev.has(id)) return prev
        const next = new Map(prev)
        next.set(id, { height, collapsed: true })
        return next
      })
    })
  }

  function endRowExit(id) {
    setExitingRows(prev => {
      if (!prev.has(id)) return prev
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }

  function beginRowRestore(id) {
    setRestoredConditionIds(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
    setTimeout(() => {
      setRestoredConditionIds(prev => {
        if (!prev.has(id)) return prev
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, ROW_ENTER_MS)
  }

  // Both condition-removal paths below share the same undo shape: capture
  // the id's index in favourites.conditions *before* removing it, then Undo
  // calls restoreConditionAt(id, index) — a splice-back-in, not toggleCondition
  // — so the item reappears exactly where it was instead of jumping to the
  // end (which is what plain toggleCondition would do, since it's append-only;
  // see useFavourites.js).
  //
  // Both paths also now play an exit animation before the actual removal:
  // beginRowExit(id) measures the row and flags it to collapse via inline
  // animation while it's still in the list, and only after ROW_EXIT_MS does
  // toggleCondition actually remove it from favourites.conditions — so the
  // row has already faded/collapsed out visually by the time it unmounts,
  // instead of vanishing instantly. Undo mirrors this: restoreConditionAt
  // splices the id back in immediately (so sort/position is correct right
  // away), and beginRowRestore(id) flags it to play the entrance animation.
  //
  // Phase 11 (Back-Button & State-Audit merged plan, 11.3) — this now
  // returns a promise (toggleCondition's own, via useFavourites.js), so
  // ConfirmSheet's Phase-3 busy/failure handling reflects what actually
  // happened instead of assuming success. The snackbar/Undo option and the
  // exit animation still fire immediately, unchanged — the removal itself
  // is genuinely instant and unconditional (see useFavourites.js's own
  // comment on writeThrough) — only the promise this function returns
  // waits for the exit animation plus the real sync result, which is what
  // keeps the Confirm sheet open with a busy state for that same window.
  function handleConfirmRemoveCondition() {
    if (!confirmingCondition) return Promise.resolve()
    const id = confirmingCondition.id
    const index = favourites.conditions.indexOf(id)
    beginRowExit(id)
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        toggleCondition(id, { silent: true }).then(
          () => {
            endRowExit(id)
            // Bug fix (post-11.3): this used to fire synchronously at the
            // top of the handler, so the snackbar appeared well before
            // ConfirmSheet actually closed (it stays open through the exit
            // animation + real sync result). Moved here so it only shows
            // once removal has genuinely succeeded — right as the sheet is
            // about to close, not while it's still open.
            showSnack('Removed from favourites', {
              label: 'Undo',
              onAction: () => {
                restoreConditionAt(id, index)
                beginRowRestore(id)
              },
            })
            resolve()
          },
          (err) => { endRowExit(id); reject(err) }
        )
      }, ROW_EXIT_MS)
    })
  }

  // Drug removal — mirrors handleConfirmRemoveCondition's confirm → exit
  // animation → remove → Undo-to-position shape exactly (Favourites Screen
  // Refactor plan, Phase 11 / Decision 14): single-item drug removal used
  // to remove instantly with no animation; it now shares the same
  // beginRowExit/endRowExit infrastructure Conditions' single-item removal
  // already used, relying on the same rowNodeRefs registration the Drugs
  // render loop now does (Phase 5a) for bulk-remove.
  function handleConfirmRemoveDrug() {
    if (!confirmingDrug) return Promise.resolve()
    const id = confirmingDrug.id
    const index = favourites.drugs.indexOf(id)
    beginRowExit(id)
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        toggleDrug(id, { silent: true }).then(
          () => {
            endRowExit(id)
            showSnack('Removed from favourites', {
              label: 'Undo',
              onAction: () => {
                restoreDrugAt(id, index)
                beginRowRestore(id)
              },
            })
            resolve()
          },
          (err) => { endRowExit(id); reject(err) }
        )
      }, ROW_EXIT_MS)
    })
  }

  // Bulk removal (manage mode) — mirrors the single-item removal paths'
  // undo shape: capture each id's original index in the relevant source
  // array before removing any of them, then Undo restores every id at its
  // original index. Order matters here: indices are captured against the
  // pre-removal array, so restoring must happen lowest-index-first — each
  // restore splices into the array as it stands after the prior restores in
  // this same batch, and only ascending order reconstructs the original
  // array correctly (a descending or unsorted order would insert into
  // positions that have already shifted from earlier restores).
  //
  // Favourites Screen Refactor plan, Phase 5b — now branches on activeTab
  // (was Conditions-only) and plays the row-exit animation neither tab
  // previously had on bulk-remove (flagged correction, not silent scope
  // creep — see the plan's Decision 7). { silent: true } is kept on the
  // per-id toggle call below even though the plan's own snippet omitted
  // it — without it, the generic app-wide "Removed from Favourites" toast
  // would fire alongside this screen's own Snackbar+Undo, which is exactly
  // what handleConfirmRemoveCondition/handleConfirmRemoveDrug above already
  // avoid the same way.
  function handleConfirmBulkRemove() {
    const ids = Array.from(selectedIds)
    const isConditions = activeTab === 'conditions'
    const sourceIds  = isConditions ? favourites.conditions : favourites.drugs
    const toggleFn   = isConditions ? toggleCondition : toggleDrug
    const restoreFn  = isConditions ? restoreConditionAt : restoreDrugAt
    const restoreEntries = ids
      .map(id => ({ id, index: sourceIds.indexOf(id) }))
      .sort((a, b) => a.index - b.index)
    ids.forEach(id => beginRowExit(id))
    setTimeout(() => {
      ids.forEach(id => {
        toggleFn(id, { silent: true })
        endRowExit(id)
      })
    }, ROW_EXIT_MS)
    showSnack(`Removed ${ids.length} favourite${ids.length === 1 ? '' : 's'}`, {
      label: 'Undo',
      onAction: () => {
        restoreEntries.forEach(({ id, index }) => restoreFn(id, index))
      },
    })
    toggleManage()
  }

  // ── Tab switching (swipe restored) ──────────────────────────────────────────
  // tabDirection decides which side the incoming tab's CSS keyframe slides in
  // from; hasSwitchedRef guards against the animation playing on mount. Both
  // are driven by switchTab regardless of whether it's called from a tab-bar
  // tap or the swipe gesture below.
  const tabDirection = useRef(1) // +1 = forward (slide from right), -1 = backward (slide from left)
  const hasSwitchedRef = useRef(false)

  function switchTab(key) {
    if (key === activeTab) return
    // Favourites Screen Refactor plan, Decision 2 / Phase 5d — switching
    // tabs (tap OR swipe) cancels manage mode and clears selection, same
    // cleanup toggleManage's own exit branch already does for the Cancel
    // button, so both exit paths behave identically.
    if (isManaging) {
      setIsManaging(false)
      setSelectedIds(new Set())
    }
    const fromIndex = FAVOURITES_TABS.findIndex(t => t.key === activeTab)
    const toIndex   = FAVOURITES_TABS.findIndex(t => t.key === key)
    tabDirection.current = toIndex > fromIndex ? 1 : -1
    hasSwitchedRef.current = true
    setActiveTab(key)
  }

  // Swipe-to-switch-tabs gesture on the tab-content area. Same axis-lock
  // approach SwipeToRemoveRow used to use for its own rows (dx-vs-dy
  // dominance, decided once per gesture) — safe to reintroduce now that no
  // row underneath captures its own horizontal drag.
  const tabTouchStartX = useRef(null)
  const tabTouchStartY = useRef(null)
  const tabAxisLocked  = useRef(null) // 'x' | 'y' | null, decided once per gesture

  function handleTabTouchStart(e) {
    tabTouchStartX.current = e.touches[0].clientX
    tabTouchStartY.current = e.touches[0].clientY
    tabAxisLocked.current  = null
  }

  function handleTabTouchMove(e) {
    if (tabTouchStartX.current === null) return
    const dx = e.touches[0].clientX - tabTouchStartX.current
    const dy = e.touches[0].clientY - tabTouchStartY.current

    if (tabAxisLocked.current === null) {
      if (Math.abs(dx) < TAB_AXIS_LOCK_SLOP && Math.abs(dy) < TAB_AXIS_LOCK_SLOP) return
      tabAxisLocked.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    }
    if (tabAxisLocked.current !== 'x') return // vertical drag — let the page scroll

    e.preventDefault() // we own this gesture now
  }

  function handleTabTouchEnd(e) {
    if (tabTouchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - tabTouchStartX.current

    if (tabAxisLocked.current === 'x' && Math.abs(dx) > TAB_SWIPE_THRESHOLD) {
      const fromIndex = FAVOURITES_TABS.findIndex(t => t.key === activeTab)
      const toIndex   = dx < 0 ? fromIndex + 1 : fromIndex - 1 // swipe left = next tab
      if (toIndex >= 0 && toIndex < FAVOURITES_TABS.length) {
        switchTab(FAVOURITES_TABS[toIndex].key)
      }
    }

    tabTouchStartX.current = null
    tabTouchStartY.current = null
    tabAxisLocked.current  = null
  }

  // Favourites Screen Refactor plan, Phase 7 / Decision 13 — the swipe
  // wrapper below only spans its own rendered content, so a short/empty tab
  // leaves no swipeable area over the blank space beneath it. Measures the
  // wrapper's top offset against the visual viewport height, minus
  // BottomNav's fixed height, and applies that as a minHeight so the
  // swipeable area always fills down to the bottom-nav regardless of how
  // much content the active tab has. Recomputed on mount and on resize —
  // same window.visualViewport source ConditionsScreen's own
  // available-height math already uses, for consistency.
  const tabContentRef = useRef(null)
  const [tabContentMinHeight, setTabContentMinHeight] = useState(0)

  useEffect(() => {
    function computeMinHeight() {
      if (!tabContentRef.current) return
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      const top = tabContentRef.current.getBoundingClientRect().top
      setTabContentMinHeight(Math.max(0, viewportHeight - top - BOTTOM_NAV_HEIGHT))
    }
    computeMinHeight()
    window.addEventListener('resize', computeMinHeight)
    return () => window.removeEventListener('resize', computeMinHeight)
  }, [])

  // ── Sliding sticky header: visible once the hero leaves viewport ───────────
  // Same IntersectionObserver approach as ConditionsScreen's brandRowRef watch.
  const [showStickyHeader, setShowStickyHeader] = useState(false)
  const heroRef = useRef(null)

  useEffect(() => {
    const el = heroRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyHeader(!entry.isIntersecting)
      },
      { threshold: 0, rootMargin: '-1px 0px 0px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <>

      {/* Sliding sticky header — appears once FavouritesHero scrolls out of view */}
      <FavouritesStickyHeader
        visible={showStickyHeader}
        activeTab={activeTab}
        onSelectTab={switchTab}
        showManagerButton={true}
        hasActiveFilters={hasActiveFilters}
        onOpenManager={() => setShowManagerSheet(true)}
        counts={tabCounts}
        isSearching={isSearching}
        onToggleSearch={toggleSearch}
        searchValue={heroSearchValue}
        onSearchChange={heroSearchOnChange}
        searchPlaceholder={heroSearchPlaceholder}
      />

      {/* Local keyframes for the tab-switch transition — same technique as
          ConditionDetailScreen, distinct names to avoid any collision.
          Direction-aware slide+fade, only ever plays after a real switch
          (see hasSwitchedRef), never on mount/refresh. favSearchExpand
          (Phase 10) replaces favHeaderCrossfade on the search-side wrapper
          only — the title side keeps the original crossfade. The
          fav-search-micro / fav-sticky-search-height rules trim the shared
          SearchBar's placeholder/icon/left-padding and (sticky only) lock
          its input height to 32px, all via !important since SearchBar's own
          sizing is inline — SearchBar.jsx itself is untouched. */}
      <style>{`
        @keyframes favTabSlideFromRight {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes favTabSlideFromLeft {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes favHeaderCrossfade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes favSearchExpand {
          from { opacity: 0; transform: scaleX(0.85); }
          to   { opacity: 1; transform: scaleX(1); }
        }
        @keyframes favRowEnter {
          from { opacity: 0; max-height: 0; transform: translateY(-6px); }
          to   { opacity: 1; max-height: 120px; transform: translateY(0); }
        }
        .fav-search-micro input {
          padding-left: 34px !important;
          height: 40px !important;
        }
        .fav-search-micro input::placeholder {
          font-size: 12.5px;
        }
        .fav-search-micro svg {
          width: 14px !important;
          height: 14px !important;
          /* Leading icon (the Heart, via SearchBar's 'icon' prop) recolored
             to the favourites accent, filled (Lucide's default fill:none is
             untouched by the color property, so this only changes the
             stroke — see the Heart's own fill prop usage elsewhere for the
             filled variant). The rule below re-scopes the clear-text (X)
             button's icon back to its original neutral color, since this
             selector would otherwise catch it too. */
          color: var(--color-favourite) !important;
        }
        .fav-search-micro button svg {
          color: var(--color-text-tertiary) !important;
        }
        .fav-sticky-search-height input {
          height: 36px !important;
        }
      `}</style>

      <div>

        <FavouritesHero
          heroRef={heroRef}
          showManagerButton={true}
          hasActiveFilters={hasActiveFilters}
          onOpenManager={() => setShowManagerSheet(true)}
          isSearching={isSearching}
          onToggleSearch={toggleSearch}
          searchValue={heroSearchValue}
          onSearchChange={heroSearchOnChange}
          searchPlaceholder={heroSearchPlaceholder}
        />

        {/* Tab bar — chooses which collection (Conditions/Drugs) is being
            browsed. Search is icon-triggered from the header (see
            FavouritesHero/FavouritesStickyHeader) and now swaps in-place
            with the header title itself — no overlay panel here anymore. */}
        <div style={{ marginBottom: 8 }}>
          {renderTabs(activeTab, switchTab, tabCounts)}
        </div>

        {/* Tab content area — swipeable again (see handleTabTouch* above),
            plus tap via the tab bar. minHeight (Phase 7) keeps this
            swipeable over blank space on a short/empty tab. Keyed by
            activeTab so the slide animation replays on every real switch. */}
        <div
          ref={tabContentRef}
          onTouchStart={handleTabTouchStart}
          onTouchMove={handleTabTouchMove}
          onTouchEnd={handleTabTouchEnd}
          style={{ minHeight: tabContentMinHeight || undefined }}
        >
          <div
            key={activeTab}
            style={{
              animation: hasSwitchedRef.current
                ? `${tabDirection.current === 1 ? 'favTabSlideFromRight' : 'favTabSlideFromLeft'} 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)`
                : 'none',
            }}
          >
            {/* ── Conditions tab ── */}
            {activeTab === 'conditions' && (
              <>
                {conditionsAtCap && (
                  <div style={{ marginBottom: 'var(--space-3)' }}>
                    <ProUpsellBanner subtitle="Unlock unlimited favourites" />
                  </div>
                )}
                {activeSpecialty !== 'all' && savedConditions.length > 0 && (
                  <SpecialtyFilterBanner
                    specialty={activeSpecialtyObj}
                    count={conditionResults.length}
                    isOpen={showSpecialtySheet}
                    onOpenSpecialties={() => setShowSpecialtySheet(true)}
                    onClear={() => setActiveSpecialty('all')}
                  />
                )}
                {!conditionsEverLoaded ? (
                  Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => <SkeletonRow key={i} />)
                ) : savedConditions.length === 0
                  ? <NothingSavedEmptyState label="conditions" showSignIn={!user} />
                  : conditionSearchEmpty
                    ? <NoSearchResultsState query={conditionQuery} onClear={() => setConditionQuery('')} />
                    : (!isSearchingConditions && activeSpecialty !== 'all' && conditionResults.length === 0)
                      ? <SpecialtyEmptyState specialtyName={activeSpecialtyObj?.name} onClear={() => setActiveSpecialty('all')} />
                      : conditionResults.map((condition, i) => {
                        const card = (
                          <ConditionCard
                            key={condition.id}
                            condition={condition}
                            isLast={i === conditionResults.length - 1}
                            highlight={conditionQuery}
                            onTap={
                              isManaging
                                ? () => toggleSelectId(condition.id)
                                : () => navigate(`/conditions/${condition.slug}`)
                            }
                            trailing={
                              isManaging
                                ? (
                                    <span style={{
                                      // RowStarButton's total footprint is
                                      // 13px icon + 14px padding top/bottom = 41px.
                                      // This checkbox's icon is bigger (20px), so
                                      // matching that same 41px total requires
                                      // less padding here (10.5px, not 14px) —
                                      // the previous 14px padding + 20px icon
                                      // actually rendered at 48px, 7px taller,
                                      // which is what was visibly changing the
                                      // card row's height when manage mode
                                      // toggled on.
                                      padding:        '10.5px 8px',
                                      display:        'flex',       // so row height stays constant across modes
                                      alignItems:     'center',
                                      justifyContent: 'center',
                                    }}>
                                      {selectedIds.has(condition.id)
                                        ? <CheckCircle2 size={20} color="#fff" fill="var(--color-accent)" strokeWidth={2} />
                                        : <Circle size={20} color="var(--color-border)" strokeWidth={1.8} />}
                                    </span>
                                  )
                                : (
                                    <RowStarButton
                                      isFavourited
                                      onPress={() => setConfirmingCondition(condition)}
                                    />
                                  )
                            }
                          />
                        )
                        if (isManaging) return card

                        const exitState  = exitingRows.get(condition.id)
                        const isEntering = restoredConditionIds.has(condition.id)

                        return (
                          <div
                            key={condition.id}
                            ref={el => {
                              if (el) rowNodeRefs.current.set(condition.id, el)
                              else rowNodeRefs.current.delete(condition.id)
                            }}
                            style={exitState
                              ? {
                                  overflow:   'hidden',
                                  maxHeight:  exitState.collapsed ? 0 : exitState.height,
                                  opacity:    exitState.collapsed ? 0 : 1,
                                  transform:  exitState.collapsed ? 'scale(0.96)' : 'scale(1)',
                                  transition: `max-height ${ROW_EXIT_MS}ms cubic-bezier(0.4, 0, 1, 1), opacity ${ROW_EXIT_MS}ms ease, transform ${ROW_EXIT_MS}ms ease`,
                                }
                              : {
                                  overflow: 'hidden',
                                  animation: isEntering
                                    ? `favRowEnter ${ROW_ENTER_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`
                                    : undefined,
                                }
                            }
                          >
                            {card}
                          </div>
                        )
                      })}
              </>
            )}

            {/* ── Drugs tab ── */}
            {/* Favourites Screen Refactor plan, Phase 5/8/9/11 — brought up
                to the same level as Conditions: manage mode (bulk-select +
                remove, same row-exit animation), sort, search, and the
                redesigned empty states. Specialty filtering stays
                Conditions-only (out of scope, see FavouritesManagerSheet's
                showSpecialty prop) — that's the one deliberate asymmetry
                left between the two tabs. */}
            {activeTab === 'drugs' && (
              <>
                {drugsAtCap && (
                  <div style={{ marginBottom: 'var(--space-3)' }}>
                    <ProUpsellBanner subtitle="Unlock unlimited favourites" />
                  </div>
                )}
                {!drugsEverLoaded ? (
                  Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => <SkeletonRow key={i} />)
                ) : savedDrugs.length === 0
                ? <NothingSavedEmptyState label="drugs" showSignIn={!user} />
                : drugSearchEmpty
                  ? <NoSearchResultsState query={drugQuery} onClear={() => setDrugQuery('')} />
                  : drugSearchResults.map((drug, i) => {
                      const card = (
                        <SharedDrugCard
                          key={drug.id}
                          drug={drug}
                          categories={categories}
                          isDark={isDark}
                          isLast={i === drugSearchResults.length - 1}
                          onTap={
                            isManaging
                              ? () => toggleSelectId(drug.id)
                              : () => navigate(`/drugs/${drug.slug}`)
                          }
                          trailing={
                            isManaging
                              ? (
                                  <span style={{
                                    padding:        '10.5px 8px',
                                    display:        'flex',
                                    alignItems:     'center',
                                    justifyContent: 'center',
                                  }}>
                                    {selectedIds.has(drug.id)
                                      ? <CheckCircle2 size={20} color="#fff" fill="var(--color-accent)" strokeWidth={2} />
                                      : <Circle size={20} color="var(--color-border)" strokeWidth={1.8} />}
                                  </span>
                                )
                              : (
                                  <RowStarButton
                                    isFavourited
                                    onPress={() => setConfirmingDrug(drug)}
                                  />
                                )
                          }
                        />
                      )
                      if (isManaging) return card

                      const exitState  = exitingRows.get(drug.id)
                      const isEntering = restoredConditionIds.has(drug.id)

                      return (
                        <div
                          key={drug.id}
                          ref={el => {
                            if (el) rowNodeRefs.current.set(drug.id, el)
                            else rowNodeRefs.current.delete(drug.id)
                          }}
                          style={exitState
                            ? {
                                overflow:   'hidden',
                                maxHeight:  exitState.collapsed ? 0 : exitState.height,
                                opacity:    exitState.collapsed ? 0 : 1,
                                transform:  exitState.collapsed ? 'scale(0.96)' : 'scale(1)',
                                transition: `max-height ${ROW_EXIT_MS}ms cubic-bezier(0.4, 0, 1, 1), opacity ${ROW_EXIT_MS}ms ease, transform ${ROW_EXIT_MS}ms ease`,
                              }
                            : {
                                overflow: 'hidden',
                                animation: isEntering
                                  ? `favRowEnter ${ROW_ENTER_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`
                                  : undefined,
                              }
                          }
                        >
                          {card}
                        </div>
                      )
                    })}
              </>
            )}
          </div>
        </div>

      </div>

      {/* Back to top */}
      <BackToTopButton visible={showBackToTop} onClick={handleBackToTop} />

      {isManaging && (
        <ManageActionBar
          count={selectedIds.size}
          allSelected={
            activeTab === 'conditions'
              ? selectedIds.size === conditionResults.length
              : selectedIds.size === drugSearchResults.length
          }
          onToggleSelectAll={() => {
            const list = activeTab === 'conditions' ? conditionResults : drugSearchResults
            setSelectedIds(prev =>
              prev.size === list.length
                ? new Set()
                : new Set(list.map(x => x.id))
            )
          }}
          onRemove={() => setShowBulkConfirm(true)}
          onCancel={toggleManage}
        />
      )}

      <FavouritesManagerSheet
        isOpen={showManagerSheet}
        onClose={() => setShowManagerSheet(false)}
        sortMode={sortMode}
        sortLabels={FAV_SORT_LABELS}
        onSetSortMode={setSortMode}
        showSpecialty={activeTab === 'conditions'}
        activeSpecialtyObj={activeSpecialtyObj}
        onOpenSpecialties={() => setShowSpecialtySheet(true)}
        onClearSpecialty={() => setActiveSpecialty('all')}
        onManage={toggleManage}
        canManage={activeTab === 'conditions' ? savedConditions.length > 0 : savedDrugs.length > 0}
      />

      <SpecialtiesBottomSheet
        isOpen={showSpecialtySheet}
        specialties={specialties}
        activeSpecialty={activeSpecialty}
        onSelect={setActiveSpecialty}
        onClose={() => setShowSpecialtySheet(false)}
      />

      <ConfirmSheet
        isOpen={!!confirmingCondition}
        onClose={() => setConfirmingCondition(null)}
        onConfirm={handleConfirmRemoveCondition}
        title="Remove from favourites?"
        message={confirmingCondition ? `"${confirmingCondition.name}" will be removed from your favourites.` : ''}
        confirmLabel="Remove"
        destructive
      />

      <ConfirmSheet
        isOpen={!!confirmingDrug}
        onClose={() => setConfirmingDrug(null)}
        onConfirm={handleConfirmRemoveDrug}
        title="Remove from favourites?"
        message={confirmingDrug ? `"${confirmingDrug.tradenameClean}" will be removed from your favourites.` : ''}
        confirmLabel="Remove"
        destructive
      />

      <ConfirmSheet
        isOpen={showBulkConfirm}
        onClose={() => setShowBulkConfirm(false)}
        onConfirm={handleConfirmBulkRemove}
        title="Remove favourites?"
        message={`${selectedIds.size} favourite${selectedIds.size === 1 ? '' : 's'} will be removed from your saved ${activeTab === 'conditions' ? 'conditions' : 'drugs'}.`}
        confirmLabel="Remove"
        destructive
      />

      <Snackbar
        visible={snackVisible}
        message={snackMessage}
        actionLabel={snackAction?.label}
        onAction={snackAction ? handleSnackAction : undefined}
      />
    </>
  )
}