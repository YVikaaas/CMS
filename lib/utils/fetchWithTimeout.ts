export class TimeoutError extends Error {
  constructor(url: string, ms: number) {
    super(
      `Request timed out after ${ms}ms: ${typeof url === "string" ? url : "(request)"}`,
    );
    this.name = "TimeoutError";
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = 20_000,
): Promise<Response> {
  const controller = new AbortController();
  const callerSignal = init?.signal as AbortSignal | undefined;
  if (callerSignal) {
    callerSignal.addEventListener("abort", () =>
      controller.abort(callerSignal.reason),
    );
  }
  const timeoutId = setTimeout(
    () => controller.abort(new TimeoutError(String(input), timeoutMs)),
    timeoutMs,
  );
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new TimeoutError(String(input), timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function isTimeoutError(err: unknown): err is TimeoutError {
  return err instanceof Error && err.name === "TimeoutError";
}
