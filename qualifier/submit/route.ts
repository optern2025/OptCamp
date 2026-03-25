import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { user_id, cohort_id, submission_link } = body;

  if (!submission_link) {
    return NextResponse.json({ error: "Link required" }, { status: 400 });
  }

  await supabase.from("qualifier_submissions").insert([
    {
      user_id,
      cohort_id,
      submission_link,
      status: "submitted",
    },
  ]);

  return NextResponse.json({ message: "Done" });
}