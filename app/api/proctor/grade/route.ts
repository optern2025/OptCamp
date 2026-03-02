import { NextResponse } from "next/server";
import { getAuthenticatedClerkUser } from "@/lib/clerkServer";

interface SubmissionAnswer {
  questionId: number;
  question: string;
  answer: string;
}

interface GradeRequestBody {
  examId?: string;
  subject?: string;
  cohortType?: string;
  answers?: SubmissionAnswer[];
}

interface GradeResult {
  score: number;
  feedback: string;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildFallbackGrade(answers: SubmissionAnswer[]): GradeResult {
  const answered = answers.filter((item) => item.answer.trim().length > 0);
  const answerRatio =
    answers.length === 0 ? 0 : answered.length / answers.length;
  const averageLength =
    answered.length === 0
      ? 0
      : answered.reduce((sum, item) => sum + item.answer.trim().length, 0) /
        answered.length;

  const completenessScore = answerRatio * 70;
  const depthScore = Math.min(30, averageLength / 18);
  const score = clampScore(completenessScore + depthScore);

  let feedback = "Good attempt with room to improve depth and structure.";

  if (score >= 85) {
    feedback =
      "Strong execution under pressure with clear and actionable responses.";
  } else if (score >= 70) {
    feedback =
      "Solid performance. Add sharper prioritization and more explicit tradeoff analysis.";
  } else if (score >= 50) {
    feedback =
      "Baseline competency shown, but answers need clearer structure and stronger detail.";
  } else {
    feedback =
      "Incomplete or shallow responses. Improve coverage and concrete execution detail.";
  }

  return { score, feedback };
}

async function gradeWithGemini(
  apiKey: string,
  payload: { subject: string; cohortType: string; answers: SubmissionAnswer[] },
): Promise<GradeResult> {
  const answerBlock = payload.answers
    .map(
      (item, index) =>
        `Q${index + 1}: ${item.question}\nA${index + 1}: ${item.answer.trim() || "[NO ANSWER]"}`,
    )
    .join("\n\n");

  const prompt = [
    "You are grading a proctored qualifier exam.",
    `Subject: ${payload.subject}`,
    `Cohort Type: ${payload.cohortType}`,
    "Evaluate for clarity, execution quality, prioritization, and practical decision-making.",
    'Return strict JSON: {"score": number, "feedback": string}.',
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

  const parsed = JSON.parse(text) as GradeResult;
  return {
    score: clampScore(Number(parsed.score) || 0),
    feedback:
      typeof parsed.feedback === "string" && parsed.feedback.trim().length > 0
        ? parsed.feedback.trim()
        : "Manual review required.",
  };
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedClerkUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as GradeRequestBody;
    const answers = Array.isArray(body.answers) ? body.answers : [];

    if (answers.length === 0) {
      return NextResponse.json(
        { error: "At least one answer is required for grading." },
        { status: 400 },
      );
    }

    const normalizedAnswers = answers.map((item) => ({
      questionId: Number(item.questionId) || 0,
      question: typeof item.question === "string" ? item.question : "",
      answer: typeof item.answer === "string" ? item.answer : "",
    }));

    const subject =
      typeof body.subject === "string" ? body.subject : "Qualifier";
    const cohortType =
      typeof body.cohortType === "string" ? body.cohortType : "General";

    const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

    if (geminiApiKey) {
      try {
        const grade = await gradeWithGemini(geminiApiKey, {
          subject,
          cohortType,
          answers: normalizedAnswers,
        });

        return NextResponse.json(grade);
      } catch {
        const fallback = buildFallbackGrade(normalizedAnswers);
        return NextResponse.json(fallback);
      }
    }

    const fallback = buildFallbackGrade(normalizedAnswers);
    return NextResponse.json(fallback);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected server error.",
      },
      { status: 500 },
    );
  }
}
