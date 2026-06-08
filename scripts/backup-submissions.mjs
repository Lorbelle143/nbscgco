// Backup inventory_submissions in small batches
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://fhucquqqneuwcwrbymen.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZodWNxdXFxbmV1d2N3cmJ5bWVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMyNjk2NywiZXhwIjoyMDg5OTAyOTY3fQ._jEXtO6GiLkpvTRX2S7jSPTR5ww9_QLJcsTex73JF64';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const backupBase = join(__dirname, '../backups');
const folders = readdirSync(backupBase).filter(f => f.startsWith('backup-')).sort();
const latestFolder = join(backupBase, folders[folders.length - 1]);
const outputFile = join(latestFolder, 'inventory_submissions.json');

console.log(`📁 Saving to: ${outputFile}\n`);

async function main() {
  let allData = [];
  let offset = 0;
  const BATCH = 20; // very small batch to avoid timeout with form_data

  while (true) {
    console.log(`📦 Fetching offset ${offset}...`);
    const { data, error } = await supabase
      .from('inventory_submissions')
      .select('id, user_id, student_id, full_name, course, year_level, contact_number, photo_url, form_data, submission_status, admin_remarks, created_at, updated_at')
      .range(offset, offset + BATCH - 1)
      .order('created_at', { ascending: true });

    if (error) {
      console.error(`❌ Error at offset ${offset}: ${error.message}`);
      break;
    }

    if (!data || data.length === 0) {
      console.log('✅ No more rows.');
      break;
    }

    allData = allData.concat(data);
    console.log(`  ✓ Total so far: ${allData.length} rows`);

    if (data.length < BATCH) break;
    offset += BATCH;
    await new Promise(r => setTimeout(r, 300));
  }

  writeFileSync(outputFile, JSON.stringify(allData, null, 2));
  console.log(`\n🎉 Done! Saved ${allData.length} rows → inventory_submissions.json`);
}

main().catch(console.error);
