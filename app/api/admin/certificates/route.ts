import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
const supabaseServer = getSupabaseAdminClient();

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('optcamp_session')?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { participant_id } = body;

  if (!participant_id) {
    return NextResponse.json({ error: 'participant_id is required' }, { status: 400 });
  }

  try {
    // Validate rules:
    // 1. Participant status = 'completed'
    // 2. Completion percentage = 100
    // 3. (Implied by 1 & 2 but we can verify) All required tasks approved
    const { data: participant, error: fetchErr } = await supabaseServer
      .from('cohort_participants')
      .select('user_id, cycle_id, status, completion_percentage, certificate_issued')
      .eq('id', participant_id)
      .single();

    if (fetchErr || !participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    if (participant.status !== 'completed') {
      return NextResponse.json({ error: 'Certificate can only be issued when status is "completed".' }, { status: 400 });
    }

    if (participant.completion_percentage !== 100) {
      return NextResponse.json({ error: 'Certificate requires 100% completion.' }, { status: 400 });
    }

    if (participant.certificate_issued) {
      return NextResponse.json({ error: 'Certificate has already been issued.' }, { status: 400 });
    }

    // Generate unique cert number (e.g. OPT-CYCLEID-USERID-DATE)
    const certNumber = `OPT-${participant.cycle_id.substring(0, 6).toUpperCase()}-${participant.user_id.substring(0, 6).toUpperCase()}`;

    // Issue certificate
    const { data: cert, error: certErr } = await supabaseServer
      .from('certificates')
      .insert({
        user_id: participant.user_id,
        cycle_id: participant.cycle_id,
        certificate_number: certNumber,
      })
      .select()
      .single();

    if (certErr) throw certErr;

    // Mark participant as certificate issued
    await supabaseServer
      .from('cohort_participants')
      .update({ certificate_issued: true })
      .eq('id', participant_id);

    // Send notification
    await supabaseServer.from('notifications').insert({
      user_id: participant.user_id,
      type: 'certificate_issued',
      title: `Certificate Issued!`,
      message: `Congratulations! Your certificate of completion for the cohort has been issued.`
    });

    return NextResponse.json(cert);
  } catch (error: any) {
    console.error('Error issuing certificate:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const reqHeaders = await headers();
  const role = reqHeaders.get("x-user-role");

  if (role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  let query = supabaseServer
    .from("certificates")
    .select("*, new_users(full_name), cycles(title)")
    .order("issue_date", { ascending: false });

  if (search) {
    query = query.or(`certificate_number.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let filteredData = data;
  if (search) {
    const s = search.toLowerCase();
    filteredData = data.filter((c: any) => 
      c.certificate_number.toLowerCase().includes(s) || 
      (Array.isArray(c.new_users) ? c.new_users[0]?.full_name : c.new_users?.full_name)?.toLowerCase().includes(s)
    );
  }

  return NextResponse.json({ certificates: filteredData });
}
