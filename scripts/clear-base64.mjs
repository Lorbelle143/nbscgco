// One-time script to clear base64 signatures from inventory_submissions
// Run: node scripts/clear-base64.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Manually read .env file
const envPath = join(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
  env[key] = val;
}

const SUPABASE_URL = 'https://fhucquqqneuwcwrbymen.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZodWNxdXFxbmV1d2N3cmJ5bWVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMyNjk2NywiZXhwIjoyMDg5OTAyOTY3fQ._jEXtO6GiLkpvTRX2S7jSPTR5ww9_QLJcsTex73JF64';

if (!SUPABASE_URL || SUPABASE_URL.includes('PASTE') || !SUPABASE_KEY || SUPABASE_KEY.includes('PASTE')) {
  console.error('❌ Please paste your real Supabase URL and service_role key in the script first!');
  process.exit(1);
}

console.log('🔗 Connecting to:', SUPABASE_URL);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function clearBase64Signatures() {
  console.log('🔍 Starting cleanup of base64 signatures...\n');

  let totalCleaned = 0;
  let batchNum = 0;
  let offset = 0;
  const BATCH_SIZE = 10;

  while (true) {
    batchNum++;
    console.log(`📦 Batch ${batchNum} (offset ${offset}): fetching rows...`);

    const { data: rows, error: fetchErr } = await supabase
      .from('inventory_submissions')
      .select('id, form_data')
      .range(offset, offset + BATCH_SIZE - 1);

    if (fetchErr) {
      console.error('❌ Fetch error:', fetchErr.message);
      break;
    }

    if (!rows || rows.length === 0) {
      console.log('✅ No more rows.');
      break;
    }

    let foundBase64 = false;

    for (const row of rows) {
      const fd = row.form_data || {};
      const fdStr = JSON.stringify(fd);
      const fdSize = Buffer.byteLength(fdStr, 'utf8');
      console.log(`  Row ${row.id}: form_data size = ${(fdSize / 1024).toFixed(1)} KB`);

      // Find ALL keys that contain base64 data
      const base64Keys = Object.keys(fd).filter(k => 
        typeof fd[k] === 'string' && fd[k].startsWith('data:')
      );

      if (base64Keys.length > 0) {
        foundBase64 = true;
        console.log(`  🔴 Base64 found in keys: ${base64Keys.join(', ')}`);
        const cleaned = { ...fd };
        for (const key of base64Keys) {
          cleaned[key] = '';
          console.log(`  ✓ Cleared ${key}`);
        }

        const { error: updateErr } = await supabase
          .from('inventory_submissions')
          .update({ form_data: cleaned })
          .eq('id', row.id);

        if (updateErr) {
          console.error(`  ❌ Failed ${row.id}:`, updateErr.message);
        } else {
          totalCleaned++;
          console.log(`  ✅ Updated row ${row.id}`);
        }
      }
    }

    if (!foundBase64) {
      console.log('  ℹ️  No base64 in this batch.');
    }

    offset += BATCH_SIZE;
    console.log(`📊 Cleaned so far: ${totalCleaned}\n`);
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n🎉 Done! Total rows cleaned: ${totalCleaned}`);
}

clearBase64Signatures().catch(console.error);
