# CMS — interface

Venue staff on tablets. One job per screen. Pick the championship, pick the work unit, do the work, save.

**Source of truth:** this file + tokens in `app/globals.css` (`--ops-*`), with MUI and the NiceAdmin theme in `app/providers/muiTheme.ts`.  
Do not invent a second look. Every signed-in page uses this system.

Product domain, scoring math, and athletics: `docs/ATHLETICS.md`. Coding rules: `AGENT_CODING_GUIDE.md`.

---

## Domain

Championship, sport, category (Boys U16 / Girls U14), CSC, fixture, round, match, team, score.

There is **no** discipline chip, BIB, FOP, kit, medals, or event-code loader. Call Room on the floor is present/absent for a match (solo athletes, or team + members). Do not copy GMS call-room desks.

---

## Look: NiceAdmin on Material UI (exact)

Built on **MUI** (`@mui/material` 9, Emotion). Every value below was measured from the NiceAdmin demo (niceadmin-mui-nextjs-main.vercel.app); override structure follows minimal-ui-kit/material-kit-react (MIT). NiceAdmin itself is a paid MUI Store template; no NiceAdmin source code or artwork is copied.

**One palette source:** `app/providers/muiTheme.ts` (`cssVariables: true`). `globals.css` aliases the `--mui-palette-*` vars as `--ops-*`. MUI renders into `@layer mui` (`AppRouterCacheProvider enableCssLayer`), so Tailwind classes override it. No `CssBaseline`.

---

## Measured spec

| Part | Spec |
|------|------|
| Page | `#f5f5f5`, content padding 24px, font Onest 14px, ink `rgba(3,14,9,.8)` |
| Sidebar | 270px white, right border `rgba(3,14,9,.1)`; logo row 70px, padding 0 24px; list padding 0 24px; 88px mini rail on tablet |
| Nav subheader | 12px/600 uppercase, `rgba(3,14,9,.7)`, line-height 26px, padding 3px 12px, margin-left −10px; groups split by a `Divider` (16px margin) |
| Nav item | 45px, padding 6px 10px, gap 2px, radius 8px, 14px/400, icon box 36px; **active** `#165a50` fill + `#c2fd75` text and icon |
| Header | sticky white `AppBar`, 70px, no shadow, toolbar padding 0 24px; left: sidebar toggle; right: championship select (44px), avatar (34px), sign out |
| Page banner (`PageHeader`) | `#165a50`, padding 20px, radius 12px; title h4 21px/600 white; right: breadcrumb (white / white 60%) or the page action (lime button) |
| Card | white, radius 12px, shadow `0 0 2px rgba(145,158,171,.3), 0 12px 24px -4px rgba(145,158,171,.12)`; content padding 24px; header 16px 24px + divider; title h5 18px/600 |
| Table (NiceAdmin User Table) | `TableCard`: card padding 24px → title h6 16px/600 + search (260px) right → toolbar (segmented filters left, primary action right) → `.ops-table` box (1px divider border, radius 12px) → `TablePager` (rows per page 10/25/50). Head row tint `rgba(3,14,9,.05)`, 14px/600 ink, 50px; body rows 50px, cells 6px 16px, 14px; sort icon 12px at 40% when idle; row hover `rgba(5,59,37,.08)`; row actions are colour `IconButton`s (edit green, archive/delete red) with `aria-label` |
| Input | outlined, radius 8px, border `rgba(3,14,9,.45)` (\*), padding 12px 14px (44px); focus border primary; label above 14px/600, 5px gap |
| Button | radius 12px, padding 6px 16px, min 44px (\*), `lg` 48px, 14px/400, no elevation, sentence case |
| Status chip | small 24px, pill, 12px/600, palette `dark` text on the 15% tint of `main` (\*): success `#3d7a22`, warning `#8a5a00`, error `#b91c1c`, info `#5b2bbf` |
| Filter (`ChipFilter`) | NiceAdmin segmented track: `rgba(3,14,9,.05)` bg, radius 12px, padding 2px 8px; segments 40px (\*), radius 12px, 13px; selected filled primary 600, idle 500 |
| Dialog | radius 12px, title 18px/600 with divider, content padding 24px |
| Alert | radius 12px, padding 6px 16px, 14px (\*); filled = palette fill (light fills take dark text \*), outlined = MUI default dark text |
| Tabs | 48px, tab padding 12px 16px, 14px/400 capitalize, idle `rgba(3,14,9,.7)`, selected primary, 2px indicator |
| Accordion | elevation 1 (`0 2px 3px rgba(0,0,0,.1)`), outer corners 12px, summary 16px/600, disabled `rgba(73,82,88,.12)` |
| Tooltip / Menu / Popover | tooltip `rgba(3,14,9,.9)`, 12px/500, radius 8px, arrow; menu & popover radius 12px with the card shadow; menu items 44px |
| Info colour | `#539bff` (tint `#ebf3fe`, readable text `#1d5fc4`) |

(\*) **Deliberate departures from NiceAdmin, for floor staff on tablets:** control borders `.45` instead of `.1` (3:1), status text uses the palette `dark` shade instead of `main` (4.5:1), error is `#dc2626` instead of `#ef4444` (white button text 4.5:1), buttons / clickable chips / header icon buttons and the header select are 44px or 40px instead of 36px. Everything else is NiceAdmin as measured.

---

## Rejecting

- Hand-rolled buttons, chips, dialogs, selects when the kit (MUI inside) has one
- Browser `window.confirm` / `alert` / `prompt` → `useConfirm()` for every delete, archive, remove or other irreversible change; `toast` for messages
- A second palette in CSS hex: palette changes go in `muiTheme.ts`
- `CssBaseline`; one-off `sx` styling (use the theme, then Tailwind classes)
- Fonts other than Onest; icon packs other than `@tabler/icons-react`
- Copying NiceAdmin's code, illustrations or logo (paid template)
- Copying GMS call-room / BIB / kit / verification / medals / weight-class UI
- Flattening championship setup into one workspace
- A fourth filter chip (discipline). Age **is** the category.

---

## Motion

MUI defaults (ripple, dialog fade) plus 150ms CSS colour transitions. No Framer Motion. Loaders stop under `prefers-reduced-motion`.

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
3. **EventIdentity** — white card (teal eyebrow, title) as chips are picked.
4. **Round chips** (`ChipFilter`) — selected = solid primary. Scoring and Results: **no All**; one round stays selected.
5. **Split workspace** — left queue, right board (fixtures match editor, scoring board).
6. **StickyActionBar** — Save / Complete. Disabled rules unchanged.
7. Status is **derived** from data (`draft` / `scheduled` / `in_progress` / `completed`). No fake KPIs.

Filters **unlock in order**: Gender disabled until Sport; Age until Gender; Category until Age. Fixtures: empty chip = All (full list), each added chip narrows. Scoring and Results wait until all four chips are set. Round chips have no All. Results also has a Ranking tab (manual places).

---

## Screen patterns

### Shell

`app/(admin)/layout.tsx` — white sidebar, header with sidebar toggle / championship `SoftSelect` / avatar (→ `/account`) / sign out. Floor + dashboard gated until a championship exists (`EmptyState` → Championships).

Nav groups (`lib/utils/nav.ts`): Dashboard · Floor (Call Room, Fixtures, Scoring, Results, Podium) · Setup (Championships) · Catalog (Sport, Category) · Pages (Account Setting, UI Kit). `aria-current="page"` on the active link.

### Dashboard (`/dashboard`)

Greeting banner with championship name and status, four overview `StatCard`s, then one detail table (setup through podium), a by-sport table, and a short next-step list. Links land on the first hop of each flow.

### Setup (nested hops — do not flatten)

```text
/championships
  /[id]/sports
    /[sportId]/categories
      /[categoryId]/teams
        /[teamId]/members
```

Each page is the **next board**. `StepCrumbs` at the top. Create/edit in `Modal`. The record list is a `TableCard` (search, filters, sort, pager, icon actions). Sports and categories multi-add from a checklist modal; category add filters by gender and age.

### Floor — Call Room (`/gameplay/call-room`)

Wait for filters. Round chips no All. `SplitWorkspace`: heat chips on the left, call table on the right. The board title is the sport, round, category, and heat from the selected match. Solo rows are lane, athlete, Present/Absent. Team rows group members under the team. Footer counts are present, absent, unmarked, and total from `callRoomProgress`. Present / Absent is an MUI `ToggleButtonGroup` (92px buttons, 44px tall). Picked = soft tint with dark text (`--ops-success-soft` / `--ops-danger-soft`), never a solid fill. No BIB, verification, delay, or sports-manager fields.

### Floor — Fixtures

A count strip above the sport table shows sports in the current filter, categories offered, and draws already created. Those numbers come from offerings and `listFixtures`. The table stays the way in.

```text
/gameplay/fixtures                  Sport filter only
/gameplay/fixtures/sport/[sportId]  Gender → Age → CSC cards
/gameplay/fixtures/[fixtureId]      Round chips, queue | match form, sticky Save
```

Default venue copy for basketball: `"Court 1"`. Athletics create-draw does not pick track vs field — that lives on the category. Track asks for lanes per heat and which rounds. Do not put scoring on this page.

### Floor — Scoring (`/gameplay/scoring`)

Wait for filters. Round chips no All. `SplitWorkspace`: heat chips on the left, score table on the right. Athletics opens with sport, round, category, and heat, then lane, athlete, status, and time or mark. Sticky Save progress / Complete. No upload sheet and no auto-position control.

### Floor — Results (`/gameplay/results`)

Wait for filters. One `CategoryResultsBoard` per fixture, with a teal identity bar (sport and category). **One** round-tab row, no All. Athletics heats are place, lane, athlete, and time. League = `ResultMatchCard` grid. Knockout = `KnockoutResultsBoard`. Read-only.

### Floor — Podium (`/gameplay/podium`)

Wait for filters. Category appears only after scoring locks 1st–3rd. Holders show bronze, then silver, then gold, with mark delivered. Teams list members; solo lists athlete details. No script, sound board, or ceremony queue.

### Account Setting (`/account`)

NiceAdmin account page. `PageHeader` banner, then a card with MUI `Tabs` (Account · Security, hash `#security` opens the second). Account: profile card (initials avatar, email, role chips) + personal details form (name, phone; email read-only) → `updateProfile`. Security: change password (current, new, confirm) → `authChangePassword`, which re-checks the current password. No avatar upload (no storage bucket).

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
| `ChipFilter` | Segmented filter (NiceAdmin User Table tabs). `showAll={false}` `allowEmpty={false}` on scoring/results rounds. |
| `EventFilters` | Sport → Gender → Age → Category. `unlockInOrder` default. Empty = All. |
| `EventIdentity` | White “where am I” card with teal eyebrow. |
| `SplitWorkspace` | Queue \| board. |
| `StickyActionBar` | Footer actions on a board. |
| `PageHeader` | NiceAdmin teal banner: title + hint, breadcrumb or action on the right. |
| `EmptyState` / `ErrorBanner` / `NotificationBanner` | NiceAdmin banners: centred card, tinted icon circle (primary / danger / info), title, hint, action. `ErrorBanner` has `role="alert"`; use it when a load fails, with a Try again action. |
| `GreetingBanner` | NiceAdmin greeting card (teal, white title, lime actions). Dashboard top. |
| `StatCard` | NiceAdmin record card: label, value, hint, optional tinted icon tile and `LinearProgress` bar, optional `href`. |
| `StepCrumbs` | Nested setup path. |
| `PageLoader` / `PageSkeleton` / `Shimmer` / `Spinner` | CSS loaders. Use skeletons for page waits, spinner for compact/inline, shimmer bars for unknown values. |
| `RouteProgress` | Thin teal bar on route enter/exit. |
| `Modal` | `components/Modal.tsx` — MUI `Dialog`. Escape, scrim click, focus trap. |
| `useConfirm` / `ConfirmProvider` | Themed confirm (`components/ops/ConfirmDialog.tsx`, mounted in `app/layout.tsx`). `if (!(await confirm({ title, message, confirmLabel: "Archive", tone: "danger" }))) return;` Title names the thing, message says what happens, button is the verb. Cancel has focus; Escape and scrim cancel. `tone: "primary"` for non-destructive changes. |
| `fieldClass` / `fieldErrorClass` | Inputs. Error = red outline (`ops-control-error`). |
| `TableCard` / `TableSearch` / `TablePager` / `SortTh` | Catalog tables (`components/table.tsx`). Wrap any other table in `<div className="ops-table">`. Page with `pageRows` from `lib/utils/table.ts`. |
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

- Touch ≥ `--ops-touch-min` (44px) for buttons, inputs and icon buttons; chips 40px
- `focus-visible`: 2px solid `--ops-focus` (primary) outline on every interactive element (global in `globals.css`); MUI adds its own focus ripple
- Status never by color alone (`StatusBadge` or visible text)
- `aria-current="page"` on nav
- Contrast: ink and muted pass 4.5:1 on page and card; status text uses palette `dark` shades
- Dialogs: `role="dialog"` `aria-modal` (see `Modal`)
- Pointer cursor on all clickable elements (already global)

---

## Icons

`@tabler/icons-react` only (NiceAdmin's icon set; type `TablerIcon`). `stroke={1.5}` in nav and tiles, default elsewhere, `currentColor`. Size 20 in nav, 18 in row actions, 16 in fields. Do not mix icon packs. Browse names at tabler.io/icons.

---

## Adding a new screen

1. Use `--ops-*` tokens and `components/ops`.
2. Floor pages: `EventFilters` + shared session filter. Do not invent a second filter store.
3. Nested setup: new hop as its own route + `StepCrumbs`.
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
CMS/app/(admin)/layout.tsx          shell, rail, championship picker
CMS/components/ops/*                kit
CMS/components/Modal.tsx            modal + fieldClass
CMS/components/table.tsx            catalog tables
CMS/components/results/*            results boards
CMS/lib/utils/nav.ts                sidebar
CMS/lib/utils/eventFilter.ts        floor filter session
CMS/lib/utils/cn.ts
```
