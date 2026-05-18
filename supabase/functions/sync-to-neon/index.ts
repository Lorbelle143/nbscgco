/**
 * sync-to-neon Edge Function
 * Runs nightly to sync Supabase data to Neon.tech
 * Schedule: every day at midnight (set in Supabase Dashboard → Edge Functions → Schedule)
 * 
 * Deploy: supabase functions deploy sync-to-neon
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const NEON_URL = Deno.env.get('NEON_DATABASE_URL')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── Neon HTTP query ──────────────────────────────────────────────
async function neonQuery(sql: string, params: any[] = []): Promise<any[]> {
  const url = new URL(NEON_URL);
  const apiUrl = `https://${url.hostname}/sql`;
  const auth = btoa(`${url.username}:${url.password}`);

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: JSON.stringify({ query: sql, params }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Neon query failed: ${err}`);
  }
  const data = await res.json();
  return data.rows || [];
}

// ─── Sync profiles ────────────────────────────────────────────────
async function syncProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, student_id, is_admin, role, created_at, profile_picture, profile_picture_url')
    .order('created_at', { ascending: true });

  if (error) throw new Error('Failed to fetch profiles: ' + error.message);
  if (!data || data.length === 0) return 0;

  let synced = 0;
  // Batch upsert in groups of 50
  for (let i = 0; i < data.length; i += 50) {
    const batch = data.slice(i, i + 50);
    for (const p of batch) {
      try {
        await neonQuery(`
          INSERT INTO profiles (id, email, full_name, student_id, is_admin, role, created_at, profile_picture, profile_picture_url)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            student_id = EXCLUDED.student_id,
            profile_picture = EXCLUDED.profile_picture,
            profile_picture_url = EXCLUDED.profile_picture_url
        `, [p.id, p.email, p.full_name, p.student_id, p.is_admin, p.role, p.created_at, p.profile_picture, p.profile_picture_url]);
        synced++;
      } catch { /* skip individual errors */ }
    }
  }
  return synced;
}

// ─── Sync inventory submissions ───────────────────────────────────
async function syncSubmissions() {
  const { data, error } = await supabase
    .from('inventory_submissions')
    .select('id, user_id, student_id, full_name, course, year_level, contact_number, photo_url, form_data, submission_status, admin_remarks, created_at, updated_at')
    .order('created_at', { ascending: true });

  if (error) throw new Error('Failed to fetch submissions: ' + error.message);
  if (!data || data.length === 0) return 0;

  let synced = 0;
  for (const s of data) {
    try {
      await neonQuery(`
        INSERT INTO inventory_submissions
          (id, user_id, student_id, full_name, course, year_level, contact_number, photo_url, form_data, submission_status, admin_remarks, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (id) DO UPDATE SET
          submission_status = EXCLUDED.submission_status,
          admin_remarks = EXCLUDED.admin_remarks,
          photo_url = EXCLUDED.photo_url,
          form_data = EXCLUDED.form_data,
          updated_at = EXCLUDED.updated_at
      `, [s.id, s.user_id, s.student_id, s.full_name, s.course, s.year_level, s.contact_number,
          s.photo_url, s.form_data ? JSON.stringify(s.form_data) : null,
          s.submission_status, s.admin_remarks, s.created_at, s.updated_at]);
      synced++;
    } catch { /* skip individual errors */ }
  }
  return synced;
}

// ─── Sync mental health assessments ──────────────────────────────
async function syncMentalHealth() {
  const { data, error } = await supabase
    .from('mental_health_assessments')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error('Failed to fetch assessments: ' + error.message);
  if (!data || data.length === 0) return 0;

  let synced = 0;
  for (const a of data) {
    try {
      await neonQuery(`
        INSERT INTO mental_health_assessments
          (id, user_id, student_id, full_name, feeling_alone, feeling_blue, feeling_easily_annoyed,
           feeling_tense_anxious, feeling_inferior, having_suicidal_thoughts, total_score, risk_level,
           requires_counseling, counseling_notes, is_counseled, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        ON CONFLICT (id) DO UPDATE SET
          risk_level = EXCLUDED.risk_level,
          total_score = EXCLUDED.total_score,
          counseling_notes = EXCLUDED.counseling_notes,
          is_counseled = EXCLUDED.is_counseled,
          updated_at = EXCLUDED.updated_at
      `, [a.id, a.user_id, a.student_id, a.full_name, a.feeling_alone, a.feeling_blue,
          a.feeling_easily_annoyed, a.feeling_tense_anxious, a.feeling_inferior,
          a.having_suicidal_thoughts, a.total_score, a.risk_level, a.requires_counseling,
          a.counseling_notes, a.is_counseled, a.created_at, a.updated_at]);
      synced++;
    } catch { /* skip individual errors */ }
  }
  return synced;
}

// ─── Main handler ─────────────────────────────────────────────────
Deno.serve(async (req) => {
  // Allow manual trigger via POST or scheduled trigger
  try {
    console.log('🔄 Starting Neon sync...');
    const start = Date.now();

    const [profilesSynced, submissionsSynced, assessmentsSynced] = await Promise.all([
      syncProfiles(),
      syncSubmissions(),
      syncMentalHealth(),
    ]);

    const duration = ((Date.now() - start) / 1000).toFixed(1);
    const result = {
      success: true,
      duration: `${duration}s`,
      synced: {
        profiles: profilesSynced,
        submissions: submissionsSynced,
        assessments: assessmentsSynced,
      },
      timestamp: new Date().toISOString(),
    };

    console.log('✅ Neon sync complete:', result);
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('❌ Neon sync failed:', err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
