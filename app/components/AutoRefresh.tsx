"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * AutoRefresh: Silently refreshes the current server component page
 * - On window focus
 * - Every 15 seconds while tab is visible
 * This ensures user cohort dashboard stays in sync after admin changes.
 */
export default function AutoRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const refresh = () => router.refresh();

    // Refresh on window focus
    window.addEventListener("focus", refresh);

    // Refresh on visibility change (tab switch)
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);

    // Periodic refresh
    intervalRef.current = setInterval(refresh, intervalMs);

    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [router, intervalMs]);

  return null; // renders nothing
}
