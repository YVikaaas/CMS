import { createBrowserClient } from "@supabase/ssr";
import { fetchWithTimeout } from "@/lib/utils/fetchWithTimeout";

function makeFetch(timeoutMs: number) {
  return (input: RequestInfo | URL, init?: RequestInit) =>
    fetchWithTimeout(input, init, timeoutMs);
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: {
        fetch: makeFetch(20_000),
      },
    },
  );
}
