// Migration script: Copy all data from OLD Supabase to NEW Supabase
// Run: node scripts/migrate-to-new-db.mjs

import { createClient } from '@supabase/supabase-js';

// OLD project
const OLD_URL = 'https://fhucquqqneuwcwrbymen.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZodWNxdXFxbmV1d2N3cmJ5bWVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMyNjk2NywiZXhwIjoyMDg5OTAyOTY3fQ._jEXtO6GiLkpvTRX2S7jSPTR5ww9_QLJcsTex73JF64';

// NEW project
const NEW_URL = 'https://zvzkovkvcaooglltsdfu.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2emtvdmt2Y2Fvb2dsbHRzZGZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTkyNDMwMSwiZXhwIjoyMDk1NTAwMzAxfQ.g4UQz1hdaGr2avpcaWTefzWenXmhvZ-lF2eESoFBWpQ';

const oldDb = createClient(OLD_URL, OLD_KEY);
const newDb = createClient(NEW_URL, NEW_KEY);

const TABLES = [
  'profiles',
  'inventory_submissions',
  'mental_health_assessments',
  'appointments',
  'student_notifications',
  'consent_records',
  'counseling_sessions',
  'audit_logs',
  'password_reset_requests',
  'admin_settings',
];

async function migrateTable(tableName) {
  console.log(`\n📦 Migrating: ${tableName}`);
  let offset = 0;
  const BATCH = 50;
  let totalMigrated = 0;

  while (true) {
    const { data, error } = await oldDb
      .from(tableName)
      .select('*')
      .range(offset, offset + BATCH - 1);

    if (error) {
      console.error(`  ❌ Fetch error: ${error.message}`);
      break;
    }

    if (!data || data.length === 0) {
      console.log(`  ✅ Done — ${totalMigrated} rows migrated`);
      break;
    }

    // Clean base64 just in case any remain
    const cleaned = data.map(row => {
      if (row.form_data) {
        const fd = { ...row.form_data };
        if (fd.studentSignatureUrl?.startsWith('data:')) fd.studentSignatureUrl = '';
        if (fd.parentSignatureUrl?.startsWith('data:')) fd.parentSignatureUrl = '';
        return { ...row, form_data: fd };
      }
      return row;
    });

    const { error: insertError } = await newDb
      .from(tableName)
      .upsert(cleaned, { onConflict: 'id', ignoreDuplicates: false });

    if (insertError) {
      console.error(`  ❌ Insert error: ${insertError.message}`);
      // Try one by one
      for (const row of cleaned) {
        const { error: singleErr } = await newDb
          .from(tableName)
          .upsert(row, { onConflict: 'id', ignoreDuplicates: true });
        if (singleErr) {
          console.error(`    ⚠️ Skipped row ${row.id}: ${singleErr.message}`);
        } else {
          totalMigrated++;
        }
      }
    } else {
      totalMigrated += cleaned.length;
      console.log(`  ✓ Batch offset ${offset}: ${cleaned.length} rows`);
    }

    offset += BATCH;
    await new Promise(r => setTimeout(r, 300));
  }
}

async function main() {
  console.log('🚀 Starting migration from OLD to NEW Supabase...\n');
  console.log(`OLD: ${OLD_URL}`);
  console.log(`NEW: ${NEW_URL}\n`);

  for (const table of TABLES) {
    try {
      await migrateTable(table);
    } catch (err) {
      console.error(`❌ Failed to migrate ${table}: ${err.message}`);
    }
  }

  console.log('\n🎉 Migration complete!');
  console.log('\nNext steps:');
  console.log('1. Update .env with new Supabase URL and keys');
  console.log('2. Update Netlify environment variables');
  console.log('3. Test the app');
}

main().catch(console.error);
