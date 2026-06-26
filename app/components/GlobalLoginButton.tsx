"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

// Routes where the Login/Apply button should NOT appear
const AUTHENTICATED_PREFIXES = ["/dashboard", "/admin", "/screening", "/cohort-test", "/cohorts/"];

export default function GlobalLoginButton() {
  const pathname = usePathname();

  const isAuthenticatedRoute = AUTHENTICATED_PREFIXES.some(prefix =>
    pathname.startsWith(prefix)
  );

  // Also hide on /auth itself and /auth/callback
  const isAuthPage = pathname.startsWith("/auth");

  if (isAuthenticatedRoute || isAuthPage) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-[200] flex items-center gap-2">
      <Link href="/auth">
        <button
          type="button"
          className="px-3 py-2 bg-cyan-500 text-black font-black tracking-widest text-[10px] hover:bg-cyan-400 transition-colors"
        >
          Login / Apply
        </button>
      </Link>
    </div>
  );
}
