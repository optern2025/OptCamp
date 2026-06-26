"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Github,
  MessageCircle,
  ShieldCheck,
  Linkedin,
  Link as LinkIcon,
  FileText,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { Cycle } from "@/lib/types";
import UniversitySearch from "./UniversitySearch";
import { useRouter } from "next/navigation";

interface RegistrationPageProps {
  onBack: () => void;
  initialCohortId?: string;
}

interface FormData {
  cycle_id: string;
  full_name: string;
  email: string;
  mobile_number: string;
  user_type: "student" | "graduate" | "";
  college: string;
  graduation_year: string;
  skills: string;
  github_url: string;
  linkedin_url: string;
  portfolio_url: string;
  resume_url: string;
  motivation: string;
}

const blankForm: FormData = {
  cycle_id: "",
  full_name: "",
  email: "",
  mobile_number: "",
  user_type: "",
  college: "",
  graduation_year: "",
  skills: "",
  github_url: "",
  linkedin_url: "",
  portfolio_url: "",
  resume_url: "",
  motivation: "",
};

const whatsappLinks: Record<string, string> = {
  "Full Stack Development": "https://chat.whatsapp.com/BhOe3bzAxnmGbI0jTJzBGX?mode=gi_t",
  "AI / ML": "https://chat.whatsapp.com/BhOe3bzAxnmGbI0jTJzBGX?mode=gi_t",
  "Cyber Security": "https://chat.whatsapp.com/IpQpt6mVNdwEFsrhiT3ygm?mode=gi_t",
};

export default function RegistrationPage({
  onBack,
  initialCohortId,
}: RegistrationPageProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [formData, setFormData] = useState<FormData>(blankForm);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [isLoadingCycles, setIsLoadingCycles] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  useEffect(() => {
    const fetchUserAndCycles = async () => {
      try {
        // 1. Fetch current session user
        const meRes = await fetch("/api/me");
        if (meRes.ok) {
          const { user: me } = await meRes.json();
          setUser(me);
          setFormData((prev) => ({
            ...prev,
            full_name: me.full_name || "",
            email: me.email || "",
            mobile_number: me.mobile_number || "",
            user_type: me.user_type || "",
          }));
        }

        // 2. Fetch active cycles and user applications
        const [cyclesRes, myAppsRes] = await Promise.all([
          fetch("/api/cycles"),
          fetch("/api/applications/my")
        ]);

        let myApps: any[] = [];
        if (myAppsRes.ok) {
          const { applications } = await myAppsRes.json();
          myApps = applications || [];
        }

        if (cyclesRes.ok) {
          const { cycles: activeCycles } = await cyclesRes.json();
          
          if (activeCycles && activeCycles.length > 0) {
            const preferredId = initialCohortId || activeCycles[0].id;
            
            // Direct URL protection check
            const hasAppliedToPreferred = myApps.some(app => app.cycle_id === preferredId);
            if (hasAppliedToPreferred && initialCohortId) {
              setAlreadyApplied(true);
            }

            // Filter out already applied cohorts from the dropdown options
            const appliedIds = new Set(myApps.map(a => a.cycle_id));
            const availableCycles = activeCycles.filter((c: any) => !appliedIds.has(c.id));
            
            setCycles(availableCycles);
            setFormData((prev) => ({ ...prev, cycle_id: preferredId }));
          }
        }
      } catch (err) {
        setErrorMessage("Failed to load application data.");
      } finally {
        setIsLoaded(true);
        setIsLoadingCycles(false);
      }
    };

    fetchUserAndCycles();
  }, [initialCohortId]);

  const activeCycleLabel = useMemo(() => {
    const cycle = cycles.find((item) => item.id === formData.cycle_id);
    return cycle?.title ?? "your selected cycle";
  }, [cycles, formData.cycle_id]);

  const selectedCycleWhatsappLink = useMemo(() => {
    const cycle = cycles.find((item) => item.id === formData.cycle_id);
    if (!cycle) return null;
    return whatsappLinks[cycle.title] ?? null;
  }, [cycles, formData.cycle_id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!user) {
      setErrorMessage("Please sign in before applying.");
      return;
    }

    if (!formData.cycle_id) {
      setErrorMessage("Please select a cycle.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.redirect) {
          router.push(data.redirect);
          return;
        }
        throw new Error(data.error || "Application failed.");
      }

      setIsSubmitted(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Application failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (alreadyApplied) {
    return (
      <div className="min-h-screen px-4 pb-20 pt-32 flex items-center justify-center">
        <div className="max-w-md w-full text-center p-8 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]">
          <AlertCircle className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Already Applied</h2>
          <p className="text-white/50 mb-6 text-sm">You've already applied to this cohort. Track your status from your dashboard.</p>
          <button onClick={() => router.push("/dashboard")} className="w-full py-3 bg-white text-black hover:bg-white/90 font-bold rounded-xl transition-colors">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pb-20 pt-32">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-xs font-black tracking-[0.24em] text-cyan-400 transition-colors hover:text-white"
        >
          <ArrowLeft size={16} /> Back to Simulation Specs
        </button>

        <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-8 md:p-12">
          <div className="space-y-4">
            <p className="text-[11px] font-black tracking-[0.32em] text-cyan-300/75">
              Secure Application
            </p>
            <h2 className="text-4xl font-black uppercase italic tracking-tight">
              Apply to a Cycle
            </h2>
            <p className="max-w-2xl text-xs font-bold tracking-[0.18em] text-white/50">
              Submit your profile details below to enter the selection gauntlet.
            </p>
          </div>

          {!isLoaded ? (
            <div className="mt-10 py-10 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-r-transparent"></div>
            </div>
          ) : !user ? (
            <div className="mt-10 rounded-[24px] border border-white/10 bg-black/30 p-8">
              <h3 className="text-2xl font-black uppercase tracking-tight">
                Sign in first
              </h3>
              <p className="mt-3 text-xs font-bold tracking-[0.18em] text-white/50">
                You must verify your identity via OTP to submit an application.
              </p>
              <div className="mt-6">
                <Link
                  href={`/auth?redirect=/`}
                  className="inline-block bg-cyan-400 px-6 py-3 text-xs font-black tracking-[0.24em] text-black transition-colors hover:bg-cyan-300"
                >
                  Verify Email
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-10 rounded-[24px] border border-cyan-500/20 bg-cyan-500/10 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black tracking-[0.28em] text-white/45">
                      Verified Identity
                    </p>
                    <p className="mt-2 text-2xl font-black uppercase tracking-tight">
                      {user.full_name}
                    </p>
                    <p className="mt-1 text-xs font-bold tracking-[0.16em] text-cyan-200/80">
                      {user.email}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 px-4 py-2 text-[10px] font-black tracking-[0.24em] text-cyan-100">
                    <ShieldCheck size={14} />
                    OTP Secured
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-8">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black tracking-widest text-white/60">
                      Full Name
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-4 font-bold text-white placeholder:text-white/15 focus:border-cyan-500 focus:outline-none"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black tracking-widest text-white/60">
                      Email Address
                    </label>
                    <input
                      required
                      readOnly
                      type="email"
                      className="w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-4 font-bold text-white/50 cursor-not-allowed focus:outline-none"
                      value={formData.email}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black tracking-widest text-white/60">
                      Mobile Number
                    </label>
                    <input
                      required
                      type="tel"
                      placeholder="+91 98765 43210"
                      className="w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-4 font-bold text-white placeholder:text-white/15 focus:border-cyan-500 focus:outline-none"
                      value={formData.mobile_number}
                      onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black tracking-widest text-white/60">
                      Current Status
                    </label>
                    <select
                      required
                      className="w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-4 font-bold text-white transition-colors focus:border-cyan-500 focus:outline-none"
                      style={{ colorScheme: "dark" }}
                      value={formData.user_type}
                      onChange={(e) => setFormData({ ...formData, user_type: e.target.value as any })}
                    >
                      <option value="" disabled className="bg-black">Select Status</option>
                      <option value="student" className="bg-black">College Student</option>
                      <option value="graduate" className="bg-black">Graduate / Professional</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black tracking-widest text-white/60">
                    College / University
                  </label>
                  <UniversitySearch
                    value={formData.college}
                    onChange={(val) => setFormData({ ...formData, college: val })}
                    inputId="registration-university"
                  />
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black tracking-widest text-white/60">
                      Graduation Year
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. 2024"
                      className="w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-4 font-bold text-white placeholder:text-white/15 focus:border-cyan-500 focus:outline-none"
                      value={formData.graduation_year}
                      onChange={(e) => setFormData({ ...formData, graduation_year: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black tracking-widest text-white/60">
                      Primary Skills
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. React, Node.js, Postgres"
                      className="w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-4 font-bold text-white placeholder:text-white/15 focus:border-cyan-500 focus:outline-none"
                      value={formData.skills}
                      onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black tracking-widest text-white/60">
                    Target Cycle
                  </label>
                  <select
                    required
                    disabled={isLoadingCycles || cycles.length === 0}
                    className="w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-4 font-bold text-white transition-colors focus:border-cyan-500 focus:outline-none"
                    style={{ colorScheme: "dark" }}
                    value={formData.cycle_id}
                    onChange={(e) => setFormData({ ...formData, cycle_id: e.target.value })}
                  >
                    {cycles.length === 0 && (
                      <option value="" className="bg-black text-white">
                        {isLoadingCycles ? "Loading cycles..." : "No cohorts are open for applications right now."}
                      </option>
                    )}
                    {cycles.map((cycle) => (
                      <option key={cycle.id} value={cycle.id} className="bg-black text-white">
                        {cycle.title} ({cycle.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black tracking-widest text-white/60">
                      <span className="flex justify-between">
                        <span>GitHub Profile</span>
                        <span>(Optional)</span>
                      </span>
                    </label>
                    <div className="relative">
                      <Github className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                      <input
                        type="url"
                        placeholder="https://github.com/..."
                        className="w-full rounded-[18px] border border-white/10 bg-white/5 py-4 pl-12 pr-4 font-bold text-white placeholder:text-white/15 focus:border-cyan-500 focus:outline-none"
                        value={formData.github_url}
                        onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black tracking-widest text-white/60">
                      <span className="flex justify-between">
                        <span>LinkedIn Profile</span>
                        <span>(Optional)</span>
                      </span>
                    </label>
                    <div className="relative">
                      <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/..."
                        className="w-full rounded-[18px] border border-white/10 bg-white/5 py-4 pl-12 pr-4 font-bold text-white placeholder:text-white/15 focus:border-cyan-500 focus:outline-none"
                        value={formData.linkedin_url}
                        onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black tracking-widest text-white/60">
                      <span className="flex justify-between">
                        <span>Portfolio URL</span>
                        <span>(Optional)</span>
                      </span>
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                      <input
                        type="url"
                        placeholder="https://yourwebsite.com"
                        className="w-full rounded-[18px] border border-white/10 bg-white/5 py-4 pl-12 pr-4 font-bold text-white placeholder:text-white/15 focus:border-cyan-500 focus:outline-none"
                        value={formData.portfolio_url}
                        onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black tracking-widest text-white/60">
                      <span className="flex justify-between">
                        <span>Resume URL</span>
                        <span>(Optional)</span>
                      </span>
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                      <input
                        type="url"
                        placeholder="Google Drive / Dropbox link"
                        className="w-full rounded-[18px] border border-white/10 bg-white/5 py-4 pl-12 pr-4 font-bold text-white placeholder:text-white/15 focus:border-cyan-500 focus:outline-none"
                        value={formData.resume_url}
                        onChange={(e) => setFormData({ ...formData, resume_url: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t border-white/5 pt-6">
                  <label className="block text-[10px] font-black tracking-widest text-white/60">
                    Why are you applying? (Motivation)
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Briefly explain your goals and why you are a strong candidate..."
                    className="w-full resize-none rounded-[18px] border border-white/10 bg-white/5 px-4 py-4 font-bold text-white placeholder:text-white/15 focus:border-cyan-500 focus:outline-none"
                    value={formData.motivation}
                    onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                  />
                </div>

                {errorMessage && (
                  <p className="text-xs font-black tracking-widest text-red-300">
                    {errorMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || isLoadingCycles}
                  className="w-full rounded-[22px] bg-cyan-400 py-5 text-sm font-black tracking-[0.24em] text-black transition-all hover:bg-cyan-300 hover:shadow-[0_0_30px_rgba(34,211,238,0.35)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Submitting Application" : "Submit Application"}
                </button>
              </form>
            </>
          )}
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
            <p className="mt-4 text-xs font-bold tracking-[0.18em] text-white/65">
              Your application is under review. Visit your dashboard to track your status and screening tests.
            </p>
            {selectedCycleWhatsappLink && (
              <a
                href={selectedCycleWhatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-cyan-500 hover:text-cyan-400 transition-colors"
              >
                <MessageCircle size={18} />
                Join WhatsApp Group
              </a>
            )}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/dashboard"
                className="border border-cyan-400 bg-cyan-400 px-6 py-3 text-xs font-black tracking-[0.24em] text-black transition-colors hover:bg-cyan-300"
              >
                Open Dashboard
              </Link>
              <button
                type="button"
                onClick={onBack}
                className="border border-cyan-400 px-6 py-3 text-xs font-black tracking-[0.24em] text-cyan-300 transition-colors hover:bg-cyan-400 hover:text-black"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
