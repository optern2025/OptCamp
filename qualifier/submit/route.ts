import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "This qualifier submission endpoint is deprecated. Use /api/proctor/grade.",
    },
    { status: 410 },
  );
}
