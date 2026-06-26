"use client";

import { useState, useEffect } from "react";
import { 
  ClipboardCheck, Clock, CheckCircle2, XCircle, FileText, 
  ChevronDown, ChevronUp, AlertCircle, AlertTriangle
} from "lucide-react";
import { Badge } from "@/app/components/ui/design-system";

export default function ScreeningReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Actions state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [overrideScore, setOverrideScore] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState<string>("");

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/screening/review");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load reviews");
      setReviews(data.reviews || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (attemptId: string, action: "approve" | "fail" | "override") => {
    try {
      setActionLoading(attemptId);
      const payload: any = { attemptId, action, notes: adminNotes };
      if (action === "override") {
        const parsed = parseInt(overrideScore, 10);
        if (isNaN(parsed) || parsed < 0 || parsed > 100) {
          throw new Error("Invalid override score (must be 0-100)");
        }
        payload.score = parsed;
      }

      const res = await fetch("/api/admin/screening/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit review");

      // Remove from list
      setReviews(reviews.filter(r => r.id !== attemptId));
      if (expandedId === attemptId) setExpandedId(null);
      setOverrideScore("");
      setAdminNotes("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-white/50">Loading pending reviews...</div>;
  if (error) return <div className="p-8 text-red-400 bg-red-400/10 rounded-xl">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Screening Reviews</h2>
          <p className="text-white/60 text-sm mt-1">Review and grade AI-flagged screening attempts.</p>
        </div>
        <div className="bg-blue-500/10 text-blue-400 px-4 py-2 rounded-lg border border-blue-500/20 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span className="font-semibold">{reviews.length} Pending</span>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-[#0B0F14] border border-white/5 rounded-xl p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">All Caught Up!</h3>
          <p className="text-white/50 mt-2">There are no pending screening reviews at this time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => {
            const isExpanded = expandedId === review.id;
            const app = review.applications;
            const generatedAnswers = review.generated_answers || {};
            const questionsSnapshot = review.question_snapshot_json || [];

            return (
              <div key={review.id} className="bg-[#0B0F14] border border-white/10 rounded-xl overflow-hidden">
                {/* Header */}
                <div 
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : review.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-yellow-500/10 text-yellow-400 rounded-lg">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{app?.full_name || 'Unknown User'}</h3>
                      <p className="text-sm text-white/50">{app?.email} • Cohort: {review.cycles?.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-white/50">Current Auto-Score</p>
                      <p className="font-mono font-medium text-lg text-yellow-400">{review.score}%</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-sm text-white/50">Submitted</p>
                      <p className="text-sm">{new Date(review.submitted_at).toLocaleString()}</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-white/40" /> : <ChevronDown className="w-5 h-5 text-white/40" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-6 border-t border-white/10 bg-black/20">
                    <h4 className="font-medium text-blue-400 mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> AI Grading Details
                    </h4>
                    
                    <div className="space-y-8">
                      {questionsSnapshot.filter((q: any) => q.type === 'practical').map((q: any, i: number) => {
                        const userAnswer = generatedAnswers.user_submissions?.[q.id] || "No answer provided.";
                        const aiFeedback = generatedAnswers.ai_grading_results?.[q.id];
                        
                        return (
                          <div key={q.id} className="p-4 rounded-xl border border-white/5 bg-[#0B0F14]/50">
                            <p className="font-medium text-sm mb-3"><span className="text-white/40">Q{i+1}:</span> {q.content}</p>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Left: User Answer */}
                              <div>
                                <h5 className="text-xs uppercase tracking-wider text-white/40 mb-2">Candidate Answer</h5>
                                <div className="p-3 bg-white/5 rounded-lg text-sm whitespace-pre-wrap font-mono text-white/80 border border-white/5">
                                  {userAnswer}
                                </div>
                              </div>
                              
                              {/* Right: AI Output */}
                              <div className="space-y-4">
                                <div>
                                  <h5 className="text-xs uppercase tracking-wider text-white/40 mb-2">AI Feedback</h5>
                                  {aiFeedback ? (
                                    <div className="p-3 bg-blue-500/5 rounded-lg text-sm border border-blue-500/10">
                                      <div className="flex items-center gap-3 mb-2">
                                        <Badge variant="outline">{aiFeedback.verdict}</Badge>
                                        <span className="text-xs font-mono text-white/60">Score: {aiFeedback.score}/100</span>
                                        <span className="text-xs font-mono text-white/60 flex items-center gap-1">
                                          {aiFeedback.confidence < 60 && <AlertTriangle className="w-3 h-3 text-red-400" />}
                                          Conf: {aiFeedback.confidence}%
                                        </span>
                                      </div>
                                      <p className="text-white/80">{aiFeedback.feedback}</p>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-red-400 p-3 bg-red-400/10 rounded-lg border border-red-400/20">
                                      AI Grading Failed to process this question.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Actions Panel */}
                    <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10">
                      <h4 className="font-medium mb-4">Admin Decision</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs uppercase tracking-wider text-white/40 mb-2">Admin Notes (Optional)</label>
                          <textarea 
                            className="w-full bg-[#0B0F14] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500 min-h-[100px]"
                            placeholder="Add notes about this review decision..."
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-4 flex flex-col justify-end">
                          <div className="flex items-center gap-3">
                            <input 
                              type="number" 
                              className="w-24 bg-[#0B0F14] border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500 text-center font-mono"
                              placeholder="Score"
                              value={overrideScore}
                              onChange={(e) => setOverrideScore(e.target.value)}
                              min="0" max="100"
                            />
                            <button 
                              disabled={actionLoading === review.id}
                              onClick={() => handleAction(review.id, "override")}
                              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              Set Override Score
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                            <button 
                              disabled={actionLoading === review.id}
                              onClick={() => handleAction(review.id, "approve")}
                              className="flex-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Approve Attempt
                            </button>
                            <button 
                              disabled={actionLoading === review.id}
                              onClick={() => handleAction(review.id, "fail")}
                              className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              Fail Attempt
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
