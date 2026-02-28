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
  assignedCohort: Cohort | null;
  cohorts: Cohort[];
}

export default function CohortTestPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [payload, setPayload] = useState<CohortTestPayload | null>(null);

  const [sendMessage, setSendMessage] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSendingQualifier, setIsSendingQualifier] = useState(false);

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

  const handleSendQualifierEmail = async () => {
    setSendMessage(null);
    setSendError(null);
    setIsSendingQualifier(true);

    try {
      const response = await fetch("/api/qualifier/send", {
        method: "POST",
      });

      const data = (await response.json()) as {
        error?: string;
        alreadySent?: boolean;
      };

      if (!response.ok) {
        setSendError(data.error ?? "Failed to send qualifier email.");
        return;
      }

      setSendMessage(
        data.alreadySent
          ? "Qualifier email was already sent to your inbox."
          : "Qualifier email has been sent successfully.",
      );

      await loadDashboard();
    } catch (error) {
      setSendError(
        error instanceof Error
          ? error.message
          : "Failed to send qualifier email.",
      );
    } finally {
      setIsSendingQualifier(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0F14] text-white px-4 py-16">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tight">
              Cohort Test Dashboard
            </h1>
            <p className="text-white/60 font-bold uppercase tracking-widest text-xs mt-2">
              Verify cohort assignment and launch qualifier test
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
                  Your Assigned Cohort
                </h2>

                {!payload.assignedCohort && (
                  <p className="text-yellow-300 font-bold uppercase tracking-widest text-xs">
                    No cohort is assigned yet. Contact support before attempting
                    the qualifier test.
                  </p>
                )}

                {payload.assignedCohort && (
                  <div className="grid gap-2 text-xs uppercase tracking-widest font-bold text-white/70">
                    <p>
                      <span className="text-white/40">Cohort:</span>{" "}
                      {payload.assignedCohort.type}
                    </p>
                    <p>
                      <span className="text-white/40">Apply Window:</span>{" "}
                      {payload.assignedCohort.apply_window}
                    </p>
                    <p>
                      <span className="text-white/40">Sprint Window:</span>{" "}
                      {payload.assignedCohort.sprint_window}
                    </p>
                    <p>
                      <span className="text-white/40">Apply By:</span>{" "}
                      {payload.assignedCohort.apply_by}
                    </p>
                    <p>
                      <span className="text-white/40">Email Verified:</span>{" "}
                      {payload.user.email_verified ? "Yes" : "No"}
                    </p>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href={payload.assignedCohort?.qualifier_test_url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className={`px-6 py-3 font-black uppercase tracking-[0.2em] text-xs transition-colors ${
                      payload.assignedCohort?.qualifier_test_url &&
                      payload.user.email_verified
                        ? "bg-cyan-500 text-black hover:bg-cyan-400"
                        : "bg-white/10 text-white/30 cursor-not-allowed pointer-events-none"
                    }`}
                  >
                    Start Qualifier Test
                  </a>
                  <button
                    type="button"
                    onClick={handleSendQualifierEmail}
                    disabled={isSendingQualifier}
                    className="px-6 py-3 border border-cyan-500 text-cyan-500 font-black uppercase tracking-[0.2em] text-xs hover:bg-cyan-500 hover:text-black transition-colors disabled:opacity-70"
                  >
                    {isSendingQualifier ? "Sending..." : "Send Qualifier Email"}
                  </button>
                </div>

                {sendMessage && (
                  <p className="mt-4 text-cyan-400 text-xs font-bold uppercase tracking-widest">
                    {sendMessage}
                  </p>
                )}
                {sendError && (
                  <p className="mt-4 text-red-400 text-xs font-bold uppercase tracking-widest">
                    {sendError}
                  </p>
                )}
              </section>

              <section className="border border-white/10 bg-black/30 p-8">
                <h2 className="text-2xl font-black uppercase tracking-tight mb-6">
                  All Cohorts
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {payload.cohorts.map((cohort) => {
                    const isAssigned = payload.user.cohort_id === cohort.id;
                    return (
                      <div
                        key={cohort.id}
                        className={`p-5 border ${
                          isAssigned
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
                        {isAssigned && (
                          <p className="mt-4 text-cyan-400 text-[10px] uppercase tracking-widest font-black">
                            Assigned to you
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
