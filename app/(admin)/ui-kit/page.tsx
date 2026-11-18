"use client";

import { useState, type ReactNode } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Avatar from "@mui/material/Avatar";
import AvatarGroup from "@mui/material/AvatarGroup";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Popover from "@mui/material/Popover";
import Rating from "@mui/material/Rating";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import {
  IconArchive,
  IconAward,
  IconBell,
  IconCalendarEvent,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconClipboardList,
  IconDotsVertical,
  IconFlag,
  IconLayoutDashboard,
  IconMedal,
  IconPencil,
  IconSearch,
  IconSettings,
  IconTrophy,
  IconUserCheck,
  IconUsers,
} from "@tabler/icons-react";
import { Modal, fieldClass, fieldErrorClass } from "@/components/Modal";
import {
  ChipFilter,
  EmptyState,
  ErrorBanner,
  EventIdentity,
  GreetingBanner,
  NotificationBanner,
  PageHeader,
  SoftButton,
  SoftSearch,
  SoftSelect,
  StatCard,
  StatusBadge,
} from "@/components/ops";
import { SortTh, TableCard, TablePager, TableSearch } from "@/components/table";
import type { SortState } from "@/lib/utils/table";

// Living reference for the NiceAdmin-styled kit. Copy from here; do not import from this page.

function Block({ title, children, wide = false }: { title: string; children: ReactNode; wide?: boolean }) {
  return (
    <Card className={wide ? "lg:col-span-2" : undefined}>
      <CardHeader title={title} />
      <Divider />
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

const tones = ["error", "warning", "info", "success"] as const;

function TransferList() {
  const [left, setLeft] = useState(["Athletics", "Basketball", "Football"]);
  const [right, setRight] = useState(["Swimming"]);
  const [checked, setChecked] = useState<string[]>([]);
  const toggle = (item: string) =>
    setChecked((prev) => (prev.includes(item) ? prev.filter((v) => v !== item) : [...prev, item]));
  const move = (from: string[], to: string[], setFrom: (v: string[]) => void, setTo: (v: string[]) => void) => {
    const picked = from.filter((item) => checked.includes(item));
    setFrom(from.filter((item) => !picked.includes(item)));
    setTo([...to, ...picked]);
    setChecked((prev) => prev.filter((item) => !picked.includes(item)));
  };
  const column = (items: string[], label: string) => (
    <Card variant="outlined" className="min-h-48 flex-1 shadow-none">
      <List dense aria-label={label}>
        {items.map((item) => (
          <ListItemButton key={item} onClick={() => toggle(item)}>
            <ListItemIcon>
              <Checkbox edge="start" checked={checked.includes(item)} tabIndex={-1} disableRipple />
            </ListItemIcon>
            <ListItemText primary={item} />
          </ListItemButton>
        ))}
      </List>
    </Card>
  );
  return (
    <div className="flex items-center gap-3">
      {column(left, "Available sports")}
      <div className="flex flex-col gap-2">
        <IconButton aria-label="Move right" onClick={() => move(left, right, setLeft, setRight)}>
          <IconChevronRight size={20} />
        </IconButton>
        <IconButton aria-label="Move left" onClick={() => move(right, left, setRight, setLeft)}>
          <IconChevronLeft size={20} />
        </IconButton>
      </div>
      {column(right, "Offered sports")}
    </div>
  );
}

const sampleRows = [
  { name: "Delhi Dynamos", city: "Delhi", status: "completed" },
  { name: "Pune Panthers", city: "Pune", status: "in progress" },
  { name: "Mumbai Mavericks", city: "Mumbai", status: "scheduled" },
];

const icons = [
  ["IconLayoutDashboard", IconLayoutDashboard],
  ["IconUserCheck", IconUserCheck],
  ["IconCalendarEvent", IconCalendarEvent],
  ["IconClipboardList", IconClipboardList],
  ["IconTrophy", IconTrophy],
  ["IconAward", IconAward],
  ["IconFlag", IconFlag],
  ["IconMedal", IconMedal],
  ["IconUsers", IconUsers],
  ["IconPencil", IconPencil],
  ["IconArchive", IconArchive],
  ["IconSearch", IconSearch],
  ["IconBell", IconBell],
  ["IconSettings", IconSettings],
] as const;

export default function UiKitPage() {
  const [tab, setTab] = useState("one");
  const [rating, setRating] = useState<number | null>(4);
  const [filter, setFilter] = useState<"" | "a" | "b">("");
  const [dialog, setDialog] = useState(false);
  const [popover, setPopover] = useState<HTMLElement | null>(null);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState<"name" | "city">>({ key: "name", dir: "asc" });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="UI Kit" hint="Every kit part in the NiceAdmin style. Copy from here." />

      <Typography variant="h5" component="h2">
        Blocks
      </Typography>
      <GreetingBanner
        title="Hello, Vikas"
        badge={<StatusBadge tone="success">active</StatusBadge>}
        text="BB Championship December · Lucknow · 2026-12-16 – 2026-12-29"
        stats={[
          { label: "Matches done", value: "100%" },
          { label: "Athletes", value: 87 },
          { label: "Medals waiting", value: 6 },
        ]}
        action={<SoftButton variant="primary">Go to the floor</SoftButton>}
      />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Sports" value={2} hint="12 categories" icon={IconTrophy} />
        <StatCard label="Athletes" value={87} hint="33 solo · 16 teams" icon={IconUsers} />
        <StatCard label="Matches complete" value="100%" hint="30 of 30" bar={100} />
        <StatCard label="Loading" value={0} ready={false} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <EmptyState title="Nothing here yet" hint="Pick a sport to start." action={<SoftButton variant="primary">Pick a sport</SoftButton>} />
        <ErrorBanner title="Could not load" hint="Check your connection and try again." action={<SoftButton variant="primary">Try again</SoftButton>} />
        <NotificationBanner title="Ranking is not locked" hint="Lock 1st, 2nd and 3rd to open the podium." action={<SoftButton>Open scoring</SoftButton>} />
      </div>
      <EventIdentity eyebrow="Basketball · Boys · U16 · Basketball" title="Boys U16 Basketball" />

      <Typography variant="h5" component="h2" className="mt-4">
        Components
      </Typography>
      <div className="grid gap-6 lg:grid-cols-2">
        <Block title="Buttons">
          <div className="flex flex-wrap gap-2">
            <SoftButton variant="primary">Primary</SoftButton>
            <SoftButton>Default</SoftButton>
            <SoftButton variant="success">Success</SoftButton>
            <SoftButton variant="danger">Danger</SoftButton>
            <SoftButton variant="ghost">Ghost</SoftButton>
            <SoftButton variant="primary" loading>
              Saving
            </SoftButton>
            <SoftButton variant="primary" size="lg">
              Large save
            </SoftButton>
          </div>
          <div className="flex gap-1">
            <IconButton color="success" aria-label="Edit">
              <IconPencil size={18} className="text-[var(--ops-success)]" />
            </IconButton>
            <IconButton color="error" aria-label="Archive">
              <IconArchive size={18} />
            </IconButton>
            <IconButton aria-label="More">
              <IconDotsVertical size={18} />
            </IconButton>
          </div>
        </Block>

        <Block title="Alert">
          {tones.map((tone) => (
            <Alert key={`f-${tone}`} variant="filled" severity={tone}>
              This is a {tone} alert — check it out!
            </Alert>
          ))}
          {tones.map((tone) => (
            <Alert key={`o-${tone}`} variant="outlined" severity={tone}>
              This is a {tone} alert — check it out!
            </Alert>
          ))}
          <Alert severity="info" action={<Button color="inherit" size="small">Undo</Button>}>
            <AlertTitle>Info</AlertTitle>
            Standard alert with a title and an action.
          </Alert>
        </Block>

        <Block title="Accordion">
          <div>
            {["Call room", "Scoring", "Podium"].map((title, index) => (
              <Accordion key={title} disabled={index === 2}>
                <AccordionSummary expandIcon={<IconChevronDown size={18} />}>{title}</AccordionSummary>
                <AccordionDetails>
                  Pick sport, gender, age, then category, then do the work for each match.
                </AccordionDetails>
              </Accordion>
            ))}
          </div>
        </Block>

        <Block title="Avatar & List">
          <div className="flex items-center gap-3">
            <Avatar className="bg-[var(--ops-primary)] text-[var(--ops-accent)]">VY</Avatar>
            <Avatar className="bg-[var(--ops-success-soft)] text-[var(--ops-success)]">DD</Avatar>
            <AvatarGroup max={3}>
              <Avatar>A</Avatar>
              <Avatar>B</Avatar>
              <Avatar>C</Avatar>
              <Avatar>D</Avatar>
            </AvatarGroup>
          </div>
          <List disablePadding>
            {sampleRows.map((row) => (
              <ListItemButton key={row.name}>
                <ListItemAvatar>
                  <Avatar>{row.name[0]}</Avatar>
                </ListItemAvatar>
                <ListItemText primary={row.name} secondary={row.city} />
              </ListItemButton>
            ))}
          </List>
        </Block>

        <Block title="Chip">
          <div className="flex flex-wrap gap-2">
            {(["default", "primary", "success", "warning", "error", "info"] as const).map((color) => (
              <Chip key={`f-${color}`} label={color} color={color} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["default", "primary", "success", "warning", "error", "info"] as const).map((color) => (
              <Chip key={`o-${color}`} label={color} color={color} variant="outlined" onDelete={() => undefined} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["neutral", "primary", "success", "warning", "danger", "info"] as const).map((tone) => (
              <StatusBadge key={tone} tone={tone}>
                {tone}
              </StatusBadge>
            ))}
          </div>
        </Block>

        <Block title="Dialog, Popover, Menu, Tooltip">
          <div className="flex flex-wrap gap-2">
            <SoftButton variant="primary" onClick={() => setDialog(true)}>
              Open dialog
            </SoftButton>
            <SoftButton onClick={(event) => setPopover(event.currentTarget)}>Open popover</SoftButton>
            <SoftButton onClick={(event) => setMenu(event.currentTarget)}>Open menu</SoftButton>
            <Tooltip title="Tooltips explain icon-only buttons">
              <IconButton aria-label="Settings">
                <IconSettings size={20} />
              </IconButton>
            </Tooltip>
          </div>
          <Modal open={dialog} title="Add sport" onClose={() => setDialog(false)}>
            <div className="grid gap-3">
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                Name
                <input className={fieldClass} />
              </label>
              <div className="flex gap-2">
                <SoftButton variant="primary" onClick={() => setDialog(false)}>
                  Add sport
                </SoftButton>
                <SoftButton onClick={() => setDialog(false)}>Cancel</SoftButton>
              </div>
            </div>
          </Modal>
          <Popover
            open={Boolean(popover)}
            anchorEl={popover}
            onClose={() => setPopover(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          >
            <p className="max-w-60 p-4 text-sm">Popovers hold short extra detail next to their trigger.</p>
          </Popover>
          <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)}>
            <MenuItem onClick={() => setMenu(null)}>Edit</MenuItem>
            <MenuItem onClick={() => setMenu(null)}>Archive</MenuItem>
          </Menu>
        </Block>

        <Block title="Tabs & Rating">
          <Tabs value={tab} onChange={(_, value: string) => setTab(value)} aria-label="Sample tabs">
            <Tab value="one" label="League" />
            <Tab value="two" label="Quarter finals" />
            <Tab value="three" label="Final" />
          </Tabs>
          <ChipFilter
            ariaLabel="Segmented filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "a", label: "Team" },
              { value: "b", label: "Solo" },
            ]}
          />
          <Rating value={rating} onChange={(_, value) => setRating(value)} aria-label="Rating" />
        </Block>

        <Block title="Transfer list">
          <TransferList />
        </Block>

        <Block title="Form elements">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Text field
            <input className={fieldClass} placeholder="Type here" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            With error
            <input className={fieldErrorClass} defaultValue="x" />
            <span className="text-xs font-normal text-[var(--ops-danger)]">Name must be letters only.</span>
          </label>
          <SoftSelect aria-label="Select" defaultValue="team">
            <option value="team">Team</option>
            <option value="solo">Solo</option>
          </SoftSelect>
          <SoftSearch placeholder="Search" aria-label="Search" />
        </Block>

        <Block title="Typography">
          <Typography variant="h3">Heading 3 · 24</Typography>
          <Typography variant="h4">Heading 4 · 21</Typography>
          <Typography variant="h5">Heading 5 · 18</Typography>
          <Typography variant="h6">Heading 6 · 16</Typography>
          <Typography variant="subtitle1">Subtitle · 14</Typography>
          <Typography variant="body1">Body · 14 Onest</Typography>
          <Typography variant="body2" className="text-[var(--ops-text-muted)]">
            Muted body · 14
          </Typography>
        </Block>

        <Block title="Icons (Tabler)" wide>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {icons.map(([name, Icon]) => (
              <div key={name} className="flex flex-col items-center gap-2 rounded-xl border border-[var(--ops-line)] p-3">
                <Icon size={24} stroke={1.5} />
                <span className="text-center text-xs text-[var(--ops-text-muted)]">{name}</span>
              </div>
            ))}
          </div>
        </Block>
      </div>

      <TableCard
        title="Table"
        search={<TableSearch value={search} onChange={setSearch} placeholder="Search teams" />}
        toolbar={<ChipFilter ariaLabel="Table filter" value={filter} onChange={setFilter} options={[{ value: "a", label: "Team" }, { value: "b", label: "Solo" }]} />}
        action={<SoftButton variant="primary">Add team</SoftButton>}
        footer={<TablePager count={sampleRows.length} page={0} perPage={10} onPage={() => undefined} onPerPage={() => undefined} />}
      >
        <table>
          <thead>
            <tr>
              <SortTh label="Team" column="name" sort={sort} onSort={setSort} />
              <SortTh label="City" column="city" sort={sort} onSort={setSort} />
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sampleRows.map((row) => (
              <tr key={row.name}>
                <td className="font-semibold">{row.name}</td>
                <td>{row.city}</td>
                <td>
                  <StatusBadge tone={row.status === "completed" ? "success" : row.status === "scheduled" ? "info" : "warning"}>
                    {row.status}
                  </StatusBadge>
                </td>
                <td className="text-right">
                  <IconButton color="success" aria-label={`Edit ${row.name}`}>
                    <IconPencil size={18} className="text-[var(--ops-success)]" />
                  </IconButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
