// Backup script — exports all data from Supabase to JSON files
// Run: node scripts/backup-data.mjs

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://fhucquqqneuwcwrbymen.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZodWNxdXFxbmV1d2N3cmJ5bWVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMyNjk2NywiZXhwIjoyMDg5OTAyOTY3fQ._jEXtO6GiLkpvTRX2S7jSPTR5ww9_QLJcsTex73JF64';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

// Create backup folder with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupDir = join(__dirname, `../backups/backup-${timestamp}`);
mkdirSync(backupDir, { recursive: true });

async function backupTable(tableName) {
  console.log(`📦 Backing up: ${tableName}...`);
  let allData = [];
  let offset = 0;
  const BATCH = 1000;

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(offset, offset + BATCH - 1);

    if (error) {
      console.error(`  ❌ Error: ${error.message}`);
      break;
    }

    if (!data || data.length === 0) break;

    allData = allData.concat(data);
    console.log(`  ✓ Fetched ${allData.length} rows...`);

    if (data.length < BATCH) break;
    offset += BATCH;
    await new Promise(r => setTimeout(r, 200));
  }

  const filePath = join(backupDir, `${tableName}.json`);
  writeFileSync(filePath, JSON.stringify(allData, null, 2));
  console.log(`  ✅ Saved ${allData.length} rows → ${tableName}.json\n`);
  return allData.length;
}

async function main() {
  console.log('🚀 Starting backup...\n');
  console.log(`📁 Backup folder: backups/backup-${timestamp}\n`);

  let totalRows = 0;
  for (const table of TABLES) {
    try {
      const count = await backupTable(table);
      totalRows += count;
    } catch (err) {
      console.error(`❌ Failed to backup ${table}: ${err.message}`);
    }
  }

  // Save backup metadata
  const meta = {
    timestamp,
    supabase_url: SUPABASE_URL,
    tables: TABLES,
    total_rows: totalRows,
    created_at: new Date().toISOString(),
  };
  writeFileSync(join(backupDir, '_metadata.json'), JSON.stringify(meta, null, 2));

  console.log(`\n🎉 Backup complete!`);
  console.log(`📊 Total rows backed up: ${totalRows}`);
  console.log(`📁 Location: backups/backup-${timestamp}/`);
}

main().catch(console.error);
