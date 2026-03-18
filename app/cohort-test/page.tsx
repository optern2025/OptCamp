"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Cohort, UserProfile } from "@/lib/types";

interface CohortTestPayload {
  user: UserProfile;
  pursuingCohorts: Cohort[];
  cohorts: Cohort[];
}

export default function CohortTestPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [payload, setPayload] = useState<CohortTestPayload | null>(null);

  const primaryCohort = payload?.pursuingCohorts[0] ?? null;
  const canStartQualifier = Boolean(primaryCohort);
  const pursuingIds = new Set(
    payload?.pursuingCohorts.map((item) => item.id) ?? [],
  );

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/me/cohort-test", {
        method: "GET",
      });

      if (response.status === 401) {
        setPayload(null);
        return;
      }

      const data = (await response.json()) as CohortTestPayload & {
        error?: string;
      };

      if (!response.ok) {
        setErrorMessage(data.error ?? "Failed to load cohort dashboard.");
        setPayload(null);
        return;
      }

      setPayload(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unexpected error while loading dashboard.",
      );
      setPayload(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <main className="min-h-screen bg-[#0B0F14] text-white px-4 py-16">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tight">
              Cohort Test Dashboard
            </h1>
            <p className="text-white/60 font-bold uppercase tracking-widest text-xs mt-2">
              Track your active cohorts and launch the qualifier
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-5 py-3 border border-cyan-500 text-cyan-500 font-black uppercase tracking-widest text-xs hover:bg-cyan-500 hover:text-black transition-colors"
            >
              Back Home
            </Link>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>

        <SignedOut>
          <section className="border border-white/10 bg-black/30 p-8 max-w-2xl">
            <h2 className="text-2xl font-black uppercase tracking-tight mb-2">
              Sign in to continue
            </h2>
            <p className="text-white/60 font-bold uppercase tracking-widest text-xs mb-8">
              Use your Optern account credentials
            </p>
            <div className="flex flex-wrap gap-3">
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="px-6 py-3 bg-cyan-500 text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-cyan-400 transition-colors"
                >
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="px-6 py-3 border border-cyan-500 text-cyan-500 font-black uppercase tracking-[0.2em] text-xs hover:bg-cyan-500 hover:text-black transition-colors"
                >
                  Create Account
                </button>
              </SignUpButton>
            </div>
          </section>
        </SignedOut>

        <SignedIn>
          {isLoading && (
            <section className="border border-white/10 bg-black/30 p-8">
              <p className="font-bold uppercase tracking-widest text-sm text-white/60">
                Loading your cohort data...
              </p>
            </section>
          )}

          {!isLoading && errorMessage && (
            <section className="border border-red-500/30 bg-red-500/10 p-8">
              <p className="text-red-300 font-bold uppercase tracking-widest text-xs">
                {errorMessage}
              </p>
            </section>
          )}

          {!isLoading && payload && (
            <div className="space-y-8">
              <section className="border border-white/10 bg-black/30 p-8">
                <h2 className="text-2xl font-black uppercase tracking-tight mb-4">
                  Your Active Cohorts
                </h2>

                {payload.pursuingCohorts.length === 0 && (
                  <p className="text-yellow-300 font-bold uppercase tracking-widest text-xs">
                    No active cohorts yet. Apply to a sprint to get started.
                  </p>
                )}

                {payload.pursuingCohorts.length > 0 && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {payload.pursuingCohorts.map((cohort) => (
                      <div
                        key={cohort.id}
                        className="border border-white/10 p-4"
                      >
                        <h3 className="text-lg font-black uppercase tracking-tight mb-3">
                          {cohort.type}
                        </h3>
                        <div className="grid gap-2 text-xs uppercase tracking-widest font-bold text-white/70">
                          <p>
                            <span className="text-white/40">Apply Window:</span>{" "}
                            {cohort.apply_window}
                          </p>
                          <p>
                            <span className="text-white/40">Sprint Window:</span>{" "}
                            {cohort.sprint_window}
                          </p>
                          <p>
                            <span className="text-white/40">Apply By:</span>{" "}
                            {cohort.apply_by}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <>
                  <Link
                    href="/cohort-test/proctor"
                    className={`px-6 py-3 font-black uppercase tracking-[0.2em] text-xs transition-colors ${
                      canStartQualifier
                        ? "bg-cyan-500 text-black hover:bg-cyan-400"
                        : "bg-white/10 text-white/30 cursor-not-allowed pointer-events-none"
                    }`}
                  >
                    Start Proctored Qualifier
                  </Link>
                  <a
                    href={primaryCohort?.qualifier_test_url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className={`px-6 py-3 font-black uppercase tracking-[0.2em] text-xs transition-colors ${
                      primaryCohort?.qualifier_test_url
                        ? "border border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-black"
                        : "bg-white/10 text-white/30 cursor-not-allowed pointer-events-none"
                    }`}
                  >
                    Open External Qualifier
                  </a>
                  </>
                </div>
              </section>

              <section className="border border-white/10 bg-black/30 p-8">
                <h2 className="text-2xl font-black uppercase tracking-tight mb-6">
                  All Cohorts
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {payload.cohorts.map((cohort) => {
                    const isPursuing = pursuingIds.has(cohort.id);
                    return (
                      <div
                        key={cohort.id}
                        className={`p-5 border ${
                          isPursuing
                            ? "border-cyan-500 bg-cyan-500/10"
                            : "border-white/10"
                        }`}
                      >
                        <h3 className="text-xl font-black uppercase tracking-tight mb-4">
                          {cohort.type}
                        </h3>
                        <div className="space-y-2 text-[10px] uppercase tracking-widest font-bold text-white/60">
                          <p>Apps: {cohort.apply_window}</p>
                          <p>Sprint: {cohort.sprint_window}</p>
                          <p>Apply By: {cohort.apply_by}</p>
                          <p>
                            Status: {cohort.is_active ? "Active" : "Upcoming"}
                          </p>
                        </div>
                        {isPursuing && (
                          <p className="mt-4 text-cyan-400 text-[10px] uppercase tracking-widest font-black">
                            Pursuing
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </SignedIn>
      </div>
    </main>
  );
}
