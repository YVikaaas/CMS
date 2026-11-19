# CMS — interface

Venue staff on tablets. One job per screen. Pick the event, pick the work unit, do the work, save.

**Source of truth:** this file + tokens in `app/globals.css` (`--ops-*`), with MUI and the Material You theme in `app/providers/muiTheme.ts`.  
Do not invent a second look. Every signed-in page uses this system.

Product domain, scoring math, and athletics: `docs/ATHLETICS.md`. Coding rules: `AGENT_CODING_GUIDE.md`.

---

## Domain

Event (the competition), sport, category (Boys U16 100m / Girls U14), CSC, fixture, round, match, team, score. Do not say championship.

There is **no** discipline chip, BIB, FOP, kit, medals, or event-code loader. Call Room on the floor is present/absent for a match (solo athletes, or team + members). Do not copy GMS call-room desks.

---

## Look: Material You (MD3), "MaterialMe" kit

Material 3 (m3.material.io) as styled by the MaterialMe UI kit, built on **MUI 9** with Emotion. Colours are the MD3 light scheme generated from the CMS teal seed `#165a50` (`@material/material-color-utilities`). Font: **Lexend** (closest Google font to the kit).

**One palette source:** `app/providers/muiTheme.ts` (`md` object, `cssVariables: true`). `globals.css` aliases the MUI vars as `--ops-*`. MUI renders into `@layer mui`, so Tailwind classes override it. No `CssBaseline`.

| MD3 role | Value | Token / use |
|------|------|------|
| primary / on-primary | `#006b5e` / `#fff` | `--ops-primary`: links, focus, icons that act |
| primary-container / on | `#76f8e2` / `#00201b` | `--ops-accent`: primary buttons, active nav outline |
| secondary-container | `#cde8e1` | `--ops-primary-soft`: selected chips, selected rows |
| surface | `#f7faf8` | `--ops-bg`: page |
| surface-container-lowest | `#fff` | `--ops-surface`: cards, tables |
| surface-container-low | `#f2f4f2` | `--ops-board-muted`: insets, queue rows |
| surface-container-high | `#e6e9e7` | dialogs |
| surface-container-highest | `#e0e3e1` | `--ops-line`: card and table borders |
| on-surface / on-surface-variant | `#191c1b` / `#3f4946` | text / muted text |
| outline | `#6f7976` | `--ops-line-strong`: field and chip borders |
| error / container | `#ba1a1a` / `#ffdad6` | `--ops-danger` |
| success, warning, info | `#386a20`, `#7c5800`, `#446179` on `#c3efad`, `#ffdea6`, `#cae6ff` | status chips |

| Part | Spec |
|------|------|
| Nav drawer | black (`--ops-nav`), 264px (88px rail on tablet), white 15px/500 labels, 24px icons, 56px items, 16px radius; active = 1.5px `--ops-accent` outline + accent label, no fill; groups split by dark dividers |
| Top app bar | white, 64px, sticky, 1px bottom border. Left: sidebar toggle (menu on phones) + "Section / Page". Right: event select (trophy icon), divider, account button (avatar, name + chevron from 1024px) → profile drawer |
| Sidebar | logo, nav groups; nothing else |
| Page header | none drawn: the top app bar shows "Section / Page". `PageHeader` keeps a screen-reader h1, a one-line breadcrumb on nested setup pages, and an optional action |
| Primary button | tonal: primary-container fill, 1.5px on-surface outline, 14px radius, 15px/500; hover = 4px offset shadow + lift |
| Other buttons | outlined (outline border, primary text), text; 40px min height, label 14/20 |
| Cards | white, 1px `--ops-line`, 16px radius, no shadow. Clickable cards: `ops-lift` (dark outline + offset shadow on hover) |
| Stat card | 15px/500 label, outlined icon top-right, value 36/44, 14px hint, MD3 4px linear progress |
| Filter chips (`ChipFilter`, `RoundChips`) | 8px radius, outline border; selected = secondary-container + check icon; 40px tall |
| Tabs | MD3 primary tabs: 48px, 15px/500, 3px rounded on-surface indicator, divider under the row |
| Text fields | MD3 outlined: 4px radius, outline border, 40px small |
| Tables | `TableCard`: title + result count; Export (CSV / Excel of the filtered, sorted rows) and primary action on the right; search + compact labelled filter dropdowns (`filters`, locked ones read "Pick sport" etc.); removable active-filter chips + Clear all; sortable headers; pager. White card, plain 14/20 header row, 40px rows, hover state layer 8% |
| Dialog | 28px radius, surface-container-high, 24/400 title, no dividers |
| Menu / tooltip | menu 4px radius surface-container; plain tooltip inverse-surface 8px |
| Status chip | 8px radius tonal container + dark text, always a word |

---

## Rejecting

- Hand-rolled buttons, chips, dialogs, selects when the kit (MUI inside) has one
- A second palette in CSS hex: palette changes go in `muiTheme.ts` (`md`)
- Coloured page banners; gradients; drop shadows on resting cards (only the hover offset shadow)
- Fonts other than Lexend; icon packs other than `@tabler/icons-react`
- Browser `window.confirm` / `alert` / `prompt` → `useConfirm()`
- Copying GMS call-room / BIB / kit / verification / medals / weight-class UI
- Flattening event setup into one workspace
- A fourth filter chip (discipline). Age **is** the category.

---

## Motion

MUI ripple and dialog fade, 150ms colour transitions, the 150ms lift on hover. Off under `prefers-reduced-motion`.

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
- Split views: `SplitWorkspace` `splitAt="lg"` for the Floor desks (Call Room, Scoring, match workspace): side by side from 1024px, stacked below with the queue capped at 40dvh. `md` only for a short list + small form.
- Modals: `fixed inset-0` overlay, `max-h-[min(92dvh,…)]`, inner scroll. `Modal` already does this.
- Empty-state copy must not say “on the left” / “above”.
- Primary actions stay reachable on narrow widths (stack, wrap, or sticky bar).

---

## Live-ops loop

Staff do the same thing on Floor:

1. Event in the **header** picker.
2. **EventFilters** — Sport → Gender → Age → Category dropdowns. Choosing one opens the next. Shared `sessionStorage` key `cms.eventFilter`.
3. **EventIdentity** — white card (teal eyebrow, title) as chips are picked.
4. **Round chips** (`ChipFilter`) — selected = solid primary. Scoring and Results: **no All**; one round stays selected.
5. **Split workspace** — left queue, right board (fixtures match editor, scoring board).
6. **StickyActionBar** — Save / Complete. Disabled rules unchanged.
7. Status is **derived** from data (`draft` / `scheduled` / `in_progress` / `completed`). No fake KPIs.

Filters **unlock in order**: Gender disabled until Sport; Age until Gender; Category until Age. Choosing a value opens the next menu. Fixtures: empty = All. Scoring and Results wait until all four are set. Round chips have no All. Results also has a Ranking tab (manual places).

---

## Screen patterns

### Shell

`app/(admin)/layout.tsx` — black sidebar (logo, nav); white top app bar with toggle, location, event select and account. Floor + dashboard gated until an event exists (`EmptyState` → Events).

Nav groups (`lib/utils/nav.ts`): Dashboard · Floor (Call Room, Fixtures, Scoring, Results, Podium) · Setup (Events) · Catalog (Sport, Category) · Pages (Account Setting, UI Kit). `aria-current="page"` on the active link.

### Dashboard (`/dashboard`)

Greeting banner with event name and status, four overview `StatCard`s, then a **Setup wizard** always on the selected event (one sport as tab cards → Boys | Girls columns → age cards → leftover discipline cards, all preselected → Add), then a **Fixtures** hop listing offered sports (opens the sport’s fixtures board with sport locked and Gender prompted), then one detail table (setup through podium), a by-sport table, and a short next-step list for the floor. Links land on the first hop of each flow.

### Setup (nested hops — do not flatten)

```text
/events
  /[id]/sports
    /[sportId]/categories
      /[categoryId]/teams
        /[teamId]/members
```

Each page is the **next board**. The path is the banner breadcrumb (`PageHeader crumbs`). Create/edit in `Modal`. The record list is a `TableCard` (search, filters, sort, pager, icon actions). Sports and categories multi-add from a checklist modal; category add filters by gender and age.

### Floor — Call Room (`/gameplay/call-room`)

Wait for filters. Round chips no All. `SplitWorkspace`: match chips on the left, call table on the right. Solo title is category and heat. Team title is sport, round, and match. Solo rows are lane, athlete, Present/Absent. Team rows are number, team, athlete count, and school when it is on the unit; players stay under a Players disclosure. Footer counts are present, absent, unmarked, and total from `callRoomProgress`. Present / Absent is an MUI `ToggleButtonGroup` (92px buttons, 44px tall). Picked = soft tint with dark text (`--ops-success-soft` / `--ops-danger-soft`), never a solid fill. No BIB, retake, verification, delay, or sports-manager fields.

### Floor — Fixtures

A count strip above the sport table shows sports in the current filter, categories offered, and draws already created. Those numbers come from offerings and `listFixtures`. The table stays the way in.

```text
/gameplay/fixtures                  Sport filter only
/gameplay/fixtures/sport/[sportId]  Gender → Age → CSC cards
/gameplay/fixtures/[fixtureId]      Round chips, queue | match form, sticky Save
```

Default venue copy for basketball: `"Court 1"`. Athletics create-draw does not pick track vs field — that lives on the category. Track asks for lanes per heat and which rounds. Do not put scoring on this page.

### Floor — Scoring (`/gameplay/scoring`)

Wait for filters. Round chips no All. `SplitWorkspace`: heat or match chips on the left, the board on the right. Athletics opens with sport, round, category, and heat, then lane, athlete, status, and time or mark. Team matches open as two rows: initials, name, athlete count, foul stepper, score stepper, and Mark winner. Player baskets stay inside each row. Sticky Save / Submit scoring. No shootout, no-show pair, upload sheet, or auto-position control.

### Floor — Results (`/gameplay/results`)

Wait for filters. One `CategoryResultsBoard` per fixture, with a teal identity bar (sport and category). Athletics keeps one round-tab row, no All, then place, lane, athlete, and time. Team knockout shows every round as a column of match cards (teams, score, Winner). Final rankings switches that board to the locked ranking. League-only stays a card grid. Read-only.

### Floor — Podium (`/gameplay/podium`)

Wait for filters. Category appears only after scoring locks 1st–3rd. Holders show bronze, then silver, then gold, with mark delivered. Teams list members; solo lists athlete details. No script, sound board, or ceremony queue.

### Account Setting (`/account`)

Account page. `PageHeader` title row, then a card with MUI `Tabs` (Account · Security, hash `#security` opens the second). Account: profile card (initials avatar, email, role chips) + personal details form (name, phone; email read-only) → `updateProfile`. Security: change password (current, new, confirm) → `authChangePassword`, which re-checks the current password. No avatar upload (no storage bucket).

### UI Kit (`/ui-kit`)

Living reference of every kit part and themed MUI component (alert, accordion, avatar, chip, dialog, list, popover, menu, rating, tabs, tooltip, transfer list, typography, form elements, table, Tabler icons) plus the blocks. Copy from it; never import from it.

### Catalog (`/masters/sports`, `/masters/categories`)

CRUD **tables**: search + at least one filter + sortable headers (`TableControls` / `SortTh` / `lib/utils/table.ts`). Create/edit in `Modal`.

### Auth

`/login`, `/auth/callback`, `/onboarding`. Same tokens, `ops-control` fields, sonner toasts top-center.

---

## Component kit (reuse before creating)

All in `components/ops/`. Import from `@/components/ops`. The kit wraps MUI; pages call the kit, not MUI, for these pieces. For anything the kit lacks (tooltip, menu, tabs, autocomplete), use the MUI component directly.

| Piece | Use |
|-------|-----|
| `SoftButton` | MUI `Button`. `default` = outlined, `primary` = contained teal, `success`, `danger`, `ghost` = text. `size="lg"` for sticky save. `loading` uses MUI loading. |
| `SoftCard` | MUI `Card`. `interactive` / `selected` for pickers. Class `.soft-card` if you need a raw div. |
| `SoftSearch` | MUI `OutlinedInput` with search icon. |
| `SoftSelect` | MUI `NativeSelect` + `OutlinedInput`; pass `<option>` children. |
| `StatusBadge` | MUI `Chip`, soft fill + dark text. Never color alone. |
| `ChipFilter` | MD3 filter chips (check when selected), sized to their options. `showAll={false}` `allowEmpty={false}` on scoring/results rounds. |
| `EventFilters` | One card: Sport → Gender → Age → Event as filled pill menus (label above, 40px, 16px menu). Choosing a value opens the next menu. `unlockInOrder` default. Empty = All. |
| `EventIdentity` | White “where am I” card with teal eyebrow. |
| `SplitWorkspace` | Queue \| board. |
| `StickyActionBar` | Footer actions on a board. |
| `PageHeader` | Hidden h1 + (nested pages) one breadcrumb line + optional action. `hint` is accepted but not shown. |
| `EmptyState` / `ErrorBanner` / `NotificationBanner` | Centred card, tinted icon circle (primary / danger / info), title, hint, action. `ErrorBanner` has `role="alert"`; use it when a load fails, with a Try again action. |
| `GreetingBanner` | Dashboard title row: greeting + badge, line, headline numbers, action. |
| `StatCard` | Kit stat card: label, 36px value, hint, optional outlined icon and `LinearProgress` bar, optional `href`. |
| `PageHeader crumbs` | Nested setup path, shown as the banner breadcrumb (no separate crumb row). |
| `PageLoader` / `PageSkeleton` / `Shimmer` / `Spinner` | CSS loaders. Use skeletons for page waits, spinner for compact/inline, shimmer bars for unknown values. |
| `RouteProgress` | Thin teal bar on route enter/exit. |
| `Modal` | `components/Modal.tsx` — MUI `Dialog`. Escape, scrim click, focus trap. |
| `useConfirm` / `ConfirmProvider` | Themed confirm (`components/ops/ConfirmDialog.tsx`, mounted in `app/layout.tsx`). `if (!(await confirm({ title, message, confirmLabel: "Archive", tone: "danger" }))) return;` Title names the thing, message says what happens, button is the verb. Cancel has focus; Escape and scrim cancel. `tone: "primary"` for non-destructive changes. |
| `fieldClass` / `fieldErrorClass` | Inputs. Error = red outline (`ops-control-error`). |
| `TableCard` (`count`, `filters`, `exportMenu`, `onClearAll`) / `TableExport` / `TableSearch` / `TablePager` (wraps on phones) / `SortTh` | Catalog tables (`components/table.tsx`). Wrap any other table in `<div className="ops-table">`. Page with `pageRows` from `lib/utils/table.ts`. |
| `cn()` | `lib/utils/cn.ts`. |

Global classes in `globals.css`: `.ops-control`, `.ops-control-error`, `.soft-card`, `.ops-shimmer`, `.ops-spinner`.

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

- Touch ≥ `--ops-touch-min` (40px) for buttons and inputs; icon buttons stay 44px; chips 40px
- `focus-visible`: 2px solid `--ops-focus` (primary) outline on every interactive element (global in `globals.css`); MUI adds its own focus ripple
- Status never by color alone (`StatusBadge` or visible text)
- `aria-current="page"` on nav
- Contrast: ink and muted pass 4.5:1 on page and card; status text uses palette `dark` shades
- Dialogs: `role="dialog"` `aria-modal` (see `Modal`)
- Pointer cursor on all clickable elements (already global)

---

## Icons

`@tabler/icons-react` only (type `TablerIcon`). Size 24 / `stroke={1.75}` in nav and stat cards, default elsewhere, `currentColor`. Size 20 in nav, 18 in row actions, 16 in fields. Do not mix icon packs. Browse names at tabler.io/icons.

---

## Adding a new screen

1. Use `--ops-*` tokens and `components/ops`.
2. Floor pages: `EventFilters` + shared session filter. Do not invent a second filter store.
3. Nested setup: new hop as its own route + `PageHeader crumbs`.
4. Catalog: table with search, filter, sort, modal form.
5. One primary sticky action. Colour transitions only.
6. If the sport is not basketball 1v1, branch on `fixture.formatType` — see `docs/ATHLETICS.md`. Do not overload `ScoreMatchBoard` / `ResultMatchCard`.

---

## File map

```text
CMS/.interface-design/system.md     ← this file
CMS/app/globals.css                 tokens + .ops-control / .soft-card
CMS/app/layout.tsx                  Onest, MUI cache + theme providers, toaster
CMS/app/providers/muiTheme.ts       MUI theme: the palette source of truth
CMS/app/(admin)/layout.tsx          shell, rail, event picker
CMS/components/ops/*                kit
CMS/components/Modal.tsx            modal + fieldClass
CMS/components/table.tsx            catalog tables
CMS/components/results/*            results boards
CMS/lib/utils/nav.ts                sidebar
CMS/lib/utils/eventFilter.ts        floor filter session
CMS/lib/utils/cn.ts
```
