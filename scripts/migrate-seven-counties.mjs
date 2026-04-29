#!/usr/bin/env node
/**
 * Seven Counties Airtable Migration Script
 * 
 * Migrates Seven Counties participant data from the Airtable JSON export
 * into the DDOR Neon PostgreSQL schema. Seven Counties used Airtable
 * exclusively (never DDOR), so this data is operational tracking only —
 * completion checkmarks, dates, and status — no detailed clinical data.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." node scripts/migrate-seven-counties.mjs
 *   DATABASE_URL="postgresql://..." node scripts/migrate-seven-counties.mjs --dry-run
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

// Airtable record IDs for Seven Counties
const SC_FACILITY_IDS = new Set([
    'recMmXuM7a27CI2L5', // Oldham Outpatient
    'rec8z0NmxV8j2weFu', // Addiction Recovery Center
    'rec268FGSaDKA2bqj', // Henry County Outpatient
    'recbxkiew8zFiSAfc', // Parent agency record
]);

// Map Airtable facility IDs to facility names for DB matching
const AT_FACILITY_NAMES = {
    'recMmXuM7a27CI2L5': 'Oldham Outpatient',
    'rec8z0NmxV8j2weFu': 'Addiction Recovery Center',
    'rec268FGSaDKA2bqj': 'Henry County Outpatient',
    'recbxkiew8zFiSAfc': 'Seven Counties', // parent — fallback
};

// Map Airtable archive reasons to our schema
const ARCHIVE_REASON_MAP = {
    'Successful Completion': 'Completed',
    'Withdrawn by prosecution': 'Withdrawn',
    'Participant dropped out': 'Dropped out',
    'Plead in court': 'Plead',
    'Ineligible': 'Ineligible',
    'Disposed': 'Other',
};

// Map Airtable LOC values to our schema
const LOC_MAP = {
    'SUD OP': '1.0 Outpatient Services',
    'SUD IOP/PHP': '2.1 Intensive Outpatient Services',
    'MH OP': 'II. Low-Intensity Community-Based Services',
    'MH IOP/PHP': 'IV. Medically-Monitored Non-Residential Services',
};

// Map diagnosis values
const DX_MAP = {
    'Co-occurring': 'co_occurring',
    'MH': 'mh',
    'SUD': 'sud',
};

// ============================================================================
// HELPERS
// ============================================================================

function splitName(fullName) {
    if (!fullName) return { first: '', last: '' };
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return { first: parts[0], last: '' };
    return { first: parts[0], last: parts.slice(1).join(' ') };
}

function milestoneStatus(val) {
    if (!val || val === 'EMPTY') return 'not_due';
    const v = String(val).trim();
    if (v === '✅') return 'completed';
    if (v === '❌') return 'overdue';
    if (v === '---' || v === 'N/A') return 'not_applicable';
    if (v === 'Need Tx Start Date') return 'needs_tx_start_date';
    return 'not_due';
}

function parseDate(val) {
    if (!val) return null;
    // Airtable dates come as "2024-10-29"
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║      SEVEN COUNTIES AIRTABLE MIGRATION                     ║');
    console.log(`║  Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE — writing to database'}                        ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // -----------------------------------------------------------
    // PHASE 1: Load data
    // -----------------------------------------------------------
    console.log('Phase 1: Loading data...');

    const jsonPath = resolve(__dirname, 'ddor_airtable_export.json');
    const raw = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    const base = raw['appGkLxpjiMI1Qrxb']; // SB90 Base

    const atReports = base.tables.find(t => t.name === 'Reports');
    const atReferrals = base.tables.find(t => t.name === 'Referral List');

    // Filter to Seven Counties only
    const scReports = atReports.allRecords.filter(r => {
        const cp = r.fields['Current Treatment Provider'] || [];
        return Array.isArray(cp) && cp.some(id => SC_FACILITY_IDS.has(id));
    });

    const scReferrals = atReferrals.allRecords.filter(r => {
        const pr = r.fields['Provider Recommendation'] || [];
        return Array.isArray(pr) && pr.some(id => SC_FACILITY_IDS.has(id));
    });

    console.log(`  Seven Counties Reports: ${scReports.length}`);
    console.log(`  Seven Counties Referrals: ${scReferrals.length}`);

    // -----------------------------------------------------------
    // PHASE 2: Match DB facilities
    // -----------------------------------------------------------
    console.log('\nPhase 2: Matching Seven Counties facilities in DB...');

    // Find Seven Counties provider in DB
    const dbProviders = await sql`SELECT id, name FROM providers WHERE name ILIKE '%seven%count%'`;
    if (dbProviders.length === 0) {
        console.error('ERROR: Seven Counties provider not found in DB');
        process.exit(1);
    }
    // Use first match (there may be duplicates)
    const scProvider = dbProviders[0];
    console.log(`  DB Provider: "${scProvider.name}" (${scProvider.id})`);

    const dbFacilities = await sql`SELECT id, name FROM facilities WHERE provider_id = ${scProvider.id}`;
    console.log(`  DB Facilities under Seven Counties: ${dbFacilities.length}`);
    for (const f of dbFacilities) console.log(`    - ${f.name} (${f.id})`);

    // Build Airtable facility ID → DB facility ID map
    const facilityMap = new Map(); // Airtable rec ID → DB UUID
    for (const [atId, atName] of Object.entries(AT_FACILITY_NAMES)) {
        const match = dbFacilities.find(f =>
            f.name.toLowerCase().includes(atName.toLowerCase()) ||
            atName.toLowerCase().includes(f.name.toLowerCase())
        );
        if (match) {
            facilityMap.set(atId, match.id);
            console.log(`  Mapped: ${atName} → ${match.name}`);
        }
    }

    // Fallback: use first facility for unmapped records
    const fallbackFacilityId = dbFacilities[0]?.id || null;
    if (!fallbackFacilityId) {
        console.error('ERROR: No Seven Counties facilities found in DB. Create them first.');
        process.exit(1);
    }

    // -----------------------------------------------------------
    // PHASE 3: Check for existing clients (avoid duplicates)
    // -----------------------------------------------------------
    console.log('\nPhase 3: Checking for existing Seven Counties clients...');

    const existingClients = await sql`
        SELECT c.id, c.first_name, c.last_name, c.facility_id 
        FROM clients c
        JOIN facilities f ON c.facility_id = f.id
        WHERE f.provider_id = ${scProvider.id}
    `;
    console.log(`  Existing SC clients in DB: ${existingClients.length}`);

    // Build name-based lookup for dedup
    const existingNameSet = new Set(
        existingClients.map(c => `${c.first_name}|${c.last_name}`.toLowerCase())
    );

    if (DRY_RUN) {
        console.log('\n--- DRY RUN PREVIEW ---');
        console.log(`\nWould insert up to ${scReports.length} clients:`);
        for (const r of scReports.slice(0, 10)) {
            const { first, last } = splitName(r.fields['Client Name']);
            const dup = existingNameSet.has(`${first}|${last}`.toLowerCase()) ? ' [DUPLICATE]' : '';
            const txDate = r.fields['Treatment Initiation Date/Intake'] || 'no tx date';
            console.log(`  ${first} ${last} — ${txDate}${dup}`);
        }
        if (scReports.length > 10) console.log(`  ... and ${scReports.length - 10} more`);

        const newClients = scReports.filter(r => {
            const { first, last } = splitName(r.fields['Client Name']);
            return !existingNameSet.has(`${first}|${last}`.toLowerCase());
        });
        console.log(`\n  New clients: ${newClients.length}`);
        console.log(`  Duplicates (would skip): ${scReports.length - newClients.length}`);

        console.log(`\nWould insert up to ${scReferrals.length} referrals`);

        printSummary(scReports, scReferrals, newClients.length);
        console.log('\n✅ DRY RUN complete. No data written.');
        process.exit(0);
    }

    // -----------------------------------------------------------
    // PHASE 4: Insert clients from Reports
    // -----------------------------------------------------------
    console.log('\nPhase 4: Inserting clients...');

    const clientIdMap = new Map(); // Airtable report rec ID → DB client UUID
    let clientCount = 0;
    let skipCount = 0;

    for (const rec of scReports) {
        const f = rec.fields;
        const { first, last } = splitName(f['Client Name']);
        const nameKey = `${first}|${last}`.toLowerCase();

        // Skip duplicates
        if (existingNameSet.has(nameKey)) {
            // Find existing client ID for report tracking
            const existing = existingClients.find(
                c => `${c.first_name}|${c.last_name}`.toLowerCase() === nameKey
            );
            if (existing) clientIdMap.set(rec.id, existing.id);
            skipCount++;
            continue;
        }

        // Determine facility
        const atFacIds = f['Current Treatment Provider'] || [];
        let facilityId = fallbackFacilityId;
        for (const atId of atFacIds) {
            if (facilityMap.has(atId)) { facilityId = facilityMap.get(atId); break; }
        }

        const txStart = parseDate(f['Treatment Initiation Date/Intake']);
        const agreementSigned = parseDate(f['Agreement Signed']);
        const agreementEnd = parseDate(f['Participant Agreement End Date']);
        const isArchived = !!f['Archived'];
        const archiveReason = f['Archive Reason']
            ? ARCHIVE_REASON_MAP[Array.isArray(f['Archive Reason']) ? f['Archive Reason'][0] : f['Archive Reason']] || null
            : null;
        const dx = f['Dx'] ? DX_MAP[f['Dx']] || null : null;
        const hasOud = f['OUD'] === 'Yes' || f['OUD'] === true;
        const notes = f['Notes'] || null;

        try {
            const result = await sql`
                INSERT INTO clients (first_name, last_name, facility_id,
                    treatment_start_date, agreement_signed_date, agreement_end_date,
                    is_archived, archive_reason, diagnosis, has_oud, notes)
                VALUES (${first}, ${last}, ${facilityId},
                    ${txStart}, ${agreementSigned}, ${agreementEnd},
                    ${isArchived}, ${archiveReason}, ${dx}, ${hasOud},
                    ${notes ? notes.substring(0, 5000) : null})
                RETURNING id
            `;
            clientIdMap.set(rec.id, result[0].id);
            existingNameSet.add(nameKey);
            clientCount++;
        } catch (err) {
            console.error(`  Error inserting ${first} ${last}: ${err.message}`);
        }
    }
    console.log(`  Inserted: ${clientCount} clients`);
    console.log(`  Skipped (duplicates): ${skipCount}`);

    // -----------------------------------------------------------
    // PHASE 5: Insert referrals
    // -----------------------------------------------------------
    console.log('\nPhase 5: Inserting referrals...');

    let refCount = 0;
    for (const rec of scReferrals) {
        const f = rec.fields;
        const firstName = f['First Name'] || '';
        const lastName = f['Last Name'] || '';
        const dateReceived = parseDate(f['Date Received']);
        const screenDate = parseDate(f['Screen Date']);
        const courtDate = parseDate(f['Court Date']);
        const eligibility = f['Eligibility'] || null;
        const locRec = f['LOC Recommendation'] || null;
        const assessorStatus = f['Statewide Assessor Status'] || null;
        const referralType = f['Referral Type'] || null;
        const closedReason = f['Closed Reason'] || null;
        const housing = f["Defendant's housing status"] || null;
        const phone = f["Defendant's Phone Number"] || null;
        const notes = f['Notes'] || null;

        // Map LOC
        const locMapped = locRec ? (LOC_MAP[locRec] || locRec) : null;

        // Determine facility for provider recommendation
        const atFacIds = f['Provider Recommendation'] || [];
        let facilityId = fallbackFacilityId;
        for (const atId of atFacIds) {
            if (facilityMap.has(atId)) { facilityId = facilityMap.get(atId); break; }
        }

        // Try to link to client by name match
        const nameKey = `${firstName}|${lastName}`.toLowerCase();
        const matchedClient = existingClients.find(
            c => `${c.first_name}|${c.last_name}`.toLowerCase() === nameKey
        );

        try {
            await sql`
                INSERT INTO referrals (first_name, last_name, phone,
                    date_received, referral_date, screen_date, court_date,
                    assessor_status, eligibility, referral_type_status,
                    closed_reason, loc_recommendation, initial_housing,
                    provider_recommendation_id, client_id, notes)
                VALUES (${firstName}, ${lastName}, ${phone},
                    ${dateReceived}, ${dateReceived}, ${screenDate}, ${courtDate},
                    ${assessorStatus}, ${eligibility}, ${referralType},
                    ${closedReason}, ${locMapped}, ${housing},
                    ${facilityId}, ${matchedClient?.id || null},
                    ${notes ? notes.substring(0, 5000) : null})
            `;
            refCount++;
        } catch (err) {
            console.error(`  Error inserting referral ${firstName} ${lastName}: ${err.message}`);
        }
    }
    console.log(`  Inserted: ${refCount} referrals`);

    // -----------------------------------------------------------
    // PHASE 6: Insert report tracking
    // -----------------------------------------------------------
    console.log('\nPhase 6: Building report tracking...');

    let trackCount = 0;
    for (const rec of scReports) {
        const clientId = clientIdMap.get(rec.id);
        if (!clientId) continue;

        const f = rec.fields;

        // Check if tracking already exists
        const existing = await sql`SELECT id FROM report_tracking WHERE client_id = ${clientId}`;
        if (existing.length > 0) continue;

        try {
            await sql`
                INSERT INTO report_tracking (client_id,
                    fourteen_day_status, kyae_referral_status,
                    forty_two_day_status, barc10_status, phq9_gad7_status,
                    ninety_day_status, one_eighty_day_status,
                    two_seventy_day_status, three_sixty_day_status,
                    final_report_status, final_provider_status)
                VALUES (${clientId},
                    ${milestoneStatus(f['14 Day Report'])},
                    ${milestoneStatus(f['KYAE Referral Complete'])},
                    ${milestoneStatus(f['42 Day Report'])},
                    ${milestoneStatus(f['BARC-10 (Due with 42 Day Report)*'])},
                    ${milestoneStatus(f['PHQ9/GAD7 (Due with the 42 Day Report)*'])},
                    ${milestoneStatus(f['90 Day Report'])},
                    ${milestoneStatus(f['180 Day Report'])},
                    ${milestoneStatus(f['270 Day Report'])},
                    ${milestoneStatus(f['360 Day Report'])},
                    ${milestoneStatus(f['Final SB90 Program Report'])},
                    ${milestoneStatus(f['Final SB90 Program Report'])})
            `;
            trackCount++;
        } catch (err) {
            console.error(`  Error on tracking for ${f['Client Name']}: ${err.message}`);
        }
    }
    console.log(`  Inserted: ${trackCount} report tracking records`);

    // -----------------------------------------------------------
    // PHASE 7: Create skeleton reports for completed milestones
    // -----------------------------------------------------------
    console.log('\nPhase 7: Creating skeleton reports for completed milestones...');

    const milestoneFields = [
        { field: '14 Day Report', type: 'fourteen_day' },
        { field: '42 Day Report', type: 'forty_two_day' },
        { field: '90 Day Report', type: 'ninety_day' },
        { field: '180 Day Report', type: 'one_eighty_day' },
        { field: '270 Day Report', type: 'two_seventy_day' },
        { field: '360 Day Report', type: 'three_sixty_day' },
        { field: 'Final SB90 Program Report', type: 'final' },
    ];

    let reportCount = 0;
    for (const rec of scReports) {
        const clientId = clientIdMap.get(rec.id);
        if (!clientId) continue;

        const f = rec.fields;
        const atFacIds = f['Current Treatment Provider'] || [];
        let facilityId = fallbackFacilityId;
        for (const atId of atFacIds) {
            if (facilityMap.has(atId)) { facilityId = facilityMap.get(atId); break; }
        }

        // Determine discharge info for final reports
        const archiveReason = f['Archive Reason'];
        const isCompleted = archiveReason &&
            (Array.isArray(archiveReason) ? archiveReason[0] : archiveReason) === 'Successful Completion';
        const dischargeReason = archiveReason
            ? (Array.isArray(archiveReason) ? archiveReason[0] : archiveReason)
            : null;

        // LOC from Airtable
        const locRaw = f['LOC Recommendation'];
        const loc = locRaw ? (Array.isArray(locRaw) ? locRaw[0] : locRaw) : null;
        const dx = f['Dx'] || null;
        let sudLoc = null;
        let mhLoc = null;
        if (loc && loc.startsWith('SUD')) sudLoc = LOC_MAP[loc] || loc;
        if (loc && loc.startsWith('MH')) mhLoc = LOC_MAP[loc] || loc;
        if (dx === 'SUD' || dx === 'Co-occurring') sudLoc = sudLoc || '1.0 Outpatient Services';
        if (dx === 'MH' || dx === 'Co-occurring') mhLoc = mhLoc || 'II. Low-Intensity Community-Based Services';

        for (const m of milestoneFields) {
            const val = f[m.field];
            if (milestoneStatus(val) !== 'completed') continue;

            const isFinal = m.type === 'final';

            try {
                await sql`
                    INSERT INTO reports (report_type, client_id, facility_id, provider_id,
                        date_submitted, current_sud_loc, current_mh_loc,
                        program_status, is_receiving_mat,
                        was_discharged, discharge_reason,
                        submitter_name, is_signed)
                    VALUES (${m.type}, ${clientId}, ${facilityId}, ${scProvider.id},
                        ${parseDate(f['Treatment Initiation Date/Intake']) || new Date().toISOString().split('T')[0]},
                        ${sudLoc}, ${mhLoc},
                        ${isFinal && isCompleted ? 'Successful Program Completion' : 'Current Patient/Client'},
                        ${false},
                        ${isFinal && !!archiveReason}, ${isFinal ? dischargeReason : null},
                        ${'Seven Counties (Airtable import)'}, ${true})
                `;
                reportCount++;
            } catch (err) {
                console.error(`  Error on report ${m.type} for ${f['Client Name']}: ${err.message}`);
            }
        }
    }
    console.log(`  Inserted: ${reportCount} skeleton reports`);

    // -----------------------------------------------------------
    // SUMMARY
    // -----------------------------------------------------------
    printSummary(scReports, scReferrals, clientCount);
    console.log('\n✅ Migration complete!');
}

function printSummary(reports, referrals, clientCount) {
    const archived = reports.filter(r => r.fields['Archived']).length;
    const withTx = reports.filter(r => r.fields['Treatment Initiation Date/Intake']).length;

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║              SEVEN COUNTIES MIGRATION SUMMARY               ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  Clients:                    ${String(clientCount).padStart(6)}                        ║`);
    console.log(`║  Referrals:                  ${String(referrals.length).padStart(6)}                        ║`);
    console.log(`║  With treatment start date:  ${String(withTx).padStart(6)}                        ║`);
    console.log(`║  Archived:                   ${String(archived).padStart(6)}                        ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝');
}

main().catch(err => {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
});
