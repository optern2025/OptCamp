"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Terminal,
  Zap,
  Target,
  ChevronRight,
  AlertCircle,
  Clock,
} from "lucide-react";
import OpternLogo from "./components/OpternLogo";
import GlowButton from "./components/GlowButton";
import SectionTitle from "./components/SectionTitle";
import RegistrationPage from "./components/RegistrationPage";

type PageType = "landing" | "register";

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

interface Cohort {
  type: string;
  date: string;
  sprint: string;
  apply: string;
  active: boolean;
}

interface NoItem {
  icon: React.FC<React.SVGProps<SVGSVGElement> & { size?: number | string }>;
  label: string;
}

const gauntletDays: GauntletDay[] = [
  { day: "01", title: "Spec + Architecture", desc: "Ambiguity navigation." },
  { day: "02", title: "Core Build", desc: "Aggressive execution cycles." },
  {
    day: "03",
    title: "Curveball Requirement",
    desc: "Instant refactor under pressure.",
  },
  {
    day: "04",
    title: "Optimization + Submission",
    desc: "Production-grade final delivery.",
  },
  {
    day: "05",
    title: "Public Ranking",
    desc: "The top 10% are identified.",
  },
];

const selectionSteps: SelectionStep[] = [
  { step: "Step 1", title: "Application", desc: "Max 40 per cohort" },
  { step: "Step 2", title: "Qualifier", desc: "3-Hour Pressure Test" },
  { step: "Step 3", title: "Sprint", desc: "Enter Simulation" },
  { step: "Step 4", title: "Exposure", desc: "Ranked Top 10%" },
];

const cohorts: Cohort[] = [
  {
    type: "Backend",
    date: "Mar 9–10",
    sprint: "Mar 11–14",
    apply: "Mar 10",
    active: true,
  },
  {
    type: "AI / ML",
    date: "Mar 23–24",
    sprint: "Mar 25–28",
    apply: "Mar 24",
    active: false,
  },
  {
    type: "Full Stack",
    date: "Apr 6–7",
    sprint: "Apr 8–11",
    apply: "Apr 7",
    active: false,
  },
  {
    type: "Mobile Dev",
    date: "Apr 20–21",
    sprint: "Apr 22–25",
    apply: "Apr 21",
    active: false,
  },
];

const noItems: NoItem[] = [
  { icon: Terminal, label: "NO LECTURES" },
  { icon: Zap, label: "NO CERTIFICATES" },
  { icon: AlertCircle, label: "NO HAND-HOLDING" },
  { icon: Clock, label: "NO EXTENSIONS" },
];

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageType>("landing");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Reset scroll on page change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  const handleApplyClick = () => {
    setCurrentPage("register");
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
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled || currentPage === "register"
            ? "bg-[#0B0F14]/95 backdrop-blur-xl border-b border-white/5 py-3"
            : "bg-transparent py-4 xs:py-8"
          }`}
      >
        <div className="container mx-auto px-4 sm:px-6 flex justify-between items-center">
          <div
            className="flex items-center gap-2 sm:gap-4 group cursor-pointer transition-transform hover:scale-105"
            onClick={() => setCurrentPage("landing")}
            onKeyDown={(e) => {
              if (e.key === "Enter") setCurrentPage("landing");
            }}
            role="button"
            tabIndex={0}
          >
            <OpternLogo
              showText={true}
              scale={scrolled || currentPage === "register" ? 0.35 : 0.45}
              isScrolled={scrolled || currentPage === "register"}
              className="origin-left"
            />
          </div>
          <div className="hidden lg:flex gap-6 xl:gap-10 text-[10px] font-black tracking-[0.3em] uppercase text-white/40">
            <button
              type="button"
              onClick={() => setCurrentPage("landing")}
              className="hover:text-cyan-500 transition-colors"
            >
              Gauntlet
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage("landing")}
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
              <div className="flex justify-center mb-6 sm:mb-12">
                <OpternLogo
                  showText={false}
                  scale={0.8}
                  className="sm:scale-[1.3] md:scale-[1.6]"
                />
              </div>

              <h1 className="text-4xl xs:text-5xl sm:text-7xl md:text-[7rem] lg:text-[8.5rem] xl:text-[9.5rem] font-black leading-[1] sm:leading-[0.85] tracking-tighter mb-6 md:mb-8 uppercase break-words">
                OPTERN <br className="xs:hidden md:block" />
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
                  4-Day Real Startup Simulation{" "}
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
                  <span className="block text-[8px] sm:text-[10px] opacity-70 mt-1 font-bold">
                    (Max 40 Applications)
                  </span>
                </GlowButton>
              </div>
            </div>
          </header>

          {/* SECTION 2: THE PROBLEM */}
          <section className="py-20 md:py-40 relative z-10 bg-black/40 border-y border-white/5">
            <div className="container mx-auto px-4 sm:px-6 text-center">
              <div className="max-w-4xl mx-auto">
                <h3 className="text-cyan-500 text-[9px] xs:text-[10px] md:text-xs font-black tracking-[0.3em] md:tracking-[0.5em] uppercase mb-6 md:mb-10 italic">
                  Context
                </h3>
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
                    Optern measures real performance.
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
                      This is a 4-day performance sprint simulating real startup
                      conditions.
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
          <section id="gauntlet" className="py-20 md:py-40 relative z-10 bg-white/5">
            <div className="container mx-auto px-4 sm:px-6">
              <SectionTitle className="text-center italic">
                The 5-Day Gauntlet
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
              <p className="text-center mt-10 md:mt-12 text-cyan-500/60 font-black tracking-widest text-[8px] md:text-[10px] uppercase">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-7xl mx-auto">
                {cohorts.map((cohort) => (
                  <div
                    key={cohort.type}
                    className={`p-7 md:p-10 border transition-all duration-500 flex flex-col justify-between h-full ${cohort.active
                        ? "border-cyan-500 bg-cyan-500/5 shadow-[0_0_30px_rgba(0,245,255,0.1)]"
                        : "border-white/10 opacity-40 hover:opacity-100"
                      }`}
                  >
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black uppercase mb-6 md:mb-10 tracking-tighter leading-none">
                        {cohort.type}
                      </h3>
                      <div className="space-y-4 md:space-y-6 mb-8 md:mb-10">
                        <div className="flex justify-between text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/40">
                          <span>Apps:</span>
                          <span className="text-white">{cohort.date}</span>
                        </div>
                        <div className="flex justify-between text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/40">
                          <span>Sprint:</span>
                          <span className="text-white">{cohort.sprint}</span>
                        </div>
                        <div className="pt-4 md:pt-6 border-t border-white/10 flex justify-between text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-cyan-500">
                          <span>Apply By:</span>
                          <span>{cohort.apply}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyClick}
                      disabled={!cohort.active}
                      className={`w-full py-3 md:py-4 text-[8px] sm:text-[10px] font-black uppercase tracking-widest border transition-all ${cohort.active
                          ? "bg-cyan-500 text-black border-cyan-500 hover:bg-cyan-400"
                          : "border-white/20 text-white/20"
                        }`}
                    >
                      {cohort.active ? "Apply to Batch" : "Waitlist"}
                    </button>
                  </div>
                ))}
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

          {/* SECTION 9: FINAL CTA */}
          <section className="py-24 md:py-60 relative z-10 text-center">
            <div className="container mx-auto px-4 sm:px-6">
              <h2 className="text-4xl xs:text-5xl sm:text-7xl md:text-[7rem] lg:text-[8.5rem] font-black mb-8 md:mb-12 uppercase italic tracking-[-0.03em] md:tracking-[-0.05em] leading-[1.1] sm:leading-none break-words">
                ONLY 40 <br className="hidden sm:block" /> APPLICATIONS.
              </h2>
              <p className="text-base xs:text-xl sm:text-2xl md:text-3xl text-white/40 mb-10 md:mb-16 max-w-2xl mx-auto font-medium uppercase tracking-tighter italic px-4 leading-snug">
                If you believe you can execute under pressure —
              </p>
              <GlowButton
                onClick={handleApplyClick}
                className="w-full sm:w-auto"
              >
                APPLY NOW
              </GlowButton>

              <footer className="mt-24 md:mt-60 pt-8 md:pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-[7px] xs:text-[8px] md:text-[10px] font-black tracking-[0.1em] md:tracking-[0.4em] text-white/20 uppercase gap-6 md:gap-8">
                <div className="flex items-center gap-2 md:gap-4 shrink-0">
                  <OpternLogo
                    showText={false}
                    scale={0.25}
                    isScrolled={false}
                    className="origin-center"
                  />
                  <span className="tracking-widest">
                    ©2026 OPTERN PERFORMANCE SYSTEMS
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
                  <button
                    type="button"
                    onClick={() => setCurrentPage("landing")}
                    className="hover:text-cyan-500 transition-colors shrink-0"
                  >
                    Leaderboard
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage("landing")}
                    className="hover:text-cyan-500 transition-colors shrink-0"
                  >
                    Legal
                  </button>
                </div>
              </footer>
            </div>
          </section>
        </>
      ) : (
        <RegistrationPage onBack={() => setCurrentPage("landing")} />
      )}
    </div>
  );
}
