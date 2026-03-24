import mammoth from "mammoth";
import type {
  AssessmentChoice,
  AssessmentQuestion,
  AssessmentQuestionType,
  DebugQuestion,
  MultipleChoiceQuestion,
  ScenarioQuestion,
} from "@/lib/types";

const FIELD_HEADERS = new Map<string, string>([
  ["type", "type"],
  ["prompt", "prompt"],
  ["guidance", "guidance"],
  ["rubric", "rubric"],
  ["solution", "solution"],
  ["options", "options"],
  ["deliverable", "deliverable"],
  ["constraints", "constraints"],
  ["language", "language"],
  ["starter code", "starterCode"],
  ["expected outcome", "expectedOutcome"],
  ["allow multiple", "allowMultiple"],
]);

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const TXT_MIME_TYPES = new Set(["text/plain", "application/octet-stream"]);

type ParsedQuestionField =
  | "type"
  | "prompt"
  | "guidance"
  | "rubric"
  | "solution"
  | "options"
  | "deliverable"
  | "constraints"
  | "language"
  | "starterCode"
  | "expectedOutcome"
  | "allowMultiple";

interface ParsedQuestionDraft {
  type: AssessmentQuestionType;
  prompt: string;
  guidance: string;
  rubric: string;
  solution: string;
  allowMultiple: boolean;
  options: Array<AssessmentChoice & { isCorrect: boolean }>;
  language: string;
  starterCode: string;
  expectedOutcome: string;
  deliverable: string;
  constraints: string[];
}

function createDraft(): ParsedQuestionDraft {
  return {
    type: "scenario",
    prompt: "",
    guidance: "",
    rubric: "",
    solution: "",
    allowMultiple: false,
    options: [],
    language: "",
    starterCode: "",
    expectedOutcome: "",
    deliverable: "",
    constraints: [],
  };
}

function stripCodeFence(value: string): string {
  return value
    .replace(/^```[a-z0-9_-]*\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeBlockText(value: string): string {
  return value
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .filter((line) => !/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line.trim()))
    .filter((line) => !/^page\s+\d+\s+of\s+\d+$/i.test(line.trim()))
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function normalizeQuestionType(value: string): AssessmentQuestionType {
  const normalized = value.trim().toLowerCase();
  if (normalized === "mcq" || normalized === "debug") {
    return normalized;
  }
  return "scenario";
}

function parseBoolean(value: string): boolean {
  return ["true", "yes", "y", "1"].includes(value.trim().toLowerCase());
}

function parseOption(line: string): AssessmentChoice & { isCorrect: boolean } {
  const trimmed = line.trim().replace(/^[-*]\s*/, "");
  const markerMatch = trimmed.match(/^\[(x|X|✓|correct)\]\s*(.+)$/);
  const plainMatch = trimmed.match(/^\[\s*\]\s*(.+)$/);
  const text = markerMatch?.[2] ?? plainMatch?.[1] ?? trimmed;

  return {
    id: crypto.randomUUID(),
    label: text.trim(),
    isCorrect: Boolean(markerMatch),
    detail: undefined,
  };
}

function splitQuestionBlocks(rawText: string): string[] {
  const lines = normalizeBlockText(rawText).split("\n");
  const blocks: string[] = [];
  let current: string[] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^question(?:\s+\d+)?$/i.test(trimmed)) {
      if (current && current.length > 0) {
        blocks.push(current.join("\n").trim());
      }
      current = [];
      continue;
    }

    if (/^end question$/i.test(trimmed)) {
      if (current && current.length > 0) {
        blocks.push(current.join("\n").trim());
      }
      current = null;
      continue;
    }

    if (current) {
      current.push(line);
    }
  }

  if (current && current.length > 0) {
    blocks.push(current.join("\n").trim());
  }

  return blocks.filter(Boolean);
}

function appendFieldLine(
  draft: ParsedQuestionDraft,
  field: ParsedQuestionField,
  line: string,
): void {
  if (field === "options") {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    draft.options.push(parseOption(trimmed));
    return;
  }

  if (field === "constraints") {
    const trimmed = line.trim().replace(/^[-*]\s*/, "");
    if (!trimmed) {
      return;
    }

    draft.constraints.push(trimmed);
    return;
  }

  const nextLine = line.trimEnd();

  const appendText = (value: string) =>
    value ? `${value}\n${nextLine}`.trim() : nextLine.trim();

  switch (field) {
    case "prompt":
      draft.prompt = appendText(draft.prompt);
      return;
    case "guidance":
      draft.guidance = appendText(draft.guidance);
      return;
    case "rubric":
      draft.rubric = appendText(draft.rubric);
      return;
    case "solution":
      draft.solution = appendText(draft.solution);
      return;
    case "deliverable":
      draft.deliverable = appendText(draft.deliverable);
      return;
    case "language":
      draft.language = appendText(draft.language);
      return;
    case "starterCode":
      draft.starterCode = appendText(draft.starterCode);
      return;
    case "expectedOutcome":
      draft.expectedOutcome = appendText(draft.expectedOutcome);
      return;
    case "type":
    case "allowMultiple":
      return;
  }
}

function buildQuestion(draft: ParsedQuestionDraft): AssessmentQuestion {
  const base = {
    id: crypto.randomUUID(),
    type: draft.type,
    prompt: draft.prompt.trim(),
    guidance: draft.guidance.trim(),
    rubric: draft.rubric.trim() || undefined,
    solution: draft.solution.trim() || undefined,
  };

  if (draft.type === "mcq") {
    const options = draft.options
      .filter((option) => option.label.trim().length > 0)
      .map(({ id, label, detail }) => ({
        id,
        label: label.trim(),
        detail,
      }));
    const correctOptionIds = draft.options
      .filter((option) => option.isCorrect && option.label.trim().length > 0)
      .map((option) => option.id);

    return {
      ...base,
      type: "mcq",
      allowMultiple: draft.allowMultiple,
      options,
      correctOptionIds,
    } satisfies MultipleChoiceQuestion;
  }

  if (draft.type === "debug") {
    return {
      ...base,
      type: "debug",
      language: draft.language.trim() || undefined,
      starterCode: stripCodeFence(draft.starterCode) || undefined,
      expectedOutcome: draft.expectedOutcome.trim() || undefined,
    } satisfies DebugQuestion;
  }

  return {
    ...base,
    type: "scenario",
    deliverable: draft.deliverable.trim() || undefined,
    constraints: draft.constraints,
  } satisfies ScenarioQuestion;
}

function parseQuestionBlock(block: string, index: number): AssessmentQuestion {
  const draft = createDraft();
  const lines = block.split("\n");
  let currentField: ParsedQuestionField | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const match = line.match(/^([A-Za-z ]+):\s*(.*)$/);

    if (match) {
      const field = FIELD_HEADERS.get(match[1].trim().toLowerCase()) as
        | ParsedQuestionField
        | undefined;

      if (field) {
        currentField = field;

        if (field === "type") {
          draft.type = normalizeQuestionType(match[2]);
        } else if (field === "allowMultiple") {
          draft.allowMultiple = parseBoolean(match[2]);
        } else if (match[2].trim().length > 0) {
          appendFieldLine(draft, field, match[2]);
        }

        continue;
      }
    }

    if (!currentField) {
      continue;
    }

    appendFieldLine(draft, currentField, line);
  }

  if (!draft.prompt.trim()) {
    throw new Error(`Question ${index + 1} is missing a prompt.`);
  }

  if (draft.type === "mcq" && draft.options.length < 2) {
    throw new Error(
      `Question ${index + 1} must include at least two MCQ options.`,
    );
  }

  return buildQuestion(draft);
}

export function isSupportedQuestionImportFile(file: File): boolean {
  const normalizedName = file.name.toLowerCase();

  if (normalizedName.endsWith(".docx")) {
    return file.type === DOCX_MIME_TYPE || file.type === "";
  }

  if (normalizedName.endsWith(".txt")) {
    return TXT_MIME_TYPES.has(file.type) || file.type === "";
  }

  return false;
}

async function extractDocxText(fileBuffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer: fileBuffer });
  return normalizeBlockText(result.value);
}

async function extractTxtText(fileBuffer: Buffer): Promise<string> {
  return normalizeBlockText(fileBuffer.toString("utf8"));
}

export async function extractTextFromQuestionImportFile(
  file: File,
): Promise<string> {
  if (!isSupportedQuestionImportFile(file)) {
    throw new Error("Only .docx and .txt uploads are supported.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const normalizedName = file.name.toLowerCase();

  if (normalizedName.endsWith(".docx")) {
    return extractDocxText(buffer);
  }

  return extractTxtText(buffer);
}

export function parseQuestionsFromImportedText(
  rawText: string,
): AssessmentQuestion[] {
  const blocks = splitQuestionBlocks(rawText);

  if (blocks.length === 0) {
    throw new Error(
      "No question blocks found. Use QUESTION / END QUESTION markers in the document.",
    );
  }

  return blocks.map((block, index) => parseQuestionBlock(block, index));
}
