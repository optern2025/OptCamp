"use client";

import { ArrowLeft, CheckCircle2, Github, Mail } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import type { Cohort } from "@/lib/types";
import UniversitySearch from "./UniversitySearch";

interface RegistrationPageProps {
  onBack: () => void;
}

interface FormData {
  name: string;
  university: string;
  email: string;
  password: string;
  cohortId: string;
  stack: string;
  github: string;
  availability: boolean;
  intent: string;
}

const RegistrationPage = ({ onBack }: RegistrationPageProps) => {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    university: "",
    email: "",
    password: "",
    cohortId: "",
    stack: "",
    github: "",
    availability: false,
    intent: "",
  });
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isLoadingCohorts, setIsLoadingCohorts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const loadCohorts = async () => {
      setIsLoadingCohorts(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/cohorts");
        if (!response.ok) {
          throw new Error("Failed to load cohorts.");
        }

        const payload = (await response.json()) as { cohorts?: Cohort[] };
        const nextCohorts = payload.cohorts ?? [];
        setCohorts(nextCohorts);

        if (nextCohorts.length > 0) {
          const active = nextCohorts.find((cohort) => cohort.is_active);
          setFormData((prev) => ({
            ...prev,
            cohortId: active?.id ?? nextCohorts[0].id,
          }));
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load cohorts.",
        );
      } finally {
        setIsLoadingCohorts(false);
      }
    };

    loadCohorts();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

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
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            name: formData.name.trim(),
            university: formData.university.trim(),
            stack: formData.stack.trim(),
            github: formData.github.trim(),
            availability: formData.availability,
            intent: formData.intent.trim(),
            cohort_id: formData.cohortId,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setIsSubmitted(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Registration failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 flex flex-col items-center animate-in">
      <div className="max-w-2xl w-full border border-white/10 bg-[#0B0F14] relative p-8 md:p-12">
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500" />

        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-cyan-500 font-black text-xs uppercase tracking-widest mb-10 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back to Simulation Specs
        </button>

        <h2 className="text-4xl font-black uppercase tracking-tighter mb-4 italic">
          Register for Sprint
        </h2>
        <p className="text-white/40 font-bold text-xs uppercase tracking-[0.2em] mb-12">
          Founding Batch - Performance Filter Level 1
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/60">
              Full Name
            </label>
            <input
              required
              type="text"
              placeholder="John Doe"
              className="w-full bg-white/5 border border-white/10 px-4 py-4 focus:outline-none focus:border-cyan-500 transition-colors font-bold text-white uppercase placeholder:text-white/10"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/60">
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
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/60">
              Email Address
            </label>
            <div className="relative">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
                size={18}
              />
              <input
                required
                type="email"
                autoComplete="email"
                placeholder="name@university.edu"
                className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-4 focus:outline-none focus:border-cyan-500 transition-colors font-bold text-white placeholder:text-white/10"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/60">
              Password
            </label>
            <input
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="w-full bg-white/5 border border-white/10 px-4 py-4 focus:outline-none focus:border-cyan-500 transition-colors font-bold text-white placeholder:text-white/10"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/60">
              Cohort
            </label>
            <select
              required
              value={formData.cohortId}
              disabled={isLoadingCohorts || cohorts.length === 0}
              className="w-full bg-white/5 border border-white/10 px-4 py-4 focus:outline-none focus:border-cyan-500 transition-colors font-bold text-white"
              onChange={(e) =>
                setFormData({ ...formData, cohortId: e.target.value })
              }
            >
              {cohorts.length === 0 && (
                <option value="">
                  {isLoadingCohorts ? "Loading cohorts..." : "No cohorts available"}
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
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/60">
              Primary Tech Stack
            </label>
            <input
              required
              type="text"
              placeholder="e.g. Node.js / React / Postgres"
              className="w-full bg-white/5 border border-white/10 px-4 py-4 focus:outline-none focus:border-cyan-500 transition-colors font-bold text-white uppercase placeholder:text-white/10"
              value={formData.stack}
              onChange={(e) =>
                setFormData({ ...formData, stack: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/60">
              <span className="flex justify-between">
                <span>GitHub Profile</span>
                <span>(Optional but Encouraged)</span>
              </span>
            </label>
            <div className="relative">
              <Github
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
                size={18}
              />
              <input
                type="text"
                placeholder="github.com/username"
                className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-4 focus:outline-none focus:border-cyan-500 transition-colors font-bold text-white placeholder:text-white/10"
                value={formData.github}
                onChange={(e) =>
                  setFormData({ ...formData, github: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <label className="flex items-start gap-4 cursor-pointer group">
              <div className="relative pt-1">
                <input
                  required
                  type="checkbox"
                  className="peer hidden"
                  checked={formData.availability}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      availability: e.target.checked,
                    })
                  }
                />
                <div className="w-5 h-5 border-2 border-white/20 peer-checked:bg-cyan-500 peer-checked:border-cyan-500 transition-all" />
                {formData.availability && (
                  <CheckCircle2
                    className="absolute top-1 left-0 text-black"
                    size={20}
                  />
                )}
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest leading-relaxed text-white/60 group-hover:text-white transition-colors">
                I confirm my availability for at least 2 hours/day for the 4-day
                sprint cycle.
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/60">
              Short Written Intent (Why should you be selected?)
            </label>
            <textarea
              required
              rows={4}
              placeholder="Detail your experience with high-pressure environments..."
              className="w-full bg-white/5 border border-white/10 px-4 py-4 focus:outline-none focus:border-cyan-500 transition-colors font-bold text-white placeholder:text-white/10 resize-none"
              value={formData.intent}
              onChange={(e) =>
                setFormData({ ...formData, intent: e.target.value })
              }
            />
          </div>

          {errorMessage && (
            <p className="text-red-400 text-xs font-bold uppercase tracking-widest">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isLoadingCohorts}
            className="w-full bg-cyan-500 text-black font-black py-6 uppercase tracking-[0.2em] italic hover:bg-cyan-400 transition-all hover:shadow-[0_0_30px_rgba(0,245,255,0.4)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </div>

      {isSubmitted && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in">
          <div className="max-w-lg w-full bg-[#0B0F14] border border-cyan-500 p-10 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500" />
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 rounded-full border-4 border-cyan-500 flex items-center justify-center animate-pulse">
                <Mail className="text-cyan-500" size={40} />
              </div>
            </div>
            <h3 className="text-3xl font-black uppercase tracking-tighter mb-4 italic">
              Verification Pending
            </h3>
            <p className="text-white/70 font-bold mb-8 leading-relaxed uppercase tracking-widest text-xs">
              A verification mail has been sent to your primary address.
              <br />
              <br />
              The qualifier link will be sent on email verification.
              <br />
              <span className="text-cyan-500">All The Best!!!</span>
            </p>
            <button
              type="button"
              onClick={() => onBack()}
              className="px-10 py-4 border border-cyan-500 text-cyan-500 font-black uppercase tracking-widest text-xs hover:bg-cyan-500 hover:text-black transition-all"
            >
              Back to Arena
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationPage;
