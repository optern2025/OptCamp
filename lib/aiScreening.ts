import { GoogleGenAI } from "@google/genai";

export interface AIScreeningQuestion {
  id: string; // "q1", "q2", etc.
  type: "MCQ" | "practical";
  content: string; // The question itself
  options?: string[]; // For MCQ only
  correct_answer: string; // For MCQ: the exact string option. For practical: expected keyword/phrase summary
  explanation?: string; // Why it's correct (for admin/candidate feedback later)
  evaluation_rubric?: string; // For practical: how to grade it
  expected_concepts?: string[]; // For practical: concepts that must be covered
  difficulty: number;
}

export interface AIScreeningPacket {
  questions: AIScreeningQuestion[];
}

function getDistribution(difficulty: number) {
  if (difficulty === 1) return { mcq: 5, practical: 2 };
  if (difficulty === 2) return { mcq: 4, practical: 3 };
  if (difficulty === 3) return { mcq: 3, practical: 4 };
  return { mcq: 2, practical: 5 }; // 4+
}

export async function generateScreeningPacket(
  domainName: string,
  difficultyLevel: number,
  primaryModel: string = "gemini-2.5-flash",
  fallbackModel: string = "gemini-2.5-flash-lite"
): Promise<{ packet: AIScreeningPacket; modelUsed: string; fallbackUsed: boolean; timeMs: number; promptVersion: string }> {
  
  // Keys can be comma-separated in GEMINI_API_KEYS or single in GEMINI_API_KEY
  const keysStr = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
  const keys = keysStr.split(",").map(k => k.trim()).filter(Boolean);
  
  if (keys.length === 0) {
    throw new Error("No GEMINI_API_KEYS configured.");
  }

  const { mcq, practical } = getDistribution(difficultyLevel);
  const promptVersion = "v1-strict-engineering";

  const prompt = `
You are an expert technical interviewer for OptCamp. Generate exactly 7 screening questions for the domain: "${domainName}".
The difficulty level is ${difficultyLevel} out of 5.

Distribution requirements:
- Exactly ${mcq} Multiple Choice Questions (MCQ)
- Exactly ${practical} Practical/Scenario Questions

CRITICAL QUALITY RULES:
1. NO textbook trivia. NO definition-only questions (e.g., "What does API stand for?").
2. Focus strictly on problem-solving, reasoning, implementation ability, and real-world engineering decisions.
3. Questions must simulate realistic scenarios for ${domainName}.
4. Do NOT repeat concepts. Ensure broad coverage of the domain.
5. NO generic interview questions (e.g., "Where do you see yourself in 5 years?").

Format your response AS STRICT JSON matching this schema:
{
  "questions": [
    {
      "id": "q1",
      "type": "MCQ",
      "content": "A detailed scenario-based question...",
      "options": ["A", "B", "C", "D"], // exactly 4 options
      "correct_answer": "A", // MUST exactly match one of the options
      "explanation": "Why this is the correct architectural choice...",
      "difficulty": ${difficultyLevel}
    },
    {
      "id": "q2",
      "type": "practical",
      "content": "A real-world task or debugging scenario. Describe how you would fix X...",
      "evaluation_rubric": "Look for identification of the root cause (e.g., race condition) and a scalable fix.",
      "expected_concepts": ["Concurrency", "State Management", "Race Conditions"],
      "correct_answer": "Identifies race condition and proposes locking or state isolation.",
      "difficulty": ${difficultyLevel}
    }
  ]
}

DO NOT include any markdown code blocks (e.g., \`\`\`json) in your response, just the raw JSON string.
`;

  const startTime = Date.now();
  let lastError: any = null;

  // Attempt with Primary Model across all keys
  for (const key of keys) {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: primaryModel,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.4
        }
      });
      
      const text = response.text || "";
      const packet = JSON.parse(text) as AIScreeningPacket;
      
      if (!packet.questions || packet.questions.length !== 7) {
         throw new Error("Invalid question count returned from model.");
      }

      return {
        packet,
        modelUsed: primaryModel,
        fallbackUsed: false,
        timeMs: Date.now() - startTime,
        promptVersion
      };
    } catch (e) {
      lastError = e;
      console.warn(`[AI Screening] Primary model failed with key ${key.substring(0, 5)}...`, e);
    }
  }

  // Fallback to secondary model
  for (const key of keys) {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: fallbackModel,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.4
        }
      });
      
      const text = response.text || "";
      const packet = JSON.parse(text) as AIScreeningPacket;

      if (!packet.questions || packet.questions.length !== 7) {
        throw new Error("Invalid question count returned from fallback model.");
     }

      return {
        packet,
        modelUsed: fallbackModel,
        fallbackUsed: true,
        timeMs: Date.now() - startTime,
        promptVersion
      };
    } catch (e) {
      lastError = e;
      console.warn(`[AI Screening] Fallback model failed with key ${key.substring(0, 5)}...`, e);
    }
  }

  let errorMessage = lastError?.message || "Unknown Error";
  if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("rate limit")) {
    errorMessage = "Rate Limited / Quota Exceeded";
  } else if (errorMessage.includes("401") || errorMessage.toLowerCase().includes("key") || errorMessage.toLowerCase().includes("auth")) {
    errorMessage = "Invalid API Key";
  } else if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT")) {
    errorMessage = "Network Timeout";
  } else if (errorMessage.includes("fetch") || errorMessage.includes("network")) {
    errorMessage = "Network Failure";
  } else if (errorMessage.includes("Invalid question count")) {
    errorMessage = "Gemini Error: Returned malformed JSON or incorrect question count.";
  } else {
    errorMessage = `Gemini Error: ${errorMessage}`;
  }

  throw new Error(`AI Screening Generation failed: ${errorMessage}`);
}
