/**
 * Neon.tech fallback database client
 * - Reads from Neon when Supabase is exhausted
 * - Writes to BOTH Supabase and Neon simultaneously (write-through)
 * - Auth always stays on Supabase
 */

const NEON_URL = import.meta.env.VITE_NEON_DATABASE_URL || '';

// ─── Neon HTTP query executor ─────────────────────────────────────
async function neonQuery(sql: string, params: any[] = []): Promise<any[]> {
  if (!NEON_URL) throw new Error('Neon not configured');

  // Use Neon serverless HTTP endpoint
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

// ─── Health state ─────────────────────────────────────────────────
let _supabaseHealthy = true;

export function markSupabaseUnhealthy() {
  _supabaseHealthy = false;
  console.warn('⚠️ Supabase marked unhealthy — Neon is now primary');
}

export function markSupabaseHealthy() {
  _supabaseHealthy = true;
}

export function isSupabaseHealthy() {
  return _supabaseHealthy;
}

export function isNeonConfigured() {
  return !!NEON_URL;
}

// ─── READ operations (used when Supabase is down) ─────────────────
export const neonRead = {
  async getProfiles(): Promise<any[]> {
    return neonQuery(`
      SELECT id, email, full_name, student_id, is_admin, role,
             created_at, last_login, profile_picture, profile_picture_url
      FROM profiles
      WHERE role = 'student' OR role IS NULL OR is_admin = false
      ORDER BY full_name ASC
    `);
  },

  async getSubmissions(): Promise<any[]> {
    return neonQuery(`
      SELECT id, user_id, student_id, full_name, course, year_level,
             contact_number, submission_status, admin_remarks, photo_url,
             created_at, updated_at, reviewed_at
      FROM inventory_submissions
      ORDER BY created_at DESC
    `);
  },

  async getMentalHealth(): Promise<any[]> {
    return neonQuery(`SELECT * FROM mental_health_assessments ORDER BY created_at DESC`);
  },

  async getStudentSubmissions(userId: string): Promise<any[]> {
    return neonQuery(
      `SELECT * FROM inventory_submissions WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
  },

  async getStudentAssessments(userId: string): Promise<any[]> {
    return neonQuery(
      `SELECT * FROM mental_health_assessments WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
  },

  async getProfile(userId: string): Promise<any> {
    const rows = await neonQuery(
      `SELECT * FROM profiles WHERE id = $1 LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  },
};

// ─── WRITE operations (write-through to Neon alongside Supabase) ──
export const neonWrite = {
  async upsertProfile(profile: any): Promise<void> {
    await neonQuery(`
      INSERT INTO profiles (id, email, full_name, student_id, is_admin, role, created_at, profile_picture, profile_picture_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        student_id = EXCLUDED.student_id,
        profile_picture = EXCLUDED.profile_picture,
        profile_picture_url = EXCLUDED.profile_picture_url
    `, [
      profile.id, profile.email, profile.full_name, profile.student_id,
      profile.is_admin || false, profile.role || 'student',
      profile.created_at || new Date().toISOString(),
      profile.profile_picture || null, profile.profile_picture_url || null,
    ]);
  },

  async upsertSubmission(submission: any): Promise<void> {
    await neonQuery(`
      INSERT INTO inventory_submissions
        (id, user_id, student_id, full_name, course, year_level, contact_number,
         photo_url, form_data, submission_status, admin_remarks, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (id) DO UPDATE SET
        submission_status = EXCLUDED.submission_status,
        admin_remarks = EXCLUDED.admin_remarks,
        photo_url = EXCLUDED.photo_url,
        form_data = EXCLUDED.form_data,
        updated_at = EXCLUDED.updated_at
    `, [
      submission.id, submission.user_id, submission.student_id, submission.full_name,
      submission.course, submission.year_level, submission.contact_number,
      submission.photo_url || null,
      submission.form_data ? JSON.stringify(submission.form_data) : null,
      submission.submission_status || 'submitted',
      submission.admin_remarks || null,
      submission.created_at || new Date().toISOString(),
      new Date().toISOString(),
    ]);
  },

  async upsertMentalHealth(assessment: any): Promise<void> {
    await neonQuery(`
      INSERT INTO mental_health_assessments
        (id, user_id, student_id, full_name, feeling_alone, feeling_blue,
         feeling_easily_annoyed, feeling_tense_anxious, feeling_inferior,
         having_suicidal_thoughts, total_score, risk_level, requires_counseling,
         counseling_notes, is_counseled, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      ON CONFLICT (id) DO UPDATE SET
        risk_level = EXCLUDED.risk_level,
        total_score = EXCLUDED.total_score,
        counseling_notes = EXCLUDED.counseling_notes,
        is_counseled = EXCLUDED.is_counseled,
        updated_at = EXCLUDED.updated_at
    `, [
      assessment.id, assessment.user_id, assessment.student_id, assessment.full_name,
      assessment.feeling_alone, assessment.feeling_blue, assessment.feeling_easily_annoyed,
      assessment.feeling_tense_anxious, assessment.feeling_inferior,
      assessment.having_suicidal_thoughts, assessment.total_score, assessment.risk_level,
      assessment.requires_counseling || false, assessment.counseling_notes || null,
      assessment.is_counseled || false,
      assessment.created_at || new Date().toISOString(),
      new Date().toISOString(),
    ]);
  },

  async updateSubmissionStatus(id: string, status: string, remarks: string): Promise<void> {
    await neonQuery(`
      UPDATE inventory_submissions
      SET submission_status = $1, admin_remarks = $2, updated_at = $3
      WHERE id = $4
    `, [status, remarks, new Date().toISOString(), id]);
  },

  async deleteSubmission(id: string): Promise<void> {
    await neonQuery(`DELETE FROM inventory_submissions WHERE id = $1`, [id]);
  },
};

// Keep neonDb as alias for backward compatibility
export const neonDb = neonRead;
// Writes to Neon in background — never blocks the main operation
export function syncToNeon(operation: () => Promise<void>): void {
  if (!isNeonConfigured()) return;
  operation().catch(err => {
    console.warn('Neon sync failed (non-critical):', err.message);
  });
}
