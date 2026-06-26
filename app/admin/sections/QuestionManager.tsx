"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Check, Search, AlertCircle, HelpCircle, FileQuestion, Archive, ChevronDown, ChevronUp, Layers, Database, Activity, CheckSquare, CheckCircle2 } from "lucide-react";
import { 
  Drawer, Input, Textarea, Select, useToast, EmptyState, Button, Skeleton
} from "@/app/components/ui/design-system";

interface Question {
  id: string; type: string; content: string; options: string; correct_answer: string; explanation: string;
}

interface QuestionSet {
  id: string; domain_id: string; difficulty_level: number; version: number;
  is_active: boolean; created_at: string;
  domains: { name: string } | null;
  screening_questions: Question[];
}

interface Domain {
  id: string; name: string;
}

export default function QuestionManager() {
  const { success, error: toastError } = useToast();
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("all");

  const [activeSet, setActiveSet] = useState<QuestionSet | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  // Drawers & Modals
  const [showSetDrawer, setShowSetDrawer] = useState(false);
  const [showQuestionDrawer, setShowQuestionDrawer] = useState(false);
  
  // Forms
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [setForm, setSetForm] = useState({ domain_id: "", difficulty_level: 1, version: 1 });
  const [questionForm, setQuestionForm] = useState({ content: "", type: "MCQ", options: "", correct_answer: "", explanation: "" });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const [setsRes, domainsRes] = await Promise.all([
        fetch("/api/admin/question-sets"),
        fetch("/api/admin/domains")
      ]);
      const setsData = await setsRes.json();
      const domainsData = await domainsRes.json();
      
      setSets(setsData.sets || []);
      setStats(setsData.stats || null);
      setDomains(domainsData.domains || []);
      
      if (activeSet) {
        const updatedSet = (setsData.sets || []).find((s: any) => s.id === activeSet.id);
        setActiveSet(updatedSet || null);
      }
    } catch {
      toastError("Failed to load question sets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredSets = sets.filter(s => {
    const matchSearch = (s.domains?.name || "").toLowerCase().includes(search.toLowerCase());
    const matchActive = filterActive === "all" || (filterActive === "active" ? s.is_active : !s.is_active);
    return matchSearch && matchActive;
  });

  const toggleQuestion = (qId: string) => {
    setExpandedQuestions(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  // --- SET CRUD ---
  const openCreateSet = () => {
    setSetForm({ domain_id: domains[0]?.id || "", difficulty_level: 1, version: 1 });
    setFormErrors({});
    setShowSetDrawer(true);
  };

  const handleCreateSet = async () => {
    if (!setForm.domain_id) {
      setFormErrors({ domain_id: "Domain is required" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/question-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setForm),
      });
      if (!res.ok) throw new Error();
      success("Question Set created");
      setShowSetDrawer(false);
      await load();
    } catch {
      toastError("Failed to create set");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSetStatus = async (set: QuestionSet) => {
    if (!set.is_active && set.screening_questions.length < 7) {
      toastError("Cannot activate", "Question set must have at least 7 questions.");
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/question-sets/${set.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !set.is_active }),
      });
      if (!res.ok) throw new Error();
      success(`Set ${set.is_active ? 'deactivated' : 'activated'}`);
      await load();
    } catch {
      toastError("Failed to update status");
    }
  };

  const handleDeleteSet = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/question-sets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      success("Question set archived");
      setActiveSet(null);
      await load();
    } catch {
      toastError("Failed to archive set");
    }
  };

  // --- QUESTION CRUD ---
  const openCreateQuestion = (set: QuestionSet) => {
    setActiveSet(set);
    setEditingQuestion(null);
    setFormErrors({});
    setQuestionForm({ content: "", type: "MCQ", options: "", correct_answer: "", explanation: "" });
    setShowQuestionDrawer(true);
  };

  const openEditQuestion = (set: QuestionSet, q: Question) => {
    setActiveSet(set);
    setEditingQuestion(q);
    setFormErrors({});
    setQuestionForm({
      content: q.content,
      type: q.type,
      options: q.options || "",
      correct_answer: q.correct_answer || "",
      explanation: q.explanation || ""
    });
    setShowQuestionDrawer(true);
  };

  const handleSaveQuestion = async () => {
    if (!questionForm.content.trim()) {
      setFormErrors({ content: "Question content is required" });
      return;
    }
    
    setSaving(true);
    try {
      const url = editingQuestion 
        ? `/api/admin/questions/${editingQuestion.id}`
        : `/api/admin/question-sets/${activeSet?.id}/questions`;
      const method = editingQuestion ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...questionForm,
          difficulty_level: 1, 
        }),
      });
      
      if (!res.ok) throw new Error();
      success(editingQuestion ? "Question updated" : "Question added");
      setShowQuestionDrawer(false);
      await load();
    } catch {
      toastError("Failed to save question");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    try {
      const res = await fetch(`/api/admin/questions/${qId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      success("Question deleted");
      await load();
    } catch {
      toastError("Failed to delete question");
    }
  };

  // Back from detail view
  if (activeSet && !showQuestionDrawer) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 max-w-[1000px] mx-auto pb-20">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveSet(null)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border bg-white/5 border-white/10 text-white/50">
                  Version {activeSet.version}
                </span>
                {activeSet.is_active ? (
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border bg-amber-500/10 text-amber-400 border-amber-500/20">Draft</span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white">{activeSet.domains?.name || "Unknown Track"} Set</h2>
            </div>
          </div>
          <Button onClick={() => openCreateQuestion(activeSet)} className="bg-cyan-500 hover:bg-cyan-400 text-black shadow-xl font-semibold">
            <Plus className="w-4 h-4 mr-2" /> Add Question
          </Button>
        </div>

        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0A0D12]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Configured Questions ({activeSet.screening_questions.length})</h3>
            {activeSet.screening_questions.length < 7 && (
              <p className="text-xs text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Requires at least 7 questions to activate
              </p>
            )}
          </div>

          <div className="space-y-3">
            {activeSet.screening_questions.length === 0 ? (
              <div className="p-8 text-center text-white/30 text-sm border border-dashed border-white/10 rounded-xl">
                No questions configured yet. Click "Add Question" to begin.
              </div>
            ) : (
              activeSet.screening_questions.map((q, idx) => {
                const isExpanded = !!expandedQuestions[q.id];
                return (
                  <div key={q.id} className="rounded-xl border border-white/[0.08] bg-[#0A0D12] overflow-hidden group">
                    <div 
                      className="p-4 flex items-start gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                      onClick={() => toggleQuestion(q.id)}
                    >
                      <div className="w-6 h-6 rounded bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-white/40">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${q.type === 'MCQ' ? 'bg-blue-500/10 text-blue-400' : 'bg-violet-500/10 text-violet-400'}`}>
                            {q.type}
                          </span>
                        </div>
                        <p className={`text-sm text-white ${!isExpanded && 'line-clamp-1'}`}>{q.content}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); openEditQuestion(activeSet, q); }} className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(q.id); }} className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/40 hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded text-white/40 transition-colors">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="p-4 pt-0 border-t border-white/[0.04] bg-white/[0.01] text-sm mt-3 pt-3">
                        {q.type === 'MCQ' && (
                          <div className="mb-3">
                            <span className="text-[10px] uppercase text-white/30 font-bold block mb-1">Options</span>
                            <div className="space-y-1">
                              {JSON.parse(q.options || '[]').map((opt: string, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-white/70">
                                  <div className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center text-[8px]">{String.fromCharCode(65 + i)}</div>
                                  {opt}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="mb-3">
                          <span className="text-[10px] uppercase text-white/30 font-bold block mb-1">Correct Answer</span>
                          <p className="text-emerald-400 font-medium bg-emerald-500/10 px-2 py-1 rounded inline-block">{q.correct_answer}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-white/30 font-bold block mb-1">Explanation</span>
                          <p className="text-white/60">{q.explanation || 'No explanation provided.'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">AI Screening Manager</h1>
          <p className="text-sm text-white/50 mt-1">Configure static question sets and monitor AI-generated screenings.</p>
        </div>
        <Button onClick={openCreateSet}>
          <Plus className="w-4 h-4 mr-2" /> Create Set
        </Button>
      </div>

      {/* STATS ROW */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[
            { label: "Active Sets", value: stats.activeSets, icon: Layers },
            { label: "Total Questions", value: stats.totalQuestions, icon: FileQuestion },
            { label: "Generated Packets", value: stats.generatedScreenings, icon: Database },
            { label: "Total Attempts", value: stats.screeningAttempts, icon: Activity },
            { label: "Pass Rate", value: `${stats.passRate}%`, icon: CheckCircle2 },
            { label: "Pending Reviews", value: stats.pendingReviews, icon: CheckSquare },
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
            placeholder="Search by learning track..."
            className="pl-9 bg-transparent border-none outline-none focus:ring-0 text-sm w-full"
          />
        </div>
        <div className="w-px h-6 bg-white/10 hidden sm:block" />
        <div className="flex items-center gap-2 w-full sm:w-auto px-2">
          <select 
            value={filterActive} 
            onChange={(e) => setFilterActive(e.target.value)} 
            className="bg-transparent border-none text-sm text-white/80 focus:ring-0"
          >
            <option value="all" className="bg-black text-white">All Status</option>
            <option value="active" className="bg-black text-white">Active Sets</option>
            <option value="inactive" className="bg-black text-white">Inactive/Drafts</option>
          </select>
        </div>
      </div>

      {/* SETS GRID */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-xl bg-white/[0.02]" />)}
        </div>
      ) : filteredSets.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No screening sets configured"
            description="Create your first question set to enable cohort screenings."
            icon={<FileQuestion />}
          />
          <div className="flex justify-center mt-4">
            <Button onClick={openCreateSet}>Create Set</Button>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSets.map(s => {
            const qCount = s.screening_questions?.length || 0;
            const isReady = qCount >= 7;

            return (
              <div key={s.id} className="group rounded-2xl border border-white/[0.08] bg-[#0A0D12] hover:border-white/[0.15] transition-all overflow-hidden flex flex-col">
                <div className="p-5 border-b border-white/[0.06] flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-[10px] uppercase font-bold text-white/40 bg-white/5 px-2 py-1 rounded border border-white/10">
                      Version {s.version}
                    </span>
                    {s.is_active ? (
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border bg-amber-500/10 text-amber-400 border-amber-500/20">Draft</span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white leading-tight mb-2">{s.domains?.name || "Unknown"} Track</h3>
                  
                  <div className="flex items-center gap-2 mt-4">
                    {isReady ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                        <AlertCircle className="w-3.5 h-3.5" /> {7 - qCount} more needed
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/[0.06]">
                    <div>
                      <p className="text-xl font-bold text-white">{qCount}</p>
                      <p className="text-[9px] uppercase text-white/30 font-bold tracking-wider">Questions</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-white/[0.01] border-t border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggleSetStatus(s)} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors tooltip-trigger" title={s.is_active ? "Deactivate" : "Activate"}>
                      {s.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDeleteSet(s.id)} className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/10 transition-colors tooltip-trigger" title="Archive">
                      <Archive className="w-4 h-4" />
                    </button>
                  </div>
                  <button onClick={() => setActiveSet(s)} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors">
                    Manage Questions
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE SET DRAWER */}
      <Drawer
        isOpen={showSetDrawer}
        onClose={() => setShowSetDrawer(false)}
        title="Create Question Set"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/60">Learning Track</label>
            <Select 
              value={setForm.domain_id} 
              onChange={e => {
                setSetForm({ ...setForm, domain_id: e.target.value });
                setFormErrors({});
              }}
              className={formErrors.domain_id ? "border-red-500/50" : ""}
            >
              <option value="" className="bg-[#0A0D12] text-white">Select a track...</option>
              {domains.map(d => <option key={d.id} value={d.id} className="bg-[#0A0D12] text-white">{d.name}</option>)}
            </Select>
            {formErrors.domain_id && <p className="text-xs text-red-400 mt-1">{formErrors.domain_id}</p>}
          </div>

          <div className="flex justify-end pt-4 border-t border-white/10 gap-3">
            <Button variant="secondary" onClick={() => setShowSetDrawer(false)}>Cancel</Button>
            <Button onClick={handleCreateSet} isLoading={saving}>Create Set</Button>
          </div>
        </div>
      </Drawer>

      {/* CREATE/EDIT QUESTION DRAWER */}
      <Drawer
        isOpen={showQuestionDrawer}
        onClose={() => setShowQuestionDrawer(false)}
        title={editingQuestion ? "Edit Question" : "Add Question"}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/60">Question Type</label>
            <Select 
              value={questionForm.type} 
              onChange={e => setQuestionForm({ ...questionForm, type: e.target.value })}
            >
              <option value="MCQ" className="bg-[#0A0D12] text-white">Multiple Choice (Auto-graded)</option>
              <option value="PRACTICAL" className="bg-[#0A0D12] text-white">Practical / Essay (Manual review)</option>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/60">Question Content</label>
            <Textarea 
              value={questionForm.content} 
              onChange={e => {
                setQuestionForm({ ...questionForm, content: e.target.value });
                setFormErrors({});
              }}
              rows={4}
              placeholder="Enter the question text..."
              className={formErrors.content ? "border-red-500/50" : ""}
            />
            {formErrors.content && <p className="text-xs text-red-400 mt-1">{formErrors.content}</p>}
          </div>

          {questionForm.type === 'MCQ' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/60">Options (JSON Array)</label>
              <Textarea 
                value={questionForm.options} 
                onChange={e => setQuestionForm({ ...questionForm, options: e.target.value })}
                rows={3}
                placeholder='["Option A", "Option B", "Option C", "Option D"]'
                className="font-mono text-sm"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/60">Correct Answer</label>
            <Input 
              value={questionForm.correct_answer} 
              onChange={e => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
              placeholder={questionForm.type === 'MCQ' ? "Match exactly one option..." : "Expected outcome or rubric..."}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/60">Explanation (Optional)</label>
            <Textarea 
              value={questionForm.explanation} 
              onChange={e => setQuestionForm({ ...questionForm, explanation: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-white/10 gap-3">
            <Button variant="secondary" onClick={() => setShowQuestionDrawer(false)}>Cancel</Button>
            <Button onClick={handleSaveQuestion} isLoading={saving}>Save Question</Button>
          </div>
        </div>
      </Drawer>

    </div>
  );
}

// Ensure CheckCircle2 is imported if missing. It is in lucide-react.
