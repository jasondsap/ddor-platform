/**
 * preview_county_backfill.js
 *
 * Read-only. Builds the originating-county backfill plan and writes a CSV
 * for review. Does NOT touch the database beyond SELECTs.
 *
 * Usage (Windows CMD):
 *   set "DATABASE_URL=postgresql://...&channel_binding=require"
 *   node preview_county_backfill.js path\to\DDOR_Client_Repor_Unlocked.csv
 *
 * Output: county_backfill_preview.csv in cwd.
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const CSV_PATH = process.argv[2];
if (!CSV_PATH) {
  console.error('Usage: node preview_county_backfill.js <path-to-ddor-csv>');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL env var is required');
  process.exit(1);
}

// MCCC normalization: State Accessor data-entry variants where the provider
// was entered into the org field instead of the plain county.
const MCCC_NORMALIZATION = {
  'MCCC McCracken': 'McCracken County',
  'MCCC Pike': 'Pike County',
};

// --- Minimal CSV parser (handles quoted fields with embedded commas/quotes) ---
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') {
        row.push(field); field = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
      } else if (c === '\r') { /* swallow */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

(async () => {
  console.log('Reading CSV:', CSV_PATH);
  // DDOR CSV is cp1252; node reads as binary then decodes. For the columns we
  // care about (PatientID, CompanyOrOrganization) everything is plain ASCII,
  // so utf8 is safe for these fields.
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCSV(raw);
  const header = rows[0];
  const idxPatientId = header.indexOf('PatientID');
  const idxOrg = header.indexOf('CompanyOrOrganization');
  if (idxPatientId === -1 || idxOrg === -1) {
    console.error('CSV missing expected columns. Found:', header);
    process.exit(1);
  }

  // PatientID -> raw org string (first occurrence; verified to be consistent per patient)
  const patientToOrg = new Map();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[idxPatientId]) continue;
    const pid = String(r[idxPatientId]).trim();
    if (!patientToOrg.has(pid)) {
      patientToOrg.set(pid, (r[idxOrg] || '').trim());
    }
  }
  console.log(`Distinct PatientIDs in CSV: ${patientToOrg.size}`);

  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  // --- 1. Introspect the clients table ---
  const colRes = await db.query(`
    SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'clients'
     ORDER BY ordinal_position
  `);
  if (colRes.rows.length === 0) {
    console.error('No table named "clients" in public schema. Aborting.');
    await db.end();
    process.exit(1);
  }
  const colNames = colRes.rows.map(r => r.column_name);
  console.log('\nclients columns:');
  colRes.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));

  // Locate the DDOR patient-id column on clients
  const patientIdCandidates = colNames.filter(n =>
    /ddor.*patient|patient.*id|ddor_id|legacy_id|external_id/i.test(n)
  );
  const countyCandidates = colNames.filter(n => /county/i.test(n));

  console.log('\nLikely DDOR-PatientID column:', patientIdCandidates);
  console.log('Likely county column:        ', countyCandidates);

  // Pick best guesses, but let user override via env vars
  const patientIdCol = process.env.PATIENT_ID_COL || patientIdCandidates[0];
  const countyCol    = process.env.COUNTY_COL    || countyCandidates[0];

  if (!patientIdCol || !countyCol) {
    console.error('\nCould not auto-detect required columns. Set PATIENT_ID_COL and/or COUNTY_COL env vars and re-run.');
    await db.end();
    process.exit(1);
  }
  console.log(`\nUsing: clients.${patientIdCol}  ->  clients.${countyCol}`);

  // --- 2. Load counties lookup ---
  const countyRes = await db.query(`SELECT id, name FROM counties`);
  // Build name -> id map, tolerant of "X" vs "X County" vs "X, KY"
  const countyByName = new Map();
  for (const r of countyRes.rows) {
    const variants = new Set();
    const n = r.name.trim();
    variants.add(n);
    variants.add(n.replace(/,\s*KY$/i, '').trim());
    variants.add(n.replace(/\s+County(,\s*KY)?$/i, '').trim());
    variants.add(`${n.replace(/\s+County(,\s*KY)?$/i, '').trim()} County`);
    for (const v of variants) countyByName.set(v.toLowerCase(), r.id);
  }
  console.log(`Loaded ${countyRes.rows.length} counties from DB`);

  // --- 3. Pull current state of every client we have a CSV row for ---
  const patientIds = [...patientToOrg.keys()];
  const clientRes = await db.query(
    `SELECT id, first_name, last_name, ${patientIdCol} AS pid, ${countyCol} AS current_county_id
       FROM clients
      WHERE ${patientIdCol}::text = ANY($1::text[])`,
    [patientIds]
  );
  console.log(`Matched ${clientRes.rows.length} of ${patientIds.length} CSV PatientIDs to clients rows`);

  // current_county_id -> name (for human-readable preview)
  const idToCountyName = new Map(countyRes.rows.map(r => [r.id, r.name]));

  // --- 4. Build the preview rows ---
  const preview = [];
  const seenInClients = new Set();
  for (const c of clientRes.rows) {
    seenInClients.add(String(c.pid));
    const rawOrg = patientToOrg.get(String(c.pid)) || '';
    const normalizedOrg = MCCC_NORMALIZATION[rawOrg] || rawOrg;
    const proposedCountyId = countyByName.get(normalizedOrg.toLowerCase()) || null;

    let action;
    if (!proposedCountyId)         action = 'COUNTY_NOT_FOUND';
    else if (c.current_county_id === proposedCountyId) action = 'NO_CHANGE';
    else if (c.current_county_id == null)              action = 'UPDATE_NULL';
    else                                                action = 'UPDATE_OVERWRITE';

    preview.push({
      ddor_patient_id: c.pid,
      client_id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      raw_csv_org: rawOrg,
      normalized_org: normalizedOrg,
      current_county_id: c.current_county_id,
      current_county_name: c.current_county_id ? idToCountyName.get(c.current_county_id) : '',
      proposed_county_id: proposedCountyId,
      proposed_county_name: normalizedOrg,
      action,
    });
  }

  // PatientIDs in CSV but no matching client row (should be 0 if migration was complete)
  for (const pid of patientIds) {
    if (seenInClients.has(pid)) continue;
    const rawOrg = patientToOrg.get(pid) || '';
    preview.push({
      ddor_patient_id: pid,
      client_id: '',
      first_name: '',
      last_name: '',
      raw_csv_org: rawOrg,
      normalized_org: MCCC_NORMALIZATION[rawOrg] || rawOrg,
      current_county_id: '',
      current_county_name: '',
      proposed_county_id: '',
      proposed_county_name: '',
      action: 'CLIENT_NOT_FOUND',
    });
  }

  // --- 5. Write preview CSV ---
  const outPath = path.resolve('county_backfill_preview.csv');
  const cols = [
    'ddor_patient_id','client_id','first_name','last_name',
    'raw_csv_org','normalized_org',
    'current_county_id','current_county_name',
    'proposed_county_id','proposed_county_name',
    'action',
  ];
  const lines = [cols.join(',')];
  for (const row of preview) lines.push(cols.map(c => csvEscape(row[c])).join(','));
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');

  // --- 6. Summary ---
  const summary = preview.reduce((acc, r) => { acc[r.action] = (acc[r.action]||0)+1; return acc; }, {});
  console.log('\n--- Summary ---');
  for (const k of Object.keys(summary).sort()) console.log(`  ${k.padEnd(20)} ${summary[k]}`);
  console.log(`\nWrote ${preview.length} rows to ${outPath}`);
  console.log('\nReview the CSV. When ready, run apply_county_backfill.js against the SAME file.');

  await db.end();
})().catch(e => { console.error(e); process.exit(1); });
