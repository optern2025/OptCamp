export interface SubmissionAnswer {
  questionId: number | string;
  question: string;
  answer: string;
  questionType?: string;
  guidance?: string;
  rubric?: string;
  correctOptionIds?: string[];
}

export interface GradeResult {
  score: number;
  feedback: string;
  passed: boolean;
}

export const PASSING_SCORE = 70;

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function buildFallbackGrade(answers: SubmissionAnswer[]): GradeResult {
  const answered = answers.filter((item) => item.answer.trim().length > 0);
  const answerRatio =
    answers.length === 0 ? 0 : answered.length / answers.length;
  const averageLength =
    answered.length === 0
      ? 0
      : answered.reduce((sum, item) => sum + item.answer.trim().length, 0) /
        answered.length;

  const scorableMcqs = answers.filter(
    (item) =>
      Array.isArray(item.correctOptionIds) && item.correctOptionIds.length > 0,
  );
  const correctMcqs = scorableMcqs.filter((item) => {
    const provided = item.answer
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .sort();
    const expected = [...(item.correctOptionIds ?? [])].sort();

    return (
      provided.length === expected.length &&
      provided.every((value, index) => value === expected[index])
    );
  });

  const objectiveScore =
    scorableMcqs.length === 0
      ? 0
      : (correctMcqs.length / scorableMcqs.length) * 35;
  const completenessScore = answerRatio * 45;
  const depthScore = Math.min(20, averageLength / 24);
  const score = clampScore(objectiveScore + completenessScore + depthScore);

  let feedback = "Good attempt with room to improve depth and structure.";

  if (score >= 85) {
    feedback =
      "Strong execution under pressure with clear and actionable responses.";
  } else if (score >= PASSING_SCORE) {
    feedback =
      "Solid performance. Add sharper prioritization and more explicit tradeoff analysis.";
  } else if (score >= 50) {
    feedback =
      "Baseline competency shown, but answers need clearer structure and stronger detail.";
  } else {
    feedback =
      "Incomplete or shallow responses. Improve coverage and concrete execution detail.";
  }

  return {
    score,
    feedback,
    passed: score >= PASSING_SCORE,
  };
}

export async function gradeWithGemini(
  apiKey: string,
  payload: { subject: string; cohortType: string; answers: SubmissionAnswer[] },
): Promise<GradeResult> {
  const answerBlock = payload.answers
    .map((item, index) =>
      [
        `Q${index + 1} (${item.questionType ?? "response"}): ${item.question}`,
        item.guidance ? `Guidance: ${item.guidance}` : null,
        item.rubric ? `Rubric: ${item.rubric}` : null,
        item.correctOptionIds?.length
          ? `Correct option ids: ${item.correctOptionIds.join(", ")}`
          : null,
        `A${index + 1}: ${item.answer.trim() || "[NO ANSWER]"}`,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");

  const prompt = [
    "You are grading a proctored candidate assessment.",
    `Subject: ${payload.subject}`,
    `Cohort Type: ${payload.cohortType}`,
    "Evaluate for clarity, execution quality, prioritization, and practical decision-making.",
    `Return strict JSON: {"score": number, "feedback": string}. Passing threshold is ${PASSING_SCORE}.`,
    "Score must be between 0 and 100.",
    "Answers:",
    answerBlock,
  ].join("\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error("Gemini grading request failed.");
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text ??
    '{"score":0,"feedback":"Manual review required."}';

  const parsed = JSON.parse(text) as { score?: number; feedback?: string };
  const score = clampScore(Number(parsed.score) || 0);

  return {
    score,
    feedback:
      typeof parsed.feedback === "string" && parsed.feedback.trim().length > 0
        ? parsed.feedback.trim()
        : "Manual review required.",
    passed: score >= PASSING_SCORE,
  };
}
