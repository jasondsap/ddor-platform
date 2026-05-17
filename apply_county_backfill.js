/**
 * apply_county_backfill.js
 *
 * Reads county_backfill_preview.csv (produced by preview_county_backfill.js)
 * and applies the proposed UPDATEs in a single transaction.
 *
 * Only rows with action = 'UPDATE_NULL' are applied by default.
 * Pass --include-overwrite to also apply 'UPDATE_OVERWRITE' rows (i.e. rows
 * where clients already has a county set that disagrees with the CSV).
 *
 * Usage (Windows CMD):
 *   set "DATABASE_URL=postgresql://...&channel_binding=require"
 *   node apply_county_backfill.js county_backfill_preview.csv
 *   node apply_county_backfill.js county_backfill_preview.csv --include-overwrite
 *   node apply_county_backfill.js county_backfill_preview.csv --dry-run
 *
 * The target column is auto-detected the same way as in the preview script,
 * or override via COUNTY_COL env var.
 */

const fs = require('fs');
const { Client } = require('pg');

const args = process.argv.slice(2);
const PREVIEW_PATH = args.find(a => !a.startsWith('--'));
const INCLUDE_OVERWRITE = args.includes('--include-overwrite');
const DRY_RUN = args.includes('--dry-run');

if (!PREVIEW_PATH) {
  console.error('Usage: node apply_county_backfill.js <preview.csv> [--include-overwrite] [--dry-run]');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL env var is required');
  process.exit(1);
}

function parseCSV(text) {
  const rows = []; let row = []; let field = ''; let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i+1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); field = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = []; }
      else if (c === '\r') {}
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

(async () => {
  const text = fs.readFileSync(PREVIEW_PATH, 'utf8');
  const rows = parseCSV(text);
  const header = rows[0];
  const col = name => header.indexOf(name);

  const required = ['ddor_patient_id','client_id','proposed_county_id','action'];
  for (const r of required) if (col(r) === -1) {
    console.error(`Preview CSV missing required column: ${r}`);
    process.exit(1);
  }

  // Filter to actionable rows
  const actionable = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const action = r[col('action')];
    if (action === 'UPDATE_NULL') actionable.push(r);
    else if (action === 'UPDATE_OVERWRITE' && INCLUDE_OVERWRITE) actionable.push(r);
  }

  if (actionable.length === 0) {
    console.log('No actionable rows. Nothing to do.');
    return;
  }

  console.log(`Preview rows actionable for this run: ${actionable.length}`);
  if (INCLUDE_OVERWRITE) console.log('(including UPDATE_OVERWRITE rows)');
  if (DRY_RUN)           console.log('(DRY RUN — no DB writes)');

  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  // Resolve county column
  const colRes = await db.query(`
    SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name='clients'
  `);
  const colNames = colRes.rows.map(r => r.column_name);
  const countyCol = process.env.COUNTY_COL || colNames.find(n => /county/i.test(n));
  if (!countyCol) {
    console.error('Could not resolve county column on clients. Set COUNTY_COL env var.');
    await db.end(); process.exit(1);
  }
  console.log(`Target column: clients.${countyCol}`);

  try {
    await db.query('BEGIN');
    let updated = 0;
    for (const r of actionable) {
      const clientId = r[col('client_id')];
      const newCounty = r[col('proposed_county_id')];
      if (!clientId || !newCounty) continue;
      const res = await db.query(
        `UPDATE clients SET ${countyCol} = $1 WHERE id = $2`,
        [newCounty, clientId]
      );
      updated += res.rowCount;
    }
    console.log(`Rows updated: ${updated}`);
    if (DRY_RUN) {
      await db.query('ROLLBACK');
      console.log('Rolled back (dry run).');
    } else {
      await db.query('COMMIT');
      console.log('Committed.');
    }
  } catch (e) {
    await db.query('ROLLBACK').catch(() => {});
    console.error('Transaction rolled back due to error:', e);
    process.exit(1);
  } finally {
    await db.end();
  }
})().catch(e => { console.error(e); process.exit(1); });
