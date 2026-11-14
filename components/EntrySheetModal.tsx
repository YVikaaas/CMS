"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Modal, fieldClass } from "@/components/Modal";
import { SoftButton } from "@/components/ops";
import { importCscTeams } from "@/lib/services";
import {
  downloadEntrySample,
  parseEntrySheetFile,
  type EntrySheetEntry,
  type EntrySheetIssue,
  type EntrySheetOptions,
} from "@/lib/utils/entrySheet";

export function EntrySheetModal({
  open,
  cscId,
  options,
  onClose,
  onImported,
}: {
  open: boolean;
  cscId: string;
  options: EntrySheetOptions;
  onClose: () => void;
  onImported: () => Promise<void> | void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [entries, setEntries] = useState<EntrySheetEntry[]>([]);
  const [errors, setErrors] = useState<EntrySheetIssue[]>([]);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const noun = options.kind === "athlete" ? "athletes" : "teams";

  const reset = () => {
    setFileName("");
    setEntries([]);
    setErrors([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const close = () => {
    reset();
    onClose();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    setFileName(file.name);
    try {
      const parsed = await parseEntrySheetFile(file, options);
      setEntries(parsed.entries);
      setErrors(parsed.errors);
      if (parsed.errors.length > 0) {
        toast.error("Fix the highlighted rows, then import again.");
      }
    } catch {
      setEntries([]);
      setErrors([{ row: 1, message: "Could not read that file. Use the sample Excel." }]);
      toast.error("Could not read that file.");
    }
    setReading(false);
  };

  const onImport = async () => {
    if (errors.length > 0 || entries.length === 0) return;
    setSaving(true);
    const result = await importCscTeams(
      cscId,
      entries.map((entry) => ({
        name: entry.name,
        orgName: entry.orgName,
        city: entry.city,
        members: entry.members,
      })),
    );
    setSaving(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    const failed = result.data?.failed ?? [];
    const created = result.data?.created ?? 0;
    if (created > 0) {
      toast.success(`Added ${created} ${noun}.`);
      await onImported();
    }
    if (failed.length > 0) {
      setErrors(
        failed.map((item) => ({
          row: entries.find((entry) => entry.name === item.name)?.sourceRow ?? 0,
          message: `${item.name}: ${item.message}`,
        })),
      );
      toast.error(`${failed.length} ${noun} could not be added.`);
      return;
    }
    close();
  };

  return (
    <Modal open={open} title={options.kind === "athlete" ? "Import athletes" : "Import teams"} onClose={close}>
      <div className="grid gap-3">
        <p className="text-sm text-[var(--ops-text-muted)]">
          {options.kind === "athlete"
            ? "Athlete sample: one row is one athlete. Organization and city are separate columns."
            : `Team sample: one row is one member. Repeat the same Team name for every player. Organization and city are separate columns. This category needs ${options.minMembers}–${options.maxMembers} members per team.`}
        </p>
        <div className="rounded-xl border border-[var(--ops-line)] bg-[var(--ops-board-muted)] p-3 text-sm">
          <p className="font-medium">Example</p>
          {options.kind === "athlete" ? (
            <p className="mt-2 font-mono text-[12px] leading-6 text-[var(--ops-text-muted)]">
              Name, Phone, Organization, City
              <br />
              Rohan Sharma, 9876500101, Delhi Public School, Delhi
              <br />
              Amit Patel, 9876500102, Mumbai Sports Club, Mumbai
            </p>
          ) : (
            <p className="mt-2 font-mono text-[12px] leading-6 text-[var(--ops-text-muted)]">
              Team name, Organization, City, Member name, Phone
              <br />
              Titans, Delhi Public School, Delhi, Rohan Sharma, 9876500101
              <br />
              Titans, Delhi Public School, Delhi, Amit Patel, 9876500102
              <br />
              Falcons, Mumbai Sports Club, Mumbai, Karan Mehta, 9876500103
            </p>
          )}
          <p className="mt-2 text-[var(--ops-text-muted)]">
            {options.kind === "athlete"
              ? "Leave organization or city blank if you do not have it. Do not put the city in the organization column."
              : "Same team name = same team. Leave organization or city blank if you do not have it. Do not put the city in the organization column."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SoftButton
            onClick={async () => {
              await downloadEntrySample(options);
            }}
          >
            {options.kind === "athlete" ? "Download athlete sample" : "Download team sample"}
          </SoftButton>
          <SoftButton onClick={() => inputRef.current?.click()} loading={reading}>
            Choose Excel
          </SoftButton>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              void onFile(file);
            }}
          />
        </div>
        {fileName ? (
          <p className="text-sm">
            {fileName}
            {errors.length === 0 && entries.length > 0
              ? ` — ${entries.length} ${noun} ready.`
              : null}
          </p>
        ) : (
          <input readOnly value="" placeholder="No file chosen" className={fieldClass} />
        )}
        {errors.length > 0 ? (
          <ul className="max-h-48 overflow-y-auto rounded-xl border border-[var(--ops-line)] p-3 text-sm text-[var(--ops-danger)]">
            {errors.slice(0, 20).map((item, index) => (
              <li key={`${item.row}-${index}`}>
                {item.row > 0 ? `Row ${item.row}: ` : null}
                {item.message}
              </li>
            ))}
            {errors.length > 20 ? <li>And {errors.length - 20} more.</li> : null}
          </ul>
        ) : null}
        <div className="flex gap-2">
          <SoftButton
            variant="primary"
            loading={saving}
            disabled={reading || errors.length > 0 || entries.length === 0}
            onClick={() => void onImport()}
          >
            Import {noun}
          </SoftButton>
          <SoftButton onClick={close}>Cancel</SoftButton>
        </div>
      </div>
    </Modal>
  );
}
