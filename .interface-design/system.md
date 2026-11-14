# CMS — interface

Venue staff on tablets. One job per screen. Pick the championship, pick the work unit, do the work, save.

**Source of truth:** this file + tokens in `app/globals.css` (`--ops-*`).  
Do not invent a second look. Every signed-in page uses this system.

Product domain, scoring math, and athletics: `docs/ATHLETICS.md`. Coding rules: `AGENT_CODING_GUIDE.md`.

---

## Domain

Championship, sport, category (Boys U16 / Girls U14), CSC, fixture, round, match, team, score.

There is **no** discipline chip, BIB, FOP, kit, medals, or event-code loader. Call Room on the floor is present/absent for a match (solo athletes, or team + members). Do not copy GMS call-room desks.

---

## Color world

Four cores. Use CSS variables, never one-off hex in new UI.

| Role | Token | Hex |
|------|--------|-----|
| Canvas | `--ops-bg` | `#f8fafc` |
| Surface | `--ops-surface` | `#ffffff` |
| Ink | `--ops-text` | `#0f172a` |
| Muted | `--ops-text-muted` | `#64748b` |
| Subtle | `--ops-text-subtle` | `#94a3b8` |
| Line | `--ops-line` / `--ops-border` | `#e2e8f0` |
| Action | `--ops-primary` | `#2559db` |
| Action hover | `--ops-primary-hover` | `#1d4ed8` |
| Action soft | `--ops-primary-soft` | `#eff6ff` |
| Header chrome | `--ops-header` | `#161a20` |
| Sky on chrome | `--ops-sky` | `#38bdf8` |
| Success | `--ops-success` / `--ops-success-soft` | `#10b981` / `#d1fae5` |
| Warning | `--ops-warning` / `--ops-warning-soft` | `#f59e0b` / `#fef3c7` |
| Danger | `--ops-danger` / `--ops-danger-soft` | `#ef4444` / `#fee2e2` |

Hover fill: `--ops-surface-hover` (`#f1f5f9`). Board: `--ops-board` white, `--ops-board-muted` canvas.

---

## Signature

White rail + charcoal event identity (`SPORT / GENDER / AGE` uppercase, sky title) → always-visible Sport / Gender / Age filters → selected primary-blue pills → white cards with 1px line.

Nav: white sidebar. Active item is `--ops-primary-soft` fill + `--ops-primary` text. Logo mark is a blue `C` square → `/dashboard`.

---

## Rejecting

- Neumorphism / clay double-shadows → 1px `--ops-line` + `--ops-shadow-card`
- Inter / mixed display faces → **Manrope only** (`--font-manrope`, `font-sans`)
- Candy multi-color screens → the four cores above; status colors only on badges
- Hover-only actions → every primary control is tappable
- Copying GMS call-room / BIB / kit / verification / medals / weight-class UI from other products
- Flattening championship setup into one workspace
- A fourth filter chip (discipline). Age **is** the category.

---

## Depth

Borders for structure. Card elevation:

```css
--ops-shadow-card: 0 1px 3px rgb(15 23 42 / 0.05), 0 4px 12px rgb(15 23 42 / 0.04);
--ops-shadow-modal: 0 20px 25px -5px rgb(15 23 42 / 0.1), 0 8px 10px -6px rgb(15 23 42 / 0.05);
```

Selected card: `border-[var(--ops-primary)]` + `--ops-primary-soft` fill. Interactive card: hover line tint + soft fill. No extra drop shadows on buttons.

---

## Spacing

Scale: 4 / 8 / 12 / 16 / 24. Page pad `p-4 sm:p-6`. Card pad `p-4 sm:p-5` (`SoftCard` `md`). Filter gap `gap-3`. Chip gap `gap-2`.

Radius: card `1rem`, panel `0.75rem`, control `0.5rem` (`--ops-radius-*`). Pills are `rounded-full`.

Touch: min `--ops-touch-min` (`2.75rem` / 44px). Primary save `--ops-touch-pref` (`3rem` / 48px). Round chips `min-h-10`.

Heights: `dvh`, never `vh` / `h-screen`.

---

## Type

Manrope everywhere. Loaded in `app/layout.tsx`. Tailwind `--font-sans: var(--font-manrope)`.

| Use | Size | Weight |
|-----|------|--------|
| Page title (`PageHeader`) | `text-lg` | 600 |
| Event identity title | `text-lg` | 600, `--ops-sky` |
| Eyebrow / chip labels | `text-[11px]` | 600, uppercase, tracking-wide |
| Body / forms | `text-sm` (13–14px) | 500–600 |
| Chips | `text-[13px]` | 600 |
| Metric | `text-2xl` tabular | 700 |
| IDs / scores | tabular-nums, extra bold | 700–800 |

Do not add Sora or a second display font.

---

## Motion

CSS only. **No Framer Motion.**

- Duration `--ops-duration` `150ms`, ease `cubic-bezier(0.2, 0, 0, 1)`
- Press: `scale(0.96)` on `button:active` (already in `globals.css`)
- `prefers-reduced-motion: reduce` disables press and transitions
- No hover scale on ops controls

---

## Tablet first

Priority: **tablet 768–1024** (portrait and landscape) → desktop scale-up → phone must still work.

| Break | Shell |
|-------|--------|
| `< 640` | Sidebar is a drawer. Menu button in header. |
| `640–1279` | 76px rail; expand **over** the page (overlay + dim). Content width does not jump. |
| `≥ 1280` | 248px rail pushes the page. |

Other rules:

- Wrap filter rows. Growing groups need a real basis (`flex-[1_1_18rem]`), not `flex-1` alone.
- Tables: `overflow-x-auto`; keep pager outside the scroll.
- Split views: `SplitWorkspace` `splitAt="md"` for list+form; default `lg` for wide boards.
- Modals: `fixed inset-0` overlay, `max-h-[min(92dvh,…)]`, inner scroll. `Modal` already does this.
- Empty-state copy must not say “on the left” / “above”.
- Primary actions stay reachable on narrow widths (stack, wrap, or sticky bar).

---

## Live-ops loop

Staff do the same thing on Floor:

1. Championship in the **header** picker.
2. **EventFilters** — Sport → Gender → Age → Category. Shared `sessionStorage` key `cms.eventFilter`.
3. **EventIdentity** — charcoal bar as chips are picked.
4. **Round chips** (`ChipFilter`) — selected = solid primary. Scoring and Results: **no All**; one round stays selected.
5. **Split workspace** — left queue, right board (fixtures match editor, scoring board).
6. **StickyActionBar** — Save / Complete. Disabled rules unchanged.
7. Status is **derived** from data (`draft` / `scheduled` / `in_progress` / `completed`). No fake KPIs.

Filters **unlock in order**: Gender disabled until Sport; Age until Gender; Category until Age. Fixtures: empty chip = All (full list), each added chip narrows. Scoring and Results wait until all four chips are set. Round chips have no All. Results also has a Ranking tab (manual places).

---

## Screen patterns

### Shell

`app/(admin)/layout.tsx` — white sidebar, header with menu / page title / championship `SoftSelect` / sign out. Floor + dashboard gated until a championship exists (`EmptyState` → Championships).

Nav groups (`lib/utils/nav.ts`): Dashboard · Floor (Call Room, Fixtures, Scoring, Results, Podium) · Setup (Championships) · Catalog (Sport, Category). `aria-current="page"` on the active link.

### Dashboard (`/dashboard`)

`PageHeader` with championship name and status. Grouped metric `SoftCard`s (overview, setup, coverage, draws, rounds, matches, call room, podium, by sport). Numbered command steps at the bottom. Links land on the first hop of each flow.

### Setup (nested hops — do not flatten)

```text
/championships
  /[id]/sports
    /[sportId]/categories
      /[categoryId]/teams
        /[teamId]/members
```

Each page is the **next board**. `StepCrumbs` at the top. Create/edit in `Modal`. Card grid to pick the next hop. Sports and categories multi-add from a checklist modal; category add filters by gender and age.

### Floor — Call Room (`/gameplay/call-room`)

Wait for filters. Round chips no All. `SplitWorkspace`: match queue | present/absent. Solo heats mark athletes. Basketball and relays mark the team and each member; team absent puts every player out.

### Floor — Fixtures

```text
/gameplay/fixtures                  Sport filter only
/gameplay/fixtures/sport/[sportId]  Gender → Age → CSC cards
/gameplay/fixtures/[fixtureId]      Round chips, queue | match form, sticky Save
```

Default venue copy for basketball: `"Court 1"`. Athletics create-draw does not pick track vs field — that lives on the category. Track asks for lanes per heat and which rounds. Do not put scoring on this page.

### Floor — Scoring (`/gameplay/scoring`)

Wait for filters. Round chips no All. `SplitWorkspace`: match queue | `ScoreMatchBoard`. Sticky Save progress / Complete.

### Floor — Results (`/gameplay/results`)

Wait for filters. One `CategoryResultsBoard` per fixture. **One** round-tab row, no All. League = `ResultMatchCard` grid. Knockout = `KnockoutResultsBoard`. Read-only.

### Floor — Podium (`/gameplay/podium`)

Wait for filters. Category appears only after scoring locks 1st–3rd. Gold / silver / bronze delivery. Teams list members; solo lists athlete details.

### Catalog (`/masters/sports`, `/masters/categories`)

CRUD **tables**: search + at least one filter + sortable headers (`TableControls` / `SortTh` / `lib/utils/table.ts`). Create/edit in `Modal`.

### Auth

`/login`, `/auth/callback`, `/onboarding`. Same tokens, `ops-control` fields, sonner toasts top-center.

---

## Component kit (reuse before creating)

All in `components/ops/`. Import from `@/components/ops`.

| Piece | Use |
|-------|-----|
| `SoftButton` | Actions. Variants: `default` `primary` `success` `danger` `ghost`. `size="lg"` for sticky save. |
| `SoftCard` | Surfaces. `interactive` / `selected` for pickers. Class `.soft-card` if you need a raw div. |
| `SoftSearch` | Search fields (icon inside). |
| `SoftSelect` | Native select with `ops-control`. |
| `StatusBadge` | Status text + tone. Never color alone. |
| `ChipFilter` | Round / phase pills. `showAll={false}` `allowEmpty={false}` on scoring/results rounds. |
| `EventFilters` | Sport → Gender → Age → Category. `unlockInOrder` default. Empty = All. |
| `EventIdentity` | Charcoal “where am I” bar. |
| `SplitWorkspace` | Queue \| board. |
| `StickyActionBar` | Footer actions on a board. |
| `PageHeader` | Title + hint + optional action. |
| `EmptyState` | Centered card when there is nothing to do. |
| `StepCrumbs` | Nested setup path. |
| `PageLoader` / `PageSkeleton` / `Shimmer` / `Spinner` | CSS loaders. Use skeletons for page waits, spinner for compact/inline, shimmer bars for unknown values. |
| `RouteProgress` | Thin primary bar on route enter/exit. |
| `Modal` | `components/Modal.tsx` — create/edit. Escape + overlay click closes. |
| `fieldClass` / `fieldErrorClass` | Inputs. Error = red outline (`ops-control-error`). |
| `TableControls` / `SortTh` | Catalog tables. `components/table.tsx`. |
| `cn()` | `lib/utils/cn.ts`. |

Global classes in `globals.css`: `.ops-control`, `.ops-control-error`, `.soft-card`, `.ops-shimmer`, `.ops-spinner`, `.ops-page-enter`.

**Do not** add a second button/card/input primitive.

---

## Forms and validation

On Save / submit:

1. Validate **all** required fields in one pass.
2. Set each failing field to `fieldErrorClass` (red outline + danger ring).
3. One short toast (e.g. “Fill the highlighted fields.”). Toast is not enough by itself.
4. Clear that field’s error as soon as the user edits a valid value.
5. Reset errors when opening a fresh create form or switching edit target.

Toasts: `sonner`, `position="top-center"`, `richColors`.

---

## Status language

| Tone | When |
|------|------|
| `neutral` | Draft, idle, unknown |
| `primary` | Selected, scheduled, info |
| `warning` | In progress / live |
| `success` | Completed, winner |
| `danger` | Cancelled, error, required miss |

Match statuses come from data. Do not invent extra colors.

---

## Accessibility (every screen)

- Touch ≥ `--ops-touch-min`
- `focus-visible` ring: primary border + `--ops-primary-soft` (already on `.ops-control`)
- Status never by color alone (`StatusBadge` or visible text)
- `aria-current="page"` on nav
- Contrast: ink on `--ops-surface` (WCAG AA)
- Dialogs: `role="dialog"` `aria-modal` (see `Modal`)
- Pointer cursor on all clickable elements (already global)

---

## Icons

`lucide-react` only. Stroke ~1.75 idle, 2.25 active. Size 18 in nav, 16 in fields. Do not mix icon packs.

---

## Adding a new screen

1. Use `--ops-*` tokens and `components/ops`.
2. Floor pages: `EventFilters` + shared session filter. Do not invent a second filter store.
3. Nested setup: new hop as its own route + `StepCrumbs`.
4. Catalog: table with search, filter, sort, modal form.
5. One primary sticky action. CSS press only.
6. If the sport is not basketball 1v1, branch on `fixture.formatType` — see `docs/ATHLETICS.md`. Do not overload `ScoreMatchBoard` / `ResultMatchCard`.

---

## File map

```text
CMS/.interface-design/system.md     ← this file
CMS/app/globals.css                 tokens + .ops-control / .soft-card
CMS/app/layout.tsx                  Manrope, toaster
CMS/app/(admin)/layout.tsx          shell, rail, championship picker
CMS/components/ops/*                kit
CMS/components/Modal.tsx            modal + fieldClass
CMS/components/table.tsx            catalog tables
CMS/components/results/*            results boards
CMS/lib/utils/nav.ts                sidebar
CMS/lib/utils/eventFilter.ts        floor filter session
CMS/lib/utils/cn.ts
```
