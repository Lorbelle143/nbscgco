// Analyze what's inside form_data to find large fields
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://fhucquqqneuwcwrbymen.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZodWNxdXFxbmV1d2N3cmJ5bWVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMyNjk2NywiZXhwIjoyMDg5OTAyOTY3fQ._jEXtO6GiLkpvTRX2S7jSPTR5ww9_QLJcsTex73JF64';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('🔍 Analyzing form_data fields for large data...\n');

  // Track field sizes across all rows
  const fieldSizes = {};
  const largeFields = [];
  let offset = 0;
  const BATCH = 20;
  let totalRows = 0;

  while (true) {
    const { data, error } = await supabase
      .from('inventory_submissions')
      .select('id, form_data')
      .range(offset, offset + BATCH - 1)
      .order('created_at', { ascending: true });

    if (error) {
      console.error(`❌ Error at offset ${offset}: ${error.message}`);
      break;
    }

    if (!data || data.length === 0) break;

    for (const row of data) {
      if (!row.form_data) continue;
      totalRows++;

      const fd = row.form_data;
      
      // Check each field size
      for (const [key, value] of Object.entries(fd)) {
        if (typeof value === 'string' && value.length > 100) {
          const sizeKB = (value.length / 1024).toFixed(1);
          
          if (!fieldSizes[key]) fieldSizes[key] = { totalKB: 0, count: 0, maxKB: 0 };
          fieldSizes[key].totalKB += parseFloat(sizeKB);
          fieldSizes[key].count++;
          if (parseFloat(sizeKB) > fieldSizes[key].maxKB) {
            fieldSizes[key].maxKB = parseFloat(sizeKB);
          }

          // Flag very large fields
          if (parseFloat(sizeKB) > 50) {
            largeFields.push({
              id: row.id,
              field: key,
              sizeKB: parseFloat(sizeKB),
              preview: value.substring(0, 100)
            });
          }
        }
      }
    }

    offset += BATCH;
    if (offset % 200 === 0) console.log(`  Analyzed ${offset} rows...`);
    await new Promise(r => setTimeout(r, 200));

    if (offset > 1100) break; // analyze first 1100 rows
  }

  console.log(`\n📊 Total rows analyzed: ${totalRows}`);
  console.log('\n📋 Field size summary (fields with large data):');
  
  const sorted = Object.entries(fieldSizes)
    .filter(([, v]) => v.maxKB > 10)
    .sort((a, b) => b[1].totalKB - a[1].totalKB);

  for (const [field, stats] of sorted) {
    console.log(`  ${field}: total=${stats.totalKB.toFixed(0)} KB, max=${stats.maxKB.toFixed(0)} KB, count=${stats.count}`);
  }

  if (largeFields.length > 0) {
    console.log('\n🔴 Large fields found (>50KB):');
    for (const f of largeFields.slice(0, 20)) {
      console.log(`  Row ${f.id}: field="${f.field}" size=${f.sizeKB}KB`);
      console.log(`    Preview: ${f.preview.substring(0, 80)}...`);
    }
  } else {
    console.log('\n✅ No large fields found besides signatures!');
  }
}

main().catch(console.error);
