// Restore script — imports data from JSON backup files back to Supabase
// Run: node scripts/restore-data.mjs
//
// IMPORTANT: Only run this if data is lost/corrupted!
// This will INSERT data — it won't overwrite existing rows (uses ignoreDuplicates)

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://fhucquqqneuwcwrbymen.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZodWNxdXFxbmV1d2N3cmJ5bWVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMyNjk2NywiZXhwIjoyMDg5OTAyOTY3fQ._jEXtO6GiLkpvTRX2S7jSPTR5ww9_QLJcsTex73JF64';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Find the latest backup folder
const backupBase = join(__dirname, '../backups');
const folders = readdirSync(backupBase).filter(f => f.startsWith('backup-')).sort();
const latestFolder = join(backupBase, folders[folders.length - 1]);

console.log(`📁 Restoring from: ${latestFolder}\n`);

// Tables to restore (order matters — profiles first due to foreign keys)
const TABLES = [
  'admin_settings',
  'profiles',
  'inventory_submissions',
  'mental_health_assessments',
  'appointments',
  'student_notifications',
  'consent_records',
  'counseling_sessions',
  'audit_logs',
  'password_reset_requests',
];

async function restoreTable(tableName) {
  const filePath = join(latestFolder, `${tableName}.json`);
  
  let data;
  try {
    data = JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    console.log(`⚠️  Skipping ${tableName} — file not found`);
    return 0;
  }

  if (!data || data.length === 0) {
    console.log(`⚠️  Skipping ${tableName} — no data`);
    return 0;
  }

  console.log(`📦 Restoring ${tableName} (${data.length} rows)...`);

  let restored = 0;
  const BATCH = 50;

  for (let i = 0; i < data.length; i += BATCH) {
    const batch = data.slice(i, i + BATCH);
    
    const { error } = await supabase
      .from(tableName)
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: true });

    if (error) {
      console.error(`  ❌ Batch ${i}-${i+BATCH} error: ${error.message}`);
    } else {
      restored += batch.length;
    }

    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`  ✅ Restored ${restored}/${data.length} rows\n`);
  return restored;
}

async function main() {
  console.log('⚠️  RESTORE MODE — This will re-insert backed up data\n');
  console.log('Note: Existing rows will be skipped (no overwrite)\n');
  console.log('Note: Auth users (login accounts) cannot be restored from backup\n');
  console.log('─'.repeat(50) + '\n');

  let total = 0;
  for (const table of TABLES) {
    try {
      const count = await restoreTable(table);
      total += count;
    } catch (err) {
      console.error(`❌ Failed to restore ${table}: ${err.message}`);
    }
  }

  console.log('─'.repeat(50));
  console.log(`\n🎉 Restore complete! Total rows restored: ${total}`);
  console.log('\n⚠️  IMPORTANT: Auth users (student login accounts) are NOT');
  console.log('   restored from this backup. Students may need to re-register');
  console.log('   if auth.users table was lost.');
}

main().catch(console.error);
