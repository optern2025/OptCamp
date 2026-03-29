"use client";

import {
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Code2,
  Flag,
  ListTodo,
} from "lucide-react";
import type { ReactNode } from "react";
import type { AssessmentQuestion } from "@/lib/types";

export type AssessmentAnswerValue = string | string[];

interface AssessmentRunnerProps {
  title: string;
  eyebrow: string;
  subtitle: string;
  questions: AssessmentQuestion[];
  answers: Record<string, AssessmentAnswerValue>;
  reviewFlags: Record<string, boolean>;
  currentIndex: number;
  onNavigate: (index: number) => void;
  onAnswerChange: (questionId: string, value: AssessmentAnswerValue) => void;
  onToggleReview: (questionId: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  isSubmitting: boolean;
  timeDisplay?: string;
  meta?: ReactNode;
}

function answerCount(value: AssessmentAnswerValue | undefined) {
  if (Array.isArray(value)) {
    return value.length;
  }

  return typeof value === "string" && value.trim().length > 0 ? 1 : 0;
}

function questionTone({
  isCurrent,
  isAnswered,
  isMarked,
}: {
  isCurrent: boolean;
  isAnswered: boolean;
  isMarked: boolean;
}) {
  if (isCurrent) {
    return "border-cyan-300 bg-cyan-300 text-black";
  }

  if (isMarked) {
    return "border-amber-300/60 bg-amber-300/15 text-amber-100";
  }

  if (isAnswered) {
    return "border-emerald-300/45 bg-emerald-300/10 text-emerald-100";
  }

  return "border-white/10 bg-white/[0.04] text-white/70";
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: AssessmentQuestion;
  value: AssessmentAnswerValue | undefined;
  onChange: (value: AssessmentAnswerValue) => void;
}) {
  if (question.type === "mcq") {
    const selectedValues = Array.isArray(value)
      ? value
      : typeof value === "string" && value
        ? [value]
        : [];

    return (
      <div className="space-y-3">
        {question.options.map((option) => {
          const checked = selectedValues.includes(option.id);

          return (
            <label
              key={option.id}
              className={`flex cursor-pointer items-start gap-3 rounded-[18px] border px-4 py-4 transition-colors ${
                checked
                  ? "border-cyan-300/50 bg-cyan-300/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              }`}
            >
              <input
                type={question.allowMultiple ? "checkbox" : "radio"}
                name={question.id}
                checked={checked}
                onChange={(event) => {
                  if (!question.allowMultiple) {
                    onChange(event.target.value);
                    return;
                  }

                  const nextValues = event.target.checked
                    ? [...selectedValues, event.target.value]
                    : selectedValues.filter(
                        (item) => item !== event.target.value,
                      );
                  onChange(nextValues);
                }}
                value={option.id}
                className="mt-1 h-4 w-4 accent-cyan-300"
              />
              <span className="space-y-1">
                <span className="block text-sm font-semibold text-white">
                  {option.label}
                </span>
                {option.detail && (
                  <span className="block text-xs tracking-[0.18em] text-white/45">
                    {option.detail}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <textarea
      rows={question.type === "debug" ? 12 : 8}
      value={Array.isArray(value) ? value.join(", ") : (value ?? "")}
      onChange={(event) => onChange(event.target.value)}
      className="w-full select-text rounded-[22px] border border-white/10 bg-[#091521] px-5 py-4 text-sm text-white outline-none transition-colors focus:border-cyan-300"
      placeholder={
        question.type === "debug"
          ? "Explain the issue, diagnosis path, and fix..."
          : "Write your response here..."
      }
    />
  );
}

export function AssessmentRunner({
  title,
  eyebrow,
  subtitle,
  questions,
  answers,
  reviewFlags,
  currentIndex,
  onNavigate,
  onAnswerChange,
  onToggleReview,
  onSubmit,
  submitLabel,
  isSubmitting,
  timeDisplay,
  meta,
}: AssessmentRunnerProps) {
  const currentQuestion = questions[currentIndex];
  const answeredQuestions = questions.filter(
    (question) => answerCount(answers[question.id]) > 0,
  ).length;

  if (!currentQuestion) {
    return null;
  }

  return (
    <section className="grid gap-6 select-none lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="rounded-[28px] border border-white/10 bg-[#07131e]/90 p-5">
        <p className="text-[10px] font-black tracking-[0.35em] text-cyan-300/75">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-white">
          {title}
        </h2>
        <p className="mt-3 text-xs font-bold tracking-[0.18em] text-white/50">
          {subtitle}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-cyan-300">
              <ListTodo size={16} />
              <span className="text-[10px] font-black tracking-[0.24em]">
                Progress
              </span>
            </div>
            <p className="mt-3 text-2xl font-black text-white">
              {answeredQuestions}/{questions.length}
            </p>
          </div>

          <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-amber-200">
              <Flag size={16} />
              <span className="text-[10px] font-black tracking-[0.24em]">
                Review
              </span>
            </div>
            <p className="mt-3 text-2xl font-black text-white">
              {questions.filter((question) => reviewFlags[question.id]).length}
            </p>
          </div>

          <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-emerald-200">
              <CheckCheck size={16} />
              <span className="text-[10px] font-black tracking-[0.24em]">
                Time
              </span>
            </div>
            <p className="mt-3 text-2xl font-black text-white">
              {timeDisplay ?? "Flexible"}
            </p>
          </div>
        </div>

        {meta && <div className="mt-5">{meta}</div>}

        <div className="mt-6">
          <p className="text-[10px] font-black tracking-[0.28em] text-white/45">
            Questions
          </p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {questions.map((question, index) => {
              const isAnswered = answerCount(answers[question.id]) > 0;
              const isMarked = Boolean(reviewFlags[question.id]);
              const isCurrent = currentIndex === index;

              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => onNavigate(index)}
                  className={`rounded-2xl border px-0 py-3 text-sm font-black transition-colors ${questionTone(
                    {
                      isCurrent,
                      isAnswered,
                      isMarked,
                    },
                  )}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <div className="space-y-5 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,20,31,0.96),rgba(4,10,18,0.96))] p-6 md:p-8">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[10px] font-black tracking-[0.3em] text-cyan-300/75">
              Question {currentIndex + 1}
            </p>
            <h3 className="mt-3 text-3xl font-black tracking-tight text-white">
              {currentQuestion.prompt}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onToggleReview(currentQuestion.id)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-black tracking-[0.24em] transition-colors ${
              reviewFlags[currentQuestion.id]
                ? "border-amber-300/50 bg-amber-300/15 text-amber-100"
                : "border-white/10 text-white/60 hover:border-white/25 hover:text-white"
            }`}
          >
            <Flag size={14} />
            {reviewFlags[currentQuestion.id]
              ? "Marked for review"
              : "Mark for review"}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-4">
            {currentQuestion.guidance && (
              <div className="rounded-[20px] border border-cyan-300/20 bg-cyan-300/10 p-4">
                <p className="text-[10px] font-black tracking-[0.26em] text-cyan-100/75">
                  Guidance
                </p>
                <p className="mt-2 text-sm text-cyan-50/90">
                  {currentQuestion.guidance}
                </p>
              </div>
            )}

            <QuestionInput
              question={currentQuestion}
              value={answers[currentQuestion.id]}
              onChange={(value) => onAnswerChange(currentQuestion.id, value)}
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-3 text-xs font-black tracking-[0.22em] text-white/70 transition-colors hover:border-white/25 hover:text-white disabled:opacity-40"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  onNavigate(Math.min(questions.length - 1, currentIndex + 1))
                }
                disabled={currentIndex === questions.length - 1}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-300/35 px-4 py-3 text-xs font-black tracking-[0.22em] text-cyan-100 transition-colors hover:bg-cyan-300/10 disabled:opacity-40"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {currentQuestion.type === "debug" && (
              <div className="rounded-[22px] border border-white/10 bg-[#0c1724] p-4">
                <div className="flex items-center gap-2 text-cyan-300">
                  <Code2 size={16} />
                  <p className="text-[10px] font-black tracking-[0.24em]">
                    {currentQuestion.language || "Code context"}
                  </p>
                </div>
                {currentQuestion.starterCode && (
                  <pre className="mt-3 overflow-x-auto rounded-[16px] bg-black/30 p-4 text-xs text-cyan-50/90">
                    <code>{currentQuestion.starterCode}</code>
                  </pre>
                )}
                {currentQuestion.expectedOutcome && (
                  <p className="mt-3 text-xs tracking-[0.16em] text-white/50">
                    Expected outcome: {currentQuestion.expectedOutcome}
                  </p>
                )}
              </div>
            )}

            {currentQuestion.type === "scenario" && (
              <div className="rounded-[22px] border border-white/10 bg-[#0c1724] p-4">
                <p className="text-[10px] font-black tracking-[0.24em] text-cyan-300/75">
                  Scenario brief
                </p>
                {currentQuestion.deliverable && (
                  <p className="mt-3 text-xs tracking-[0.18em] text-white/55">
                    Deliverable: {currentQuestion.deliverable}
                  </p>
                )}
                {currentQuestion.constraints?.length ? (
                  <div className="mt-4 space-y-2">
                    {currentQuestion.constraints.map((constraint) => (
                      <p
                        key={constraint}
                        className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/75"
                      >
                        {constraint}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            {currentQuestion.rubric && (
              <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[10px] font-black tracking-[0.24em] text-white/45">
                  Evaluated for
                </p>
                <p className="mt-2 text-sm text-white/80">
                  {currentQuestion.rubric}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="w-full rounded-[20px] bg-cyan-300 px-4 py-4 text-xs font-black tracking-[0.26em] text-black transition-colors hover:bg-cyan-200 disabled:opacity-60"
            >
              {isSubmitting ? "Submitting..." : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
