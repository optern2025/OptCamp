import { GoogleGenAI } from "@google/genai";

export interface AIGradingResult {
  score: number; // 0 - 100
  isCorrect: boolean;
  confidence: number; // 0 - 100
  reasoning: string;
  error?: boolean;
}

export async function gradePracticalSubmission(
  questionContent: string,
  userAnswer: string,
  evaluationRubric: string,
  expectedConcepts: string[],
  primaryModel: string = "gemini-2.5-flash",
  fallbackModel: string = "gemini-2.5-flash-lite"
): Promise<AIGradingResult> {
  const keysStr = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
  const keys = keysStr.split(",").map(k => k.trim()).filter(Boolean);
  
  if (keys.length === 0) {
    throw new Error("No GEMINI_API_KEYS configured.");
  }

  // Detect if the answer is code-based for prompt adaptation
  const isCodeAnswer = /```|function |const |let |var |=>|import |SELECT |FROM |WHERE |CREATE |ALTER |<[A-Z]/.test(userAnswer);

  const prompt = `
You are an expert technical recruiter and senior engineer evaluating a candidate's screening answer.
Grade the submission based purely on SEMANTIC UNDERSTANDING, technical accuracy, and problem-solving ability.

CRITICAL INSTRUCTIONS:
1. Do NOT require exact wording, specific keyword matches, or exact sentence structure.
2. Be highly lenient and recruiter-friendly. If the candidate demonstrates a correct high-level understanding of the core concept, they MUST receive a passing score (70+).
3. Do NOT heavily penalize for omitting advanced technical nuances if the basic, primary concept is correct.
4. Only score below 70 if the candidate's understanding is fundamentally flawed, dangerously incorrect, or they completely missed the point of the question.
5. Vary in answer format is allowed: bullet points, short answers, code snippets, and prose all are acceptable as long as the correct understanding is demonstrated.
${isCodeAnswer ? `6. CODE ANSWER DETECTED: Evaluate the code for correctness and problem-solving. Two different valid implementations that solve the same problem correctly should receive similar high scores. Do NOT penalize for using different but equivalent syntax, patterns, or approaches.` : ""}

SCORING BUCKETS:
- 85-100: Strong answer (Clear, correct understanding or correct code. Missing minor nuances is totally fine.)
- 70-84: Good answer (Correct high-level understanding. Core concept is right even with some gaps. PASS THEM.)
- 50-69: Partial/Weak understanding (Touched the concept but major gaps or partial code errors.)
- 0-49: Poor/Incorrect answer (Fundamentally misunderstands or code is entirely wrong/broken.)

QUESTION:
${questionContent}

EXPECTED ANSWER / RUBRIC:
${evaluationRubric}

EXPECTED CONCEPTS TO BE COVERED (Optional, do not penalize if candidate only covers the basics):
${expectedConcepts.join(", ")}

CANDIDATE ANSWER:
${userAnswer}

Provide your evaluation as a strict JSON object matching this exact schema:
{
  "score": 0-100,
  "isCorrect": true/false,
  "confidence": 0-100,
  "reasoning": "Detailed, constructive feedback on why they received this score."
}

DO NOT include any markdown code blocks (e.g., \`\`\`json) in your response. Just the raw JSON string.
`;

  let lastError: any = null;

  // Primary model attempt
  for (const key of keys) {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: primaryModel,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      });
      
      const text = response.text || "";
      if (!text.trim()) throw new Error("Empty response from AI.");

      // Clean up markdown block if present
      let cleanText = text.trim();
      if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "").trim();
      }

      const result = JSON.parse(cleanText) as AIGradingResult;
      
      if (typeof result.score !== "number" || typeof result.confidence !== "number" || typeof result.isCorrect !== "boolean") {
        throw new Error("Invalid grading format returned.");
      }

      return result;
    } catch (e: any) {
      lastError = e;
      // Log specifics for rate limits vs other failures
      const errMsg = e?.message || String(e);
      const isRateLimit = errMsg.includes("429") || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("rate");
      const isUnavailable = errMsg.includes("503") || errMsg.toLowerCase().includes("unavailable");
      console.warn(
        `[AI Grading] Primary model failed (${isRateLimit ? "RATE_LIMIT" : isUnavailable ? "UNAVAILABLE" : "ERROR"}) key ${key.substring(0, 8)}...`,
        errMsg.substring(0, 100)
      );
    }
  }

  // Fallback model attempt
  for (const key of keys) {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: fallbackModel,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      });
      
      const text = response.text || "";
      if (!text.trim()) throw new Error("Empty response from fallback AI.");

      let cleanText = text.trim();
      if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "").trim();
      }

      const result = JSON.parse(cleanText) as AIGradingResult;

      if (typeof result.score !== "number" || typeof result.confidence !== "number" || typeof result.isCorrect !== "boolean") {
        throw new Error("Invalid grading format from fallback.");
      }

      return result;
    } catch (e: any) {
      lastError = e;
      console.warn(`[AI Grading] Fallback model failed key ${key.substring(0, 8)}...`, String(e?.message || e).substring(0, 100));
    }
  }

  // SAFETY NET: If ALL AI calls fail (rate limit, network, etc.):
  // NEVER auto-fail the candidate. Flag for admin review instead.
  console.error("[AI Grading] CRITICAL: All AI grading attempts failed. Flagging for admin review to protect candidate.", lastError);
  return {
    score: 0,     // score of 0 + error flag triggers needsAdminReview in submit route
    isCorrect: false,
    confidence: 0, // confidence=0 < threshold → triggers admin review, not auto-fail
    reasoning: `Automated AI grading temporarily unavailable. This answer requires manual review. Error: ${String(lastError?.message || "Unknown").substring(0, 200)}`,
    error: true
  };
}
