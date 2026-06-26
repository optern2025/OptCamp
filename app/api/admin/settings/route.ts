import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { loadAdminSettings, saveAdminSettings } from "@/lib/adminSettings";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    const settings = await loadAdminSettings(supabase);
    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    const body = await req.json();
    
    const settings = await loadAdminSettings(supabase);
    const updatedSettings = { ...settings, ...body };
    
    await saveAdminSettings(supabase, updatedSettings);
    
    return NextResponse.json({ settings: updatedSettings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
