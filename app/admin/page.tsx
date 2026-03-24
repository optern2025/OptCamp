"use client";

import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import { FileUp, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { hasClerkPublishableKey } from "@/lib/clerkEnv";
import type {
  AdminContentPayload,
  AssessmentQuestion,
  AssessmentQuestionType,
  CohortContentBundle,
  DebugQuestion,
  MultipleChoiceQuestion,
  QualifierTemplate,
  ScenarioQuestion,
} from "@/lib/types";

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

function createEmptyBundle(cohortId: string): CohortContentBundle {
  return {
    qualifier: createEmptyQualifier(cohortId),
    stages: [],
  };
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <span className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">
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
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300/70">
          {question.type} question
        </p>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-2 rounded-full border border-red-400/30 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-red-200 transition-colors hover:bg-red-400/10"
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
          <label className="inline-flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-white/65">
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
                  <label className="inline-flex items-center gap-2 rounded-[14px] border border-white/10 px-4 py-3 text-xs uppercase tracking-[0.16em] text-white/65">
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
                    className="rounded-[14px] border border-red-400/20 px-4 py-3 text-xs uppercase tracking-[0.16em] text-red-200 transition-colors hover:bg-red-400/10"
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
            className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100 transition-colors hover:bg-cyan-300/10"
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

  const importPdf = async () => {
    if (!file) {
      setErrorMessage("Choose a PDF before importing.");
      return;
    }

    setIsImporting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/content/import-pdf", {
        method: "POST",
        body: formData,
      });
      const data = await readJsonResponse<{
        questions?: AssessmentQuestion[];
        error?: string;
      }>(response);

      if (!response.ok || !data.questions) {
        throw new Error(data.error ?? "Unable to import questions from PDF.");
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
          : "Unable to import questions from PDF.",
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="rounded-[22px] border border-white/10 bg-[#07121b] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300/70">
            PDF import
          </p>
          <p className="mt-2 max-w-2xl text-xs uppercase tracking-[0.14em] text-white/50">
            Upload a structured PDF to generate questions, then keep refining
            them in the editor below.
          </p>
        </div>
        <button
          type="button"
          onClick={importPdf}
          disabled={!file || isImporting}
          className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100 transition-colors hover:bg-cyan-300/10 disabled:opacity-50"
        >
          <FileUp size={14} />
          {isImporting ? "Importing..." : "Import PDF"}
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <Field label="PDF file">
          <input
            type="file"
            accept="application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-cyan-300 file:px-4 file:py-2 file:text-xs file:font-black file:uppercase file:tracking-[0.18em] file:text-black"
          />
        </Field>
        <label className="inline-flex items-center gap-3 rounded-[18px] border border-white/10 px-4 py-3 text-xs uppercase tracking-[0.16em] text-white/65">
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
        <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-red-200">
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
          {successMessage}
        </p>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [payload, setPayload] = useState<AdminContentPayload | null>(null);
  const [selectedCohortId, setSelectedCohortId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, CohortContentBundle>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  useEffect(() => {
    loadAdminContent();
  }, [loadAdminContent]);

  const selectedCohort = useMemo(
    () =>
      payload?.cohorts.find((cohort) => cohort.id === selectedCohortId) ?? null,
    [payload, selectedCohortId],
  );

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

    return (
      selectedBundle.qualifier ?? createEmptyBundle(selectedCohortId).qualifier
    );
  }, [selectedBundle, selectedCohortId]);

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

  const saveContent = async () => {
    if (!selectedCohortId || !selectedBundle || !selectedQualifier) {
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
          qualifier: selectedQualifier,
          stages: selectedBundle.stages,
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

  if (!hasClerkPublishableKey) {
    return (
      <main className="min-h-screen bg-[#071018] px-4 py-10 text-white">
        <section className="mx-auto max-w-4xl rounded-[24px] border border-amber-400/20 bg-amber-400/10 p-8">
          <h1 className="text-3xl font-black uppercase tracking-tight">
            Admin access is unavailable
          </h1>
          <p className="mt-4 text-sm font-bold uppercase tracking-[0.16em] text-white/65">
            Add <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> to use the admin
            content studio.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#071018] px-4 py-10 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.22),_transparent_30%),linear-gradient(140deg,#09131d_0%,#04080d_100%)] p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300/80">
            Admin Studio
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-tight md:text-5xl">
            Cohort Content Dashboard
          </h1>
          <p className="mt-4 max-w-3xl text-sm font-bold uppercase tracking-[0.16em] text-white/55">
            Add qualifier content and sprint-stage questions with MCQs,
            debugging snippets, and scenario implementation prompts.
          </p>
        </header>

        <SignedOut>
          <section className="rounded-[24px] border border-white/10 bg-black/30 p-8">
            <h2 className="text-2xl font-black uppercase tracking-tight">
              Sign in to manage cohort content
            </h2>
            <div className="mt-6 flex flex-wrap gap-3">
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="bg-cyan-400 px-6 py-3 text-xs font-black uppercase tracking-[0.24em] text-black transition-colors hover:bg-cyan-300"
                >
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="border border-cyan-400 px-6 py-3 text-xs font-black uppercase tracking-[0.24em] text-cyan-300 transition-colors hover:bg-cyan-400 hover:text-black"
                >
                  Create Account
                </button>
              </SignUpButton>
            </div>
          </section>
        </SignedOut>

        <SignedIn>
          {isLoading && (
            <section className="rounded-[24px] border border-white/10 bg-black/30 p-8">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-white/55">
                Loading admin content studio...
              </p>
            </section>
          )}

          {errorMessage && (
            <section className="rounded-[24px] border border-red-500/30 bg-red-500/10 p-6">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-red-200">
                {errorMessage}
              </p>
            </section>
          )}

          {successMessage && (
            <section className="rounded-[24px] border border-emerald-400/30 bg-emerald-400/10 p-6">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-100">
                {successMessage}
              </p>
            </section>
          )}

          {payload && selectedBundle && selectedQualifier && (
            <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
              <aside className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">
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
                      <p className="text-sm font-black uppercase tracking-[0.16em] text-white">
                        {cohort.type}
                      </p>
                      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
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
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300/80">
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
                      className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-xs font-black uppercase tracking-[0.24em] text-black transition-colors hover:bg-cyan-200 disabled:opacity-60"
                    >
                      <Save size={16} />
                      {isSaving ? "Saving..." : "Save Content"}
                    </button>
                  </div>
                </section>

                <section className="rounded-[28px] border border-white/10 bg-black/20 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300/80">
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
                      className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100 transition-colors hover:bg-cyan-300/10"
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
                    {selectedQualifier.questions.map((question, index) => (
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
                                    itemIndex === index ? nextQuestion : item,
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
                    ))}
                  </div>
                </section>

                <section className="rounded-[28px] border border-white/10 bg-black/20 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300/80">
                        Sprint Stages
                      </p>
                      <h3 className="mt-2 text-2xl font-black uppercase tracking-tight">
                        Progressive assessments
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateSelectedBundle((bundle) => ({
                          ...bundle,
                          stages: [
                            ...bundle.stages,
                            {
                              id: "",
                              cohort_id: selectedCohortId,
                              stage_number: bundle.stages.length + 1,
                              title: "",
                              description: "",
                              duration_minutes: 45,
                              questions: [],
                              created_at: "",
                            },
                          ],
                        }))
                      }
                      className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100 transition-colors hover:bg-cyan-300/10"
                    >
                      <Plus size={14} />
                      Add stage
                    </button>
                  </div>

                  <div className="mt-6 space-y-6">
                    {selectedBundle.stages.map((stage, stageIndex) => (
                      <div
                        key={`${stage.id || "new"}-${stageIndex}`}
                        className="rounded-[24px] border border-white/10 bg-[#08111a] p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-black uppercase tracking-[0.18em] text-white">
                            Stage {stageIndex + 1}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedBundle((bundle) => ({
                                ...bundle,
                                stages: bundle.stages.filter(
                                  (_, itemIndex) => itemIndex !== stageIndex,
                                ),
                              }))
                            }
                            className="inline-flex items-center gap-2 rounded-full border border-red-400/30 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-red-200 transition-colors hover:bg-red-400/10"
                          >
                            <Trash2 size={14} />
                            Remove stage
                          </button>
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                          <Field label="Title">
                            <input
                              value={stage.title}
                              onChange={(event) =>
                                updateSelectedBundle((bundle) => ({
                                  ...bundle,
                                  stages: bundle.stages.map(
                                    (item, itemIndex) =>
                                      itemIndex === stageIndex
                                        ? { ...item, title: event.target.value }
                                        : item,
                                  ),
                                }))
                              }
                              className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
                            />
                          </Field>
                          <Field label="Duration (minutes)">
                            <input
                              type="number"
                              min={5}
                              value={stage.duration_minutes}
                              onChange={(event) =>
                                updateSelectedBundle((bundle) => ({
                                  ...bundle,
                                  stages: bundle.stages.map(
                                    (item, itemIndex) =>
                                      itemIndex === stageIndex
                                        ? {
                                            ...item,
                                            duration_minutes:
                                              Number(event.target.value) || 5,
                                          }
                                        : item,
                                  ),
                                }))
                              }
                              className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
                            />
                          </Field>
                          <div className="md:col-span-2">
                            <Field label="Description">
                              <textarea
                                rows={4}
                                value={stage.description}
                                onChange={(event) =>
                                  updateSelectedBundle((bundle) => ({
                                    ...bundle,
                                    stages: bundle.stages.map(
                                      (item, itemIndex) =>
                                        itemIndex === stageIndex
                                          ? {
                                              ...item,
                                              description: event.target.value,
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

                        <div className="mt-6">
                          <QuestionImportPanel
                            onImported={(questions, replaceExisting) =>
                              updateSelectedBundle((bundle) => ({
                                ...bundle,
                                stages: bundle.stages.map((item, itemIndex) =>
                                  itemIndex === stageIndex
                                    ? {
                                        ...item,
                                        questions: replaceExisting
                                          ? questions
                                          : [...item.questions, ...questions],
                                      }
                                    : item,
                                ),
                              }))
                            }
                          />
                        </div>

                        <div className="mt-6 flex flex-wrap gap-2">
                          {(
                            [
                              "mcq",
                              "debug",
                              "scenario",
                            ] as AssessmentQuestionType[]
                          ).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() =>
                                updateSelectedBundle((bundle) => ({
                                  ...bundle,
                                  stages: bundle.stages.map(
                                    (item, itemIndex) =>
                                      itemIndex === stageIndex
                                        ? {
                                            ...item,
                                            questions: [
                                              ...item.questions,
                                              createQuestion(type),
                                            ],
                                          }
                                        : item,
                                  ),
                                }))
                              }
                              className="rounded-full border border-cyan-300/25 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100 transition-colors hover:bg-cyan-300/10"
                            >
                              <Plus size={12} className="mr-1 inline" />
                              Add {type}
                            </button>
                          ))}
                        </div>

                        <div className="mt-6 space-y-5">
                          {stage.questions.map((question, questionIndex) => (
                            <QuestionEditor
                              key={question.id}
                              question={question}
                              onChange={(nextQuestion) =>
                                updateSelectedBundle((bundle) => ({
                                  ...bundle,
                                  stages: bundle.stages.map(
                                    (item, itemIndex) =>
                                      itemIndex === stageIndex
                                        ? {
                                            ...item,
                                            questions: item.questions.map(
                                              (stageQuestion, itemQIndex) =>
                                                itemQIndex === questionIndex
                                                  ? nextQuestion
                                                  : stageQuestion,
                                            ),
                                          }
                                        : item,
                                  ),
                                }))
                              }
                              onRemove={() =>
                                updateSelectedBundle((bundle) => ({
                                  ...bundle,
                                  stages: bundle.stages.map(
                                    (item, itemIndex) =>
                                      itemIndex === stageIndex
                                        ? {
                                            ...item,
                                            questions: item.questions.filter(
                                              (_, itemQIndex) =>
                                                itemQIndex !== questionIndex,
                                            ),
                                          }
                                        : item,
                                  ),
                                }))
                              }
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}
        </SignedIn>
      </div>
    </main>
  );
}
