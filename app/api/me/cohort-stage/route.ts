import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      error:
        "Stage assessments are retired. Use the sprint-day workflow instead.",
    },
    { status: 410 },
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Stage assessments are retired. Use the sprint-day workflow instead.",
    },
    { status: 410 },
  );
}
