"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, LayoutDashboard, Users, FileText, Zap, GitBranch,
  Upload, Megaphone, BookOpen, Trophy, Activity, Menu, X,
  ChevronRight, Calendar, Pencil
} from "lucide-react";
import { Badge } from "@/app/components/ui/design-system";
import { toISTDisplay } from "@/lib/dateTime";
import CohortOverview from "./sections/CohortOverview";
import CohortApplications from "./sections/CohortApplications";
import CohortMembers from "./sections/CohortMembers";
import CohortSprints from "./sections/CohortSprints";
import CohortTasks from "./sections/CohortTasks";
import CohortSubmissions from "./sections/CohortSubmissions";
import CohortUpdates from "./sections/CohortUpdates";
import CohortResources from "./sections/CohortResources";
import CohortCertificates from "./sections/CohortCertificates";
import CohortAnalytics from "./sections/CohortAnalytics";

type Section =
  | "overview" | "applications" | "members" | "sprints" | "tasks"
  | "submissions" | "updates" | "resources" | "certificates" | "analytics";

const NAV_ITEMS: { id: Section; label: string; icon: any; group: string }[] = [
  { id: "overview",     label: "Overview",      icon: LayoutDashboard, group: "main" },
  { id: "analytics",   label: "Analytics",     icon: Activity,        group: "main" },
  { id: "applications",label: "Applications",  icon: FileText,        group: "manage" },
  { id: "members",     label: "Members",       icon: Users,           group: "manage" },
  { id: "sprints",     label: "Sprints",       icon: Zap,             group: "content" },
  { id: "tasks",       label: "Tasks",         icon: GitBranch,       group: "content" },
  { id: "submissions", label: "Submissions",   icon: Upload,          group: "content" },
  { id: "updates",     label: "Updates",       icon: Megaphone,       group: "engagement" },
  { id: "resources",   label: "Resources",     icon: BookOpen,        group: "engagement" },
  { id: "certificates",label: "Certificates",  icon: Trophy,          group: "engagement" },
];

const GROUPS = [
  { id: "main",       label: null },
  { id: "manage",     label: "Cohort Management" },
  { id: "content",    label: "Curriculum" },
  { id: "engagement", label: "Engagement" },
];

function getStatusVariant(status: string): "success" | "info" | "warning" | "neutral" | "danger" {
  if (status === "active") return "success";
  if (status === "draft") return "warning";
  if (status === "completed") return "neutral";
  return "info";
}

export default function CohortAdminShell({ cycle }: { cycle: any }) {
  const [active, setActive] = useState<Section>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const domainName = Array.isArray(cycle.domains)
    ? cycle.domains[0]?.name
    : cycle.domains?.name;
  const trackLabel = domainName || cycle.cohort_type || "Cohort";

  const NavContent = () => (
    <nav className="flex-1 p-3 overflow-y-auto no-scrollbar space-y-5">
      {GROUPS.map(group => {
        const groupItems = NAV_ITEMS.filter(i => i.group === group.id);
        return (
          <div key={group.id}>
            {group.label && (
              <p className="px-3 mb-1.5 text-[9px] font-black text-white/25 uppercase tracking-[0.2em]">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {groupItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { setActive(id); closeMobileMenu(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    active === id
                      ? "bg-primary-500/10 border-l-2 border-primary-400 text-primary-300 pl-2.5"
                      : "text-white/40 hover:text-white/80 hover:bg-white/5 border-l-2 border-transparent"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{label}</span>
                  {active === id && <ChevronRight className="w-3 h-3 opacity-40" />}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-foreground flex flex-col md:flex-row">
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-[#0A0E17] sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Badge variant="info" className="text-[10px]">Cohort Admin</Badge>
          <span className="font-semibold text-sm truncate max-w-[180px]">{cycle.title}</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 bg-white/5 rounded-md">
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeMobileMenu} />
          <aside className="relative w-[280px] bg-[#0A0E17] border-r border-white/10 flex flex-col h-full animate-in slide-in-from-left duration-200">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <Badge variant="info" className="mb-2 text-[10px]">Managing Cohort</Badge>
                <h1 className="text-base font-bold tracking-tight text-white leading-tight">{cycle.title}</h1>
              </div>
              <button onClick={closeMobileMenu} className="p-2 text-white/40 hover:bg-white/10 hover:text-white rounded-full">
                <X size={18} />
              </button>
            </div>
            <NavContent />
            <div className="p-3 border-t border-white/10">
              <Link href="/admin" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/40 hover:text-white hover:bg-white/5 transition-all">
                <ArrowLeft className="w-4 h-4" /> Global Admin
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-white/[0.07] bg-[#0A0E17] flex-col h-screen sticky top-0">
        <div className="p-4 border-b border-white/[0.07]">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary-400/70 mb-1">Managing Cohort</p>
          <h1 className="text-sm font-bold tracking-tight text-white leading-tight line-clamp-2">{cycle.title}</h1>
        </div>
        <NavContent />
        <div className="p-3 border-t border-white/[0.07] bg-[#05080C]">
          <Link
            href="/admin"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white/40 hover:text-white hover:bg-white/5 transition-all border border-white/[0.06]"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Exit to Global Admin
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-[#060810]">
        <div className="flex-1 p-4 md:p-7 max-w-[1600px] mx-auto w-full">

          {/* Cohort Hero Header */}
          <div className="mb-7 bg-[#0A0E17]/80 border border-white/[0.08] rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary-500/15 border border-primary-500/20 flex items-center justify-center shrink-0">
                  <LayoutDashboard className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-lg font-black text-white tracking-tight">{cycle.title}</h2>
                    <Badge variant={getStatusVariant(cycle.status)} className="text-[9px] uppercase tracking-widest">
                      {cycle.status ?? "draft"}
                    </Badge>
                  </div>
                  <p className="text-xs text-white/40 font-medium">{trackLabel}</p>
                  {(cycle.cohort_start_at || cycle.cohort_end_at) && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-white/30">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {cycle.cohort_start_at ? toISTDisplay(cycle.cohort_start_at) : "TBD"}
                        {" → "}
                        {cycle.cohort_end_at ? toISTDisplay(cycle.cohort_end_at) : "TBD"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/[0.08] transition-all shrink-0"
              >
                <Pencil className="w-3 h-3" /> Edit in Admin
              </Link>
            </div>
          </div>

          {/* Section Content */}
          <div className="animate-in fade-in duration-200">
            {active === "overview"      && <CohortOverview      cycleId={cycle.id} />}
            {active === "analytics"     && <CohortAnalytics     cycleId={cycle.id} />}
            {active === "applications"  && <CohortApplications  cycleId={cycle.id} />}
            {active === "members"       && <CohortMembers       cycleId={cycle.id} />}
            {active === "sprints"       && <CohortSprints       cycleId={cycle.id} />}
            {active === "tasks"         && <CohortTasks         cycleId={cycle.id} />}
            {active === "submissions"   && <CohortSubmissions   cycleId={cycle.id} />}
            {active === "updates"       && <CohortUpdates       cycleId={cycle.id} />}
            {active === "resources"     && <CohortResources     cycleId={cycle.id} />}
            {active === "certificates"  && <CohortCertificates  cycleId={cycle.id} />}
          </div>
        </div>
      </main>
    </div>
  );
}
