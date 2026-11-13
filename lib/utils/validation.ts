const NAME_RE = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
const PHONE_RE = /^[6-9][0-9]{9}$/;

/** Strip everything except letters and spaces while typing a name. */
export function sanitizeNameInput(raw: string): string {
  return raw
    .replace(/[^A-Za-z ]/g, "")
    .replace(/ +/g, " ")
    .replace(/^ /, "");
}

/** Keep at most 10 digits; first digit must be 6–9. */
export function sanitizePhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (!digits) return "";
  if (!/^[6-9]/.test(digits)) return "";
  return digits;
}

export function isValidName(value: string): boolean {
  return NAME_RE.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  return PHONE_RE.test(value.trim());
}

export function nameError(value: string, label = "Name"): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (!isValidName(trimmed)) return `${label} can only contain letters.`;
  return null;
}

export function phoneError(value: string, label = "Phone"): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (!isValidPhone(trimmed)) {
    return `${label} must be 10 digits starting with 6-9.`;
  }
  return null;
}

export function optionalNameError(value: string, label: string): string | null {
  if (!value.trim()) return null;
  return nameError(value, label);
}

/** Keep digits only (basketball points / fouls). */
export function sanitizeDigitInput(raw: string, maxLen = 3): string {
  return raw.replace(/\D/g, "").slice(0, maxLen);
}
