"use client";

import { useEffect, useState } from "react";
import { Search, Download, Filter, Shield, User, Clock, AlertTriangle, FileText, CheckCircle2, ChevronRight, Activity, XCircle, FileOutput, Database } from "lucide-react";
import { Input, Select, EmptyState, Button, Badge, Skeleton } from "@/app/components/ui/design-system";

function formatRelativeTime(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface AuditLog {
  id: string;
  event_type: string;
  action_details: any;
  ip_address: string;
  created_at: string;
  admin: { full_name: string; email: string } | null;
  target: { full_name: string; email: string } | null;
}

const ALL_EVENTS = [
  "user_signup", "user_login", "password_reset", 
  "application_submitted", "application_approved", "application_rejected", 
  "screening_started", "screening_passed", "screening_failed", 
  "user_selected", "user_enrolled", 
  "task_submitted", "task_approved", "task_rejected", 
  "certificate_issued", "admin_created", "admin_approved", 
  "domain_created", "question_modified", "sprint_created"
];

const getEventConfig = (type: string) => {
  if (type.includes("failed") || type.includes("rejected") || type.includes("deleted")) {
    return { color: "text-red-400 bg-red-500/10 border-red-500/20", icon: XCircle };
  }
  if (type.includes("approved") || type.includes("passed") || type.includes("issued") || type.includes("selected") || type.includes("enrolled")) {
    return { color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 };
  }
  if (type.includes("modified") || type.includes("reset") || type.includes("created")) {
    return { color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: AlertTriangle };
  }
  return { color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: Activity };
};

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEvent, setFilterEvent] = useState("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (filterEvent !== "all") params.set("event", filterEvent);
        
        const res = await fetch(`/api/admin/audit-logs?${params}`);
        const data = await res.json();
        
        setLogs(data.logs || []);
        setStats(data.stats || null);
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [debouncedSearch, filterEvent]);

  const exportCSV = () => {
    const headers = ["Timestamp", "Event", "Admin", "Target User", "IP Address", "Details"];
    const rows = logs.map(l => [
      new Date(l.created_at).toISOString(),
      l.event_type,
      l.admin?.full_name || "",
      l.target?.full_name || "",
      l.ip_address || "",
      JSON.stringify(l.action_details || {})
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Activity Logs</h1>
          <p className="text-sm text-white/50 mt-1">Immutable trail of critical operations, security events, and platform changes.</p>
        </div>
        <Button onClick={exportCSV}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* STATS ROW */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Logs", value: stats.totalLogs, icon: Database },
            { label: "Admin Actions", value: stats.adminActions, icon: Shield },
            { label: "User Actions", value: stats.userActions, icon: User },
            { label: "Critical Events", value: stats.criticalEvents, icon: AlertTriangle },
            { label: "Logs Today", value: stats.logsToday, icon: Clock },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-white/[0.08] bg-[#0A0D12] p-5">
              <div className="flex items-center gap-2 mb-2 text-white/40">
                <s.icon className="w-4 h-4" />
                <span className="text-xs font-semibold">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-center gap-4 p-2 bg-[#0A0D12] border border-white/[0.08] rounded-xl">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by event type, admin name, or target user..."
            className="pl-9 bg-transparent border-none outline-none focus:ring-0 text-sm w-full"
          />
        </div>
        <div className="w-px h-6 bg-white/10 hidden sm:block" />
        <div className="flex items-center gap-2 w-full sm:w-auto px-2">
          <Select
            value={filterEvent}
            onChange={e => setFilterEvent(e.target.value)}
            className="bg-transparent border-none text-sm text-white/80 focus:ring-0 w-full sm:w-48"
          >
            <option value="all" className="bg-black">All Events</option>
            {ALL_EVENTS.map(e => (
              <option key={e} value={e} className="bg-black text-white">{e}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* TIMELINE LIST */}
      {loading ? (
        <div className="space-y-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl bg-white/[0.02]" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="mt-8">
          <EmptyState 
            title="No activity recorded" 
            description="Actions will appear here once users or admins interact with the platform." 
            icon={<Shield />} 
          />
        </div>
      ) : (
        <div className="relative pl-4 space-y-6 border-l border-white/10 ml-4">
          {logs.map((log) => {
            const config = getEventConfig(log.event_type);
            const Icon = config.icon;
            return (
              <div key={log.id} className="relative group">
                <div className={`absolute -left-[26px] top-4 w-5 h-5 rounded-full border-2 border-[#0A0D12] flex items-center justify-center ${config.color.split(' ')[1]}`}>
                  <div className={`w-2 h-2 rounded-full bg-current ${config.color.split(' ')[0]}`} />
                </div>
                
                <div className="ml-4 rounded-xl border border-white/[0.06] bg-[#0A0D12] p-4 hover:border-white/10 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${config.color}`}>
                          {log.event_type}
                        </span>
                        <span className="text-xs text-white/40 font-medium">
                          {formatRelativeTime(log.created_at)}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3">
                        {log.admin && (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                              <Shield className="w-3 h-3 text-cyan-400" />
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Admin</p>
                              <p className="text-sm font-medium text-white">{log.admin.full_name}</p>
                            </div>
                          </div>
                        )}
                        
                        {log.target && (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                              <User className="w-3 h-3 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Target User</p>
                              <p className="text-sm font-medium text-white">{log.target.full_name}</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                            <Activity className="w-3 h-3 text-white/40" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold">IP Address</p>
                            <p className="text-sm font-medium text-white">{log.ip_address || "Unknown"}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {Object.keys(log.action_details || {}).length > 0 && (
                      <div className="shrink-0 w-full sm:w-64 bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 overflow-hidden">
                        <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-2">Metadata</p>
                        <pre className="text-xs text-white/60 font-mono whitespace-pre-wrap truncate max-h-24">
                          {JSON.stringify(log.action_details, null, 2)}
                        </pre>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Ensure Database is imported, used from lucide-react above.
