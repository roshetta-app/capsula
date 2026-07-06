# Capsula — Drug Library Restructure & Refinement Plan

**Status:** 🟡 Phase 1 (Discovery) — no schema, code, or CMS changes yet.
**Purpose:** The single source of truth for this restructure, updated across every
session. Re-upload this file at the start of any future session on this topic —
Claude should resume from here, not re-derive decisions from scratch.

**How to use this doc:** Every decision gets recorded as an ADR (§2) before it's
acted on. Every phase has a defined artifact and an exit condition — you don't move
to the next phase until the current one's artifact exists and you've confirmed it.

---

## 0. Operating principles (why this plan won't need to be ditched)

Three rules, borrowed from how mature engineering orgs de-risk exactly this kind of
change, sized down for a solo-admin app:

1. **Decisions are written down with their reasoning, not just their outcome.**
   See the ADR log in §2. If a decision is ever questioned later, the answer is
   "check the ADR," not "let's re-argue it."
2. **Live data is never big-bang migrated.** New structure is built *alongside* the
   old one, data is migrated with verification, both run in parallel briefly, then
   the old structure is removed. See §7 (Migration Strategy).
3. **Every risky rollout has a fallback path**, so a bad change is a quick revert,
   not an emergency. See §11 (Rollout Strategy).

Everything below is organized around these three rules.

---

## 1. Glossary (lock this before anything else)

Ambiguous terminology is how plans quietly drift. These terms are used consistently
everywhere else in this doc and should be used consistently in code/CMS labels too:

| Term | Meaning |
|---|---|
| **Substance / Generic** | The underlying drug compound and its pharmacology (mechanism, interactions, textbook dosing). Currently the `generics` table. |
| **Product / Formulation** | A specific strength + form + route of a generic (e.g. "500mg tablet, oral"). Currently the `formulations` table. |
| **Combination Product** | A product containing 2+ generics at fixed doses in one unit (e.g. Spasmofen). Not yet modeled — see ADR-001. |
| **Brand / Trade Name** | A commercial product sold under a formulation, with a manufacturer (e.g. "Panadol"). Currently the `brands` table. |
| **Reference Dose** | Pharmacological/textbook dosing at the generic level (mg/kg, titration, dilution). Currently `generics.textbook_doses`. |
| **Practical Dose** | The prescribing instruction for a specific formulation (e.g. "1 tablet twice daily"). Currently `formulations.doses_structured`. |

---

## 2. Architecture Decision Records (ADR log)

Every fork-in-the-road decision goes here **before** implementation planning touches
it. Template:

```
### ADR-NNN: [Title]
Status: Proposed | Decided | Superseded
Context: What problem forced this decision?
Options considered: A / B / C, with trade-offs
Decision: Which option, and why
Consequences: What this makes easier, what it makes harder, how reversible it is
```

### ADR-001: Combination-brand modeling
**Status:** 🔴 Proposed, not decided
**Context:** Brands like Spasmofen contain 2+ generics at fixed doses in one unit.
Current schema assumes 1 brand → 1 formulation → 1 generic.
**Options considered:**
- **A. Combo-as-its-own-generic** — model the combination as its own generic entity (matches how BNF/Medscape catalogue fixed-dose combinations). Component generics referenced as text only.
- **B. Many-to-many brand↔formulation** — a brand can link to multiple formulations across different generics via a junction table. Pharmacologically accurate, enables future interaction-checking across combo ingredients.
- **C. Free-text composite** — no structured link at all.
**Claude's recommendation:** A now, documented as a stepping stone toward B if/when
cross-ingredient interaction-checking becomes a real feature requirement.
**Consequences if A is chosen:** Low schema risk, ships faster, but a future move to
B requires a real migration (not just an add) since it changes brand's core relationship.
**Decision:** _pending_

### ADR-002: Search entity priority (brand-first vs. unified)
**Status:** 🔴 Proposed, not decided
**Context:** Doctors search by brand name more often than generic name.
**Options considered:** Unified ranked search (brand matches weighted first) vs.
two explicit search modes.
**Claude's recommendation:** Unified, brand-weighted, generic name shown as context per result row.
**Decision:** _pending_

### ADR-003: Prescription-sheet brand linking target
**Status:** 🔴 Proposed, not decided
**Context:** Prescription sheets currently link a brand to its formulation page. New
model has one page per generic.
**Options considered:** Deep-anchor link into the generic page (`/drugs/paracetamol?formulation=X&brand=Y`) vs. keeping a separate formulation-level page.
**Claude's recommendation:** Deep-anchor into the generic page — preserves "one page per generic" as the single source of truth.
**Decision:** _pending_

### ADR-004: Dose display hierarchy
**Status:** 🔴 Proposed, not decided
**Context:** Reference dose (generic-level) and practical dose (formulation-level) need clearly distinct, non-confusing presentation.
**Options considered:** Two-tier display (reference panel at generic level, practical dose per formulation card) vs. a single merged dose field.
**Claude's recommendation:** Two-tier, as described. Open sub-question: does the CMS need an optional per-brand dose override for edge cases? Not yet decided — flag if a real case comes up in the data audit (§3).
**Decision:** _pending_

### ADR-005: Query/data-access contract between CMS and App
**Status:** 🔴 Proposed, not decided
**Context:** Some CMS pages already query Supabase directly instead of going through
`lib/adminQueries.js` (this is exactly how the `formulations.doses` bug happened —
a stray direct query drifted out of sync with the schema). This risk repeats itself
under a new schema if not addressed structurally.
**Options considered:**
- **A.** Mandate all reads/writes go through `lib/queries.js` / `lib/adminQueries.js` — no page ever calls `supabase.from(...)` directly.
- **B.** Leave as-is, rely on manual discipline.
**Claude's recommendation:** A. This is a low-cost, high-value rule to enforce during the Stage 4/5 rebuild — it would have prevented the bug we just fixed.
**Decision:** _pending_

*(New ADRs get appended here as they come up — don't renumber existing ones.)*

---

## 3. Phase Roadmap

| # | Phase | Artifact produced | Exit condition | Status |
|---|---|---|---|---|
| 1 | **Discovery & Benchmarking** | Written comparison of BNF, Medscape, Lexicomp, Drugs.com, MIMS on combo modeling, dosing display, and search UX + a real data audit of your current `generics`/`formulations`/`brands` (any existing combo brands? data quality baseline?) | Comparison doc + data audit both exist | 🟡 In progress |
| 2 | **Concept Decisions** | Every ADR in §2 moved from Proposed → Decided | All ADRs decided | 🔴 Not started (blocked on Phase 1) |
| 3 | **Domain Edge-Case Sweep** | Enumerated list of every real-world case the model must handle (see §4 for starter list — needs your review + additions from actual data) | Edge-case list reviewed and signed off | 🔴 Not started |
| 4 | **Schema & Data Architecture** | ERD, table/column definitions, types, constraints, indexes, RLS policies, source-per-field matrix (§5) | Schema doc complete, matches all decided ADRs | 🔴 Blocked on Phase 2–3 |
| 5 | **Migration Strategy Design** | Expand→migrate→contract plan (§7): what gets added, how data moves, how it's verified, rollback plan | Migration plan written and reviewed before any DB change | 🔴 Blocked on Phase 4 |
| 6 | **Data-Access Contract Layer** | Defined query functions (ADR-005) that both CMS and App will use — single source of truth for how data is fetched/shaped | Contract functions specified (not yet built) | 🔴 Blocked on Phase 4 |
| 7 | **CMS UX Redesign Plan** | Screen-by-screen spec: drug list, generic editor, formulation sub-editor, combo-brand entry flow, brand editor — mirroring the Condition CMS decluttering pattern | Full CMS spec, page by page | 🔴 Blocked on Phase 6 |
| 8 | **App UX Redesign Plan** | Screen-by-screen spec: library list, generic detail page, search results, prescription sheet linking, dose display | Full App spec, page by page | 🔴 Blocked on Phase 6 (parallel with Phase 7) |
| 9 | **Cross-Layer Consistency Pass** | Checklist confirming favourites, recently-viewed, stock toggle, search-gaps analytics, prescription sheets, share cards, caching all work under the new model | Every existing feature verified against new model on paper | 🔴 Blocked on Phase 7–8 |
| 10 | **Implementation Planning** | Actual phased build plan, run through normal BRAINSTORM→PLAN_PENDING→PLAN_APPROVED→IMPLEMENTING gates, file by file | Approved implementation plan | 🔴 Blocked on Phase 9 |
| 11 | **Rollout Strategy** | Feature-flag/parallel-path plan, go-live checklist, rollback plan (§11) | Rollout plan written before any production migration runs | 🔴 Blocked on Phase 10 |
| 12 | **QA & Data Validation** | Manual QA checklist + data-integrity audit scripts (e.g. catch orphaned records, invalid combo entries) | Checklist exists, scripts written | 🔴 Blocked on Phase 10 |
| 13 | **Post-Launch Governance** | Content-entry standard for all *future* generics/brands using the new model + monitoring plan | Governance doc exists | 🔴 Runs after go-live |

**Visual UI polish** is intentionally not its own numbered phase — it's a lower-risk,
separable pass that can run continuously after Phase 8 locks structure, rather than
being a one-time finale. Don't restyle before structure is settled.

---

## 4. Domain edge-case sweep (starter list — expand during Phase 3)

Every case below needs to map cleanly onto whatever schema comes out of Phase 4.
This list is a starting point from general pharmacy-domain knowledge — it must be
checked against your *actual* data during the Phase 1 audit, since real datasets
always surface cases nobody thought of upfront.

- Single-ingredient generic with one formulation, one brand (simplest case)
- Single-ingredient generic with multiple formulations (e.g. tablet + syrup)
- Same brand name reused across different formulations of the same generic (e.g. "Panadol" tablet vs "Panadol" syrup — same brand, different products)
- Combination-ingredient brand (Spasmofen-style) — ADR-001
- Generic with formulations but zero brands currently available (out of stock / discontinued everywhere)
- Discontinued brand still needed for historical/reference purposes (should it be hidden, not deleted?)
- OTC vs. prescription-only distinction — does this affect display or access at all?
- Controlled substances — any special handling needed (warnings, restricted CMS visibility)?
- Pediatric-only or adult-only formulations of the same generic
- A brand available in multiple markets/manufacturers under the same name (generic manufacturing — same brand name, different manufacturer, is that one brand row or two?)
- A generic with no textbook dose data yet (draft/incomplete content — how should the UI degrade gracefully?)

**Action needed from you before Phase 3 closes:** review this list against your real
`generics`/`brands` data and flag any case that already exists in production but
isn't listed here.

---

## 5. Data source standard (finalize during Phase 4)

| Data type | Suggested primary source(s) |
|---|---|
| Mechanism of action, drug class | BNF, Medscape |
| Side effects (common/serious) | BNF, manufacturer SmPC/label, Medscape |
| Drug interactions | BNF interaction checker, Medscape interaction checker |
| Contraindications | Manufacturer SmPC, BNF |
| Pregnancy/breastfeeding safety | BNF, LactMed |
| Reference/textbook dosing | BNF, WHO guidelines, standard clinical references |
| Practical formulation dosing | Manufacturer label/insert, EDA-approved SmPC |
| Egyptian brand data (manufacturer, availability, packaging) | Egyptian Drug Authority (EDA) database, pharmacy-verified data |

**Standing caveat:** all test/seed data entered so far (Cetirizine, Diclofenac
examples) is structurally illustrative only and has not been verified against these
sources. It must not be treated as clinically accurate until reviewed by someone
with pharmacological authority — this applies to all future data entry too, not
just the test rows.

---

## 6. Current architecture (as-is, for reference during Phase 4 design)

```
generics (1) ──< formulations (many) ──< brands (many)
```

- **Known limitation:** a brand can only belong to one formulation → one generic — breaks for combo products (ADR-001).
- **Known architectural risk:** some CMS pages query Supabase directly instead of through `lib/adminQueries.js`, causing schema drift bugs (ADR-005; this is exactly what caused the `formulations.doses` bug fixed earlier in this project).
- `fetchFlatDrugs` (public library) returns one row per **formulation** — why the library currently shows multiple cards per generic.
- `DrugEditor.jsx` (CMS) already models the "generic page, nested formulations and brands" shape we want for the public app — useful reference during Phase 8.
- `ConditionDetailScreen` prescription sheets link brands to formulation pages directly — needs to change per ADR-003.

---

## 7. Migration strategy principles (design in full during Phase 5)

Non-negotiable pattern, regardless of what Phase 4's schema ends up looking like:

1. **Expand:** add new tables/columns alongside the existing ones. Nothing old is removed yet.
2. **Migrate:** write and run a migration script that populates the new structure from the old data, with row-count and spot-check verification at each step.
3. **Parallel run:** both old and new structures exist and are queryable; new CMS/App code reads from the new structure while old code (if still needed as fallback) still works against the old one.
4. **Contract:** only after the new structure is proven in production do we remove the old tables/columns.

No step in Phase 10 (Implementation) should ever propose collapsing steps 1–4 into
a single migration.

---

## 8. Rollout strategy principles (design in full during Phase 11)

- New library/generic-detail screens should be reachable in parallel with the old
  ones during rollout (e.g. behind a route or flag), not a hard cutover.
- A rollback plan is written **before** any production data migration runs, not
  improvised after something breaks.
- Go-live checklist gets written once Phase 10's implementation plan exists — too
  early to draft now.

---

## 9. Decision Log

*(Mirrors ADR statuses in §2 — use this as a flat chronological record: decision → date/session → who confirmed it.)*

---

## 10. Immediate next step

**Phase 1, remaining half:** a dedicated benchmarking pass (BNF/Medscape/Lexicomp/
Drugs.com/MIMS comparison) plus a real audit of your current production data for
combo brands and data-quality baseline. Both should exist before touching any ADR
in §2. Say the word and this is what happens next session.
