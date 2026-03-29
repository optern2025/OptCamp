"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  useUser,
} from "@clerk/nextjs";
import { FileUp, Github, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { canAccessAdmin } from "@/lib/adminAccess";
import { hasClerkPublishableKey } from "@/lib/clerkEnv";
import {
  DEFAULT_COHORT_TIMEZONE,
  getSprintDayCountForCohort,
  validateCohortSchedule,
} from "@/lib/cohortSchedule";
import {
  type AdminAssessmentResultFilters,
  filterAndSortAssessmentResults,
} from "@/lib/sprintDays";
import type {
  AdminContentPayload,
  AdminSprintSubmissionReview,
  AdminUserDashboardPayload,
  AssessmentQuestion,
  AssessmentQuestionType,
  Cohort,
  CohortContentBundle,
  DebugQuestion,
  MultipleChoiceQuestion,
  QualifierTemplate,
  ScenarioQuestion,
  SprintDayTask,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function createQuestion(type: AssessmentQuestionType): AssessmentQuestion {
  const base = {
    id: crypto.randomUUID(),
    type,
    prompt: "",
    guidance: "",
    rubric: "",
    solution: "",
  };

  if (type === "mcq") {
    return {
      ...base,
      type: "mcq",
      allowMultiple: false,
      options: [
        { id: crypto.randomUUID(), label: "" },
        { id: crypto.randomUUID(), label: "" },
      ],
      correctOptionIds: [],
    } satisfies MultipleChoiceQuestion;
  }

  if (type === "debug") {
    return {
      ...base,
      type: "debug",
      language: "typescript",
      starterCode: "",
      expectedOutcome: "",
    } satisfies DebugQuestion;
  }

  return {
    ...base,
    type: "scenario",
    deliverable: "",
    constraints: [],
  } satisfies ScenarioQuestion;
}

function cloneBundle(bundle: CohortContentBundle): CohortContentBundle {
  return structuredClone(bundle);
}

function createEmptyQualifier(cohortId: string): QualifierTemplate {
  return {
    id: "",
    cohort_id: cohortId,
    duration_seconds: 15 * 60,
    updated_at: "",
    questions: [],
  };
}

function createEmptySprintDay(
  cohortId: string,
  dayNumber: number,
): SprintDayTask {
  return {
    id: "",
    cohort_id: cohortId,
    day_number: dayNumber,
    title: `Day ${dayNumber}`,
    description: "",
    brief: "",
    created_at: "",
    updated_at: "",
  };
}

function createEmptyBundle(cohortId: string): CohortContentBundle {
  return {
    qualifier: createEmptyQualifier(cohortId),
    sprintDays: Array.from({ length: 2 }, (_, index) =>
      createEmptySprintDay(cohortId, index + 1),
    ),
  };
}

function cloneCohort(cohort: Cohort): Cohort {
  return structuredClone(cohort);
}

function ensureQualifier(
  bundle: CohortContentBundle,
  cohortId: string,
): QualifierTemplate {
  return bundle.qualifier ?? createEmptyQualifier(cohortId);
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.toLowerCase().includes("application/json")) {
    return (await response.json()) as T;
  }

  const text = (await response.text()).trim();
  const compact = text.replace(/\s+/g, " ").slice(0, 240);

  throw new Error(
    compact
      ? `Expected JSON but received: ${compact}`
      : "Expected JSON but received an empty response.",
  );
}

const adminDateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatAdminDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return adminDateTimeFormatter.format(parsed);
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#09131d] p-5">
      <p className="text-[10px] font-black tracking-[0.24em] text-white/45">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black tracking-tight text-white">
        {value}
      </p>
    </div>
  );
}

function GitHubLink({
  href,
  label,
  className = "",
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-2 ${className}`.trim()}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label="Open GitHub link"
        className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-cyan-200 transition-colors hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-cyan-100"
      >
        <Github size={14} />
      </a>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 break-all text-sm text-cyan-200 underline decoration-cyan-400/40 underline-offset-4"
      >
        {label ?? href}
      </a>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <span className="text-[10px] font-black tracking-[0.24em] text-white/45">
        {label}
      </span>
      {children}
    </div>
  );
}

function QuestionEditor({
  question,
  onChange,
  onRemove,
}: {
  question: AssessmentQuestion;
  onChange: (question: AssessmentQuestion) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#0a1520] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] font-black tracking-[0.3em] text-cyan-300/70">
          {question.type} question
        </p>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-2 rounded-full border border-red-400/30 px-3 py-2 text-[10px] font-black tracking-[0.22em] text-red-200 transition-colors hover:bg-red-400/10"
        >
          <Trash2 size={14} />
          Remove
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Prompt">
          <textarea
            rows={4}
            value={question.prompt}
            onChange={(event) =>
              onChange({ ...question, prompt: event.target.value })
            }
            className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
          />
        </Field>

        <Field label="Guidance">
          <textarea
            rows={4}
            value={question.guidance}
            onChange={(event) =>
              onChange({ ...question, guidance: event.target.value })
            }
            className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Rubric">
          <textarea
            rows={3}
            value={question.rubric ?? ""}
            onChange={(event) =>
              onChange({ ...question, rubric: event.target.value })
            }
            className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Solution">
          <textarea
            rows={3}
            value={question.solution ?? ""}
            onChange={(event) =>
              onChange({ ...question, solution: event.target.value })
            }
            className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
          />
        </Field>
      </div>

      {question.type === "mcq" && (
        <div className="mt-5 space-y-4">
          <label className="inline-flex items-center gap-3 text-xs tracking-[0.18em] text-white/65">
            <input
              type="checkbox"
              checked={Boolean(question.allowMultiple)}
              onChange={(event) =>
                onChange({
                  ...question,
                  allowMultiple: event.target.checked,
                  correctOptionIds: [],
                })
              }
              className="h-4 w-4 accent-cyan-300"
            />
            Allow multiple correct answers
          </label>

          <div className="space-y-3">
            {question.options.map((option) => {
              const isCorrect = (question.correctOptionIds ?? []).includes(
                option.id,
              );
              return (
                <div
                  key={option.id}
                  className="grid gap-3 rounded-[18px] border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[1fr_auto_auto]"
                >
                  <input
                    value={option.label}
                    onChange={(event) =>
                      onChange({
                        ...question,
                        options: question.options.map((item) =>
                          item.id === option.id
                            ? { ...item, label: event.target.value }
                            : item,
                        ),
                      })
                    }
                    className="rounded-[14px] border border-white/10 bg-[#09131d] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
                    placeholder="Option label"
                  />
                  <label className="inline-flex items-center gap-2 rounded-[14px] border border-white/10 px-4 py-3 text-xs tracking-[0.16em] text-white/65">
                    <input
                      type={question.allowMultiple ? "checkbox" : "radio"}
                      checked={isCorrect}
                      onChange={(event) => {
                        const nextCorrect = question.allowMultiple
                          ? event.target.checked
                            ? [...(question.correctOptionIds ?? []), option.id]
                            : (question.correctOptionIds ?? []).filter(
                                (item) => item !== option.id,
                              )
                          : [option.id];

                        onChange({
                          ...question,
                          correctOptionIds: Array.from(new Set(nextCorrect)),
                        });
                      }}
                      className="h-4 w-4 accent-cyan-300"
                    />
                    Correct
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...question,
                        options: question.options.filter(
                          (item) => item.id !== option.id,
                        ),
                        correctOptionIds: (
                          question.correctOptionIds ?? []
                        ).filter((item) => item !== option.id),
                      })
                    }
                    className="rounded-[14px] border border-red-400/20 px-4 py-3 text-xs tracking-[0.16em] text-red-200 transition-colors hover:bg-red-400/10"
                  >
                    Delete option
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() =>
              onChange({
                ...question,
                options: [
                  ...question.options,
                  { id: crypto.randomUUID(), label: "" },
                ],
              })
            }
            className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 px-4 py-2 text-[10px] font-black tracking-[0.24em] text-cyan-100 transition-colors hover:bg-cyan-300/10"
          >
            <Plus size={14} />
            Add option
          </button>
        </div>
      )}

      {question.type === "debug" && (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Language">
            <input
              value={question.language ?? ""}
              onChange={(event) =>
                onChange({ ...question, language: event.target.value })
              }
              className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
            />
          </Field>
          <Field label="Expected outcome">
            <textarea
              rows={3}
              value={question.expectedOutcome ?? ""}
              onChange={(event) =>
                onChange({ ...question, expectedOutcome: event.target.value })
              }
              className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Starter code">
              <textarea
                rows={8}
                value={question.starterCode ?? ""}
                onChange={(event) =>
                  onChange({ ...question, starterCode: event.target.value })
                }
                className="w-full rounded-[18px] border border-white/10 bg-[#061018] px-4 py-3 font-mono text-sm text-white outline-none focus:border-cyan-300"
              />
            </Field>
          </div>
        </div>
      )}

      {question.type === "scenario" && (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Deliverable">
            <input
              value={question.deliverable ?? ""}
              onChange={(event) =>
                onChange({ ...question, deliverable: event.target.value })
              }
              className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
            />
          </Field>
          <Field label="Constraints">
            <textarea
              rows={4}
              value={(question.constraints ?? []).join("\n")}
              onChange={(event) =>
                onChange({
                  ...question,
                  constraints: event.target.value
                    .split("\n")
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
              className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
              placeholder="One constraint per line"
            />
          </Field>
        </div>
      )}
    </div>
  );
}

function QuestionImportPanel({
  onImported,
}: {
  onImported: (
    questions: AssessmentQuestion[],
    replaceExisting: boolean,
  ) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const importQuestions = async () => {
    if (!file) {
      setErrorMessage("Choose a .docx or .txt file before importing.");
      return;
    }

    setIsImporting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/content/import-questions", {
        method: "POST",
        body: formData,
      });
      const data = await readJsonResponse<{
        questions?: AssessmentQuestion[];
        error?: string;
      }>(response);

      if (!response.ok || !data.questions) {
        throw new Error(
          data.error ?? "Unable to import questions from that document.",
        );
      }

      onImported(data.questions, replaceExisting);
      setSuccessMessage(
        `Imported ${data.questions.length} question${
          data.questions.length === 1 ? "" : "s"
        }.`,
      );
      setFile(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to import questions from that document.",
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="rounded-[22px] border border-white/10 bg-[#07121b] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black tracking-[0.26em] text-cyan-300/70">
            Document import
          </p>
          <p className="mt-2 max-w-2xl text-xs tracking-[0.14em] text-white/50">
            Upload a structured `.docx` or `.txt` file to generate qualifier
            questions, then refine them in the editor below.
          </p>
        </div>
        <button
          type="button"
          onClick={importQuestions}
          disabled={!file || isImporting}
          className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 px-4 py-2 text-[10px] font-black tracking-[0.24em] text-cyan-100 transition-colors hover:bg-cyan-300/10 disabled:opacity-50"
        >
          <FileUp size={14} />
          {isImporting ? "Importing..." : "Import File"}
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <Field label="Document file">
          <input
            type="file"
            accept=".docx,.txt,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-cyan-300 file:px-4 file:py-2 file:text-xs file:font-black file:tracking-[0.18em] file:text-black"
          />
        </Field>
        <label className="inline-flex items-center gap-3 rounded-[18px] border border-white/10 px-4 py-3 text-xs tracking-[0.16em] text-white/65">
          <input
            type="checkbox"
            checked={replaceExisting}
            onChange={(event) => setReplaceExisting(event.target.checked)}
            className="h-4 w-4 accent-cyan-300"
          />
          Replace existing questions
        </label>
      </div>

      {errorMessage && (
        <p className="mt-4 text-xs font-black tracking-[0.2em] text-red-200">
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p className="mt-4 text-xs font-black tracking-[0.2em] text-emerald-100">
          {successMessage}
        </p>
      )}
    </div>
  );
}

function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-[10px] font-black tracking-[0.2em] ${
        active
          ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
          : "border-white/10 text-white/55"
      }`}
    >
      {label} {active ? (direction === "asc" ? "↑" : "↓") : ""}
    </button>
  );
}

function ReviewEditor({
  review,
  onSave,
}: {
  review: AdminSprintSubmissionReview;
  onSave: (
    submissionId: string,
    score: number | null,
    evaluatorNotes: string,
  ) => Promise<void>;
}) {
  const [score, setScore] = useState(review.score?.toString() ?? "");
  const [notes, setNotes] = useState(review.evaluator_notes ?? "");
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className="rounded-[22px] border border-white/10 bg-[#08111a] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black tracking-[0.24em] text-cyan-300/75">
            {review.cohort_type} · Day {review.day_number}
          </p>
          <h4 className="mt-2 text-lg font-black uppercase tracking-tight text-white">
            {review.task_title}
          </h4>
          <p className="mt-2 text-xs font-bold tracking-[0.16em] text-white/55">
            {review.candidate_name} · {review.candidate_email}
          </p>
        </div>
        <p className="text-[10px] font-black tracking-[0.18em] text-white/45">
          Submitted {formatAdminDateTime(review.submitted_at)}
        </p>
      </div>

      <GitHubLink href={review.github_url} className="mt-4" />

      <div className="mt-5 grid gap-4 md:grid-cols-[140px_minmax(0,1fr)_auto]">
        <Field label="Score">
          <input
            type="number"
            min={0}
            max={100}
            value={score}
            onChange={(event) => setScore(event.target.value)}
            className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
          />
        </Field>
        <Field label="Evaluator notes">
          <textarea
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
          />
        </Field>
        <div className="flex items-end">
          <button
            type="button"
            onClick={async () => {
              setIsSaving(true);
              try {
                await onSave(
                  review.submission_id,
                  score.trim() ? Number(score) : null,
                  notes,
                );
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-4 py-3 text-xs font-black tracking-[0.22em] text-black transition-colors hover:bg-cyan-200 disabled:opacity-60"
          >
            <Save size={14} />
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminPageContent() {
  const { isLoaded, user } = useUser();
  const [payload, setPayload] = useState<AdminContentPayload | null>(null);
  const [userDashboard, setUserDashboard] =
    useState<AdminUserDashboardPayload | null>(null);
  const [selectedCohortId, setSelectedCohortId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, CohortContentBundle>>({});
  const [cohortDrafts, setCohortDrafts] = useState<Record<string, Cohort>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userDashboardError, setUserDashboardError] = useState<string | null>(
    null,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [adminView, setAdminView] = useState<"operations" | "content">(
    "operations",
  );
  const [resultFilters, setResultFilters] =
    useState<AdminAssessmentResultFilters>({
      query: "",
      cohortId: "",
      testType: "all",
      status: "all",
      sortField: "submitted_at",
      sortDirection: "desc",
    });
  const canManageContent = canAccessAdmin(
    user?.primaryEmailAddress?.emailAddress ?? "",
  );

  const loadAdminContent = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/content");
      const data = await readJsonResponse<
        AdminContentPayload & {
          error?: string;
        }
      >(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load admin content.");
      }

      setPayload(data);
      setDrafts(
        Object.fromEntries(
          Object.entries(data.contentByCohort).map(([cohortId, bundle]) => [
            cohortId,
            cloneBundle(bundle),
          ]),
        ),
      );
      setCohortDrafts(
        Object.fromEntries(
          data.cohorts.map((cohort) => [cohort.id, cloneCohort(cohort)]),
        ),
      );
      setSelectedCohortId((current) => current || data.cohorts[0]?.id || "");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load admin content.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAdminUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    setUserDashboardError(null);

    try {
      const response = await fetch("/api/admin/users");
      const data = await readJsonResponse<
        AdminUserDashboardPayload & {
          error?: string;
        }
      >(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load admin users.");
      }

      setUserDashboard(data);
    } catch (error) {
      setUserDashboardError(
        error instanceof Error ? error.message : "Unable to load admin users.",
      );
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!canManageContent) {
      setIsLoading(false);
      setIsLoadingUsers(false);
      return;
    }

    loadAdminContent();
    loadAdminUsers();
  }, [canManageContent, isLoaded, loadAdminContent, loadAdminUsers]);

  const selectedCohort = useMemo(
    () =>
      payload?.cohorts.find((cohort) => cohort.id === selectedCohortId) ?? null,
    [payload, selectedCohortId],
  );

  const selectedCohortDraft = useMemo(() => {
    if (!selectedCohort) {
      return null;
    }

    return cohortDrafts[selectedCohort.id] ?? cloneCohort(selectedCohort);
  }, [cohortDrafts, selectedCohort]);

  const selectedBundle = useMemo(() => {
    if (!selectedCohortId) {
      return null;
    }

    return drafts[selectedCohortId] ?? createEmptyBundle(selectedCohortId);
  }, [drafts, selectedCohortId]);

  const selectedQualifier = useMemo(() => {
    if (!selectedBundle || !selectedCohortId) {
      return null;
    }

    return selectedBundle.qualifier ?? createEmptyQualifier(selectedCohortId);
  }, [selectedBundle, selectedCohortId]);

  const selectedSprintReviews = useMemo(() => {
    if (!userDashboard) {
      return [];
    }

    return userDashboard.sprintSubmissionReviews.filter(
      (review) => !selectedCohortId || review.cohort_id === selectedCohortId,
    );
  }, [selectedCohortId, userDashboard]);

  const requiredSprintDayCount = useMemo(() => {
    if (!selectedCohortDraft) {
      return 0;
    }

    return getSprintDayCountForCohort(selectedCohortDraft);
  }, [selectedCohortDraft]);

  const scheduleValidationErrors = useMemo(() => {
    if (!selectedCohortDraft || !selectedBundle) {
      return [];
    }

    return validateCohortSchedule(
      {
        application_open_date: selectedCohortDraft.application_open_date,
        application_close_date: selectedCohortDraft.application_close_date,
        qualifier_open_date: selectedCohortDraft.qualifier_open_date,
        qualifier_close_date: selectedCohortDraft.qualifier_close_date,
        sprint_start_date: selectedCohortDraft.sprint_start_date,
        sprint_end_date: selectedCohortDraft.sprint_end_date,
        results_announcement_date:
          selectedCohortDraft.results_announcement_date,
        schedule_timezone:
          selectedCohortDraft.schedule_timezone || DEFAULT_COHORT_TIMEZONE,
      },
      selectedBundle.sprintDays.length,
    );
  }, [selectedBundle, selectedCohortDraft]);

  const filteredResults = useMemo(() => {
    if (!userDashboard) {
      return [];
    }

    return filterAndSortAssessmentResults(
      userDashboard.assessmentResults,
      resultFilters,
    );
  }, [resultFilters, userDashboard]);

  const updateSelectedBundle = (
    updater: (bundle: CohortContentBundle) => CohortContentBundle,
  ) => {
    if (!selectedCohortId) {
      return;
    }

    setDrafts((current) => {
      const existing =
        current[selectedCohortId] ?? createEmptyBundle(selectedCohortId);
      return {
        ...current,
        [selectedCohortId]: updater(cloneBundle(existing)),
      };
    });
  };

  const updateSelectedCohortDraft = (updater: (cohort: Cohort) => Cohort) => {
    if (!selectedCohortId || !selectedCohort) {
      return;
    }

    setCohortDrafts((current) => {
      const existing = current[selectedCohortId] ?? cloneCohort(selectedCohort);
      return {
        ...current,
        [selectedCohortId]: updater(cloneCohort(existing)),
      };
    });
  };

  const saveContent = async () => {
    if (
      !selectedCohortId ||
      !selectedBundle ||
      !selectedQualifier ||
      !selectedCohortDraft
    ) {
      return;
    }

    if (scheduleValidationErrors.length > 0) {
      setErrorMessage(
        scheduleValidationErrors[0] ?? "Invalid cohort schedule.",
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/admin/content", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cohortId: selectedCohortId,
          cohort: {
            application_open_date: selectedCohortDraft.application_open_date,
            application_close_date: selectedCohortDraft.application_close_date,
            qualifier_open_date: selectedCohortDraft.qualifier_open_date,
            qualifier_close_date: selectedCohortDraft.qualifier_close_date,
            sprint_start_date: selectedCohortDraft.sprint_start_date,
            sprint_end_date: selectedCohortDraft.sprint_end_date,
            results_announcement_date:
              selectedCohortDraft.results_announcement_date,
            schedule_timezone: selectedCohortDraft.schedule_timezone,
          },
          qualifier: selectedQualifier,
          sprintDays: selectedBundle.sprintDays,
        }),
      });
      const data = await readJsonResponse<
        AdminContentPayload & {
          error?: string;
        }
      >(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to save admin content.");
      }

      setPayload(data);
      setDrafts(
        Object.fromEntries(
          Object.entries(data.contentByCohort).map(([cohortId, bundle]) => [
            cohortId,
            cloneBundle(bundle),
          ]),
        ),
      );
      setCohortDrafts(
        Object.fromEntries(
          data.cohorts.map((cohort) => [cohort.id, cloneCohort(cohort)]),
        ),
      );
      setSuccessMessage("Cohort content saved.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to save admin content.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const saveSprintReview = useCallback(
    async (
      submissionId: string,
      score: number | null,
      evaluatorNotes: string,
    ) => {
      setUserDashboardError(null);

      const response = await fetch("/api/admin/sprint-submissions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          submissionId,
          score,
          evaluatorNotes,
        }),
      });
      const data = await readJsonResponse<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to save sprint review.");
      }

      await loadAdminUsers();
      setSuccessMessage("Sprint review saved.");
    },
    [loadAdminUsers],
  );

  const toggleSort = (field: AdminAssessmentResultFilters["sortField"]) => {
    setResultFilters((current) => ({
      ...current,
      sortField: field,
      sortDirection:
        current.sortField === field && current.sortDirection === "desc"
          ? "asc"
          : "desc",
    }));
  };

  return (
    <main className="min-h-screen bg-[#071018] px-4 py-10 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.22),_transparent_30%),linear-gradient(140deg,#09131d_0%,#04080d_100%)] p-8">
          <p className="text-[10px] font-black tracking-[0.35em] text-cyan-300/80">
            Admin Console
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-tight md:text-5xl">
            Cohort Operations and Content
          </h1>
          <p className="mt-4 max-w-3xl text-sm font-bold tracking-[0.16em] text-white/55">
            Review cross-cohort assessment results, score sprint submissions,
            and manage qualifier plus sprint-day content.
          </p>
        </header>

        <SignedOut>
          <section className="rounded-[24px] border border-white/10 bg-black/30 p-8">
            <h2 className="text-2xl font-black uppercase tracking-tight">
              Sign in to manage cohorts
            </h2>
            <div className="mt-6 flex flex-wrap gap-3">
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="bg-cyan-400 px-6 py-3 text-xs font-black tracking-[0.24em] text-black transition-colors hover:bg-cyan-300"
                >
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="border border-cyan-400 px-6 py-3 text-xs font-black tracking-[0.24em] text-cyan-300 transition-colors hover:bg-cyan-400 hover:text-black"
                >
                  Create Account
                </button>
              </SignUpButton>
            </div>
          </section>
        </SignedOut>

        <SignedIn>
          {isLoaded && !canManageContent && (
            <section className="rounded-[24px] border border-amber-400/20 bg-amber-400/10 p-8">
              <h2 className="text-2xl font-black uppercase tracking-tight">
                Admin access is restricted
              </h2>
              <p className="mt-4 text-sm font-bold tracking-[0.16em] text-white/65">
                Only admins can manage cohort content.
              </p>
            </section>
          )}

          {(isLoading || isLoadingUsers) && canManageContent && (
            <section className="rounded-[24px] border border-white/10 bg-black/30 p-8">
              <p className="text-sm font-bold tracking-[0.22em] text-white/55">
                Loading admin console...
              </p>
            </section>
          )}

          {canManageContent && errorMessage && (
            <section className="rounded-[24px] border border-red-500/30 bg-red-500/10 p-6">
              <p className="text-xs font-black tracking-[0.22em] text-red-200">
                {errorMessage}
              </p>
            </section>
          )}

          {canManageContent && userDashboardError && (
            <section className="rounded-[24px] border border-red-500/30 bg-red-500/10 p-6">
              <p className="text-xs font-black tracking-[0.22em] text-red-200">
                {userDashboardError}
              </p>
            </section>
          )}

          {canManageContent && successMessage && (
            <section className="rounded-[24px] border border-emerald-400/30 bg-emerald-400/10 p-6">
              <p className="text-xs font-black tracking-[0.22em] text-emerald-100">
                {successMessage}
              </p>
            </section>
          )}

          {canManageContent && payload && userDashboard && (
            <>
              <section className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setAdminView("operations")}
                  className={`rounded-full border px-5 py-3 text-xs font-black tracking-[0.24em] ${
                    adminView === "operations"
                      ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                      : "border-white/10 text-white/60"
                  }`}
                >
                  Operations
                </button>
                <button
                  type="button"
                  onClick={() => setAdminView("content")}
                  className={`rounded-full border px-5 py-3 text-xs font-black tracking-[0.24em] ${
                    adminView === "content"
                      ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                      : "border-white/10 text-white/60"
                  }`}
                >
                  Content
                </button>
              </section>

              {adminView === "operations" && (
                <div className="space-y-6">
                  <section className="rounded-[28px] border border-white/10 bg-black/20 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black tracking-[0.3em] text-cyan-300/80">
                          Registrations
                        </p>
                        <h2 className="mt-2 text-3xl font-black uppercase tracking-tight">
                          User and cohort dashboard
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={loadAdminUsers}
                        disabled={isLoadingUsers}
                        className="rounded-full border border-cyan-300/30 px-4 py-2 text-[10px] font-black tracking-[0.22em] text-cyan-100 transition-colors hover:bg-cyan-300/10 disabled:opacity-60"
                      >
                        {isLoadingUsers ? "Refreshing..." : "Refresh table"}
                      </button>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                      <SummaryCard
                        label="Total Users"
                        value={userDashboard.summary.totalUsers}
                      />
                      <SummaryCard
                        label="Registered Users"
                        value={userDashboard.summary.registeredUsers}
                      />
                      <SummaryCard
                        label="Applications"
                        value={userDashboard.summary.totalApplications}
                      />
                      <SummaryCard
                        label="Active Cohorts"
                        value={userDashboard.summary.activeCohorts}
                      />
                      <SummaryCard
                        label="Enrolled Users"
                        value={userDashboard.summary.enrolledUsers}
                      />
                      <SummaryCard
                        label="Completed Users"
                        value={userDashboard.summary.completedUsers}
                      />
                    </div>

                    <div className="mt-6 overflow-x-auto rounded-[24px] border border-white/10 bg-[#08111a]">
                      <table className="min-w-full divide-y divide-white/10 text-left">
                        <thead className="bg-white/[0.03]">
                          <tr className="text-[10px] font-black tracking-[0.22em] text-white/45">
                            <th className="px-4 py-4">Candidate</th>
                            <th className="px-4 py-4">Profile</th>
                            <th className="px-4 py-4">Registered Cohorts</th>
                            <th className="px-4 py-4">Progress</th>
                            <th className="px-4 py-4">Activity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 align-top">
                          {userDashboard.users.map((dashboardUser) => (
                            <tr key={dashboardUser.id} className="text-sm">
                              <td className="px-4 py-4">
                                <p className="font-black tracking-[0.08em] text-white">
                                  {dashboardUser.name || "Unnamed user"}
                                </p>
                                <p className="mt-2 text-xs font-bold text-cyan-100/90">
                                  {dashboardUser.email}
                                </p>
                                <p className="mt-2 text-xs text-white/65">
                                  {dashboardUser.university ||
                                    "University not provided"}
                                </p>
                                <p className="mt-3 text-[11px] text-white/55">
                                  {dashboardUser.intent ||
                                    "No application intent provided."}
                                </p>
                              </td>
                              <td className="px-4 py-4">
                                <div className="space-y-2 text-xs text-white/70">
                                  <p>
                                    <span className="font-black tracking-[0.14em] text-white/45">
                                      Stack
                                    </span>
                                    <br />
                                    {dashboardUser.stack || "—"}
                                  </p>
                                  <p>
                                    <span className="font-black tracking-[0.14em] text-white/45">
                                      Github
                                    </span>
                                    <br />
                                    {dashboardUser.github ? (
                                      <a
                                        href={dashboardUser.github}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-cyan-200 underline decoration-cyan-400/40 underline-offset-4"
                                      >
                                        {dashboardUser.github}
                                      </a>
                                    ) : (
                                      "—"
                                    )}
                                  </p>
                                  <p>
                                    <span className="font-black tracking-[0.14em] text-white/45">
                                      Availability
                                    </span>
                                    <br />
                                    {dashboardUser.availability
                                      ? "Confirmed"
                                      : "Not confirmed"}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                {dashboardUser.memberships.length === 0 ? (
                                  <p className="text-xs text-white/45">
                                    No cohort registrations yet.
                                  </p>
                                ) : (
                                  <div className="space-y-3">
                                    {dashboardUser.memberships.map(
                                      (membership) => (
                                        <div
                                          key={`${dashboardUser.id}-${membership.cohort.id}`}
                                          className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3"
                                        >
                                          <p className="font-black tracking-[0.12em] text-white">
                                            {membership.cohort.type}
                                          </p>
                                          <p className="mt-1 text-[11px] font-bold tracking-[0.16em] text-white/45">
                                            {membership.cohort.slug}
                                          </p>
                                          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black tracking-[0.16em]">
                                            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-cyan-100">
                                              {membership.status.replaceAll(
                                                "_",
                                                " ",
                                              )}
                                            </span>
                                            <span className="rounded-full border border-white/10 px-2 py-1 text-white/55">
                                              Apply by{" "}
                                              {membership.cohort.apply_by}
                                            </span>
                                          </div>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-4">
                                {dashboardUser.memberships.length === 0 ? (
                                  <p className="text-xs text-white/45">—</p>
                                ) : (
                                  <div className="space-y-3">
                                    {dashboardUser.memberships.map(
                                      (membership) => (
                                        <div
                                          key={`${dashboardUser.id}-${membership.cohort.id}-progress`}
                                          className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3 text-xs text-white/70"
                                        >
                                          <p className="font-black tracking-[0.14em] text-white/45">
                                            {membership.cohort.type}
                                          </p>
                                          <p className="mt-2">
                                            Qualifier:{" "}
                                            {membership.qualifier_score === null
                                              ? "Not submitted"
                                              : membership.qualifier_passed ===
                                                  true
                                                ? "Passed"
                                                : "Failed"}
                                          </p>
                                          <p className="mt-1">
                                            Sprint days:{" "}
                                            {
                                              membership.sprint_days_submitted_count
                                            }
                                            /{membership.total_sprint_day_count}
                                          </p>
                                          <div className="mt-3 space-y-2">
                                            <p className="font-black tracking-[0.14em] text-white/45">
                                              GitHub uploads
                                            </p>
                                            {membership.sprint_submissions
                                              .length === 0 ? (
                                              <p className="text-white/45">—</p>
                                            ) : (
                                              membership.sprint_submissions.map(
                                                (submission) => (
                                                  <div
                                                    key={
                                                      submission.submission_id
                                                    }
                                                  >
                                                    <p className="text-[10px] font-black tracking-[0.14em] text-white/45">
                                                      Day{" "}
                                                      {submission.day_number}:{" "}
                                                      {submission.task_title}
                                                    </p>
                                                    <GitHubLink
                                                      href={
                                                        submission.github_url
                                                      }
                                                      className="mt-1"
                                                    />
                                                  </div>
                                                ),
                                              )
                                            )}
                                          </div>
                                          <p className="mt-1">
                                            Qualifier submitted:{" "}
                                            {formatAdminDateTime(
                                              membership.qualifier_submitted_at,
                                            )}
                                          </p>
                                          <p className="mt-1">
                                            Completed:{" "}
                                            {formatAdminDateTime(
                                              membership.completed_at,
                                            )}
                                          </p>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-4">
                                <div className="space-y-2 text-xs text-white/70">
                                  <p>
                                    <span className="font-black tracking-[0.14em] text-white/45">
                                      Latest
                                    </span>
                                    <br />
                                    {formatAdminDateTime(
                                      dashboardUser.latest_activity_at,
                                    )}
                                  </p>
                                  <p>
                                    <span className="font-black tracking-[0.14em] text-white/45">
                                      Created
                                    </span>
                                    <br />
                                    {formatAdminDateTime(
                                      dashboardUser.created_at,
                                    )}
                                  </p>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-white/10 bg-black/20 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black tracking-[0.3em] text-cyan-300/80">
                          Results
                        </p>
                        <h2 className="mt-2 text-3xl font-black uppercase tracking-tight">
                          Cross-cohort assessments
                        </h2>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_repeat(3,minmax(0,0.7fr))]">
                      <Field label="Search">
                        <input
                          value={resultFilters.query}
                          onChange={(event) =>
                            setResultFilters((current) => ({
                              ...current,
                              query: event.target.value,
                            }))
                          }
                          placeholder="Name, email, university, cohort..."
                          className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
                        />
                      </Field>
                      <Field label="Cohort">
                        <select
                          value={resultFilters.cohortId}
                          onChange={(event) =>
                            setResultFilters((current) => ({
                              ...current,
                              cohortId: event.target.value,
                            }))
                          }
                          className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
                        >
                          <option value="">All cohorts</option>
                          {payload.cohorts.map((cohort) => (
                            <option key={cohort.id} value={cohort.id}>
                              {cohort.type}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Test type">
                        <select
                          value={resultFilters.testType}
                          onChange={(event) =>
                            setResultFilters((current) => ({
                              ...current,
                              testType: event.target.value as
                                | "all"
                                | "qualifier"
                                | "sprint_day",
                            }))
                          }
                          className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
                        >
                          <option value="all">All tests</option>
                          <option value="qualifier">Qualifier</option>
                          <option value="sprint_day">Sprint days</option>
                        </select>
                      </Field>
                      <Field label="Status">
                        <select
                          value={resultFilters.status}
                          onChange={(event) =>
                            setResultFilters((current) => ({
                              ...current,
                              status: event.target.value as
                                | "all"
                                | "submitted"
                                | "reviewed"
                                | "passed"
                                | "failed",
                            }))
                          }
                          className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
                        >
                          <option value="all">All statuses</option>
                          <option value="submitted">Submitted</option>
                          <option value="reviewed">Reviewed</option>
                          <option value="passed">Passed</option>
                          <option value="failed">Failed</option>
                        </select>
                      </Field>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <SortButton
                        label="Submitted"
                        active={resultFilters.sortField === "submitted_at"}
                        direction={resultFilters.sortDirection}
                        onClick={() => toggleSort("submitted_at")}
                      />
                      <SortButton
                        label="Score"
                        active={resultFilters.sortField === "score"}
                        direction={resultFilters.sortDirection}
                        onClick={() => toggleSort("score")}
                      />
                      <SortButton
                        label="Candidate"
                        active={resultFilters.sortField === "candidate_name"}
                        direction={resultFilters.sortDirection}
                        onClick={() => toggleSort("candidate_name")}
                      />
                      <SortButton
                        label="Cohort"
                        active={resultFilters.sortField === "cohort_type"}
                        direction={resultFilters.sortDirection}
                        onClick={() => toggleSort("cohort_type")}
                      />
                      <SortButton
                        label="Status"
                        active={resultFilters.sortField === "status"}
                        direction={resultFilters.sortDirection}
                        onClick={() => toggleSort("status")}
                      />
                    </div>

                    <div className="mt-6 overflow-x-auto rounded-[24px] border border-white/10 bg-[#08111a]">
                      <table className="min-w-full divide-y divide-white/10 text-left">
                        <thead className="bg-white/[0.03]">
                          <tr className="text-[10px] font-black tracking-[0.22em] text-white/45">
                            <th className="px-4 py-4">Candidate</th>
                            <th className="px-4 py-4">Cohort</th>
                            <th className="px-4 py-4">Test</th>
                            <th className="px-4 py-4">GitHub</th>
                            <th className="px-4 py-4">Status</th>
                            <th className="px-4 py-4">Score</th>
                            <th className="px-4 py-4">Submitted</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {filteredResults.map((row) => (
                            <tr key={row.id} className="text-sm">
                              <td className="px-4 py-4">
                                <p className="font-black tracking-[0.08em] text-white">
                                  {row.candidate_name}
                                </p>
                                <p className="mt-2 text-xs text-cyan-100/90">
                                  {row.candidate_email}
                                </p>
                                <p className="mt-2 text-xs text-white/55">
                                  {row.candidate_university || "—"}
                                </p>
                              </td>
                              <td className="px-4 py-4">
                                <p className="font-black tracking-[0.08em] text-white">
                                  {row.cohort_type}
                                </p>
                                <p className="mt-2 text-xs text-white/55">
                                  {row.cohort_slug}
                                </p>
                              </td>
                              <td className="px-4 py-4 text-white/75">
                                {row.test_label}
                              </td>
                              <td className="px-4 py-4">
                                {row.github_url ? (
                                  <GitHubLink href={row.github_url} />
                                ) : (
                                  <span className="text-white/35">—</span>
                                )}
                              </td>
                              <td className="px-4 py-4">
                                <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-black tracking-[0.16em] text-white/70">
                                  {row.status}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-white/75">
                                {row.score ?? "—"}
                              </td>
                              <td className="px-4 py-4 text-white/55">
                                {formatAdminDateTime(row.submitted_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-white/10 bg-black/20 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black tracking-[0.3em] text-cyan-300/80">
                          Sprint Review
                        </p>
                        <h2 className="mt-2 text-3xl font-black uppercase tracking-tight">
                          GitHub submissions
                        </h2>
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      {selectedSprintReviews.length === 0 ? (
                        <div className="rounded-[20px] border border-white/10 bg-[#08111a] p-5 text-sm text-white/55">
                          No sprint submissions available for the current
                          filter.
                        </div>
                      ) : (
                        selectedSprintReviews.map((review) => (
                          <ReviewEditor
                            key={review.submission_id}
                            review={review}
                            onSave={saveSprintReview}
                          />
                        ))
                      )}
                    </div>
                  </section>
                </div>
              )}

              {adminView === "content" &&
                selectedBundle &&
                selectedQualifier && (
                  <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                    <aside className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                      <p className="text-[10px] font-black tracking-[0.28em] text-white/45">
                        Cohorts
                      </p>
                      <div className="mt-4 space-y-3">
                        {payload.cohorts.map((cohort) => (
                          <button
                            key={cohort.id}
                            type="button"
                            onClick={() => {
                              setSelectedCohortId(cohort.id);
                              setSuccessMessage(null);
                            }}
                            className={`w-full rounded-[20px] border px-4 py-4 text-left transition-colors ${
                              cohort.id === selectedCohortId
                                ? "border-cyan-300/40 bg-cyan-300/10"
                                : "border-white/10 bg-white/[0.03] hover:border-white/20"
                            }`}
                          >
                            <p className="text-sm font-black tracking-[0.16em] text-white">
                              {cohort.type}
                            </p>
                            <p className="mt-2 text-[10px] font-bold tracking-[0.18em] text-white/45">
                              {cohort.slug}
                            </p>
                          </button>
                        ))}
                      </div>
                    </aside>

                    <div className="space-y-6">
                      <section className="rounded-[28px] border border-white/10 bg-black/20 p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black tracking-[0.3em] text-cyan-300/80">
                              Selected Cohort
                            </p>
                            <h2 className="mt-2 text-3xl font-black uppercase tracking-tight">
                              {selectedCohort?.type}
                            </h2>
                          </div>
                          <button
                            type="button"
                            onClick={saveContent}
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-xs font-black tracking-[0.24em] text-black transition-colors hover:bg-cyan-200 disabled:opacity-60"
                          >
                            <Save size={16} />
                            {isSaving ? "Saving..." : "Save Content"}
                          </button>
                        </div>
                      </section>

                      {selectedCohortDraft && (
                        <section className="rounded-[28px] border border-white/10 bg-black/20 p-6">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black tracking-[0.3em] text-cyan-300/80">
                                Timeline Control
                              </p>
                              <h3 className="mt-2 text-2xl font-black uppercase tracking-tight">
                                Cohort Schedule and Unlock Rules
                              </h3>
                            </div>
                            <div className="rounded-full border border-white/10 px-4 py-2 text-[10px] font-black tracking-[0.22em] text-white/55">
                              {selectedBundle?.sprintDays.length ?? 0}{" "}
                              configured day
                              {(selectedBundle?.sprintDays.length ?? 0) === 1
                                ? ""
                                : "s"}{" "}
                              · {requiredSprintDayCount} required
                            </div>
                          </div>

                          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <Field label="Application opens">
                              <input
                                type="date"
                                value={
                                  selectedCohortDraft.application_open_date
                                }
                                onChange={(event) =>
                                  updateSelectedCohortDraft((cohort) => ({
                                    ...cohort,
                                    application_open_date: event.target.value,
                                  }))
                                }
                                className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
                              />
                            </Field>
                            <Field label="Application closes">
                              <input
                                type="date"
                                value={
                                  selectedCohortDraft.application_close_date
                                }
                                onChange={(event) =>
                                  updateSelectedCohortDraft((cohort) => ({
                                    ...cohort,
                                    application_close_date: event.target.value,
                                  }))
                                }
                                className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
                              />
                            </Field>
                            <Field label="Schedule timezone">
                              <input
                                value={selectedCohortDraft.schedule_timezone}
                                onChange={(event) =>
                                  updateSelectedCohortDraft((cohort) => ({
                                    ...cohort,
                                    schedule_timezone:
                                      event.target.value ||
                                      DEFAULT_COHORT_TIMEZONE,
                                  }))
                                }
                                className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
                              />
                            </Field>
                            <Field label="Qualifier opens">
                              <input
                                type="date"
                                value={selectedCohortDraft.qualifier_open_date}
                                onChange={(event) =>
                                  updateSelectedCohortDraft((cohort) => ({
                                    ...cohort,
                                    qualifier_open_date: event.target.value,
                                  }))
                                }
                                className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
                              />
                            </Field>
                            <Field label="Qualifier closes">
                              <input
                                type="date"
                                value={selectedCohortDraft.qualifier_close_date}
                                onChange={(event) =>
                                  updateSelectedCohortDraft((cohort) => ({
                                    ...cohort,
                                    qualifier_close_date: event.target.value,
                                  }))
                                }
                                className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
                              />
                            </Field>
                            <div />
                            <Field label="Sprint starts">
                              <input
                                type="date"
                                value={selectedCohortDraft.sprint_start_date}
                                onChange={(event) =>
                                  updateSelectedCohortDraft((cohort) => ({
                                    ...cohort,
                                    sprint_start_date: event.target.value,
                                  }))
                                }
                                className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
                              />
                            </Field>
                            <Field label="Sprint ends">
                              <input
                                type="date"
                                value={selectedCohortDraft.sprint_end_date}
                                onChange={(event) =>
                                  updateSelectedCohortDraft((cohort) => ({
                                    ...cohort,
                                    sprint_end_date: event.target.value,
                                  }))
                                }
                                className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
                              />
                            </Field>
                            <Field label="Results announced">
                              <input
                                type="date"
                                value={
                                  selectedCohortDraft.results_announcement_date
                                }
                                onChange={(event) =>
                                  updateSelectedCohortDraft((cohort) => ({
                                    ...cohort,
                                    results_announcement_date:
                                      event.target.value,
                                  }))
                                }
                                className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
                              />
                            </Field>
                          </div>

                          {scheduleValidationErrors.length > 0 && (
                            <p className="mt-5 text-xs font-black tracking-[0.18em] text-red-200">
                              {scheduleValidationErrors[0]}
                            </p>
                          )}
                        </section>
                      )}

                      <section className="rounded-[28px] border border-white/10 bg-black/20 p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black tracking-[0.3em] text-cyan-300/80">
                              Qualifier
                            </p>
                            <h3 className="mt-2 text-2xl font-black uppercase tracking-tight">
                              Timed entry assessment
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedBundle((bundle) => {
                                const qualifier = ensureQualifier(
                                  bundle,
                                  selectedCohortId,
                                );

                                return {
                                  ...bundle,
                                  qualifier: {
                                    ...qualifier,
                                    questions: [
                                      ...qualifier.questions,
                                      createQuestion("scenario"),
                                    ],
                                  },
                                };
                              })
                            }
                            className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 px-4 py-2 text-[10px] font-black tracking-[0.24em] text-cyan-100 transition-colors hover:bg-cyan-300/10"
                          >
                            <Plus size={14} />
                            Add qualifier question
                          </button>
                        </div>

                        <div className="mt-5">
                          <Field label="Duration (seconds)">
                            <input
                              type="number"
                              min={300}
                              value={selectedQualifier.duration_seconds}
                              onChange={(event) =>
                                updateSelectedBundle((bundle) => {
                                  const qualifier = ensureQualifier(
                                    bundle,
                                    selectedCohortId,
                                  );

                                  return {
                                    ...bundle,
                                    qualifier: {
                                      ...qualifier,
                                      duration_seconds:
                                        Number(event.target.value) || 300,
                                    },
                                  };
                                })
                              }
                              className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
                            />
                          </Field>
                        </div>

                        <div className="mt-6">
                          <QuestionImportPanel
                            onImported={(questions, replaceExisting) =>
                              updateSelectedBundle((bundle) => {
                                const qualifier = ensureQualifier(
                                  bundle,
                                  selectedCohortId,
                                );

                                return {
                                  ...bundle,
                                  qualifier: {
                                    ...qualifier,
                                    questions: replaceExisting
                                      ? questions
                                      : [...qualifier.questions, ...questions],
                                  },
                                };
                              })
                            }
                          />
                        </div>

                        <div className="mt-6 space-y-5">
                          {selectedQualifier.questions.map(
                            (question, index) => (
                              <QuestionEditor
                                key={question.id}
                                question={question}
                                onChange={(nextQuestion) =>
                                  updateSelectedBundle((bundle) => {
                                    const qualifier = ensureQualifier(
                                      bundle,
                                      selectedCohortId,
                                    );

                                    return {
                                      ...bundle,
                                      qualifier: {
                                        ...qualifier,
                                        questions: qualifier.questions.map(
                                          (item, itemIndex) =>
                                            itemIndex === index
                                              ? nextQuestion
                                              : item,
                                        ),
                                      },
                                    };
                                  })
                                }
                                onRemove={() =>
                                  updateSelectedBundle((bundle) => {
                                    const qualifier = ensureQualifier(
                                      bundle,
                                      selectedCohortId,
                                    );

                                    return {
                                      ...bundle,
                                      qualifier: {
                                        ...qualifier,
                                        questions: qualifier.questions.filter(
                                          (_, itemIndex) => itemIndex !== index,
                                        ),
                                      },
                                    };
                                  })
                                }
                              />
                            ),
                          )}
                        </div>
                      </section>

                      <section className="rounded-[28px] border border-white/10 bg-black/20 p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black tracking-[0.3em] text-cyan-300/80">
                              Sprint Days
                            </p>
                            <h3 className="mt-2 text-2xl font-black uppercase tracking-tight">
                              Day-by-day GitHub tasks
                            </h3>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                updateSelectedBundle((bundle) => ({
                                  ...bundle,
                                  sprintDays: [
                                    ...bundle.sprintDays,
                                    createEmptySprintDay(
                                      selectedCohortId,
                                      bundle.sprintDays.length + 1,
                                    ),
                                  ],
                                }))
                              }
                              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 px-4 py-2 text-[10px] font-black tracking-[0.24em] text-cyan-100 transition-colors hover:bg-cyan-300/10"
                            >
                              <Plus size={14} />
                              Add day
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateSelectedBundle((bundle) => ({
                                  ...bundle,
                                  sprintDays: bundle.sprintDays.slice(0, -1),
                                }))
                              }
                              disabled={
                                (selectedBundle?.sprintDays.length ?? 0) <= 1
                              }
                              className="inline-flex items-center gap-2 rounded-full border border-red-400/30 px-4 py-2 text-[10px] font-black tracking-[0.24em] text-red-200 transition-colors hover:bg-red-400/10 disabled:opacity-50"
                            >
                              <Trash2 size={14} />
                              Remove last day
                            </button>
                          </div>
                        </div>

                        <div className="mt-6 space-y-6">
                          {selectedBundle.sprintDays.map((sprintDay, index) => (
                            <div
                              key={`${sprintDay.id || "new"}-${index}`}
                              className="rounded-[24px] border border-white/10 bg-[#08111a] p-5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-sm font-black tracking-[0.18em] text-white">
                                  Day {index + 1}
                                </p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSelectedBundle((bundle) => ({
                                      ...bundle,
                                      sprintDays: bundle.sprintDays.map(
                                        (item, itemIndex) =>
                                          itemIndex === index
                                            ? createEmptySprintDay(
                                                selectedCohortId,
                                                index + 1,
                                              )
                                            : item,
                                      ),
                                    }))
                                  }
                                  className="inline-flex items-center gap-2 rounded-full border border-red-400/30 px-3 py-2 text-[10px] font-black tracking-[0.22em] text-red-200 transition-colors hover:bg-red-400/10"
                                >
                                  <Trash2 size={14} />
                                  Reset day
                                </button>
                              </div>

                              <div className="mt-5 grid gap-4 md:grid-cols-2">
                                <Field label="Title">
                                  <input
                                    value={sprintDay.title}
                                    onChange={(event) =>
                                      updateSelectedBundle((bundle) => ({
                                        ...bundle,
                                        sprintDays: bundle.sprintDays.map(
                                          (item, itemIndex) =>
                                            itemIndex === index
                                              ? {
                                                  ...item,
                                                  title: event.target.value,
                                                }
                                              : item,
                                        ),
                                      }))
                                    }
                                    className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
                                  />
                                </Field>
                                <Field label="Description">
                                  <input
                                    value={sprintDay.description}
                                    onChange={(event) =>
                                      updateSelectedBundle((bundle) => ({
                                        ...bundle,
                                        sprintDays: bundle.sprintDays.map(
                                          (item, itemIndex) =>
                                            itemIndex === index
                                              ? {
                                                  ...item,
                                                  description:
                                                    event.target.value,
                                                }
                                              : item,
                                        ),
                                      }))
                                    }
                                    className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
                                  />
                                </Field>
                                <div className="md:col-span-2">
                                  <Field label="Task brief">
                                    <textarea
                                      rows={5}
                                      value={sprintDay.brief}
                                      onChange={(event) =>
                                        updateSelectedBundle((bundle) => ({
                                          ...bundle,
                                          sprintDays: bundle.sprintDays.map(
                                            (item, itemIndex) =>
                                              itemIndex === index
                                                ? {
                                                    ...item,
                                                    brief: event.target.value,
                                                  }
                                                : item,
                                          ),
                                        }))
                                      }
                                      className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
                                    />
                                  </Field>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  </div>
                )}
            </>
          )}
        </SignedIn>
      </div>
    </main>
  );
}

export default function AdminPage() {
  if (!hasClerkPublishableKey) {
    return (
      <main className="min-h-screen bg-[#071018] px-4 py-10 text-white">
        <section className="mx-auto max-w-4xl rounded-[24px] border border-amber-400/20 bg-amber-400/10 p-8">
          <h1 className="text-3xl font-black uppercase tracking-tight">
            Admin access is unavailable
          </h1>
          <p className="mt-4 text-sm font-bold tracking-[0.16em] text-white/65">
            Add <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> to use the admin
            console.
          </p>
        </section>
      </main>
    );
  }

  return <AdminPageContent />;
}
