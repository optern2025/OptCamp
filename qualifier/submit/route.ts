import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

console.log(supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

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
