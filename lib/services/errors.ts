import type { ServiceError } from "@/lib/types/cms";

export function toServiceError(error: { message?: string } | null): ServiceError {
  return { message: error?.message || "Something went wrong." };
}
