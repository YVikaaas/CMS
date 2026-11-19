import type { ServiceError } from "@/lib/types/cms";

export function toServiceError(error: { message?: string } | null): ServiceError {
  const message = error?.message || "Something went wrong.";
  return {
    message: message.replace(/championship/gi, (match) => (match[0] === "C" ? "Event" : "event")),
  };
}
