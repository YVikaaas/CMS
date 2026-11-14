import type { Gender, TeamMemberInput } from "@/lib/types/cms";
import { nameError, optionalNameError, phoneError } from "@/lib/utils/validation";
import { slugify } from "@/lib/utils/slug";

export type EntrySheetKind = "athlete" | "team";

export type EntrySheetOptions = {
  kind: EntrySheetKind;
  minMembers: number;
  maxMembers: number;
  gender: Gender;
  label: string;
};

export type EntrySheetEntry = {
  name: string;
  orgName: string | null;
  city: string | null;
  members: TeamMemberInput[];
  sourceRow: number;
};

export type EntrySheetIssue = {
  row: number;
  message: string;
};

export type EntrySheetParse = {
  entries: EntrySheetEntry[];
  errors: EntrySheetIssue[];
};

const MAX_ROWS = 200;
const SAMPLE_NAMES = [
  "Rohan Sharma",
  "Amit Patel",
  "Karan Mehta",
  "Harsh Joshi",
  "Yash Malhotra",
  "Neel Kapoor",
  "Aditya Kale",
  "Sahil Banerjee",
  "Ishan Deshmukh",
  "Veer Khanna",
  "Rehan Qureshi",
  "Kabir Anand",
  "Manav Gupta",
  "Parth Shah",
  "Sagar Patil",
];

function normHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function cellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  const raw = String(value).trim();
  if (!raw) return "";
  if (/e[+-]?\d+$/i.test(raw)) {
    const n = Number(raw);
    if (Number.isFinite(n)) return String(Math.trunc(n));
  }
  return raw.replace(/^'/, "");
}

function cellPhone(value: unknown): string {
  return cellText(value).replace(/\D/g, "").slice(0, 10);
}

function classifyHeader(
  header: string,
): { key: "name" | "phone" | "org" | "city" | "team" | "mname" | "mphone"; n?: number } | null {
  const n = normHeader(header);
  if (!n) return null;
  if (n === "team" || n === "team name") return { key: "team" };
  if (n === "city" || n === "town" || n === "location") return { key: "city" };
  if (
    n === "organization" ||
    n === "organisation" ||
    n === "org" ||
    n === "school" ||
    n === "club" ||
    n === "academy"
  ) {
    return { key: "org" };
  }
  if (
    n === "name" ||
    n === "athlete" ||
    n === "athlete name" ||
    n === "player" ||
    n === "player name" ||
    n === "member" ||
    n === "member name"
  ) {
    return { key: "name" };
  }
  if (
    n === "phone" ||
    n === "mobile" ||
    n === "mobile number" ||
    n === "phone number" ||
    n === "contact" ||
    n === "member phone"
  ) {
    return { key: "phone" };
  }
  const named = n.match(/^(?:(?:member|player|athlete)(?: name)?|name) (\d+)$/);
  if (named) return { key: "mname", n: Number(named[1]) };
  const namedFlip = n.match(/^(?:member|player|athlete) (\d+) name$/);
  if (namedFlip) return { key: "mname", n: Number(namedFlip[1]) };
  const phoned = n.match(/^(?:(?:member|player|athlete) )?phone(?: number)? (\d+)$/);
  if (phoned) return { key: "mphone", n: Number(phoned[1]) };
  const phonedFlip = n.match(/^(?:member|player|athlete) (\d+) phone(?: number)?$/);
  if (phonedFlip) return { key: "mphone", n: Number(phonedFlip[1]) };
  return null;
}

export function entrySheetHeaders(options: EntrySheetOptions): string[] {
  if (options.kind === "athlete") return ["Name", "Phone", "Organization", "City"];
  return ["Team name", "Organization", "City", "Member name", "Phone"];
}

function samplePeople(count: number, seed: number): { name: string; phone: string }[] {
  return Array.from({ length: count }, (_, i) => ({
    name: SAMPLE_NAMES[(seed + i) % SAMPLE_NAMES.length],
    phone: String(9876500101 + seed * 20 + i),
  }));
}

export function entrySheetSampleRows(options: EntrySheetOptions): string[][] {
  const headers = entrySheetHeaders(options);
  if (options.kind === "athlete") {
    return [
      headers,
      ["Rohan Sharma", "9876500101", "Delhi Public School", "Delhi"],
      ["Amit Patel", "9876500102", "Mumbai Sports Club", "Mumbai"],
    ];
  }
  const rows: string[][] = [headers];
  const teams = [
    { name: "Titans", org: "Delhi Public School", city: "Delhi" },
    { name: "Falcons", org: "Mumbai Sports Club", city: "Mumbai" },
  ];
  teams.forEach((team, index) => {
    if (index > 0) rows.push(["", "", "", "", ""]);
    samplePeople(options.minMembers, index * 8).forEach((person) => {
      rows.push([team.name, team.org, team.city, person.name, person.phone]);
    });
  });
  return rows;
}

function teamGuideRows(options: EntrySheetOptions): string[][] {
  return [
    ["Team Excel"],
    [""],
    ["One row is one member. Repeat the same Team name for every player on that team."],
    [`This category needs ${options.minMembers} to ${options.maxMembers} members on each team.`],
    ["Names are letters only. Phone is 10 digits starting with 6-9."],
    [""],
    ["Columns on the Teams sheet"],
    ["Team name", "Same name on every member row of that team."],
    ["Organization", "School or club name. Not the city."],
    ["City", "City name. Not the organization."],
    ["Member name", "That player's name."],
    ["Phone", "That player's phone."],
    [""],
    ["Do not put every member in one row. Copy the team name down."],
  ];
}

function athleteGuideRows(): string[][] {
  return [
    ["Athlete Excel"],
    [""],
    ["One row is one athlete."],
    ["Columns: Name, Phone, Organization, City. Organization is the school or club. City is the city."],
    ["Names are letters only. Phone is 10 digits starting with 6-9."],
  ];
}

export function entrySheetFileName(options: EntrySheetOptions): string {
  const base = slugify(options.label) || "category";
  return options.kind === "athlete" ? `${base}-athletes.xlsx` : `${base}-teams.xlsx`;
}

async function workbook(): Promise<typeof import("xlsx")> {
  const mod = await import("xlsx");
  return ((mod as { default?: typeof import("xlsx") }).default ?? mod) as typeof import("xlsx");
}

function freezeSheet(
  XLSX: typeof import("xlsx"),
  rows: string[][],
  widths: number[],
) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];
      if (!cell) continue;
      cell.t = "s";
      cell.v = String(cell.v ?? "");
      cell.z = "@";
    }
  }
  sheet["!cols"] = widths.map((wch) => ({ wch }));
  return sheet;
}

export async function downloadEntrySample(options: EntrySheetOptions): Promise<void> {
  const XLSX = await workbook();
  const book = XLSX.utils.book_new();
  if (options.kind === "athlete") {
    XLSX.utils.book_append_sheet(
      book,
      freezeSheet(XLSX, entrySheetSampleRows(options), [18, 14, 22, 14]),
      "Athletes",
    );
    XLSX.utils.book_append_sheet(book, freezeSheet(XLSX, athleteGuideRows(), [72]), "How to fill");
  } else {
    XLSX.utils.book_append_sheet(
      book,
      freezeSheet(XLSX, entrySheetSampleRows(options), [16, 22, 14, 18, 14]),
      "Teams",
    );
    XLSX.utils.book_append_sheet(book, freezeSheet(XLSX, teamGuideRows(options), [22, 56]), "How to fill");
  }
  XLSX.writeFile(book, entrySheetFileName(options));
}

function pickDataSheet(book: import("xlsx").WorkBook) {
  const skip = /how to fill|instruction/i;
  const preferred = book.SheetNames.find((name) => /^(teams|athletes|members)$/i.test(name));
  if (preferred) return book.Sheets[preferred];
  const first = book.SheetNames.find((name) => !skip.test(name));
  return first ? book.Sheets[first] : undefined;
}

export async function parseEntrySheetFile(
  file: File,
  options: EntrySheetOptions,
): Promise<EntrySheetParse> {
  const XLSX = await workbook();
  const buffer = await file.arrayBuffer();
  const book = XLSX.read(buffer, { type: "array", raw: false, cellDates: false });
  const sheet = pickDataSheet(book);
  if (!sheet) return { entries: [], errors: [{ row: 1, message: "The file has no sheet." }] };
  const aoa = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
  return parseEntrySheet(aoa, options);
}

function headerMap(headerRow: Array<string | number | null | undefined>) {
  const cols = headerRow.map((cell) => classifyHeader(cellText(cell)));
  const colOf = (key: "name" | "phone" | "org" | "city" | "team") =>
    cols.findIndex((col) => col?.key === key);
  const memberIndexes = (key: "mname" | "mphone") => {
    const found: Array<{ n: number; i: number }> = [];
    cols.forEach((col, i) => {
      if (col?.key === key && col.n) found.push({ n: col.n, i });
    });
    return found.sort((a, b) => a.n - b.n);
  };
  return {
    teamCol: colOf("team"),
    nameCol: colOf("name"),
    phoneCol: colOf("phone"),
    orgCol: colOf("org"),
    cityCol: colOf("city"),
    memberNames: memberIndexes("mname"),
    memberPhones: memberIndexes("mphone"),
  };
}

function parseTeamLong(
  body: Array<Array<string | number | null | undefined>>,
  headerIndex: number,
  cols: ReturnType<typeof headerMap>,
  options: EntrySheetOptions,
): EntrySheetParse {
  const errors: EntrySheetIssue[] = [];
  const people = new Set<string>();
  const groups = new Map<
    string,
    { name: string; orgName: string | null; city: string | null; members: TeamMemberInput[]; sourceRow: number }
  >();

  body.forEach((raw, offset) => {
    const excelRow = headerIndex + offset + 2;
    const row = raw ?? [];
    if (row.every((cell) => !cellText(cell))) return;

    const teamName = cellText(row[cols.teamCol]);
    const orgName = cols.orgCol >= 0 ? cellText(row[cols.orgCol]) : "";
    const city = cols.cityCol >= 0 ? cellText(row[cols.cityCol]) : "";
    const memberName = cellText(row[cols.nameCol]);
    const memberPhone = cellPhone(row[cols.phoneCol]);

    const teamErr = nameError(teamName, "Team name");
    const orgErr = optionalNameError(orgName, "Organization");
    const cityErr = optionalNameError(city, "City");
    const memberNameErr = nameError(memberName, "Member name");
    const memberPhoneErr = phoneError(memberPhone, "Phone");
    if (teamErr) errors.push({ row: excelRow, message: teamErr });
    if (orgErr) errors.push({ row: excelRow, message: orgErr });
    if (cityErr) errors.push({ row: excelRow, message: cityErr });
    if (memberNameErr) errors.push({ row: excelRow, message: memberNameErr });
    if (memberPhoneErr) errors.push({ row: excelRow, message: memberPhoneErr });
    if (teamErr || orgErr || cityErr || memberNameErr || memberPhoneErr) return;

    const personKey = `${memberName.trim().toLowerCase()}|${memberPhone}`;
    if (people.has(personKey)) {
      errors.push({ row: excelRow, message: `${memberName} / ${memberPhone} is listed twice.` });
      return;
    }
    people.add(personKey);

    const key = teamName.trim().toLowerCase();
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        name: teamName.trim(),
        orgName: orgName || null,
        city: city || null,
        members: [{ name: memberName, phone: memberPhone, gender: options.gender }],
        sourceRow: excelRow,
      });
      return;
    }
    if (orgName && existing.orgName && orgName.trim().toLowerCase() !== existing.orgName.trim().toLowerCase()) {
      errors.push({
        row: excelRow,
        message: `${teamName} has two organizations. Use one organization per team.`,
      });
    }
    if (city && existing.city && city.trim().toLowerCase() !== existing.city.trim().toLowerCase()) {
      errors.push({
        row: excelRow,
        message: `${teamName} has two cities. Use one city per team.`,
      });
    }
    if (!existing.orgName && orgName) existing.orgName = orgName;
    if (!existing.city && city) existing.city = city;
    existing.members.push({ name: memberName, phone: memberPhone, gender: options.gender });
  });

  const entries: EntrySheetEntry[] = [];
  for (const team of groups.values()) {
    if (team.members.length < options.minMembers || team.members.length > options.maxMembers) {
      errors.push({
        row: team.sourceRow,
        message: `${team.name} needs ${options.minMembers} to ${options.maxMembers} members. It has ${team.members.length}.`,
      });
      continue;
    }
    entries.push(team);
  }

  if (entries.length === 0 && errors.length === 0) {
    errors.push({ row: headerIndex + 1, message: "No data rows under the header." });
  }
  return { entries, errors };
}

function parseTeamWide(
  body: Array<Array<string | number | null | undefined>>,
  headerIndex: number,
  cols: ReturnType<typeof headerMap>,
  options: EntrySheetOptions,
): EntrySheetParse {
  const errors: EntrySheetIssue[] = [];
  const entries: EntrySheetEntry[] = [];
  const teamNames = new Set<string>();
  const people = new Set<string>();

  body.forEach((raw, offset) => {
    const excelRow = headerIndex + offset + 2;
    const row = raw ?? [];
    if (row.every((cell) => !cellText(cell))) return;

    const before = errors.length;
    const orgName = cols.orgCol >= 0 ? cellText(row[cols.orgCol]) : "";
    const city = cols.cityCol >= 0 ? cellText(row[cols.cityCol]) : "";
    const orgErr = optionalNameError(orgName, "Organization");
    const cityErr = optionalNameError(city, "City");
    if (orgErr) errors.push({ row: excelRow, message: orgErr });
    if (cityErr) errors.push({ row: excelRow, message: cityErr });

    const teamName = cellText(row[cols.teamCol]);
    const teamErr = nameError(teamName, "Team name");
    if (teamErr) errors.push({ row: excelRow, message: teamErr });
    if (teamName && teamNames.has(teamName.trim().toLowerCase())) {
      errors.push({ row: excelRow, message: `${teamName} is listed twice.` });
    }

    const members: TeamMemberInput[] = [];
    const maxN = Math.max(
      options.maxMembers,
      ...cols.memberNames.map((item) => item.n),
      ...cols.memberPhones.map((item) => item.n),
    );
    for (let n = 1; n <= maxN; n += 1) {
      const nameIdx = cols.memberNames.find((item) => item.n === n)?.i;
      const phoneIdx = cols.memberPhones.find((item) => item.n === n)?.i;
      const memberName = nameIdx != null ? cellText(row[nameIdx]) : "";
      const memberPhone = phoneIdx != null ? cellPhone(row[phoneIdx]) : "";
      if (!memberName && !memberPhone) continue;
      if (n > options.maxMembers) {
        errors.push({
          row: excelRow,
          message: `This category allows at most ${options.maxMembers} members.`,
        });
        continue;
      }
      const memberNameErr = nameError(memberName, `Name ${n}`);
      const memberPhoneErr = phoneError(memberPhone, `Phone ${n}`);
      if (memberNameErr) errors.push({ row: excelRow, message: memberNameErr });
      if (memberPhoneErr) errors.push({ row: excelRow, message: memberPhoneErr });
      if (memberNameErr || memberPhoneErr) continue;
      const personKey = `${memberName.trim().toLowerCase()}|${memberPhone}`;
      if (people.has(personKey)) {
        errors.push({
          row: excelRow,
          message: `${memberName} / ${memberPhone} is listed twice.`,
        });
        continue;
      }
      people.add(personKey);
      members.push({ name: memberName, phone: memberPhone, gender: options.gender });
    }

    if (members.length < options.minMembers || members.length > options.maxMembers) {
      errors.push({
        row: excelRow,
        message: `This category needs ${options.minMembers} to ${options.maxMembers} members.`,
      });
    }
    if (errors.length > before) return;
    teamNames.add(teamName.trim().toLowerCase());
    entries.push({
      name: teamName,
      orgName: orgName || null,
      city: city || null,
      members,
      sourceRow: excelRow,
    });
  });

  if (entries.length === 0 && errors.length === 0) {
    errors.push({ row: headerIndex + 1, message: "No data rows under the header." });
  }
  return { entries, errors };
}

export function parseEntrySheet(
  aoa: Array<Array<string | number | null | undefined>>,
  options: EntrySheetOptions,
): EntrySheetParse {
  const headerIndex = aoa.findIndex((row) =>
    (row ?? []).some((cell) => String(cell ?? "").trim()),
  );
  if (headerIndex < 0) {
    return { entries: [], errors: [{ row: 1, message: "The sheet is empty." }] };
  }

  const cols = headerMap(aoa[headerIndex] ?? []);
  const body = aoa.slice(headerIndex + 1);
  if (body.length > MAX_ROWS) {
    return {
      entries: [],
      errors: [{ row: 1, message: `Import at most ${MAX_ROWS} rows at a time.` }],
    };
  }

  if (options.kind === "athlete") {
    if (cols.nameCol < 0 || cols.phoneCol < 0 || cols.orgCol < 0 || cols.cityCol < 0) {
      return {
        entries: [],
        errors: [
          {
            row: headerIndex + 1,
            message: "Use columns Name, Phone, Organization, and City. Download a fresh athlete sample.",
          },
        ],
      };
    }
    const errors: EntrySheetIssue[] = [];
    const entries: EntrySheetEntry[] = [];
    const teamNames = new Set<string>();
    const people = new Set<string>();
    body.forEach((raw, offset) => {
      const excelRow = headerIndex + offset + 2;
      const row = raw ?? [];
      if (row.every((cell) => !cellText(cell))) return;
      const before = errors.length;
      const orgName = cols.orgCol >= 0 ? cellText(row[cols.orgCol]) : "";
      const city = cols.cityCol >= 0 ? cellText(row[cols.cityCol]) : "";
      const orgErr = optionalNameError(orgName, "Organization");
      const cityErr = optionalNameError(city, "City");
      if (orgErr) errors.push({ row: excelRow, message: orgErr });
      if (cityErr) errors.push({ row: excelRow, message: cityErr });
      const name = cellText(row[cols.nameCol]);
      const phone = cellPhone(row[cols.phoneCol]);
      const nameErr = nameError(name, "Athlete name");
      const phoneErr = phoneError(phone, "Phone");
      if (nameErr) errors.push({ row: excelRow, message: nameErr });
      if (phoneErr) errors.push({ row: excelRow, message: phoneErr });
      const personKey = `${name.trim().toLowerCase()}|${phone}`;
      if (name && phone && people.has(personKey)) {
        errors.push({ row: excelRow, message: `${name} / ${phone} is listed twice.` });
      }
      if (name && teamNames.has(name.trim().toLowerCase())) {
        errors.push({ row: excelRow, message: `${name} is listed twice.` });
      }
      if (errors.length > before) return;
      people.add(personKey);
      teamNames.add(name.trim().toLowerCase());
      entries.push({
        name,
        orgName: orgName || null,
        city: city || null,
        members: [{ name, phone, gender: options.gender }],
        sourceRow: excelRow,
      });
    });
    if (entries.length === 0 && errors.length === 0) {
      errors.push({ row: headerIndex + 1, message: "No data rows under the header." });
    }
    return { entries, errors };
  }

  if (cols.teamCol < 0 || cols.orgCol < 0 || cols.cityCol < 0) {
    return {
      entries: [],
      errors: [
        {
          row: headerIndex + 1,
          message:
            "Use columns Team name, Organization, City, Member name, and Phone. Download a fresh team sample.",
        },
      ],
    };
  }

  if (cols.memberNames.length > 0) {
    return parseTeamWide(body, headerIndex, cols, options);
  }
  if (cols.nameCol < 0 || cols.phoneCol < 0) {
    return {
      entries: [],
      errors: [
        {
          row: headerIndex + 1,
          message:
            "Use columns Team name, Organization, City, Member name, and Phone. One member per row.",
        },
      ],
    };
  }
  return parseTeamLong(body, headerIndex, cols, options);
}
