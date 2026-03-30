"use client";

import type { LucideIcon } from "lucide-react";
import {
  BrainCircuit,
  ChevronDown,
  Filter,
  Layers,
  Shield,
  Star,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import SectionTitle from "./SectionTitle";

type CohortId = "ai-ml" | "fullstack" | "cyber-security";

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  progress: number;
  lastActive: string | null;
  college: string;
  avatar: string;
  cohort: CohortId;
}

interface CohortTab {
  id: CohortId;
  label: string;
  icon: LucideIcon;
}

interface LeaderboardProps {
  id?: string;
}

interface LeaderboardApiEntry {
  id: string;
  cohortId: string;
  cohortSlug: string;
  cohortType: string;
  name: string;
  college: string;
  avatar: string;
  score: number;
  progress: number;
  lastActive: string | null;
}
/*
const COHORTS: CohortTab[] = [
  { id: "ai-ml", label: "AI / ML", icon: BrainCircuit },
  { id: "fullstack", label: "Full Stack", icon: Layers },
  { id: "cyber-security", label: "Cyber Security", icon: Shield },
];

function mapCohortTypeToId(type: string): CohortId | null {
  const normalized = type.trim().toLowerCase();

  if (
    normalized === "ai / ml" ||
    normalized === "ai/ml" ||
    normalized === "ai-ml"
  ) {
    return "ai-ml";
  }

  if (normalized === "full stack" || normalized === "fullstack") {
    return "fullstack";
  }

  if (
    normalized === "cyber security" ||
    normalized === "cyber-security" ||
    normalized === "cybersecurity"
  ) {
    return "cyber-security";
  }

  return null;
}

function formatLastActive(value: string | null): string {
  if (!value) {
    return "No recent activity";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function Leaderboard({ id = "leaderboard" }: LeaderboardProps) {
  const [activeCohort, setActiveCohort] = useState<CohortId>("cyber-security");
  const [collegeFilter, setCollegeFilter] = useState("All Institutions");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const filterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (filterRef.current && !filterRef.current.contains(target)) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadLeaderboard = async () => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/leaderboard");
        const payload = (await response.json()) as {
          entries?: LeaderboardApiEntry[];
        };

        if (!response.ok) {
          throw new Error("Failed to load leaderboard.");
        }

        const nextEntries = (payload.entries ?? [])
          .map((entry) => {
            const cohort = mapCohortTypeToId(entry.cohortType);
            if (!cohort) {
              return null;
            }

            return {
              id: entry.id,
              name: entry.name,
              score: entry.score,
              progress: entry.progress,
              lastActive: entry.lastActive,
              college: entry.college,
              avatar: entry.avatar,
              cohort,
            } satisfies LeaderboardEntry;
          })
          .filter((entry): entry is LeaderboardEntry => entry !== null);

        if (isMounted) {
          setEntries(nextEntries);
        }
      } catch (_error) {
        if (isMounted) {
          setEntries([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadLeaderboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const cohortData = useMemo(
    () => entries.filter((item) => item.cohort === activeCohort),
    [activeCohort, entries],
  );

  const collegeOptions = useMemo(
    () => [
      "All Institutions",
      ...Array.from(new Set(cohortData.map((item) => item.college))).sort(),
    ],
    [cohortData],
  );

  const filteredData = useMemo(
    () =>
      collegeFilter === "All Institutions"
        ? cohortData
        : cohortData.filter((item) => item.college === collegeFilter),
    [cohortData, collegeFilter],
  );

  const sortedData = useMemo(
    () => [...filteredData].sort((a, b) => b.score - a.score),
    [filteredData],
  );

  const topThree = sortedData.slice(0, 3);
  const podiumOrder = [
    topThree[1] ? { ...topThree[1], rank: 2 as const } : null,
    topThree[0] ? { ...topThree[0], rank: 1 as const } : null,
    topThree[2] ? { ...topThree[2], rank: 3 as const } : null,
  ].filter((item) => item !== null);

  return (
    <section
      id={id}
      className="py-20 md:py-40 relative z-10 bg-black/60 border-y border-white/10"
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-6xl w-full mx-auto">
          <div className="text-center mb-12">
            <SectionTitle className="italic mb-4 text-white leading-none">
              Cohort Standings
            </SectionTitle>
            <p className="text-cyan-500 text-xs font-black tracking-[0.4em]">
              Arena Rankings • Real-Time Performance
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-1 sm:gap-2 mb-16 bg-white/[0.03] p-1.5 border border-white/5 rounded-2xl">
            {COHORTS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveCohort(tab.id);
                  setCollegeFilter("All Institutions");
                }}
                className={`flex items-center gap-3 px-6 py-4 text-[10px] font-black tracking-[0.2em] transition-all rounded-xl ${
                  activeCohort === tab.id
                    ? "bg-cyan-500 text-black shadow-[0_0_20px_rgba(0,245,255,0.3)]"
                    : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
              >
                <tab.icon size={16} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-row items-end justify-center gap-4 sm:gap-12 mb-24 min-h-[350px]">
            {podiumOrder.map((user) => (
              <div
                key={user.id}
                className={`flex flex-col items-center group transition-all duration-500 ${
                  user.rank === 1
                    ? "z-10 -translate-y-12"
                    : "z-0 opacity-80 hover:opacity-100"
                }`}
              >
                <div className="relative mb-8">
                  <div
                    className={`rounded-full flex items-center justify-center font-black overflow-hidden border-4 transition-all group-hover:scale-105 ${
                      user.rank === 1
                        ? "w-28 h-28 sm:w-40 sm:h-40 border-yellow-500 bg-gradient-to-tr from-yellow-500/20 to-pink-500/20 shadow-[0_0_80px_rgba(234,179,8,0.4)]"
                        : user.rank === 2
                          ? "w-24 h-24 sm:w-32 sm:h-32 border-slate-400 bg-slate-400/10"
                          : "w-24 h-24 sm:w-32 sm:h-32 border-amber-700 bg-amber-700/10"
                    }`}
                  >
                    <span
                      className={`text-4xl sm:text-6xl ${
                        user.rank === 1
                          ? "text-white"
                          : user.rank === 2
                            ? "text-slate-400"
                            : "text-amber-700"
                      }`}
                    >
                      {user.avatar}
                    </span>
                  </div>
                  <div
                    className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-black shadow-lg ${
                      user.rank === 1
                        ? "bg-yellow-500"
                        : user.rank === 2
                          ? "bg-slate-400"
                          : "bg-amber-700"
                    }`}
                  >
                    {user.rank}
                  </div>
                  {user.rank === 1 && (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-yellow-500 animate-pulse">
                      <Star size={40} fill="currentColor" />
                    </div>
                  )}
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 px-6 py-5 rounded-2xl text-center min-w-[160px] shadow-xl">
                  <h3 className="text-sm font-black uppercase tracking-tight text-white mb-1 truncate max-w-[140px]">
                    {user.name}
                  </h3>
                  <div className="text-[24px] font-black text-cyan-500 leading-none mb-1">
                    {user.score}
                  </div>
                  <div className="text-[8px] font-black tracking-[0.2em] text-white/30">
                    Total Score
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#0B0F14] border border-white/5 p-6 sm:p-10 shadow-2xl relative rounded-3xl overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
              <div className="flex items-center gap-4">
                <div className="w-1.5 h-6 bg-cyan-500" />
                <h4 className="text-xl font-black uppercase italic tracking-tighter text-white">
                  Full Leaderboard
                </h4>
              </div>

              <div className="relative w-full sm:w-80" ref={filterRef}>
                <button
                  type="button"
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="w-full flex items-center justify-between px-6 py-4 bg-white/5 border border-white/10 text-[10px] font-black tracking-widest text-white hover:border-cyan-500 transition-all rounded-xl shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <Filter size={14} className="text-cyan-500" />
                    <span className="truncate max-w-[180px]">
                      {collegeFilter}
                    </span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`transition-transform shrink-0 ${
                      showFilterDropdown ? "rotate-180 text-cyan-500" : ""
                    }`}
                  />
                </button>
                {showFilterDropdown && (
                  <div className="absolute z-[160] left-0 right-0 top-full mt-2 bg-[#0B0F14] border border-cyan-500 max-h-80 overflow-y-auto shadow-2xl rounded-xl">
                    {collegeOptions.map((option, idx) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setCollegeFilter(option);
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full px-6 py-4 text-left text-[10px] font-black tracking-widest text-white/60 hover:text-black hover:bg-cyan-500 cursor-pointer transition-colors truncate ${
                          idx > 0 ? "border-t border-white/5" : ""
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-[10px] font-black tracking-widest text-white/20">
                    <th className="px-6 pb-4">Rank</th>
                    <th className="px-6 pb-4">User</th>
                    <th className="px-6 pb-4">Score</th>
                    <th className="px-6 pb-4 hidden md:table-cell">Progress</th>
                    <th className="px-6 pb-4 text-right">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="group hover:bg-white/[0.04] transition-all bg-white/[0.01]"
                    >
                      <td className="px-6 py-6 first:rounded-l-2xl font-mono font-bold text-white/40 group-hover:text-cyan-500">
                        #{idx + 1}
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 rounded-full border border-white/10 flex items-center justify-center font-black text-white text-sm shrink-0 shadow-inner">
                            {item.avatar}
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-black text-white tracking-tight truncate">
                              {item.name}
                            </p>
                            <p className="text-[10px] font-bold text-white/20 tracking-widest truncate">
                              {item.college}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className="font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 rounded-lg text-sm shadow-[0_0_15px_rgba(0,245,255,0.1)]">
                          {item.score}
                        </span>
                      </td>
                      <td className="px-6 py-6 hidden md:table-cell w-64">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-cyan-500 shadow-[0_0_20px_rgba(0,245,255,0.8)]"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-black text-white/40 w-10">
                            {item.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right last:rounded-r-2xl font-mono text-[10px] text-white/30 whitespace-nowrap">
                        {formatLastActive(item.lastActive)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {sortedData.length === 0 && (
              <div className="py-24 text-center text-white/10 font-black tracking-[0.4em] italic">
                {isLoading
                  ? "Loading live standings"
                  : "No scored submissions found for this cohort"}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}*/
