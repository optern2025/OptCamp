"use client";

import { useEffect, useState } from "react";
import { Users, FileText, CheckCircle, Database, LayoutDashboard, Send, Archive, Shield, TrendingUp, TrendingDown, Calendar, Minus } from "lucide-react";
import { Card, PageHeader, Skeleton, EmptyState, Select } from "@/app/components/ui/design-system";

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [timeRange, setTimeRange] = useState("all_time");

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (timeRange !== "all_time") params.set("range", timeRange);
        
        const res = await fetch(`/api/admin/analytics?${params}`);
        if (res.ok) {
          const json = await res.json();
          setData(json.stats);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [timeRange]);

  const renderTrend = (value: number, isPercentage: boolean = false) => {
    if (value === undefined || value === null) return null;
    const isPositive = value > 0;
    const isNeutral = value === 0;
    
    if (isNeutral) {
      return (
        <div className="flex items-center gap-1 text-[10px] font-black tracking-widest text-white/30 uppercase">
          <Minus size={12} /> 0{isPercentage ? "%" : ""}
        </div>
      );
    }
    
    return (
      <div className={`flex items-center gap-1 text-[10px] font-black tracking-widest uppercase ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {Math.abs(value)}{isPercentage ? "%" : ""}
      </div>
    );
  };

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <PageHeader title="Analytics" description="Loading real-time insights..." />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-[24px]" />)}
        </div>
      </div>
    );
  }

  if (!data || data.applicationsCount === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <PageHeader title="Analytics" description="Monitor platform usage and engagement." />
        <EmptyState
          icon={<Database className="w-8 h-8" />}
          title="No activity data yet"
          description="Metrics will appear after users start applying and taking screenings."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Analytics" 
          description="Monitor platform usage, cohort engagement, and infrastructure metrics." 
        />
        <div className="flex items-center gap-2 bg-[#0B0F14] border border-white/10 rounded-[14px] p-1.5">
          <Calendar className="w-4 h-4 text-white/40 ml-2" />
          <Select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="border-none bg-transparent focus:ring-0 text-xs font-bold w-40"
          >
            <option value="all_time" className="bg-black">All Time</option>
            <option value="7d" className="bg-black">Last 7 Days</option>
            <option value="30d" className="bg-black">Last 30 Days</option>
            <option value="90d" className="bg-black">Last 90 Days</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="solid" padding="md" className="flex flex-col border border-white/10 bg-[#0B0F14]">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2"><Users size={14} className="text-cyan-400"/> Total Users</p>
          <div className="flex items-end justify-between mt-auto">
            <p className="text-4xl font-black text-white tracking-tight">{data.totalUsers}</p>
            {renderTrend(data.usersTrend)}
          </div>
        </Card>
        
        <Card variant="solid" padding="md" className="flex flex-col border border-white/10 bg-[#0B0F14]">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2"><FileText size={14} className="text-violet-400"/> Applications</p>
          <div className="flex items-end justify-between mt-auto">
            <p className="text-4xl font-black text-white tracking-tight">{data.applicationsCount}</p>
            {renderTrend(data.appsTrend)}
          </div>
        </Card>

        <Card variant="solid" padding="md" className="flex flex-col border border-white/10 bg-[#0B0F14]">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400"/> Pass Rate</p>
          <div className="flex items-end justify-between mt-auto">
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-black text-white tracking-tight">{data.passRate}%</p>
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">/ {data.screeningAttemptsCount} att.</span>
            </div>
            {renderTrend(data.passRateTrend, true)}
          </div>
        </Card>

        <Card variant="solid" padding="md" className="flex flex-col border border-white/10 bg-[#0B0F14]">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2"><Send size={14} className="text-amber-400"/> Task Submissions</p>
          <div className="flex items-end justify-between mt-auto">
            <p className="text-4xl font-black text-white tracking-tight">{data.taskSubmissionsCount}</p>
            {renderTrend(data.tasksTrend)}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card variant="solid" padding="lg" className="border border-white/10 bg-[#0B0F14]">
          <h3 className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <LayoutDashboard size={16} /> Platform Overview
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-4 rounded-[16px] bg-white/[0.02] border border-white/5">
              <span className="text-xs font-bold text-white/60">Learning Tracks</span>
              <span className="text-sm font-black text-white">{data.domainsCount}</span>
            </div>
            <div className="flex justify-between items-center p-4 rounded-[16px] bg-white/[0.02] border border-white/5">
              <span className="text-xs font-bold text-white/60">Cohorts / Cycles</span>
              <span className="text-sm font-black text-white">{data.cyclesCount} <span className="text-[10px] text-emerald-400 ml-2 uppercase tracking-widest">({data.activeCyclesCount} Active)</span></span>
            </div>
            <div className="flex justify-between items-center p-4 rounded-[16px] bg-white/[0.02] border border-white/5">
              <span className="text-xs font-bold text-white/60">Certificates Issued</span>
              <span className="text-sm font-black text-white">{data.certificatesCount}</span>
            </div>
            <div className="flex justify-between items-center p-4 rounded-[16px] bg-white/[0.02] border border-white/5">
              <span className="text-xs font-bold text-white/60">Approved Task Submissions</span>
              <span className="text-sm font-black text-white">{data.approvedSubmissionsCount}</span>
            </div>
            <div className="flex justify-between items-center p-4 rounded-[16px] bg-white/[0.02] border border-white/5">
              <span className="text-xs font-bold text-white/60 flex items-center gap-2"><Shield size={14}/> Audit Log Events</span>
              <span className="text-sm font-black text-white font-mono">{data.auditLogsCount?.toLocaleString() || 0}</span>
            </div>
          </div>
        </Card>

        <Card variant="solid" padding="lg" className="border border-white/10 bg-[#0B0F14]">
          <h3 className="text-[11px] font-black text-violet-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <Archive size={16} /> Applicant Management
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-4 rounded-[16px] bg-white/[0.02] border border-white/5">
              <span className="text-xs font-bold text-white/60">Pending Review</span>
              <span className="text-sm font-black text-white">{data.pendingApplications}</span>
            </div>
            <div className="flex justify-between items-center p-4 rounded-[16px] bg-white/[0.02] border border-white/5">
              <span className="text-xs font-bold text-white/60">Needs Screening</span>
              <span className="text-sm font-black text-white">{data.screeningRequired}</span>
            </div>
            <div className="flex justify-between items-center p-4 rounded-[16px] bg-white/[0.02] border border-white/5">
              <span className="text-xs font-bold text-white/60">Screening Cleared / Not Cleared</span>
              <div className="flex gap-2 text-sm font-black">
                <span className="text-emerald-400">{data.screeningPassed}</span>
                <span className="text-white/20">/</span>
                <span className="text-red-400">{data.screeningFailed}</span>
              </div>
            </div>
            <div className="flex justify-between items-center p-4 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-xs font-bold text-emerald-400">Selected & Enrolled</span>
              <span className="text-sm font-black text-emerald-400">{data.selectedCount + data.enrolledCount}</span>
            </div>
            <div className="flex justify-between items-center p-4 rounded-[16px] bg-red-500/10 border border-red-500/20">
              <span className="text-xs font-bold text-red-400">Rejected Applications</span>
              <span className="text-sm font-black text-red-400">{data.rejectedApplications}</span>
            </div>
          </div>
        </Card>
      </div>

    </div>
  );
}
