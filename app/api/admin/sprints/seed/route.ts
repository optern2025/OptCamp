import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

const supabase = getSupabaseAdminClient();

// POST /api/admin/sprints/seed
// Body: { cycle_id, domain_slug }
// Seeds sprint templates for a given domain into a cycle
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('optcamp_session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: session } = await supabase.from('sessions').select('user_id').eq('id', token).single();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { cycle_id, domain_slug } = body;

  if (!cycle_id || !domain_slug) {
    return NextResponse.json({ error: 'cycle_id and domain_slug are required' }, { status: 400 });
  }

  try {
    // Fetch sprint templates for domain
    const { data: templates, error: tmplErr } = await supabase
      .from('sprint_templates')
      .select('*')
      .eq('domain_slug', domain_slug)
      .order('sprint_order', { ascending: true });

    if (tmplErr) throw tmplErr;
    if (!templates || templates.length === 0) {
      return NextResponse.json({ error: `No sprint templates found for domain: ${domain_slug}` }, { status: 404 });
    }

    // Get cycle dates for distributing sprints
    const { data: cycle } = await supabase
      .from('cycles')
      .select('cohort_start_at, cohort_end_at')
      .eq('id', cycle_id)
      .single();

    const cohortStart = cycle?.cohort_start_at ? new Date(cycle.cohort_start_at) : new Date();
    const cohortEnd = cycle?.cohort_end_at ? new Date(cycle.cohort_end_at) : new Date(cohortStart.getTime() + 28 * 24 * 60 * 60 * 1000);
    const totalMs = cohortEnd.getTime() - cohortStart.getTime();
    const sprintDuration = Math.floor(totalMs / templates.length);

    // Create sprints
    const sprintsToInsert = templates.map((t: any, i: number) => {
      const start = new Date(cohortStart.getTime() + i * sprintDuration);
      const end = new Date(cohortStart.getTime() + (i + 1) * sprintDuration - 1);
      return {
        cycle_id,
        title: t.title,
        description: t.description,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
      };
    });

    const { data: createdSprints, error: sprintErr } = await supabase
      .from('sprints')
      .insert(sprintsToInsert)
      .select();

    if (sprintErr) throw sprintErr;

    // Seed default tasks for each sprint
    const defaultTasksByDomain: Record<string, Record<number, string[]>> = {
      'full-stack-development': {
        1: ['Build a responsive landing page', 'CSS Grid portfolio layout', 'Semantic HTML form with validation'],
        2: ['Todo app with localStorage', 'Fetch API data and render it', 'ES6 class-based calculator'],
        3: ['React counter with hooks', 'React todo app with state', 'React routing with React Router'],
        4: ['Express REST API', 'PostgreSQL CRUD integration', 'Auth with JWT tokens'],
      },
    };

    const tasksToInsert: any[] = [];
    (createdSprints ?? []).forEach((sprint: any, i: number) => {
      const template = templates[i];
      const domainTasks = defaultTasksByDomain[domain_slug]?.[template.sprint_order];
      const taskTitles = domainTasks ?? [
        `${template.title} – Core Exercise`,
        `${template.title} – Applied Project`,
        `${template.title} – Capstone`,
      ];
      taskTitles.forEach((title: string) => {
        tasksToInsert.push({
          sprint_id: sprint.id,
          title,
          description: `Complete the ${title} task for the ${template.title} sprint.`,
          task_type: 'project',
          due_date: sprint.end_date,
          points: 10,
          required_proof: ['github'],
        });
      });
    });

    const { data: createdTasks, error: taskErr } = await supabase
      .from('tasks')
      .insert(tasksToInsert)
      .select();

    if (taskErr) throw taskErr;

    return NextResponse.json({
      message: `Seeded ${createdSprints?.length} sprints and ${createdTasks?.length} tasks`,
      sprints: createdSprints,
      tasks: createdTasks,
    });
  } catch (error: any) {
    console.error('Sprint seed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
