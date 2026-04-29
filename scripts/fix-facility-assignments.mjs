#!/usr/bin/env node
/**
 * Facility Assignment Fixup Script
 *
 * Finds clients with null facility_id and attempts to match them to the correct
 * facility under their assigned provider using the original CSV facility text.
 *
 * Usage:
 *   DATABASE_URL="..." node scripts/fix-facility-assignments.mjs [--dry-run]
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');

if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// ============================================================================
// CSV PARSER
// ============================================================================

function parseCSV(text) {
    const rows = [];
    let headers = null;
    let current = '';
    let inQuotes = false;
    let fields = [];

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const next = text[i + 1];

        if (ch === '"') {
            if (inQuotes && next === '"') { current += '"'; i++; }
            else inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            fields.push(current.trim()); current = '';
        } else if ((ch === '\n' || (ch === '\r' && next === '\n')) && !inQuotes) {
            fields.push(current.trim()); current = '';
            if (ch === '\r') i++;
            if (!headers) { headers = fields; }
            else if (fields.some(f => f !== '')) {
                const row = {};
                headers.forEach((h, idx) => { row[h] = fields[idx] || ''; });
                rows.push(row);
            }
            fields = [];
        } else {
            current += ch;
        }
    }
    if (fields.length > 0 || current) {
        fields.push(current.trim());
        if (headers && fields.some(f => f !== '')) {
            const row = {};
            headers.forEach((h, idx) => { row[h] = fields[idx] || ''; });
            rows.push(row);
        }
    }
    return rows;
}

// ============================================================================
// FACILITY MATCHING
// ============================================================================

/**
 * Match CSV facility text against a list of facilities under a provider.
 * Returns the best matching facility or null.
 */
function matchFacility(facilityText, providerFacilities) {
    if (!facilityText || !providerFacilities.length) return null;
    const text = facilityText.toLowerCase();

    // Score each facility by number of matching words in its name
    let best = null;
    let bestScore = 0;

    for (const f of providerFacilities) {
        const fName = (f.name || '').toLowerCase();
        if (!fName) continue;

        // Exact substring match gets highest score
        if (text.includes(fName) || fName.includes(text.split(',')[0]?.trim() || '')) {
            // Score = length of matched facility name (prefer longer/more specific)
            const score = fName.length;
            if (score > bestScore) {
                best = f;
                bestScore = score;
            }
        }

        // Token-based matching: count facility name tokens appearing in text
        const tokens = fName.split(/[\s\-]+/).filter(t => t.length > 3);
        let tokenScore = 0;
        for (const tok of tokens) {
            if (text.includes(tok)) tokenScore++;
        }
        if (tokenScore > 0 && tokenScore * 2 > bestScore) {
            best = f;
            bestScore = tokenScore * 2;
        }

        // County-based matching: extract county name from facility and check text
        const countyMatch = fName.match(/\b(johnson|letcher|pike|christian|hopkins|mccracken|daviess|clark|madison|boyd|floyd|greenup|rowan|montgomery|bourbon|marshall|russell|caldwell|perry|wolfe|breathitt|jefferson|oldham|henry|fayette|kenton|warren|pulaski|mason|lewis|carter|graves|calloway|crittenden|monticello|wayne|mccreary)\b/);
        if (countyMatch && text.includes(countyMatch[1])) {
            const score = 3;
            if (score > bestScore) {
                best = f;
                bestScore = score;
            }
        }
    }

    return best;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║       FACILITY ASSIGNMENT FIXUP                             ║');
    console.log(`║  Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE — writing to database'}                        ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // -----------------------------------------------------------
    // PHASE 1: Find clients needing facility assignment
    // -----------------------------------------------------------
    console.log('Phase 1: Finding clients with null facility_id...');

    const orphanClients = await sql`
        SELECT c.id, c.ddor_id, c.first_name, c.last_name
        FROM clients c
        WHERE c.facility_id IS NULL
        AND c.ddor_id IS NOT NULL
    `;
    console.log(`  Found ${orphanClients.length} clients with null facility_id`);

    // Also find clients whose reports have a provider but clients have no facility
    const mismatched = await sql`
        SELECT DISTINCT c.id, c.ddor_id, c.first_name, c.last_name, r.provider_id
        FROM clients c
        JOIN reports r ON r.client_id = c.id
        WHERE c.facility_id IS NULL
        AND r.provider_id IS NOT NULL
    `;
    console.log(`  ${mismatched.length} of them have reports linked to a provider`);

    // Build a map: client_id -> provider_id (from their reports)
    const clientProviderMap = new Map();
    for (const m of mismatched) {
        if (!clientProviderMap.has(m.id)) {
            clientProviderMap.set(m.id, m.provider_id);
        }
    }

    if (orphanClients.length === 0) {
        console.log('\n✅ No orphan clients found. Nothing to do.');
        process.exit(0);
    }

    // -----------------------------------------------------------
    // PHASE 2: Load CSV and build facility hints per patient
    // -----------------------------------------------------------
    console.log('\nPhase 2: Parsing CSV for facility text...');

    const csvPath = resolve(__dirname, 'DDOR_Client_Repor_Unlocked.csv');
    const rawText = readFileSync(csvPath, 'latin1');
    const rows = parseCSV(rawText);
    console.log(`  Parsed ${rows.length.toLocaleString()} rows`);

    const orphanPids = new Set(orphanClients.map(c => c.ddor_id));
    const patientFacilityTexts = new Map(); // ddor_id -> [text strings]

    for (const row of rows) {
        const pid = row['PatientID']?.trim();
        if (!pid || !orphanPids.has(pid)) continue;

        const question = (row['Question'] || '').toLowerCase();
        const answer = (row['Answer'] || '').trim();
        if (!answer || answer === 'This question was skipped') continue;

        const isFacilityQ = (
            question.includes('parent agency and facility') ||
            question.includes('name, address, and county of your facility') ||
            question.includes('suggested provider first choice') ||
            (question.includes('parent agency') && question.includes('different')) ||
            question.includes('facility name and address')
        );

        if (isFacilityQ) {
            if (!patientFacilityTexts.has(pid)) patientFacilityTexts.set(pid, []);
            patientFacilityTexts.get(pid).push(answer);
        }
    }

    console.log(`  Collected facility text for ${patientFacilityTexts.size} orphan patients`);

    // -----------------------------------------------------------
    // PHASE 3: Load all facilities grouped by provider
    // -----------------------------------------------------------
    console.log('\nPhase 3: Loading facilities by provider...');

    const allFacilities = await sql`
        SELECT id, name, provider_id FROM facilities WHERE is_inactive = false
    `;
    const facilitiesByProvider = new Map();
    for (const f of allFacilities) {
        if (!facilitiesByProvider.has(f.provider_id)) {
            facilitiesByProvider.set(f.provider_id, []);
        }
        facilitiesByProvider.get(f.provider_id).push(f);
    }
    console.log(`  ${allFacilities.length} facilities across ${facilitiesByProvider.size} providers`);

    // -----------------------------------------------------------
    // PHASE 4: Match each orphan client to a facility
    // -----------------------------------------------------------
    console.log('\nPhase 4: Matching orphan clients to facilities...');

    const updates = []; // { clientId, facilityId, matchedFacilityName, providerId }
    const unmatched = [];

    for (const client of orphanClients) {
        const providerId = clientProviderMap.get(client.id);
        if (!providerId) {
            unmatched.push({ ...client, reason: 'no provider_id from reports' });
            continue;
        }

        const providerFacilities = facilitiesByProvider.get(providerId) || [];
        if (providerFacilities.length === 0) {
            unmatched.push({ ...client, reason: `provider has no facilities (${providerId})` });
            continue;
        }

        // If provider has only one facility, use it
        if (providerFacilities.length === 1) {
            updates.push({
                clientId: client.id,
                ddorId: client.ddor_id,
                facilityId: providerFacilities[0].id,
                matchedFacilityName: providerFacilities[0].name,
                providerId,
                reason: 'only facility under provider',
            });
            continue;
        }

        // Try to match using CSV facility text
        const texts = patientFacilityTexts.get(client.ddor_id) || [];
        let bestMatch = null;
        for (const text of texts) {
            const match = matchFacility(text, providerFacilities);
            if (match) { bestMatch = match; break; }
        }

        if (bestMatch) {
            updates.push({
                clientId: client.id,
                ddorId: client.ddor_id,
                facilityId: bestMatch.id,
                matchedFacilityName: bestMatch.name,
                providerId,
                reason: 'text match',
            });
        } else {
            // Fallback: use first facility under the provider
            updates.push({
                clientId: client.id,
                ddorId: client.ddor_id,
                facilityId: providerFacilities[0].id,
                matchedFacilityName: providerFacilities[0].name,
                providerId,
                reason: 'fallback to first facility',
            });
        }
    }

    console.log(`  Matched: ${updates.length}`);
    console.log(`  Unmatched: ${unmatched.length}`);

    // Summary by provider
    const providerStats = new Map();
    for (const u of updates) {
        if (!providerStats.has(u.providerId)) providerStats.set(u.providerId, 0);
        providerStats.set(u.providerId, providerStats.get(u.providerId) + 1);
    }

    // Look up provider names for display
    const providerNames = await sql`SELECT id, name FROM providers`;
    const nameMap = new Map(providerNames.map(p => [p.id, p.name]));

    console.log('\n  Updates by Provider:');
    for (const [pid, count] of [...providerStats.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`    ${nameMap.get(pid) || pid}: ${count}`);
    }

    // Reason breakdown
    const reasonStats = new Map();
    for (const u of updates) {
        reasonStats.set(u.reason, (reasonStats.get(u.reason) || 0) + 1);
    }
    console.log('\n  Match Reasons:');
    for (const [reason, count] of reasonStats) {
        console.log(`    ${reason}: ${count}`);
    }

    if (unmatched.length > 0) {
        console.log('\n  Unmatched clients:');
        for (const u of unmatched.slice(0, 10)) {
            console.log(`    PID ${u.ddor_id} (${u.first_name} ${u.last_name}): ${u.reason}`);
        }
        if (unmatched.length > 10) console.log(`    ... and ${unmatched.length - 10} more`);
    }

    if (DRY_RUN) {
        console.log('\n✅ DRY RUN complete. No data written.');
        process.exit(0);
    }

    // -----------------------------------------------------------
    // PHASE 5: Apply updates
    // -----------------------------------------------------------
    console.log('\nPhase 5: Applying updates...');

    let clientUpdated = 0;
    let reportsUpdated = 0;

    for (const u of updates) {
        try {
            // Update client
            await sql`UPDATE clients SET facility_id = ${u.facilityId} WHERE id = ${u.clientId}`;
            clientUpdated++;

            // Update any reports with null facility_id for this client
            const result = await sql`
                UPDATE reports
                SET facility_id = ${u.facilityId}
                WHERE client_id = ${u.clientId} AND facility_id IS NULL
            `;
            // Count affected (neon returns array with updated rows if RETURNING used; here just count attempts)
            const reportsFixed = await sql`
                SELECT COUNT(*)::int AS cnt FROM reports WHERE client_id = ${u.clientId} AND facility_id = ${u.facilityId}
            `;
            reportsUpdated += reportsFixed[0]?.cnt || 0;

            if (clientUpdated % 50 === 0) process.stdout.write(`\r  Updated ${clientUpdated} clients...`);
        } catch (err) {
            console.error(`\n  Error updating client ${u.ddorId}: ${err.message}`);
        }
    }

    console.log(`\n  Clients updated: ${clientUpdated}`);
    console.log(`  Reports with facility set: ${reportsUpdated}`);

    console.log('\n✅ Fixup complete!');
}

main().catch(err => {
    console.error('\n❌ Fixup failed:', err);
    process.exit(1);
});
