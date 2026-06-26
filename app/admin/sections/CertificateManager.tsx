"use client";

import { useEffect, useState } from "react";
import { Search, ExternalLink, Trophy, Copy, Check, Download } from "lucide-react";
import { toISTDisplay } from "@/lib/dateTime";

import { 
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
  Input, EmptyState, Button, PageHeader, Badge, Skeleton, Card
} from "@/app/components/ui/design-system";

export default function CertificateManager() {
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/certificates?${params}`);
      const data = await res.json();
      setCerts(data.certificates || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Certificates" 
          description="View and manage all certificates issued to cohort graduates." 
        />
      </div>

      <div className="flex items-center gap-4 bg-[#0B0F14] p-4 rounded-[24px] border border-white/10">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input 
            placeholder="Search by student name or certificate no..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-[14px]" />
          <Skeleton className="h-12 w-full rounded-[14px]" />
          <Skeleton className="h-12 w-full rounded-[14px]" />
        </div>
      ) : certs.length === 0 ? (
        <EmptyState 
          title="No Certificates Issued" 
          description="Graduate students from cohorts to generate verified certificates." 
          icon={<Trophy />} 
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Cohort</TableHead>
              <TableHead>Certificate Details</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {certs.map(cert => {
              const studentName = Array.isArray(cert.new_users) ? cert.new_users[0]?.full_name : cert.new_users?.full_name;
              const certUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/certificate/${cert.id}`;
              
              return (
                <TableRow key={cert.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center font-black text-cyan-400 text-xs">
                        {studentName?.charAt(0) || "U"}
                      </div>
                      <p className="font-bold text-white group-hover:text-cyan-400 transition-colors">{studentName || "Unknown User"}</p>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-white/60">
                    <p className="font-bold text-white/80">{cert.cycles?.title || "Unknown Cohort"}</p>
                    <p className="text-[9px] uppercase tracking-wider text-white/30">{cert.cycles?.cohort_type || "N/A"}</p>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="neutral" className="font-mono text-[10px] bg-white/5 border-white/10 px-2 py-1">
                        {cert.certificate_number}
                      </Badge>
                      <button 
                        onClick={() => copyToClipboard(cert.certificate_number, cert.id)}
                        className="p-1 rounded text-white/30 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                        title="Copy Certificate Number"
                      >
                        {copiedId === cert.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-white/40 text-xs font-mono">
                    {toISTDisplay(cert.issue_date)}
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                        onClick={() => copyToClipboard(certUrl, `link-${cert.id}`)}
                      >
                        {copiedId === `link-${cert.id}` ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        <span className="ml-1.5">Link</span>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="primary" 
                        onClick={() => window.open(certUrl, '_blank')}
                      >
                        <ExternalLink size={14} className="mr-1.5" /> View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
