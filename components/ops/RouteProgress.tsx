"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export function RouteProgress() {
  const pathname = usePathname();
  const [on, setOn] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    const start = (event: MouseEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const link = (event.target as HTMLElement | null)?.closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      } catch {
        return;
      }
      setOn(true);
    };
    document.addEventListener("click", start, true);
    return () => document.removeEventListener("click", start, true);
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setOn(true);
    const done = window.setTimeout(() => setOn(false), 420);
    return () => window.clearTimeout(done);
  }, [pathname]);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[80] h-0.5 overflow-hidden transition-opacity duration-150",
        on ? "opacity-100" : "opacity-0",
      )}
      aria-hidden
    >
      <div className="ops-route-bar h-full w-1/3 rounded-full bg-[var(--ops-primary)]" />
    </div>
  );
}
