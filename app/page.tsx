"use client";

import {
  AlertCircle,
  ChevronRight,
  Clock,
  MessageCircle,
  ShieldAlert,
  Target,
  Terminal,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type React from "react";
import { Suspense, useEffect, useState } from "react";
import type { Cycle as LandingCycle } from "@/lib/types";
import GlowButton from "./components/GlowButton";
import Leaderboard from "./components/Leaderboard";
import LegalPage from "./components/LegalPage";
import OptCampLogo from "./components/OptCampLogo";
import RegistrationPage from "./components/RegistrationPage";
import SectionTitle from "./components/SectionTitle";

type PageType = "landing" | "register" | "legal";

interface GauntletDay {
  day: string;
  title: string;
  desc: string;
}

interface SelectionStep {
  step: string;
  title: string;
  desc: string;
}

interface NoItem {
  icon: React.FC<React.SVGProps<SVGSVGElement> & { size?: number | string }>;
  label: string;
}

const gauntletDays: GauntletDay[] = [
  { day: "01", title: "APPLICATION", desc: "Submit your cohort application." },
  { day: "02", title: "SCREENING", desc: "Complete the cohort screening assessment." },
  { day: "03", title: "REVIEW", desc: "Application and screening evaluation." },
  { day: "04", title: "SELECTION", desc: "Final candidate shortlisting." },
  { day: "05", title: "COHORT ACCESS", desc: "Selected candidates receive cohort onboarding and access." },
];

const selectionSteps: SelectionStep[] = [
  { step: "STEP 1", title: "APPLICATION", desc: "Apply to an active cohort." },
  { step: "STEP 2", title: "SCREENING", desc: "Complete the cohort-specific screening assessment." },
  { step: "STEP 3", title: "REVIEW", desc: "Applications and screening results are evaluated." },
  { step: "STEP 4", title: "SELECTION", desc: "Final candidates receive cohort access." },
];

function normalizeCohortType(type: string | null) {
  return (type || "").trim().toLowerCase();
}

function sortCycles(items: LandingCycle[]) {
  return [...items].sort((left, right) => {
    const leftRank = normalizeCohortType(left.cohort_type) === "full stack" ? 0 : 1;
    const rightRank = normalizeCohortType(right.cohort_type) === "full stack" ? 0 : 1;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    const leftActive = left.status === "active";
    const rightActive = right.status === "active";

    if (leftActive !== rightActive) {
      return Number(rightActive) - Number(leftActive);
    }

    return left.created_at.localeCompare(right.created_at);
  });
}

import { toISTDisplay } from "@/lib/dateTime";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "TBD";
  return toISTDisplay(dateStr);
}

function formatWindow(start: string | null, end: string | null) {
  if (!start || !end) return "TBD";
  return `${toISTDisplay(start)} - ${toISTDisplay(end)}`;
}

function getCycleDisplay(cycle: LandingCycle) {
  return {
    ...cycle,
    displayType: cycle.title,
    apply_window: formatWindow(cycle.application_start_at, cycle.application_end_at),
    qualifier_window: formatWindow(cycle.screening_start_at, cycle.screening_end_at),
    sprint_window: formatWindow(cycle.cohort_start_at, cycle.cohort_end_at),
    apply_by: formatDate(cycle.application_end_at),
    results_on: "TBD", // Or derive from screening_end
    is_active: cycle.status === "active",
    applicationLabel: "Application Window",
    qualifierLabel: "Screening Round",
    sprintLabel: "Cohort Sprint",
    resultsLabel: "Results",
  };
}

const noItems: NoItem[] = [
  { icon: Terminal, label: "NO LECTURES" },
  { icon: Zap, label: "NO CERTIFICATES" },
  { icon: AlertCircle, label: "NO HAND-HOLDING" },
  { icon: Clock, label: "NO EXTENSIONS" },
];

function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scrolled, setScrolled] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageType>("landing");
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [cycles, setCycles] = useState<LandingCycle[]>([]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const loadCycles = async () => {
      try {
        const response = await fetch("/api/cycles");
        if (!response.ok) return;
        const payload = (await response.json()) as {
          cycles?: LandingCycle[];
        };
        if (payload.cycles && payload.cycles.length > 0) {
          setCycles(sortCycles(payload.cycles));
        }
      } catch (_error) {
        // Silent fail
      }
    };

    loadCycles();
  }, []);

  // Reset scroll on page change
  useEffect(() => {
    if (currentPage === "landing" || currentPage === "register") {
      window.scrollTo(0, 0);
    }
  }, [currentPage]);

  useEffect(() => {
    if (searchParams.get("apply") !== "1") {
      return;
    }

    const cohortId = searchParams.get("cohortId") ?? "";
    setSelectedCohortId(cohortId);
    setCurrentPage("register");
    router.replace("/");
  }, [router, searchParams]);

  const handleApplyClick = (cohortId?: string) => {
    setSelectedCohortId(cohortId ?? "");
    setCurrentPage("register");
  };

  const scrollToLandingSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleLandingAnchorClick = (sectionId: string) => {
    if (currentPage === "landing") {
      scrollToLandingSection(sectionId);
      return;
    }

    setCurrentPage("landing");
    setTimeout(() => {
      scrollToLandingSection(sectionId);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-[#0B0F14] text-white font-sans selection:bg-cyan-400 selection:text-black overflow-x-hidden antialiased">
      {/* TECH GRID BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #00F5FF 1px, transparent 1px), linear-gradient(to bottom, #00F5FF 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F14] via-transparent to-[#0B0F14]" />
        <div className="absolute top-[10%] right-[5%] w-[200px] h-[200px] sm:w-[400px] sm:h-[400px] bg-cyan-500/5 blur-[60px] sm:blur-[120px] rounded-full animate-pulse" />
        <div
          className="absolute bottom-[10%] left-[5%] w-[200px] h-[200px] sm:w-[400px] sm:h-[400px] bg-cyan-500/5 blur-[60px] sm:blur-[120px] rounded-full animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      {/* NAVIGATION */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${
          scrolled || currentPage === "register"
            ? "bg-[#0B0F14]/95 backdrop-blur-xl border-b border-white/5 py-3"
            : "bg-transparent py-4 xs:py-8"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 flex justify-between items-center">
          <button
            type="button"
            className="flex items-center gap-2 sm:gap-4 group cursor-pointer transition-transform hover:scale-105"
            onClick={() => setCurrentPage("landing")}
          >
            <OptCampLogo
              scale={scrolled || currentPage === "register" ? 0.45 : 0.55}
              isScrolled={scrolled || currentPage === "register"}
              className="origin-left"
            />
          </button>
          <div className="hidden lg:flex gap-6 xl:gap-10 text-[10px] font-black tracking-[0.3em] uppercase text-white/40">
            <button
              type="button"
              onClick={() => handleLandingAnchorClick("gauntlet")}
              className="hover:text-cyan-500 transition-colors"
            >
              Gauntlet
            </button>
            <button
              type="button"
              onClick={() => handleLandingAnchorClick("cohorts")}
              className="hover:text-cyan-500 transition-colors"
            >
              Cycles
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage("register")}
              className="text-cyan-500"
            >
              Apply
            </button>
            <Link
              href="/dashboard"
              className="hover:text-cyan-500 transition-colors"
            >
              Dashboard
            </Link>
          </div>
          <div className="lg:hidden text-[8px] xs:text-[10px] font-black tracking-[0.2em] uppercase text-cyan-500 animate-pulse shrink-0">
            SIMULATION ACTIVE
          </div>
        </div>
      </nav>

      {currentPage === "landing" ? (
        <>
          {/* SECTION 1: HERO */}
          <header className="relative min-h-[90vh] md:min-h-screen flex items-center justify-center pt-24 sm:pt-32 pb-12 z-10">
            <div className="container mx-auto px-4 sm:px-6 text-center">
              <h1 className="text-4xl xs:text-5xl sm:text-7xl md:text-[7rem] lg:text-[8.5rem] xl:text-[9.5rem] font-black leading-[1] sm:leading-[0.85] tracking-tighter mb-6 md:mb-8 uppercase break-words">
                OPTCAMP <br className="xs:hidden md:block" />
                <span
                  className="text-transparent inline-block my-2"
                  style={{
                    WebkitTextStroke: "1px rgba(255,255,255,1)",
                    filter:
                      "drop-shadow(0 0 10px rgba(255,255,255,0.6)) drop-shadow(0 0 2px rgba(255,255,255,0.8))",
                  }}
                >
                  PERFORMANCE
                </span>{" "}
                <br />
                SPRINT
              </h1>

              <div className="max-w-3xl mx-auto mb-8 md:mb-16">
                <h2 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-white/90 mb-3 md:mb-4 uppercase tracking-tight leading-tight">
                  Timed Startup Simulation{" "}
                  <br className="hidden sm:block" />
                  <span className="text-cyan-500 font-black">
                    Built to Identify the Top 10%
                  </span>
                </h2>
                <p className="text-white/40 font-bold text-[9px] xs:text-[10px] sm:text-sm tracking-[0.1em] xs:tracking-[0.2em] uppercase px-2 leading-relaxed">
                  Prove Your Execution. Top 10% Ranked. Startup Exposure.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center gap-4 w-full">
                <GlowButton
                  onClick={handleApplyClick}
                  className="w-full sm:w-auto"
                >
                  Apply Now
                </GlowButton>
              </div>
            </div>
          </header>

          {/* SECTION 2: THE PROBLEM */}
          <section className="py-20 md:py-40 relative z-10 bg-black/40 border-y border-white/5">
            <div className="container mx-auto px-4 sm:px-6 text-center">
              <div className="max-w-4xl mx-auto">
                <SectionTitle>
                  Resumes Don&apos;t <br />
                  Prove Execution.
                </SectionTitle>
                <div className="space-y-4 sm:space-y-8 text-base xs:text-lg sm:text-2xl md:text-3xl text-white font-medium leading-tight max-w-4xl mx-auto px-2">
                  <p className="opacity-40">
                    Most hiring processes measure theory.
                  </p>
                  <p className="opacity-40">
                    Real startups demand execution under ambiguity and pressure.
                  </p>
                  <p className="text-cyan-500 italic">
                    Optcamp measures real performance.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3: WHAT THIS IS */}
          <section className="py-20 md:py-40 relative z-10 overflow-hidden">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-6xl mx-auto">
                <div className="flex flex-col lg:flex-row gap-10 md:gap-20 items-center justify-between">
                  <div className="flex-1 text-center lg:text-left w-full">
                    <SectionTitle>
                      This Is <br className="hidden lg:block" />
                      Not Training.
                    </SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-8 md:mb-12 max-w-2xl mx-auto lg:mx-0">
                      {noItems.map((item) => {
                        const IconComponent = item.icon;
                        return (
                          <div
                            key={item.label}
                            className="flex items-center justify-center lg:justify-start gap-4 p-4 md:p-6 border border-white/10 bg-white/5 hover:border-cyan-500 transition-colors group"
                          >
                            <IconComponent
                              className="text-cyan-500 group-hover:scale-110 transition-transform shrink-0"
                              size={18}
                            />
                            <span className="font-black tracking-widest text-[9px] xs:text-[10px] sm:text-[11px] uppercase">
                              {item.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-white/80 border-l-4 border-cyan-500 pl-6 md:pl-8 italic mx-auto lg:mx-0 max-w-xl text-left leading-snug">
                      This is a timed performance sprint shaped by each
                      cohort&apos;s schedule.
                    </p>
                  </div>
                  <div className="w-full sm:w-64 md:w-80 aspect-square bg-cyan-500 flex items-center justify-center p-8 md:p-12 relative overflow-hidden shrink-0 mt-8 lg:mt-0">
                    <span className="text-black font-black text-4xl sm:text-6xl rotate-[-10deg] leading-none uppercase tracking-tighter z-10 text-center">
                      THE
                      <br />
                      FILTER
                    </span>
                    <div className="absolute inset-0 border-8 border-black/10 m-3 md:m-4" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 4: HOW IT WORKS */}
          <section
            id="gauntlet"
            className="py-20 md:py-40 relative z-10 bg-white/5"
          >
            <div className="container mx-auto px-4 sm:px-6">
              <SectionTitle className="text-center italic">
                The Selection Gauntlet
              </SectionTitle>
              <div className="max-w-4xl mx-auto grid gap-3 md:gap-4">
                {gauntletDays.map((item) => (
                  <div
                    key={item.day}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-5 xs:p-8 md:p-12 border border-white/10 hover:border-cyan-500 transition-all bg-[#0B0F14] group gap-4"
                  >
                    <div className="flex items-center gap-6 md:gap-10">
                      <span className="text-2xl sm:text-4xl font-black text-cyan-500 font-mono italic group-hover:scale-110 transition-transform shrink-0">
                        {item.day}
                      </span>
                      <h4 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none">
                        {item.title}
                      </h4>
                    </div>
                    <p className="text-white/40 font-bold uppercase tracking-widest text-[8px] xs:text-[9px] sm:text-xs shrink-0">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 5: SELECTION PROCESS */}
          <section className="py-20 md:py-40 relative z-10">
            <div className="container mx-auto px-4 sm:px-6">
              <SectionTitle className="text-center mb-12 md:mb-24 uppercase">
                Selection Process
              </SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-1 max-w-7xl mx-auto">
                {selectionSteps.map((item) => (
                  <div
                    key={item.step}
                    className="group p-8 md:p-10 bg-[#0B0F14] border border-white/5 hover:bg-cyan-500 transition-all duration-500 cursor-default flex flex-col items-center text-center h-full"
                  >
                    <span className="block text-white/20 group-hover:text-black/40 font-black text-[9px] xs:text-xs uppercase tracking-widest mb-6 md:mb-10 transition-colors tracking-[0.2em] md:tracking-[0.4em]">
                      {item.step}
                    </span>
                    <h4 className="text-xl sm:text-2xl font-black uppercase mb-3 md:mb-4 tracking-tighter group-hover:text-black transition-colors leading-none">
                      {item.title}
                    </h4>
                    <p className="text-white/40 group-hover:text-black/60 text-[10px] sm:text-xs font-bold uppercase tracking-widest leading-relaxed transition-colors">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-center mt-10 md:mt-12 text-cyan-500/60 font-black tracking-widest text-[12px] md:text-[20px] uppercase">
                Performance-Based Selection Only
              </p>
            </div>
          </section>

          {/* SECTION 6: COHORT BLOCKS */}
          <section id="cohorts" className="py-20 md:py-40 relative z-10">
            <div className="container mx-auto px-4 sm:px-6">
              <SectionTitle className="text-center mb-10 md:mb-20 italic">
                Active Cycles
              </SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-7xl mx-auto">
                {cycles.length === 0 && (
                  <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-20 text-white/40 italic text-sm font-bold tracking-widest uppercase">
                    No active cycles available at the moment.
                  </div>
                )}
                {cycles.map((cycle) => {
                  const displayCycle = getCycleDisplay(cycle);

                  return (
                    <div
                      key={displayCycle.id}
                      className={`p-7 md:p-10 border transition-all duration-500 flex flex-col justify-between h-full ${
                        displayCycle.is_active
                          ? "border-cyan-500 bg-cyan-500/5 shadow-[0_0_30px_rgba(0,245,255,0.1)]"
                          : "border-white/10 opacity-40 hover:opacity-100"
                      }`}
                    >
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black uppercase mb-6 md:mb-10 tracking-tighter leading-none">
                          {displayCycle.displayType}
                        </h3>
                        <div className="space-y-4 md:space-y-6 mb-8 md:mb-10">
                          <div className="flex justify-between text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/40">
                            <span>{displayCycle.applicationLabel}:</span>
                            <span className="text-white">
                              {displayCycle.apply_window}
                            </span>
                          </div>
                          {displayCycle.qualifier_window && (
                            <div className="flex justify-between text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/40">
                              <span>{displayCycle.qualifierLabel}:</span>
                              <span className="text-white">
                                {displayCycle.qualifier_window}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/40">
                            <span>{displayCycle.sprintLabel}:</span>
                            <span className="text-white">
                              {displayCycle.sprint_window}
                            </span>
                          </div>
                          <div className="flex justify-between text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/40">
                            <span>{displayCycle.resultsLabel}:</span>
                            <span className="text-white">
                              {displayCycle.results_on}
                            </span>
                          </div>
                          <div className="pt-4 md:pt-6 border-t border-white/10 flex justify-between text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-cyan-500">
                            <span>Apply By:</span>
                            <span>{displayCycle.apply_by}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyClick(displayCycle.id)}
                        disabled={!displayCycle.is_active}
                        className={`w-full py-3 md:py-4 text-[8px] sm:text-[10px] font-black uppercase tracking-widest border transition-all ${
                          displayCycle.is_active
                            ? "bg-cyan-500 text-black border-cyan-500 hover:bg-cyan-400"
                            : "border-white/20 text-white/20"
                        }`}
                      >
                        {displayCycle.is_active
                          ? "Apply to Batch"
                          : "Waitlist"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* SECTION 7 & 8: APPLY LOGIC */}
          <section
            id="apply"
            className="py-20 md:py-40 border-y border-white/10 bg-black"
          >
            <div className="container mx-auto px-4 sm:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-[1px] bg-white/10 max-w-6xl mx-auto border border-white/10 overflow-hidden">
                {/* SHOULD */}
                <div className="p-8 xs:p-12 md:p-16 bg-[#0B0F14]">
                  <h3 className="text-xl xs:text-2xl sm:text-3xl font-black mb-8 md:mb-12 flex items-center gap-4 uppercase tracking-tighter leading-none">
                    <Target className="text-cyan-500 shrink-0" size={24} />{" "}
                    Apply if:
                  </h3>
                  <ul className="space-y-5 md:space-y-8 text-sm xs:text-base sm:text-lg font-bold uppercase tracking-tight text-white/70">
                    <li className="flex gap-4">
                      <ChevronRight
                        className="text-cyan-500 shrink-0"
                        size={18}
                      />{" "}
                      You are confident in your stack
                    </li>
                    <li className="flex gap-4">
                      <ChevronRight
                        className="text-cyan-500 shrink-0"
                        size={18}
                      />{" "}
                      You want to test real execution
                    </li>
                    <li className="flex gap-4">
                      <ChevronRight
                        className="text-cyan-500 shrink-0"
                        size={18}
                      />{" "}
                      You prefer competition over comfort
                    </li>
                    <li className="flex gap-4">
                      <ChevronRight
                        className="text-cyan-500 shrink-0"
                        size={18}
                      />{" "}
                      You can meet strict deadlines
                    </li>
                  </ul>
                </div>
                {/* SHOULD NOT */}
                <div className="p-8 xs:p-12 md:p-16 bg-[#0B0F14]">
                  <h3 className="text-xl xs:text-2xl sm:text-3xl font-black mb-8 md:mb-12 flex items-center gap-4 uppercase tracking-tighter opacity-40 leading-none">
                    <ShieldAlert className="shrink-0" size={24} /> Do NOT apply
                    if:
                  </h3>
                  <ul className="space-y-5 md:space-y-8 text-sm xs:text-base sm:text-lg font-bold uppercase tracking-tight text-white/20">
                    <li className="flex gap-4 shrink-0">
                      × You want a certificate
                    </li>
                    <li className="flex gap-4 shrink-0">
                      × You need guided training
                    </li>
                    <li className="flex gap-4 shrink-0">
                      × You can&apos;t commit seriously
                    </li>
                    <li className="flex gap-4 shrink-0">
                      × You expect flexibility
                    </li>
                  </ul>
                  <p className="mt-8 md:mt-12 text-[8px] md:text-[10px] text-cyan-500/40 font-black uppercase tracking-[0.2em] md:tracking-[0.4em]">
                    Selection Filter: Extreme
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* <Leaderboard id="leaderboard" /> */}

          {/* SECTION 9: FINAL CTA */}
          <section className="py-24 md:py-60 relative z-10 text-center">
            <div className="container mx-auto px-4 sm:px-6">
              <h2 className="text-4xl xs:text-5xl sm:text-7xl md:text-[7rem] lg:text-[8.5rem] font-black mb-8 md:mb-12 uppercase italic tracking-[-0.03em] md:tracking-[-0.05em] leading-[1.1] sm:leading-none break-words">
                ONLY 40 <br className="hidden sm:block" /> APPLICATIONS.
              </h2>
              <p className="text-base xs:text-xl sm:text-2xl md:text-3xl text-white/40 mb-10 md:mb-16 max-w-2xl mx-auto font-medium uppercase tracking-tighter italic px-4 leading-snug">
                If you believe you can execute in an Organisation —
              </p>
              <GlowButton
                onClick={handleApplyClick}
                className="w-full sm:w-auto"
              >
                APPLY NOW
              </GlowButton>

              <footer className="mt-24 md:mt-60 pt-8 md:pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-[7px] xs:text-[8px] md:text-[10px] font-black tracking-[0.1em] md:tracking-[0.4em] text-white/20 uppercase gap-6 md:gap-8">
                <div className="flex items-center gap-2 md:gap-4 shrink-0">
                  <OptCampLogo
                    scale={0.25}
                    isScrolled={false}
                    className="origin-center"
                  />
                  <span className="tracking-widest">
                    ©2026 OPTCAMP PERFORMANCE SYSTEMS.{" "}
                    <i>An Initiative by OPTCAMP</i>
                  </span>
                </div>
                <div className="flex flex-wrap justify-center gap-4 md:gap-10">
                  <button
                    type="button"
                    onClick={() => setCurrentPage("landing")}
                    className="hover:text-cyan-500 transition-colors shrink-0"
                  >
                    Infrastructure
                  </button>
                  {/* <button
                    type="button"
                    onClick={() => handleLandingAnchorClick("leaderboard")}
                    className="hover:text-cyan-500 transition-colors shrink-0"
                  >
                    Leaderboard
                  </button> */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage("legal")}
                    className="hover:text-cyan-500 transition-colors shrink-0"
                  >
                    Legal
                  </button>
                  <Link
                    href="/dashboard"
                    className="hover:text-cyan-500 transition-colors shrink-0"
                  >
                    Dashboard
                  </Link>
                </div>
              </footer>
            </div>
          </section>
        </>
      ) : currentPage === "legal" ? (
        <LegalPage onBack={() => setCurrentPage("landing")} />
      ) : (
        <RegistrationPage
          onBack={() => setCurrentPage("landing")}
          initialCohortId={selectedCohortId}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomePage />
    </Suspense>
  );
}
