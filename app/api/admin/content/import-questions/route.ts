import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import {
  extractTextFromQuestionImportFile,
  isSupportedQuestionImportFile,
  parseQuestionsFromImportedText,
} from "@/lib/adminQuestionImport";
import { normalizeAssessmentQuestions } from "@/lib/assessment";

export async function POST(request: Request) {
  try {
    await requireAdminUser();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Attach a .docx or .txt file to import questions." },
        { status: 400 },
      );
    }

    if (!isSupportedQuestionImportFile(file)) {
      return NextResponse.json(
        { error: "Only .docx and .txt uploads are supported." },
        { status: 400 },
      );
    }

    const text = await extractTextFromQuestionImportFile(file);
    const questions = normalizeAssessmentQuestions(
      parseQuestionsFromImportedText(text),
    );

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "No valid questions were found in the uploaded document." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      questions,
      extractedTextLength: text.length,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to import questions from that document.";

    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized." ? 401 : 400 },
    );
  }
}
