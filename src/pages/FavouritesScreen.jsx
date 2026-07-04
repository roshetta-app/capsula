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
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, BookOpen, Pill, SlidersHorizontal, Circle, CheckCircle2, Search, ArrowLeft, X } from 'lucide-react'
import Layout from '../components/layout'
import ConditionCard from '../components/ConditionCard'
import DrugCard from '../components/DrugCard'
import ConfirmSheet from '../components/ui/ConfirmSheet'
import SearchBar from '../components/ui/SearchBar'
import SpecialtiesBottomSheet from '../components/conditions/SpecialtiesBottomSheet'
import FavouritesManagerSheet from '../components/conditions/FavouritesManagerSheet'
import { useConditionContext } from '../context/ConditionContext'
import { useDrugContext } from '../context/DrugContext'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useStock } from '../hooks/useStock'
import { useConditionSearch } from '../hooks/useConditionSearch'
import { useSortToggle } from '../hooks/useSortToggle'

// Favourites' own identity color for badges/buttons/underline — not
// var(--color-accent) (that's the app's blue, used throughout Home/
// ConditionDetail). This is the exact hex RowStarButton already uses for a
// favourited star, so promoting it to this screen's accent reuses a meaning
// the app already teaches ("amber = saved"), rather than introducing an
// arbitrary new color.
const FAV_ACCENT = '#F59E0B'

// Sort labels for this screen's own useSortToggle instance (separate
// storage key from ConditionsScreen — see Phase 14 note below). 'recent'
// means "recently added to favourites" here, not "recently viewed", so it
// gets its own label rather than reusing useSortToggle's exported default.
const FAV_SORT_LABELS = {
  az:     'A – Z',
  recent: 'Recently added',
}

// Static tab order/labels/icons — no longer carries per-render count data, so
// this can live outside the component. Order matters: switchTab() below uses
// this array's index to figure out swipe/tap direction (forward vs backward).
// Icons represent content type (open book = reference material, pill =
// medication) rather than favourited-status, which a per-tab Star never
// actually conveyed since both tabs used the identical icon shape.
const FAVOURITES_TABS = [
  {
    key: 'conditions',
    label: 'Conditions',
    renderIcon: (color) => <BookOpen size={15} strokeWidth={1.8} color={color} />,
  },
  {
    key: 'drugs',
    label: 'Drugs',
    renderIcon: (color) => <Pill size={15} strokeWidth={1.8} color={color} />,
  },
]

// ─── Snackbar ─────────────────────────────────────────────────────────────────

function Snackbar({ visible, message }) {
  return (
    <div
      aria-live="polite"
      style={{
        position:        'fixed',
        bottom:          80,           // above bottom nav
        left:            '50%',
        transform:       `translateX(-50%) translateY(${visible ? 0 : 12}px)`,
        opacity:         visible ? 1 : 0,
        transition:      'opacity 0.2s ease, transform 0.2s ease',
        backgroundColor: 'var(--color-text-primary)',
        color:           'var(--color-bg)',
        fontSize:        13,
        fontWeight:      500,
        padding:         '8px 18px',
        borderRadius:    'var(--radius-full)',
        boxShadow:       'var(--shadow-elevated)',
        whiteSpace:      'nowrap',
        pointerEvents:   'none',
        zIndex:          9999,
      }}
    >
      {message}
    </div>
  )
}

// ─── Manage-mode bulk action bar ─────────────────────────────────────────────
// Now rendered for the full duration of manage mode (not just once something
// is selected) so there's always an inline way out — previously, entering
// manage mode with nothing selected left no visible bar and no way to leave
// it without reopening FavouritesManagerSheet and tapping its toggle again.
// Cancel is an icon-button (matches the sheet's own close-X pattern) rather
// than a text link, so it reads as a distinct dismiss action instead of
// competing with "Select all" for attention — count and Select all are
// grouped together with a middle dot since they're both about the current
// selection, while Remove stays anchored on its own at the far right as the
// one destructive action in the bar.

function ManageActionBar({ count, allSelected, onToggleSelectAll, onRemove, onCancel }) {
  return (
    <div style={{
      position:        'fixed',
      left:            0,
      right:           0,
      bottom:          80,
      zIndex:          60,
      display:         'flex',
      justifyContent:  'center',
      pointerEvents:   'none',
    }}>
      <div style={{
        pointerEvents:   'auto',
        width:           'calc(100% - var(--space-6) * 2)',
        maxWidth:        680 - 48,
        backgroundColor: 'var(--color-surface)',
        borderRadius:    'var(--radius-lg)',
        boxShadow:       '0 8px 24px rgba(0, 0, 0, 0.14)',
        padding:         '10px 14px',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        gap:             10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button
            onClick={onCancel}
            aria-label="Cancel selection"
            style={{
              display:                 'flex',
              alignItems:              'center',
              justifyContent:          'center',
              flexShrink:              0,
              width:                   28,
              height:                  28,
              borderRadius:            '50%',
              border:                  'none',
              backgroundColor:         'var(--color-border-subtle)',
              cursor:                  'pointer',
              outline:                 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <X size={15} strokeWidth={2} color="var(--color-text-secondary)" aria-hidden="true" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{
              fontSize:   13,
              fontWeight: 600,
              color:      'var(--color-text-primary)',
              whiteSpace: 'nowrap',
            }}>
              {count} selected
            </span>
            <span aria-hidden="true" style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>·</span>
            <button
              onClick={onToggleSelectAll}
              style={{
                background:     'none',
                border:         'none',
                cursor:         'pointer',
                fontSize:       13,
                color:          FAV_ACCENT,
                fontFamily:     'var(--font-body)',
                padding:        0,
                whiteSpace:     'nowrap',
                textDecoration: 'underline',
              }}
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>
        </div>
        {count > 0 && (
          <button
            onClick={onRemove}
            style={{
              padding:         '8px 16px',
              borderRadius:    'var(--radius-full)',
              border:          'none',
              backgroundColor: 'var(--color-danger)',
              color:           '#fff',
              fontSize:        13,
              fontWeight:      600,
              fontFamily:      'var(--font-body)',
              cursor:          'pointer',
              flexShrink:      0,
            }}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Empty state: nothing saved yet ─────────────────────────────────────────
// Replaces the old generic "No saved X yet" text block. Accent-tinted
// circular icon background, short body copy, verb-first CTA to go save
// something. Shared between both tabs — only the label/destination differ.

function NothingSavedEmptyState({ label }) {
  const navigate = useNavigate()
  const isConditions = label === 'conditions'

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      textAlign:     'center',
      padding:       'var(--space-12) var(--space-4)',
      gap:           'var(--space-3)',
    }}>
      <div style={{
        width:           64,
        height:          64,
        borderRadius:    '50%',
        backgroundColor: 'var(--color-accent-light)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
      }}>
        <Star size={28} strokeWidth={1.5} style={{ color: 'var(--color-accent)' }} />
      </div>

      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
        Nothing saved yet
      </div>

      <div style={{
        fontSize:   13,
        color:      'var(--color-text-tertiary)',
        lineHeight: 1.5,
        maxWidth:   240,
      }}>
        {isConditions
          ? 'Save conditions you want to find quickly later.'
          : 'Save drugs you want to find quickly later.'}
      </div>

      <button
        onClick={() => navigate(isConditions ? '/conditions' : '/drugs')}
        style={{
          marginTop:       4,
          padding:         '10px 20px',
          borderRadius:    'var(--radius-full)',
          border:          'none',
          backgroundColor: 'var(--color-accent)',
          color:           '#fff',
          fontSize:        13,
          fontWeight:      600,
          fontFamily:      'var(--font-body)',
          cursor:          'pointer',
        }}
      >
        {isConditions ? 'Browse conditions' : 'Browse drugs'}
      </button>
    </div>
  )
}

// ─── Empty state: search matched nothing ────────────────────────────────────
// Distinct from NothingSavedEmptyState — the user DOES have favourites,
// their search just didn't match any of them. Simpler, no browse CTA.

function NoSearchResultsState({ query, onClear }) {
  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      textAlign:     'center',
      padding:       'var(--space-12) var(--space-4)',
      gap:           'var(--space-2)',
    }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
        No results for "{query}"
      </div>
      <button
        onClick={onClear}
        style={{
          fontSize:       13,
          color:          'var(--color-accent)',
          background:     'none',
          border:         'none',
          cursor:         'pointer',
          textDecoration: 'underline',
          fontFamily:     'var(--font-body)',
          padding:        '4px 0',
        }}
      >
        Clear search
      </button>
    </div>
  )
}

// ─── Empty state: specialty filter matched nothing ──────────────────────────
// Distinct from both states above — the user has favourites and isn't
// searching by text, but the active specialty filter (set via
// FavouritesManagerSheet) doesn't match any of their saved conditions.
// Previously this case fell through to an empty .map() and rendered a
// blank list with no explanation or way out.

function SpecialtyEmptyState({ specialtyName, onClear }) {
  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      textAlign:     'center',
      padding:       'var(--space-12) var(--space-4)',
      gap:           'var(--space-2)',
    }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
        No saved conditions{specialtyName ? ` in ${specialtyName}` : ''}
      </div>
      <button
        onClick={onClear}
        style={{
          fontSize:       13,
          color:          'var(--color-accent)',
          background:     'none',
          border:         'none',
          cursor:         'pointer',
          textDecoration: 'underline',
          fontFamily:     'var(--font-body)',
          padding:        '4px 0',
        }}
      >
        Clear filter
      </button>
    </div>
  )
}

// ─── Row star button ────────────────────────────────────────────────────────
// Local (not InlineStarButton) so it can open a confirm step instead of
// toggling immediately on tap. Rendered into ConditionCard's trailing slot,
// so it sits right before the chevron and shares its vertical centering.
// Icon shrunk 16→13px (Phase 2M) — integrated row action, not a floating
// decoration. Tap target stays 44px via the button's own padding.

function RowStarButton({ onPress }) {
  function handleTap(e) {
    e.stopPropagation()
    onPress()
  }

  return (
    <button
      onClick={handleTap}
      aria-label="Remove from favourites"
      style={{
        background:              'none',
        border:                  'none',
        cursor:                  'pointer',
        padding:                 '14px 8px',   // 44px tap height
        display:                 'flex',
        alignItems:              'center',
        justifyContent:          'center',
        flexShrink:              0,
        WebkitTapHighlightColor: 'transparent',
        outline:                 'none',
        color:                   '#F59E0B',
      }}
    >
      <Star size={13} fill="#F59E0B" strokeWidth={1.8} />
    </button>
  )
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────
// Shared between the in-page tab row and the sticky header's copy, so the two
// never visually diverge. Pure render function of (activeTab, onSelect).
// Phase 3 — rebuilt to structurally match ConditionDetailScreen's
// Treatment/Clinical tabs: full-width 50/50 cells (flex: 1, width: 100%
// button) instead of content-sized columns, no count badge.
// Phase 4 — content-type icons (BookOpen/Pill, via FAVOURITES_TABS.renderIcon)
// replace the Star fill-toggle — fixed 50px tap height (within 48–52dp target,
// vs the previous 10px-padding-derived height), larger icon/label, wider
// icon-label gap, fully-rounded thicker underline for true "rounded ends."
// Active: semibold + accent blue. Inactive: medium weight (500) + secondary gray.
// Phase 10 — count badge rebuilt from de-emphasized plain text into a small
// rounded pill (accent-filled when active, neutral track otherwise), matching
// the treatment already used for the sticky/expanded header's own badges.

function renderTabs(activeTab, onSelect, counts) {
  return (
    <div style={{ display: 'flex' }}>
      {FAVOURITES_TABS.map(tab => {
        const isActive = activeTab === tab.key
        const fg = isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)'
        const count = counts ? counts[tab.key] : undefined

        return (
          <div
            key={tab.key}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <button
              onClick={() => onSelect(tab.key)}
              style={{
                display:        'flex',
                flexDirection:  'row',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            10,
                height:         50,
                paddingLeft:    'var(--space-2)',
                paddingRight:   'var(--space-2)',
                width:          '100%',
                border:         'none',
                background:     'none',
                cursor:         'pointer',
                fontFamily:     'var(--font-body)',
                WebkitTapHighlightColor: 'transparent',
                outline:        'none',
                transition:     'color 0.15s ease',
              }}
            >
              {tab.renderIcon(fg)}
              <span style={{ fontSize: 14, fontWeight: isActive ? 700 : 500, color: fg }}>
                {tab.label}
              </span>
              {typeof count === 'number' && (
                <span style={{
                  fontSize:   11,
                  fontWeight: 600,
                  color:      'var(--color-text-secondary)',
                  lineHeight: 1.4,
                }}>
                  {count}
                </span>
              )}
            </button>
            {/* Underline — full width of this 50% cell, exactly matching the
                active tab's rendered width; rounded ends; visible only
                beneath the active tab. marginTop trimmed 3→2 per request to
                tighten the label-to-indicator gap in both headers (shared
                via this one function). NOTE: this spec was previously kept
                pixel-identical to ConditionDetailScreen's DetailHeader
                underline by explicit prior decision — that file wasn't part
                of this task's context, so it's now out of sync with this
                2px value until/unless it's updated to match. */}
            <span style={{
              display:         'block',
              height:          2,
              width:           '100%',
              marginTop:       2,
              borderRadius:    'var(--radius-full)',
              backgroundColor: isActive ? 'var(--color-accent)' : 'transparent',
              transition:      'background-color 0.15s ease',
            }} />
          </div>
        )
      })}
    </div>
  )
}

// ─── Hero: title + subtitle ─────────────────────────────────────────────────
// Phase 2M — logo removed (title-first hierarchy, per spec: Favourites
// prioritizes content/page identity over branding — logo stays reserved
// for Home).
// Phase 3 — SearchBar moved out of the hero and now renders below the tabs
// (see FavouritesScreen's return): tabs choose the collection, search filters
// within it. Hero is title + subtitle only.
// Phase 4 — small filled Star icon added beside the title as a visual
// anchor/identity marker (distinguishes this screen from ConditionsScreen at
// a glance, per the "header identity" requirement) — same treatment mirrored
// in StickyFavouritesHeader below. Vertical rhythm tightened: paddingBottom
// 8→6, subtitle marginBottom 6→5.
// Phase 10 — panel background moved from the blue accent-light tint to
// var(--color-surface) with a hairline boxShadow, matching the sticky
// header's own white-shelf treatment (see file header Phase 10 note). Action
// buttons: search-toggle grows 36→44 while searching; both buttons' idle
// background moves from var(--color-surface) to var(--color-accent-light);
// active search-button background moves from FAV_ACCENT to
// var(--color-accent). Search wrapper's crossfade swapped for the new
// favSearchExpand keyframe and given the fav-search-micro scoped class (see
// local <style> block in FavouritesScreen below).

function FavouritesHero({ heroRef, showManagerButton, hasActiveFilters, onOpenManager, isSearching, onToggleSearch, searchValue, onSearchChange, searchPlaceholder }) {
  return (
    <div ref={heroRef} style={{
      backgroundColor: 'var(--color-surface)',
      borderRadius:    16,
      padding:         '14px 14px 14px',
      marginTop:       'var(--space-4)',
      // Diffused, soft-blur shadow — previous 0 1px 2px hairline read as
      // nearly flush with the page background and needed more definition.
      // Larger blur radius + low spread keeps it soft rather than a hard
      // drop shadow. Offset/opacity trimmed further (8px→4px, 0.06→0.045)
      // so the card still lifts off the page without reading as heavy.
      boxShadow:       '0 4px 16px rgba(0, 0, 0, 0.045)',
    }}>
      {/* Single lockup: badge icon on the left, centered against the combined
          title+subtitle stack (not against the title alone) — one cohesive
          unit rather than icon+title as one row and subtitle as a separate
          block underneath. Manage toggle sits on the right, filling the
          same visual slot Home's dark-mode toggle occupies.
          When isSearching, the title/subtitle stack is replaced in-place by
          the SearchBar (favSearchExpand via key, see the local <style>
          block); the badge hides (frees full width for the input,
          keeps the placeholder legible) and manage hides too, so only the
          search icon flips to ArrowLeft while the input is showing.
          height: 44 (not minHeight) is a hard lock matching SearchBar's own
          compact height exactly. minHeight alone wasn't enough — the title/
          subtitle text had no explicit lineHeight, so it rendered at the
          font's default line-height (taller than 44px), while the search
          state is pinned exactly at 44px; toggling between them still
          visibly shrank the row. Title/subtitle sizes below are trimmed and
          given explicit lineHeight so their natural stack actually fits
          under 44px instead of overflowing it, and so their visual weight
          better matches the 38px badge / 36px buttons beside them. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, height: 44 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          {!isSearching && (
            <div style={{
              width:           38,
              height:          38,
              borderRadius:    '50%',
              backgroundColor: FAV_ACCENT,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              flexShrink:      0,
            }}>
              <Star size={18} fill="#fff" color="#fff" strokeWidth={0} />
            </div>
          )}
          {isSearching
            ? (
                <div
                  key="search"
                  className="fav-search-micro"
                  style={{
                    flex:            1,
                    minWidth:        0,
                    animation:       'favSearchExpand 0.2s ease',
                    transformOrigin: 'left center',
                  }}
                >
                  <SearchBar
                    value={searchValue}
                    onChange={onSearchChange}
                    placeholder={searchPlaceholder}
                    icon={Star}
                    compact
                  />
                </div>
              )
            : (
                <div key="title" style={{ minWidth: 0, animation: 'favHeaderCrossfade 0.2s ease' }}>
                  <h1 style={{
                    fontSize:      19,
                    lineHeight:    1.15,
                    fontWeight:    700,
                    color:         'var(--color-text-primary)',
                    margin:        0,
                    letterSpacing: '-0.2px',
                  }}>
                    Favourites
                  </h1>
                  <div style={{
                    fontSize:   12,
                    lineHeight: 1.2,
                    color:      'var(--color-text-tertiary)',
                    marginTop:  1,
                  }}>
                    Your saved references
                  </div>
                </div>
              )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={onToggleSearch}
            aria-label={isSearching ? 'Close search' : 'Search favourites'}
            style={{
              width:                   isSearching ? 40 : 36,
              height:                  isSearching ? 40 : 36,
              borderRadius:            '50%',
              border:                  'none',
              backgroundColor:         isSearching ? 'var(--color-accent)' : 'transparent',
              display:                 'flex',
              alignItems:              'center',
              justifyContent:          'center',
              flexShrink:              0,
              cursor:                  'pointer',
              WebkitTapHighlightColor: 'transparent',
              outline:                 'none',
              transition:              'width 0.2s ease, height 0.2s ease, background-color 0.15s ease',
            }}
          >
            {isSearching
              ? <ArrowLeft size={17} color="#fff" strokeWidth={2} />
              : <Search size={17} color="var(--color-text-secondary)" strokeWidth={2.2} />}
          </button>

          {showManagerButton && !isSearching && (
            <button
              onClick={onOpenManager}
              aria-label="Sort, filter, and manage favourites"
              style={{
                position:                'relative',
                width:                   36,
                height:                  36,
                borderRadius:            '50%',
                border:                  'none',
                backgroundColor:         'transparent',
                display:                 'flex',
                alignItems:              'center',
                justifyContent:          'center',
                flexShrink:              0,
                cursor:                  'pointer',
                WebkitTapHighlightColor: 'transparent',
                outline:                 'none',
              }}
            >
              <SlidersHorizontal size={17} color="var(--color-text-secondary)" strokeWidth={2.2} />
              {hasActiveFilters && (
                <span aria-hidden="true" style={{
                  position:        'absolute',
                  top:             6,
                  right:           6,
                  width:           7,
                  height:          7,
                  borderRadius:    '50%',
                  backgroundColor: 'var(--color-accent)',
                }} />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sliding sticky header ──────────────────────────────────────────────────
// Appears once FavouritesHero scrolls out of view. Visual shell
// (position/zIndex/shadow/border-radius/transition) matches ConditionsScreen's
// StickyLogoHeader; Phase 2M replaces the logo row with a plain "Favourites"
// text label (no logo, no back arrow — Favourites is a bottom-nav tab, there's
// no "back" destination that makes sense here). Internal padding tightened.
// Phase 4 — carries the same leading Star icon as the expanded hero (scaled
// down) so the collapsed state reads as an intentionally-designed compact
// header, not a cropped one. Still icon + title + tabs only — no subtitle,
// no search, per spec.
// Phase 10 — panel given an explicit white backgroundColor + hairline
// boxShadow (was the heavier 0 4px 12px shadow). Title row grown 44→48
// (padding-top 14→16) for breathing room around the badge/buttons, clawed
// back partially via the tab-row's bottom padding (10→9) and a 1px badge
// trim (26→25) so the panel doesn't grow by the full 4px. Search-toggle
// button stays 28px idle and only grows to 32px while isSearching, wrapped
// together with the compact SearchBar in the fav-search-micro /
// fav-sticky-search-height scoped classes (see FavouritesScreen's local
// <style> block) so the input's own height matches the expanded button.

function StickyFavouritesHeader({ visible, activeTab, onSelectTab, showManagerButton, hasActiveFilters, onOpenManager, counts, isSearching, onToggleSearch, searchValue, onSearchChange, searchPlaceholder }) {
  return (
    <div
      aria-hidden="true"
      className="fav-sticky-header"
      style={{
        position:                'fixed',
        top:                     0,
        left:                    0,
        right:                   0,
        zIndex:                  50,
        backgroundColor:         'var(--color-surface)',
        borderBottomLeftRadius:  18,
        borderBottomRightRadius: 18,
        boxShadow:               '0 4px 12px rgba(0, 0, 0, 0.06)',
        transform:               visible ? 'translateY(0)' : 'translateY(-100%)',
        transition:              'transform 0.25s ease',
        pointerEvents:           visible ? 'auto' : 'none',
      }}
    >
      <div style={{ width: '100%', maxWidth: 680, margin: '0 auto' }}>

        {/* Title row — badge icon + text on the left, manage toggle on the
            right, same lockup as the expanded hero at a smaller scale.
            When isSearching, the title text is replaced in-place by the
            SearchBar (favSearchExpand via key); the badge hides and manage
            hides too, same treatment as the hero.
            boxSizing: 'border-box' + height: 44 (not minHeight) hard-locks
            this row to a fixed, PADDING-INCLUSIVE size. Previous version set
            height:48 alongside paddingTop:16 with no boxSizing — content-box
            default meant those stacked (48 + 16 = 64px actual rendered
            height), which was the real source of the "too much whitespace /
            header too tall" report, on top of the tabs row's own generous
            margins below. 44px border-box, 8px top padding, gives a 36px
            content area — exactly enough for the searching-state back
            button / SearchBar (36px, see fav-sticky-search-height) with no
            clipping, while idle content (28px badge, 32px buttons) sits
            centered within it. */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            8,
          padding:        '8px var(--space-6) 0',
          height:         44,
          boxSizing:      'border-box',
          marginTop:      5,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            {!isSearching && (
              <div style={{
                width:           28,
                height:          28,
                borderRadius:    '50%',
                backgroundColor: FAV_ACCENT,
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                flexShrink:      0,
              }}>
                <Star size={15} fill="#fff" color="#fff" strokeWidth={0} />
              </div>
            )}
            {isSearching
              ? (
                  <div
                    key="search"
                    className="fav-search-micro fav-sticky-search-height"
                    style={{
                      flex:            1,
                      minWidth:        0,
                      animation:       'favSearchExpand 0.2s ease',
                      transformOrigin: 'left center',
                    }}
                  >
                    <SearchBar
                      value={searchValue}
                      onChange={onSearchChange}
                      placeholder={searchPlaceholder}
                      icon={Star}
                      compact
                    />
                  </div>
                )
              : (
                  <div
                    key="title"
                    style={{
                      fontSize:      18,
                      fontWeight:    700,
                      color:         'var(--color-text-primary)',
                      letterSpacing: '-0.2px',
                      minWidth:      0,
                      animation:     'favHeaderCrossfade 0.2s ease',
                    }}
                  >
                    Favourites
                  </div>
                )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button
              onClick={onToggleSearch}
              aria-label={isSearching ? 'Close search' : 'Search favourites'}
              style={{
                width:                   isSearching ? 36 : 32,
                height:                  isSearching ? 36 : 32,
                borderRadius:            '50%',
                border:                  'none',
                backgroundColor:         isSearching ? 'var(--color-accent)' : 'var(--color-surface)',
                display:                 'flex',
                alignItems:              'center',
                justifyContent:          'center',
                flexShrink:              0,
                cursor:                  'pointer',
                WebkitTapHighlightColor: 'transparent',
                outline:                 'none',
                transition:              'width 0.2s ease, height 0.2s ease',
              }}
            >
              {isSearching
                ? <ArrowLeft size={17} color="#fff" strokeWidth={2.2} />
                : <Search size={17} color="var(--color-text-primary)" strokeWidth={2.2} />}
            </button>

            {showManagerButton && !isSearching && (
              <button
                onClick={onOpenManager}
                aria-label="Sort, filter, and manage favourites"
                style={{
                  position:                'relative',
                  width:                   32,
                  height:                  32,
                  borderRadius:            '50%',
                  border:                  'none',
                  backgroundColor:         'var(--color-surface)',
                  display:                 'flex',
                  alignItems:              'center',
                  justifyContent:          'center',
                  flexShrink:              0,
                  cursor:                  'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  outline:                 'none',
                }}
              >
                <SlidersHorizontal size={17} color="var(--color-text-primary)" strokeWidth={2.2} />
                {hasActiveFilters && (
                  <span aria-hidden="true" style={{
                    position:        'absolute',
                    top:             5,
                    right:           5,
                    width:           7,
                    height:          7,
                    borderRadius:    '50%',
                    backgroundColor: 'var(--color-accent)',
                  }} />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Tabs — same content as the in-page row, kept in sync via renderTabs.
            No longer needs position: relative — the search input now swaps
            in-place with the title above instead of overlaying below the
            tabs. Spacing redistributed (not just trimmed) per request to add
            breathing room above the title row without growing the panel:
            marginTop 3→0 and bottom padding 5→3 here exactly offset the
            +5px marginTop added to the title row above, so total sticky-
            header height is unchanged. The 50px tab button height itself
            (inside renderTabs) is untouched — it's intentionally kept
            pixel-identical to ConditionDetailScreen's DetailHeader tabs (see
            renderTabs comment), so the wrapper's own margin/padding are the
            only levers available here. */}
        <div style={{
          marginTop: 0,
          padding:   '0 var(--space-6) 3px',
        }}>
          {renderTabs(activeTab, onSelectTab, counts)}
        </div>

      </div>
    </div>
  )
}

// ─── FavouritesScreen ─────────────────────────────────────────────────────────

export default function FavouritesScreen() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('conditions')

  // Snackbar state — message is now dynamic (bulk-remove needs a count-aware
  // string; single-item remove keeps its original fixed message).
  const [snackVisible, setSnackVisible] = useState(false)
  const [snackMessage, setSnackMessage] = useState('')
  const snackTimer = useRef(null)

  function showSnack(message) {
    if (snackTimer.current) clearTimeout(snackTimer.current)
    setSnackMessage(message)
    setSnackVisible(true)
    snackTimer.current = setTimeout(() => setSnackVisible(false), 2000)
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

  // ── Manage mode (Conditions tab only — Drugs is deferred, see file header
  // Phase 6 note below) ───────────────────────────────────────────────────
  const [isManaging, setIsManaging] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())

  // Entering manage mode pushes a throwaway history entry (same URL, no
  // navigation) so the phone's back gesture/button has something of ours to
  // consume first — without this, back would leave the whole screen instead
  // of just closing the selector, which isn't what a bottom-sheet-adjacent
  // control should do. Popping that entry (whether via toggleManage's own
  // exit branch or a real back gesture) fires 'popstate', and this listener
  // is the single place that actually closes manage mode — so both exit
  // paths behave identically.
  useEffect(() => {
    function handlePopState() {
      setIsManaging(false)
      setSelectedIds(new Set())
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function toggleManage() {
    if (isManaging) {
      // Exiting — if we're still sitting on the history entry pushed below,
      // pop it via back() so the stack stays balanced; handlePopState above
      // does the actual state cleanup. Otherwise (entry already consumed by
      // a real back-gesture) just close directly.
      if (window.history.state?.favouritesManaging) {
        window.history.back()
      } else {
        setIsManaging(false)
        setSelectedIds(new Set())
      }
    } else {
      window.history.pushState({ favouritesManaging: true }, '')
      setIsManaging(true)
    }
  }

  function toggleSelectCondition(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Manager sheet (sort + specialty + manage entry point) — Conditions
  // tab only, same scope as manage mode above. The specialty sheet is a
  // separate piece of state so the two never render stacked/simultaneously —
  // opening one always closes the other first (see handlers below).
  const [showManagerSheet, setShowManagerSheet] = useState(false)
  const [showSpecialtySheet, setShowSpecialtySheet] = useState(false)

  const [showBulkConfirm, setShowBulkConfirm] = useState(false)

  function handleConfirmBulkRemove() {
    const ids = Array.from(selectedIds)
    ids.forEach(id => toggleCondition(id))
    showSnack(`Removed ${ids.length} favourite${ids.length === 1 ? '' : 's'}`)
    toggleManage()
  }

  const { favourites, toggleDrug, toggleCondition } = useFavouritesContext()
  const { conditions, specialties } = useConditionContext()
  const { drugs }      = useDrugContext()
  const { stockMap }   = useStock(drugs)

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

  // Sort (Phase 14) — own storage key ('capsula_favourites_sort'), separate
  // from ConditionsScreen's 'capsula_conditions_sort' key, since 'recent'
  // means a different thing on each screen (viewed vs added). Defaults to
  // 'recent' here per explicit product decision, vs ConditionsScreen's 'az'.
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

  // Conditions-tab search — scoped to the user's saved conditions only (not
  // the full catalog). Own query state, independent of any other search on
  // the app. Drugs-tab search is deferred this session (see file header).
  // sortMode/recentlyAddedOrder (Phase 14) feed the hook's existing sort
  // step; activeSpecialty/setActiveSpecialty feed its existing specialty
  // filter step — both were already built into useConditionSearch, just
  // unused by this screen until now.
  const {
    query:   conditionQuery,
    setQuery: setConditionQuery,
    activeSpecialty,
    setActiveSpecialty,
    results: conditionResults,
  } = useConditionSearch(savedConditions, sortMode, recentlyAddedOrder)

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

  // Drugs-tab search box — placeholder only (Phase 2N). Local, unwired state
  // just so the input is controlled/typeable. Do NOT connect this to
  // filtering, a search hook, or ConditionCard/DrugCard's highlight prop —
  // that wiring is deferred to a future session (see file header, decision
  // #19 follow-up).
  const [drugQuery, setDrugQuery] = useState('')

  // Hero search box swaps value/handler/placeholder based on the active tab.
  const heroSearchValue = activeTab === 'conditions' ? conditionQuery : drugQuery
  const heroSearchOnChange = activeTab === 'conditions' ? setConditionQuery : setDrugQuery
  const heroSearchPlaceholder = activeTab === 'conditions'
    ? 'Search favourite conditions…'
    : 'Search favourite drugs…'

  // Wrapper that also triggers the snackbar (called on remove = already favourited)
  const handleRemoveDrug = useCallback((id) => {
    toggleDrug(id)
    showSnack('Removed from favourites')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggleDrug])

  // Condition removal confirms first — see ConfirmSheet below.
  const [confirmingCondition, setConfirmingCondition] = useState(null)

  function handleConfirmRemoveCondition() {
    if (!confirmingCondition) return
    toggleCondition(confirmingCondition.id)
    showSnack('Removed from favourites')
  }

  // ── Tab switching + swipe (Phase 3) ─────────────────────────────────────────
  // Ports ConditionDetailScreen's exact swipe mechanism: touch-threshold
  // detection (not continuous finger-tracked dragging), a direction ref so
  // the incoming tab's CSS keyframe slides in from the correct side, and a
  // "has switched yet" guard so the animation never plays on mount/refresh.
  // Deliberately NOT ported: ConditionDetailScreen's internal fixed-height
  // scroll box + per-tab scrollTop memory — see file header Phase 3 note.
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const tabDirection = useRef(1) // +1 = forward (slide from right), -1 = backward (slide from left)
  const hasSwitchedRef = useRef(false)

  function switchTab(key) {
    if (key === activeTab) return
    const fromIndex = FAVOURITES_TABS.findIndex(t => t.key === activeTab)
    const toIndex   = FAVOURITES_TABS.findIndex(t => t.key === key)
    tabDirection.current = toIndex > fromIndex ? 1 : -1
    hasSwitchedRef.current = true
    setActiveTab(key)
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0 && activeTab === 'conditions') switchTab('drugs')
      if (dx > 0 && activeTab === 'drugs')      switchTab('conditions')
    }
    touchStartX.current = null
    touchStartY.current = null
  }

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
    <Layout>

      {/* Sliding sticky header — appears once FavouritesHero scrolls out of view */}
      <StickyFavouritesHeader
        visible={showStickyHeader}
        activeTab={activeTab}
        onSelectTab={switchTab}
        showManagerButton={activeTab === 'conditions' && savedConditions.length > 0}
        hasActiveFilters={hasActiveFilters}
        onOpenManager={() => setShowManagerSheet(true)}
        counts={{ conditions: savedConditions.length, drugs: savedDrugs.length }}
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
          /* Leading icon (the Star, via SearchBar's 'icon' prop) recolored
             amber/yellow, outlined (Lucide's default fill:none is untouched,
             so this only changes the stroke color). The rule below re-scopes
             the clear-text (X) button's icon back to its original neutral
             color, since this selector would otherwise catch it too. */
          color: #F59E0B !important;
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
          showManagerButton={activeTab === 'conditions' && savedConditions.length > 0}
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
            FavouritesHero/StickyFavouritesHeader) and now swaps in-place
            with the header title itself — no overlay panel here anymore. */}
        <div style={{ marginBottom: 8 }}>
          {renderTabs(activeTab, switchTab, { conditions: savedConditions.length, drugs: savedDrugs.length })}
        </div>

        {/* Swipeable content area — tap OR swipe switches tabs, mirroring
            ConditionDetailScreen's Treatment/Clinical interaction. Keyed by
            activeTab so the slide animation replays on every real switch. */}
        <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
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
              savedConditions.length === 0
                ? <NothingSavedEmptyState label="conditions" />
                : conditionSearchEmpty
                  ? <NoSearchResultsState query={conditionQuery} onClear={() => setConditionQuery('')} />
                  : (!isSearchingConditions && activeSpecialty !== 'all' && conditionResults.length === 0)
                    ? <SpecialtyEmptyState specialtyName={activeSpecialtyObj?.name} onClear={() => setActiveSpecialty('all')} />
                    : conditionResults.map((condition, i) => (
                      <ConditionCard
                        key={condition.id}
                        condition={condition}
                        isLast={i === conditionResults.length - 1}
                        highlight={conditionQuery}
                        onTap={
                          isManaging
                            ? () => toggleSelectCondition(condition.id)
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
                                  onPress={() => setConfirmingCondition(condition)}
                                />
                              )
                        }
                      />
                    ))
            )}

            {/* ── Drugs tab ── */}
            {/* Phase 6 — manage mode is Conditions-only this session (explicit
                decision, deferred): DrugCard has no trailing/selection slot,
                and this screen's Drugs tab has no per-row remove control at
                all yet (see Phase 2M note above). Rows here render exactly
                as before regardless of isManaging — no checkboxes, no
                selection, nothing wired. Revisit once the Drugs screen/card
                rework lands. */}
            {activeTab === 'drugs' && (
              savedDrugs.length === 0
                ? <NothingSavedEmptyState label="drugs" />
                : savedDrugs.map(drug => (
                    <DrugCard
                      key={drug.id}
                      drug={drug}
                      isInStock={stockMap[drug.id] ?? drug.inStock}
                      onTap={() => navigate(`/drugs/${drug.slug}`)}
                    />
                  ))
            )}
          </div>
        </div>

      </div>

      {isManaging && (
        <ManageActionBar
          count={selectedIds.size}
          allSelected={selectedIds.size === conditionResults.length}
          onToggleSelectAll={() => {
            setSelectedIds(prev =>
              prev.size === conditionResults.length
                ? new Set()
                : new Set(conditionResults.map(c => c.id))
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
        activeSpecialtyObj={activeSpecialtyObj}
        onOpenSpecialties={() => setShowSpecialtySheet(true)}
        onClearSpecialty={() => setActiveSpecialty('all')}
        onManage={toggleManage}
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
        isOpen={showBulkConfirm}
        onClose={() => setShowBulkConfirm(false)}
        onConfirm={handleConfirmBulkRemove}
        title="Remove favourites?"
        message={`${selectedIds.size} favourite${selectedIds.size === 1 ? '' : 's'} will be removed from your saved conditions.`}
        confirmLabel="Remove"
        destructive
      />

      <Snackbar visible={snackVisible} message={snackMessage} />
    </Layout>
  )
}