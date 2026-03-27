"use client";

import Link from "next/link";

export default function RetiredStagePage() {
  return (
    <main className="min-h-screen bg-[#071018] px-4 py-10 text-white">
      <section className="mx-auto max-w-4xl rounded-[24px] border border-white/10 bg-black/30 p-8">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-300/75">
          Sprint Update
        </p>
        <h1 className="mt-3 text-3xl font-black uppercase tracking-tight">
          Stage assessments are no longer active
        </h1>
        <p className="mt-4 text-sm font-bold uppercase tracking-[0.16em] text-white/60">
          The enrolled cohort flow now uses day-by-day sprint submissions
          instead of stage answer sheets. Open the dashboard to continue with
          the current sprint experience.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex border border-cyan-400 px-5 py-3 text-xs font-black uppercase tracking-[0.24em] text-cyan-300 transition-colors hover:bg-cyan-400 hover:text-black"
        >
          Back Dashboard
        </Link>
      </section>
    </main>
  );
}
