"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, RefreshCw, Users, FileText,
  HelpCircle, ArrowLeft, LogOut, ChevronRight, Globe,
  Trophy, Activity, ClipboardList, Megaphone, BookOpen, Menu, X, ClipboardCheck,
  Search, Command, PanelLeftClose, PanelLeftOpen, Zap
} from "lucide-react";
import { Badge } from "@/app/components/ui/design-system";
import OverviewSection from "./sections/Overview";
import CycleManager from "./sections/CycleManager";
import ApplicationManager from "./sections/ApplicationManager";
import UserManager from "./sections/UserManager";
import QuestionManager from "./sections/QuestionManager";
import DomainManager from "./sections/DomainManager";
import CertificateManager from "./sections/CertificateManager";
import Analytics from "./sections/Analytics";
import AuditLogs from "./sections/AuditLogs";
import AnnouncementManager from "./sections/AnnouncementManager";
import ResourceLibrary from "./sections/ResourceLibrary";
import ScreeningReviews from "./sections/ScreeningReviews";

type Section =
  | "overview" | "analytics" | "cycles" | "domains"
  | "applications" | "users" | "questions"
  | "certificates" | "audit" | "announcements" | "resources" | "screening_reviews";

const NAV_ITEMS: { id: Section; label: string; icon: any; group?: string }[] = [
  { id: "overview",       label: "Overview",         icon: LayoutDashboard,  group: "main" },
  { id: "cycles",         label: "All Cohorts",      icon: RefreshCw,        group: "main" },
  { id: "domains",        label: "Learning Tracks",  icon: Globe,            group: "manage" },
  { id: "questions",      label: "AI Screening",     icon: Zap,              group: "manage" },
  { id: "audit",          label: "Activity Logs",    icon: ClipboardList,    group: "system" },
];

const GROUPS = [
  { id: "main",    label: null },
  { id: "manage",  label: "Platform Management" },
  { id: "system",  label: "System" },
];

export default function AdminShell() {
  const router = useRouter();
  const [active, setActive] = useState<Section>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Command Palette listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const renderSection = () => {
    switch (active) {
      case "overview": return <OverviewSection />;
      case "cycles": return <CycleManager />;
      case "domains": return <DomainManager />;
      case "questions": return <QuestionManager />;
      case "audit": return <AuditLogs />;
      // Fallbacks for other routes if ever accessed directly
      case "applications": return <ApplicationManager />;
      case "users": return <UserManager />;
      case "certificates": return <CertificateManager />;
      case "analytics": return <Analytics />;
      case "announcements": return <AnnouncementManager />;
      case "resources": return <ResourceLibrary />;
      case "screening_reviews": return <ScreeningReviews />;
      default: return <OverviewSection />;
    }
  };

  return (
    <div className="min-h-screen bg-[#02040A] text-foreground flex flex-col md:flex-row font-sans">
      
      {/* ── COMMAND PALETTE (Search) ── */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
          <div className="relative w-full max-w-xl bg-[#0B0F14] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center px-4 py-3 border-b border-white/[0.08]">
              <Search className="w-5 h-5 text-white/40 mr-3" />
              <input
                autoFocus
                placeholder="Search cohorts, users, applications..."
                className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="flex items-center gap-1 text-[10px] font-bold text-white/30 bg-white/5 px-2 py-1 rounded">
                <Command size={10} /> ESC
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {searchQuery.trim() === "" ? (
                <p className="p-4 text-center text-sm text-white/30">Type to search OptCamp OS...</p>
              ) : (
                <div className="p-2 text-center text-sm text-white/30">
                  Search results for "{searchQuery}" will appear here. (Requires full-text API)
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE TOPBAR ── */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-[#0B0F14]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-white tracking-tight">OptCamp OS</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSearchOpen(true)} className="p-2 text-white/60 hover:text-white">
            <Search className="w-5 h-5" />
          </button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 bg-white/5 rounded-md">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── MOBILE SIDEBAR OVERLAY ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeMobileMenu} />
          <aside className="relative w-[280px] bg-[#0B0F14] border-r border-white/10 flex flex-col h-full animate-in slide-in-from-left duration-300">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <Badge variant="info" className="mb-2 text-[10px] bg-cyan-500/10 text-cyan-400 border-cyan-500/20">Executive Control</Badge>
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> OptCamp OS
                </h1>
              </div>
              <button onClick={closeMobileMenu} className="p-2 text-white/40 hover:bg-white/10 hover:text-white rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <nav className="flex-1 p-3 overflow-y-auto no-scrollbar space-y-4">
              {GROUPS.map(group => {
                const groupItems = NAV_ITEMS.filter(i => i.group === group.id);
                return (
                  <div key={group.id}>
                    {group.label && <p className="px-3 mb-2 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{group.label}</p>}
                    <div className="space-y-1">
                      {groupItems.map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          onClick={() => { setActive(id); closeMobileMenu(); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                            active === id ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]" : "text-white/40 hover:text-white hover:bg-white/[0.04] border border-transparent"
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 transition-colors ${active === id ? "text-cyan-400" : "text-white/40 group-hover:text-white/80"}`} />
                          <span className="flex-1 text-left">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className={`hidden md:flex flex-col h-screen sticky top-0 transition-all duration-300 z-30 border-r border-white/[0.06] bg-[#06080D]/95 backdrop-blur-xl ${collapsed ? "w-[80px]" : "w-[280px]"}`}>
        {/* Header */}
        <div className={`p-5 border-b border-white/[0.06] flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Executive Control</span>
              </div>
              <h1 className="text-xl font-black tracking-tight text-white">OptCamp OS</h1>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
          )}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className={`p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors ${collapsed ? "absolute -right-3 top-6 bg-[#0B0F14] border border-white/10" : ""}`}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Global Search Trigger */}
        <div className="p-4 border-b border-white/[0.06]">
          <button
            onClick={() => setSearchOpen(true)}
            className={`w-full flex items-center gap-3 bg-black/40 hover:bg-white/5 border border-white/[0.08] hover:border-white/[0.15] transition-all rounded-xl ${collapsed ? "justify-center p-2.5" : "px-3 py-2.5"}`}
          >
            <Search className="w-4 h-4 text-white/40 shrink-0" />
            {!collapsed && (
              <>
                <span className="text-sm text-white/40 flex-1 text-left">Search...</span>
                <span className="text-[10px] font-bold text-white/30 bg-white/5 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Command size={10} /> K
                </span>
              </>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto no-scrollbar space-y-6">
          {GROUPS.map(group => {
            const groupItems = NAV_ITEMS.filter(i => i.group === group.id);
            if (groupItems.length === 0) return null;
            return (
              <div key={group.id}>
                {!collapsed && group.label && (
                  <p className="px-3 mb-2 text-[10px] font-black text-white/25 uppercase tracking-[0.2em]">
                    {group.label}
                  </p>
                )}
                <div className="space-y-1">
                  {groupItems.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setActive(id)}
                      title={collapsed ? label : undefined}
                      className={`w-full flex items-center rounded-xl transition-all duration-200 group ${
                        collapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5"
                      } ${
                        active === id
                          ? "bg-gradient-to-r from-cyan-500/10 to-transparent border-l-2 border-cyan-400 text-cyan-300"
                          : "text-white/40 hover:text-white hover:bg-white/[0.03] border-l-2 border-transparent"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 transition-colors ${active === id ? "text-cyan-400" : "text-white/40 group-hover:text-white/80"}`} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left text-sm font-semibold">{label}</span>
                          {active === id && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.06]">
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/adminauth");
            }}
            className={`w-full flex items-center gap-3 rounded-xl text-sm font-semibold text-white/40 hover:text-white hover:bg-white/5 transition-all group ${collapsed ? "justify-center p-3" : "px-3 py-2.5"}`}
            title={collapsed ? "Sign Out" : undefined}
          >
            <LogOut className="w-4 h-4 shrink-0 group-hover:-translate-x-1 transition-transform" />
            {!collapsed && <span>Exit Admin</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 min-w-0 bg-[#02040A] text-white relative">
        <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-cyan-900/10 to-transparent pointer-events-none" />
        <div className="relative z-10 h-full overflow-y-auto p-4 md:p-8">
          {renderSection()}
        </div>
      </main>
    </div>
  );
}
