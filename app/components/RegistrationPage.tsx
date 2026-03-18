"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  useUser,
} from "@clerk/nextjs";
import { ArrowLeft, CheckCircle2, Github, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { hasClerkPublishableKey } from "@/lib/clerkEnv";
import type { Cohort, DashboardPayload } from "@/lib/types";
import UniversitySearch from "./UniversitySearch";

interface RegistrationPageProps {
  onBack: () => void;
  initialCohortId?: string;
}

interface FormData {
  university: string;
  cohortId: string;
  stack: string;
  github: string;
  availability: boolean;
  intent: string;
}

const blankForm: FormData = {
  university: "",
  cohortId: "",
  stack: "",
  github: "",
  availability: false,
  intent: "",
};

function RegistrationPageWithAuth({
  onBack,
  initialCohortId,
}: RegistrationPageProps) {
  const { user, isLoaded } = useUser();
  const [formData, setFormData] = useState<FormData>(blankForm);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isLoadingCohorts, setIsLoadingCohorts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const loadContext = async () => {
      if (!isLoaded) {
        return;
      }

      if (!user) {
        setCohorts([]);
        setIsLoadingCohorts(false);
        return;
      }

      setIsLoadingCohorts(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/me/dashboard");
        const payload = (await response.json()) as DashboardPayload & {
          error?: string;
        };

        if (response.status === 401) {
          setCohorts([]);
          return;
        }

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load cohorts.");
        }

        const nextCohorts = payload.cohorts ?? [];
        setCohorts(nextCohorts);

        const active = nextCohorts.find((cohort) => cohort.is_active);
        const preferredCohortId =
          initialCohortId ||
          payload.memberships.find(
            (membership) => membership.status === "applied",
          )?.cohort.id ||
          active?.id ||
          nextCohorts[0]?.id ||
          "";

        setFormData({
          university: payload.user.university ?? "",
          cohortId: preferredCohortId,
          stack: payload.user.stack ?? "",
          github: payload.user.github ?? "",
          availability: payload.user.availability ?? false,
          intent: payload.user.intent ?? "",
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load cohorts.",
        );
      } finally {
        setIsLoadingCohorts(false);
      }
    };

    loadContext();
  }, [initialCohortId, isLoaded, user]);

  const activeCohortLabel = useMemo(() => {
    const cohort = cohorts.find((item) => item.id === formData.cohortId);
    return cohort?.type ?? "your selected cohort";
  }, [cohorts, formData.cohortId]);

  const persistProfile = async () => {
    const profileResponse = await fetch("/api/register/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        university: formData.university,
        cohortId: formData.cohortId,
        stack: formData.stack,
        github: formData.github,
        availability: formData.availability,
        intent: formData.intent,
      }),
    });

    const profilePayload = (await profileResponse.json()) as { error?: string };

    if (!profileResponse.ok) {
      throw new Error(profilePayload.error ?? "Failed to save your profile.");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!isLoaded || !user) {
      setErrorMessage("Please sign in before applying.");
      return;
    }

    if (!formData.availability) {
      setErrorMessage("Please confirm your sprint availability.");
      return;
    }

    if (!formData.cohortId) {
      setErrorMessage("Please select a cohort.");
      return;
    }

    setIsSubmitting(true);

    try {
      await persistProfile();
      setIsSubmitted(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Application failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen px-4 pb-20 pt-32">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-cyan-400 transition-colors hover:text-white"
        >
          <ArrowLeft size={16} /> Back to Simulation Specs
        </button>

        <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-8 md:p-12">
          <div className="space-y-4">
            <p className="text-[11px] font-black uppercase tracking-[0.32em] text-cyan-300/75">
              Authenticated Application
            </p>
            <h2 className="text-4xl font-black uppercase italic tracking-tight">
              Apply to a Cohort
            </h2>
            <p className="max-w-2xl text-xs font-bold uppercase tracking-[0.18em] text-white/50">
              Identity comes from your signed-in account. Add the sprint details
              we need and we&apos;ll wire the cohort into your dashboard.
            </p>
          </div>

          <SignedOut>
            <div className="mt-10 rounded-[24px] border border-white/10 bg-black/30 p-8">
              <h3 className="text-2xl font-black uppercase tracking-tight">
                Sign in first
              </h3>
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-white/50">
                Your name and email come from Clerk, so the application opens
                only after authentication.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="bg-cyan-400 px-6 py-3 text-xs font-black uppercase tracking-[0.24em] text-black transition-colors hover:bg-cyan-300"
                  >
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button
                    type="button"
                    className="border border-cyan-400 px-6 py-3 text-xs font-black uppercase tracking-[0.24em] text-cyan-300 transition-colors hover:bg-cyan-400 hover:text-black"
                  >
                    Create Account
                  </button>
                </SignUpButton>
              </div>
            </div>
          </SignedOut>

          <SignedIn>
            <div className="mt-10 rounded-[24px] border border-cyan-500/20 bg-cyan-500/10 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">
                    Signed in as
                  </p>
                  <p className="mt-2 text-2xl font-black uppercase tracking-tight">
                    {user?.fullName || user?.username || "Candidate"}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-cyan-200/80">
                    {user?.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100">
                  <ShieldCheck size={14} />
                  No duplicate identity fields
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-8">
              <div className="space-y-2">
                <label
                  htmlFor="registration-university"
                  className="block text-[10px] font-black uppercase tracking-widest text-white/60"
                >
                  University
                </label>
                <UniversitySearch
                  value={formData.university}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, university: value }))
                  }
                  inputId="registration-university"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="registration-cohort"
                  className="block text-[10px] font-black uppercase tracking-widest text-white/60"
                >
                  Cohort
                </label>
                <select
                  id="registration-cohort"
                  required
                  value={formData.cohortId}
                  disabled={isLoadingCohorts || cohorts.length === 0}
                  className="w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-4 font-bold text-white transition-colors focus:border-cyan-500 focus:outline-none"
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      cohortId: event.target.value,
                    }))
                  }
                >
                  {cohorts.length === 0 && (
                    <option value="">
                      {isLoadingCohorts
                        ? "Loading cohorts..."
                        : "No cohorts available"}
                    </option>
                  )}
                  {cohorts.map((cohort) => (
                    <option key={cohort.id} value={cohort.id}>
                      {cohort.type} {cohort.is_active ? "(Active)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="registration-stack"
                  className="block text-[10px] font-black uppercase tracking-widest text-white/60"
                >
                  Primary Tech Stack
                </label>
                <input
                  id="registration-stack"
                  required
                  type="text"
                  placeholder="e.g. Node.js / React / Postgres"
                  className="w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-4 font-bold text-white uppercase placeholder:text-white/15 focus:border-cyan-500 focus:outline-none"
                  value={formData.stack}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      stack: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="registration-github"
                  className="block text-[10px] font-black uppercase tracking-widest text-white/60"
                >
                  <span className="flex justify-between">
                    <span>GitHub Profile</span>
                    <span>(Optional)</span>
                  </span>
                </label>
                <div className="relative">
                  <Github
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
                    size={18}
                  />
                  <input
                    id="registration-github"
                    type="text"
                    placeholder="github.com/username"
                    className="w-full rounded-[18px] border border-white/10 bg-white/5 py-4 pl-12 pr-4 font-bold text-white placeholder:text-white/15 focus:border-cyan-500 focus:outline-none"
                    value={formData.github}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        github: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-4 border-t border-white/5 pt-4">
                <label className="flex cursor-pointer items-start gap-4">
                  <div className="relative pt-1">
                    <input
                      required
                      type="checkbox"
                      className="peer hidden"
                      checked={formData.availability}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          availability: event.target.checked,
                        }))
                      }
                    />
                    <div className="h-5 w-5 border-2 border-white/20 transition-all peer-checked:border-cyan-500 peer-checked:bg-cyan-500" />
                    {formData.availability && (
                      <CheckCircle2
                        className="absolute left-0 top-1 text-black"
                        size={18}
                      />
                    )}
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest leading-relaxed text-white/60">
                    I can commit at least 2 hours/day during the sprint cycle
                    for {activeCohortLabel}.
                  </span>
                </label>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="registration-intent"
                  className="block text-[10px] font-black uppercase tracking-widest text-white/60"
                >
                  Short Written Intent
                </label>
                <textarea
                  id="registration-intent"
                  required
                  rows={5}
                  placeholder="Explain why you should be selected for this cohort..."
                  className="w-full resize-none rounded-[18px] border border-white/10 bg-white/5 px-4 py-4 font-bold text-white placeholder:text-white/15 focus:border-cyan-500 focus:outline-none"
                  value={formData.intent}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      intent: event.target.value,
                    }))
                  }
                />
              </div>

              {errorMessage && (
                <p className="text-xs font-black uppercase tracking-widest text-red-300">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || isLoadingCohorts || !isLoaded}
                className="w-full rounded-[22px] bg-cyan-400 py-5 text-sm font-black uppercase tracking-[0.24em] text-black transition-all hover:bg-cyan-300 hover:shadow-[0_0_30px_rgba(34,211,238,0.35)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Submitting Application" : "Submit Application"}
              </button>
            </form>
          </SignedIn>
        </div>
      </div>

      {isSubmitted && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-cyan-500 bg-[#0B0F14] p-10 text-center">
            <div className="absolute left-0 top-0 h-1 w-full bg-cyan-500" />
            <div className="mb-8 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-cyan-500">
                <CheckCircle2 className="text-cyan-400" size={40} />
              </div>
            </div>
            <h3 className="text-3xl font-black uppercase italic tracking-tight">
              Application Received
            </h3>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-white/65">
              Your cohort application is now live in the dashboard. From there
              you can launch the qualifier and track progressive unlocks.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/dashboard"
                className="border border-cyan-400 bg-cyan-400 px-6 py-3 text-xs font-black uppercase tracking-[0.24em] text-black transition-colors hover:bg-cyan-300"
              >
                Open Dashboard
              </Link>
              <button
                type="button"
                onClick={onBack}
                className="border border-cyan-400 px-6 py-3 text-xs font-black uppercase tracking-[0.24em] text-cyan-300 transition-colors hover:bg-cyan-400 hover:text-black"
              >
                Back to Arena
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const RegistrationPage = (props: RegistrationPageProps) => {
  if (!hasClerkPublishableKey) {
    return (
      <div className="min-h-screen px-4 pb-20 pt-32">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={props.onBack}
            className="mb-8 flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-cyan-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} /> Back to Simulation Specs
          </button>

          <div className="rounded-[32px] border border-amber-400/20 bg-amber-400/10 p-8 md:p-12">
            <p className="text-[11px] font-black uppercase tracking-[0.32em] text-amber-200/75">
              Authentication Unavailable
            </p>
            <h2 className="mt-4 text-3xl font-black uppercase tracking-tight">
              Add Clerk keys to enable applications
            </h2>
            <p className="mt-4 max-w-2xl text-sm font-bold uppercase tracking-[0.16em] text-white/65">
              This deployment is missing{" "}
              <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>, so the
              authenticated application flow is hidden during build and preview.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <RegistrationPageWithAuth {...props} />;
};

export default RegistrationPage;
