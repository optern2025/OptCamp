import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import {
  extractPdfText,
  parseQuestionsFromPdfText,
} from "@/lib/adminPdfImport";
import { normalizeAssessmentQuestions } from "@/lib/assessment";

export async function POST(request: Request) {
  try {
    await requireAdminUser();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Attach a PDF file to import questions." },
        { status: 400 },
      );
    }

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return NextResponse.json(
        { error: "Only PDF uploads are supported." },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const text = await extractPdfText(Buffer.from(arrayBuffer));
    const questions = normalizeAssessmentQuestions(
      parseQuestionsFromPdfText(text),
    );

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "No valid questions were found in the uploaded PDF." },
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
        : "Unable to import questions from that PDF.";

    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized." ? 401 : 400 },
    );
  }
}
