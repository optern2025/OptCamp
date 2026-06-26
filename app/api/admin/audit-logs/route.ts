import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  try {
    const reqHeaders = await headers();
    const role = reqHeaders.get("x-user-role");

    if (role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase() || "";
    const filterEvent = searchParams.get("event") || "";

    const supabase = getSupabaseAdminClient();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      { count: totalLogs },
      { count: adminActions },
      { count: logsToday },
      { data: logsData }
    ] = await Promise.all([
      supabase.from("audit_logs").select("*", { count: "exact", head: true }),
      supabase.from("audit_logs").select("*", { count: "exact", head: true }).not("admin_id", "is", null),
      supabase.from("audit_logs").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()),
      supabase
        .from("audit_logs")
        .select("*, admin:new_users!admin_id(full_name, email), target:new_users!target_user_id(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(200)
    ]);

    let filtered = logsData || [];
    if (filterEvent) {
      filtered = filtered.filter((log: any) => log.event_type === filterEvent);
    }
    if (search) {
      filtered = filtered.filter((log: any) => 
        (log.event_type || "").toLowerCase().includes(search) ||
        (log.admin?.full_name || "").toLowerCase().includes(search) ||
        (log.target?.full_name || "").toLowerCase().includes(search)
      );
    }

    // Critical events based on event_type ending with _failed, _rejected, or _deleted
    const criticalEvents = (logsData || []).filter((l: any) => 
      l.event_type.includes("failed") || 
      l.event_type.includes("rejected") || 
      l.event_type.includes("deleted")
    ).length;

    const stats = {
      totalLogs: totalLogs || 0,
      adminActions: adminActions || 0,
      userActions: (totalLogs || 0) - (adminActions || 0),
      criticalEvents,
      logsToday: logsToday || 0,
    };

    return NextResponse.json({ logs: filtered, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
