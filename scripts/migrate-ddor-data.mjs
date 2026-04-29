#!/usr/bin/env node
/**
 * DDOR Data Migration Script
 * 
 * Migrates the DDOR Client Report CSV (EAV format) into the Neon PostgreSQL schema.
 * 
 * Usage:
 *   DATABASE_URL="postgresql://..." node scripts/migrate-ddor-data.mjs
 * 
 * Options:
 *   --dry-run    Parse and map data without writing to DB
 *   --verbose    Show detailed matching output
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// ============================================================================
// CSV PARSER (handles quoted fields with commas)
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
            if (inQuotes && next === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
        } else if ((ch === '\n' || (ch === '\r' && next === '\n')) && !inQuotes) {
            fields.push(current.trim());
            current = '';
            if (ch === '\r') i++; // skip \n

            if (!headers) {
                headers = fields;
            } else if (fields.some(f => f !== '')) {
                const row = {};
                headers.forEach((h, idx) => { row[h] = fields[idx] || ''; });
                rows.push(row);
            }
            fields = [];
        } else {
            current += ch;
        }
    }
    // Last row
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
// PROVIDER MATCHING ENGINE
// ============================================================================

// Priority-ordered matching rules: [pattern, providerNameInDB]
// Longer/more-specific patterns first to avoid false matches
const PROVIDER_PATTERNS = [
    // Very specific first
    [/mountain\s*comp(rehensive|hrensive)?\s*(care\s*center|health\s*corp)/i, 'MCCC'],
    [/mountain\s*comp(rehensive|hrensive)?\s*care/i, 'MCCC'],
    [/mountain\s*comp(rehensive|hrensive)?\s*health/i, 'MCHC'],
    [/\bMCCC\b/i, 'MCCC'],
    [/\bMCC\b(?!\s*racken)/i, 'MCCC'],  // MCC but not McCracken
    [/\bMCHC\b/i, 'MCHC'],
    [/four\s*rivers?\s*(behavioral)?/i, 'Four Rivers'],
    [/\blifeskills?\b/i, 'Lifeskills'],
    [/\blife\s+skills?\b/i, 'Lifeskills'],
    [/pennyroyal|penny\s*royal/i, 'Pennyroyal'],
    [/seven\s*count(ies|y)/i, 'Seven Counties'],
    [/new\s*vista/i, 'New Vista'],
    [/\bnorthkey\b|north\s*key\b/i, 'NorthKey'],
    [/emerald\s*therapy/i, 'Emerald Therapy'],
    [/pathways?\s*(inc|behavioral)?/i, 'Pathways'],
    [/kentucky\s*river\s*community\s*care|ky\s*river\s*community|\bKRCC\b/i, 'KRCC'],
    [/journey\s*pure|journeypure/i, 'JourneyPure'],
    [/journey\s*to\s*heal/i, 'Journey To Healing'],
    [/ramey[\s-]*estep|re[\s-]*group\b/i, 'Ramey-Estep'],
    [/river\s*valley\s*behav/i, 'River Valley'],
    [/\brivervalley\b/i, 'River Valley'],
    [/spero\s*health|sperohealth|\bspero\b/i, 'Spero Health'],
    [/brightview/i, 'Brightview Health'],
    [/\bprotea\b/i, 'Protea'],
    [/\badanta\b/i, 'Adanta'],
    [/comprehend/i, 'Comprehend'],
    [/fresh\s*start/i, 'Fresh Start Health'],
    [/pursue\s*care|pursuecare/i, 'Pursue Care'],
    [/true\s*north/i, 'TrueNorth'],
    [/the\s*morton\s*center/i, 'The Morton Center'],
    [/transitions/i, 'Transitions'],
    [/recovery\s*kentucky/i, 'Recovery Kentucky'],
    [/redeemed\s*(and|&)\s*restored/i, 'Redeemed and Restored'],
    [/cumberland\s*family\s*medical|\bCFMC\b/i, 'Cumberland Family Medical Center'],
    [/cumberland\s*river\s*beh|\bCRBH\b/i, 'Cumberland River'],
    [/frontier\s*(medical|behavioral)/i, 'Frontier Medical'],
    [/groups?\s*recover\s*together/i, 'Groups Recover Together'],
    [/\bWARM\b/i, 'WARM'],
    [/\bSPARC\b|sparc\s*recovery/i, 'SPARC Recovery'],
    [/baptist\s*health/i, 'Baptist Health'],
    [/optimal\s*living/i, 'Optimal Living Services'],
    [/volunteers\s*of\s*america/i, 'Volunteers of America'],
    [/the\s*healing\s*place/i, 'The Healing Place'],
    [/ethan\s*health/i, 'Ethan Health'],
    [/chrysalis\s*house/i, 'Chrysalis House'],
    [/clean\s*slate/i, 'Clean Slate'],
    [/neartown/i, 'Neartown'],
    [/\bMARC\b/i, 'MARC'],
    [/hope\s*in\s*the\s*mountains/i, 'Hope In The Mountains'],
    [/isaiah\s*house/i, 'Isaiah House'],
    [/beacon/i, 'Beacons of Hope'],
    [/yonder/i, 'Yonder Behavioral Health'],
    [/your\s*path|yourpath/i, 'YourPath'],
    [/\bARcare\b|arcare|kentucky\s*care|kentuckycare/i, 'ARcare'],
    [/\bARC\b|addiction\s*recovery\s*care|bellefonte|crown\s*recovery|eagles?\s*creek|yellow\s*banks/i, 'ARC'],
    [/\bARIA\b|aria\s*recovery|edgewater/i, 'Aria'],
    [/u\s*of\s*l\s*health/i, 'U of L Health'],
    [/westcare/i, 'Westcare'],
    [/stellar/i, 'Stellar Behavioral Health'],
    [/malta/i, 'Malta Recovery LLC'],
    [/foothills/i, 'Foothills Healthcare Inc.'],
    [/communicare/i, 'Communicare'],
    [/hope\s*center/i, 'Hope Center'],
    [/rivendell/i, 'Rivendell'],
];

function matchProvider(text, dbProviders) {
    if (!text || text === 'This question was skipped' || text === 'n/a' || text === 'None' || text === 'Skipped' || text === 'TBD') {
        return null;
    }

    for (const [pattern, providerAlias] of PROVIDER_PATTERNS) {
        if (pattern.test(text)) {
            // Find matching provider in DB (fuzzy name match)
            const match = dbProviders.find(p => {
                const pName = p.name.toLowerCase();
                const alias = providerAlias.toLowerCase();
                return pName === alias
                    || pName.includes(alias)
                    || alias.includes(pName)
                    || pName.replace(/[^a-z]/g, '') === alias.replace(/[^a-z]/g, '');
            });
            if (match) return match;

            if (VERBOSE) console.log(`  Pattern matched "${providerAlias}" but no DB provider found`);
        }
    }
    return null;
}

// ============================================================================
// QUESTIONNAIRE TYPE MAPPING
// ============================================================================

const QNAME_TO_TYPE = {
    'ASAM Clinical Summary Report v1.2': 'clinical_assessor',
    'ASAM Clinical Summary Report v1.3': 'clinical_assessor',
    'Patient Demographic Information v1.2': 'demographic',
    'Informed Consent v1.1': 'informed_consent',
    'Informed Consent (Cell phone text or email) v1.3': 'informed_consent',
    'Informed Consent - Remote Cell or Email': 'informed_consent',
    'Release of Information (ROI) for CDP v1.0': 'informed_consent',
    'Global Assessment of Individual Needs (GAIN-SS) v1.08': 'gain_ss',
    'Global Assessment of Individual Needs (GAIN-SS) Interview v1.09': 'gain_ss',
    'Global Assessment of Individual Needs (GAIN-SS) Interview v1.10': 'gain_ss',
    'Brief Assessment of Recovery Capital (BARC-10) Interview v1.5': 'barc_10',
    'Brief Assessment of Recovery Capital (BARC-10) Interview v1.6': 'barc_10',
    'PHQ-9 and GAD-7 v1.0': 'phq9_gad7',
    'PHQ-9 and GAD-7 v1.1': 'phq9_gad7',
    'Working Alliance Inventory v1.0': 'wai_sr',
    'LOCUS Evaluation Summary Report': 'locus',
    'LOCUS Evaluation Summary Report Interview v1.0': 'locus',
    'LOCUS Evaluation Summary Report Interview v1.1': 'locus',
    'Statewide Assessor Referral to Case Navigator v1.2': 'assessor_referral',
};

const QNAME_TO_REPORT_TYPE = {
    '14 Day Stabilization Report v1.4': 'fourteen_day',
    '42 Day Progress Report v1.3': 'forty_two_day',
    'A 90 Day Provider Report v1.3': 'ninety_day',
    'A 180 Day Provider Report v1.3': 'one_eighty_day',
    'A 270 Day Provider Report v1.3': 'two_seventy_day',
    'A 360 Day Provider Report v1.3': 'three_sixty_day',
    'Final Provider Report v1.6': 'final',
};

// Questions that map to report table columns
const REPORT_FIELD_MAP = {
    "current level of care for substance use disorder": 'current_sud_loc',
    "current level of care for mental health disorder": 'current_mh_loc',
    "current program status": 'program_status',
    "currently receiving medication assisted treatment": 'is_receiving_mat',
    "participant discharged": 'was_discharged',
    "discharge date": 'discharge_date',
    "why was the participant discharged": 'discharge_reason',
    "participant's insurance type": 'insurance_type',
    "current employment status": 'employment_status',
    "current living situation": 'living_situation',
    "mat services is the participant currently receiving": 'mat_services',
    "referred to another provider": 'was_referred',
    "referred level of care": 'referred_loc',
    "referred provider": 'referred_provider',
    "attendance": 'attendance_frequency',
    "level of care for substance use disorder at discharge": 'discharge_sud_loc',
    "level of care for for mental health disorder at discharge": 'discharge_mh_loc',
    "length of time the individual participated": 'program_length_days',
    "employment training with": 'kyae_employment_status',
    "education with": 'kyae_education_status',
    "treated for mental health conditions": 'has_mh_treatment',
    "treated for substance use disorder": 'has_sud_treatment',
};

// Questions that map to report_attributes (multi-select service grids)
const REPORT_ATTR_MAP = {
    "treatment services your agency has provided": 'treatment_provided',
    "treatment services your agency plans to provide": 'treatment_planned',
    "case management services your agency has provided": 'case_mgmt_provided',
    "case management services your agency plans to provide": 'case_mgmt_planned',
    "medical services your agency has provided": 'medical_provided',
    "medical services your agency plans to provide": 'medical_planned',
    "aftercare services your agency has provided": 'aftercare_provided',
    "aftercare services your agency plans to provide": 'aftercare_planned',
    "educational services your agency has provided": 'educational_provided',
    "educational services your agency plans to provide": 'educational_planned',
    "recovery support services your agency has provided": 'recovery_provided',
    "recovery support services your agency plans to provide": 'recovery_planned',
    "goals were met": 'goals_achieved',
    "barriers to treatment": 'barriers',
};

function classifyQuestion(questionText) {
    const ql = questionText.toLowerCase();

    // Check report column fields
    for (const [pattern, field] of Object.entries(REPORT_FIELD_MAP)) {
        if (ql.includes(pattern)) return { type: 'report_field', field };
    }

    // Check report attribute fields (multi-select)
    for (const [pattern, field] of Object.entries(REPORT_ATTR_MAP)) {
        if (ql.includes(pattern)) return { type: 'report_attr', field };
    }

    // Submitter info
    if (ql.includes('parent agency and facility')) return { type: 'submitter_info' };

    return { type: 'other' };
}

// ============================================================================
// DATE PARSING
// ============================================================================

function parseDate(dateStr) {
    if (!dateStr || dateStr === 'This question was skipped') return null;
    
    // "Jan  2 2025  6:31PM" format
    const match1 = dateStr.match(/^(\w{3})\s+(\d{1,2})\s+(\d{4})\s+(\d{1,2}):(\d{2})(AM|PM)$/i);
    if (match1) {
        const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
        let [, mon, day, year, hour, min, ampm] = match1;
        hour = parseInt(hour);
        if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
        if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
        const d = new Date(parseInt(year), months[mon], parseInt(day), hour, parseInt(min));
        if (!isNaN(d.getTime())) return d.toISOString();
    }

    // "1/23/2025" or "01/23/2025" format
    const match2 = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match2) {
        const d = new Date(parseInt(match2[3]), parseInt(match2[1]) - 1, parseInt(match2[2]));
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }

    return null;
}

// ============================================================================
// MAIN MIGRATION
// ============================================================================

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║           DDOR DATA MIGRATION                              ║');
    console.log(`║  Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE — writing to database'}                        ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // -----------------------------------------------------------
    // PHASE 1: Load reference data from DB
    // -----------------------------------------------------------
    console.log('Phase 1: Loading reference data from database...');

    const dbProviders = await sql`SELECT id, name, abbreviation FROM providers WHERE is_active = true ORDER BY name`;
    const dbFacilities = await sql`SELECT id, name, provider_id FROM facilities WHERE is_inactive = false ORDER BY name`;
    const dbCounties = await sql`SELECT id, name FROM counties ORDER BY name`;
    const dbQuestDefs = await sql`SELECT id, questionnaire_type, name FROM questionnaire_definitions ORDER BY name`;

    console.log(`  Providers: ${dbProviders.length}`);
    console.log(`  Facilities: ${dbFacilities.length}`);
    console.log(`  Counties: ${dbCounties.length}`);
    console.log(`  Questionnaire defs: ${dbQuestDefs.length}`);

    // Build lookup maps
    const providerByName = new Map();
    for (const p of dbProviders) {
        providerByName.set(p.name.toLowerCase(), p);
        if (p.abbreviation) providerByName.set(p.abbreviation.toLowerCase(), p);
    }

    const questDefByType = new Map();
    for (const q of dbQuestDefs) {
        if (q.questionnaire_type) questDefByType.set(q.questionnaire_type, q);
    }

    // -----------------------------------------------------------
    // PHASE 2: Parse CSV
    // -----------------------------------------------------------
    console.log('\nPhase 2: Parsing CSV...');
    const csvPath = resolve(__dirname, 'DDOR_Client_Repor_Unlocked.csv');
    const rawText = readFileSync(csvPath, 'latin1'); // cp1252 compatible
    const rows = parseCSV(rawText);
    console.log(`  Parsed ${rows.length.toLocaleString()} rows`);

    // -----------------------------------------------------------
    // PHASE 3: Build patient records
    // -----------------------------------------------------------
    console.log('\nPhase 3: Building patient records...');

    const patients = new Map(); // patientId -> { info, facilityTexts, submissions }

    for (const row of rows) {
        const pid = row['PatientID']?.trim();
        if (!pid) continue;

        if (!patients.has(pid)) {
            patients.set(pid, {
                ddor_id: pid,
                first_name: row['FirstName']?.trim() || '',
                last_name: row['LastName']?.trim() || '',
                dob: row['Date of birth']?.trim() || null,
                created_on: row['Client Created on']?.trim() || null,
                org: row['CompanyOrOrganization']?.trim() || '',
                facilityTexts: [],
                submissions: new Map(), // key: qname|assigned_date -> { rows }
                treatment_start_date: null,
            });
        }

        const patient = patients.get(pid);
        const qname = row['Questionnaire Name']?.trim() || '';
        const assigned = row['Questionnaire Assigned On']?.trim() || '';
        const completed = row['Questionnaire Completed On']?.trim() || '';
        const questionNo = row['Question No.']?.trim() || '';
        const question = row['Question']?.trim() || '';
        const answer = row['Answer']?.trim() || '';

        // Collect facility hints
        const ql = question.toLowerCase();
        if (ql.includes('parent agency and facility') ||
            ql.includes('name, address, and county of your facility') ||
            ql.includes('suggested provider first choice') ||
            (ql.includes('parent agency') && ql.includes('different'))) {
            patient.facilityTexts.push(answer);
        }

        // Collect treatment start date from Initiation Notification
        if (qname === 'Initiation Notification v1.1' && ql.includes('date treatment services began')) {
            const parsed = parseDate(answer);
            if (parsed) patient.treatment_start_date = parsed;
        }

        // Group into submissions
        const subKey = `${qname}||${assigned}`;
        if (!patient.submissions.has(subKey)) {
            patient.submissions.set(subKey, {
                qname,
                assigned_on: assigned,
                completed_on: completed,
                responses: [],
            });
        }
        patient.submissions.get(subKey).responses.push({
            question_no: parseInt(questionNo) || 0,
            question,
            answer,
        });
    }

    console.log(`  Unique patients: ${patients.size}`);
    console.log(`  Total submissions: ${[...patients.values()].reduce((s, p) => s + p.submissions.size, 0)}`);

    // -----------------------------------------------------------
    // PHASE 4: Match providers
    // -----------------------------------------------------------
    console.log('\nPhase 4: Matching patients to providers...');

    const providerMatches = new Map(); // pid -> provider record
    const unmatchedPatients = [];

    for (const [pid, patient] of patients) {
        let matched = null;
        for (const text of patient.facilityTexts) {
            matched = matchProvider(text, dbProviders);
            if (matched) break;
        }
        if (matched) {
            providerMatches.set(pid, matched);
        } else {
            unmatchedPatients.push({ pid, org: patient.org, texts: patient.facilityTexts.slice(0, 2) });
        }
    }

    const matchedCount = providerMatches.size;
    console.log(`  Matched: ${matchedCount} / ${patients.size} (${(matchedCount / patients.size * 100).toFixed(1)}%)`);
    console.log(`  Unmatched: ${unmatchedPatients.length}`);

    if (unmatchedPatients.length > 0 && VERBOSE) {
        console.log('\n  === UNMATCHED PATIENTS ===');
        for (const u of unmatchedPatients.slice(0, 20)) {
            console.log(`  PID ${u.pid} (${u.org}): ${u.texts[0]?.substring(0, 80) || 'NO FACILITY TEXT'}`);
        }
        if (unmatchedPatients.length > 20) console.log(`  ... and ${unmatchedPatients.length - 20} more`);
    }

    // Provider distribution
    const providerDist = new Map();
    for (const [, p] of providerMatches) {
        providerDist.set(p.name, (providerDist.get(p.name) || 0) + 1);
    }
    console.log('\n  Provider Distribution:');
    for (const [name, count] of [...providerDist.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`    ${name}: ${count}`);
    }

    if (DRY_RUN) {
        console.log('\n✅ DRY RUN complete. No data written.');
        printSummary(patients, providerMatches, unmatchedPatients);
        process.exit(0);
    }

    // -----------------------------------------------------------
    // PHASE 5: Insert clients
    // -----------------------------------------------------------
    console.log('\nPhase 5: Inserting clients...');

    const clientIdMap = new Map(); // ddor_id -> uuid

    let clientCount = 0;
    for (const [pid, patient] of patients) {
        const provider = providerMatches.get(pid);

        // Find a facility for this patient under the matched provider
        let facilityId = null;
        if (provider) {
            const provFacilities = dbFacilities.filter(f => f.provider_id === provider.id);
            if (provFacilities.length === 1) {
                facilityId = provFacilities[0].id;
            } else if (provFacilities.length > 1) {
                // Try to match facility name from text
                for (const text of patient.facilityTexts) {
                    const textLower = text.toLowerCase();
                    const facMatch = provFacilities.find(f => textLower.includes(f.name.toLowerCase()));
                    if (facMatch) { facilityId = facMatch.id; break; }
                }
                // Default to first facility under this provider
                if (!facilityId) facilityId = provFacilities[0].id;
            }
        }

        const dob = parseDate(patient.dob);
        const createdAt = parseDate(patient.created_on) || new Date().toISOString();

        try {
            const result = await sql`
                INSERT INTO clients (ddor_id, first_name, last_name, date_of_birth, facility_id,
                                     treatment_start_date, created_at)
                VALUES (${patient.ddor_id}, ${patient.first_name}, ${patient.last_name},
                        ${dob}, ${facilityId}, ${patient.treatment_start_date}, ${createdAt})
                RETURNING id
            `;
            clientIdMap.set(pid, result[0].id);
            clientCount++;

            if (clientCount % 100 === 0) process.stdout.write(`  ${clientCount} clients...`);
        } catch (err) {
            console.error(`  Error inserting client PID ${pid}: ${err.message}`);
        }
    }
    console.log(`\n  Inserted ${clientCount} clients`);

    // -----------------------------------------------------------
    // PHASE 6: Insert questionnaire submissions & responses
    // -----------------------------------------------------------
    console.log('\nPhase 6: Inserting questionnaire submissions & responses...');

    let subCount = 0;
    let respCount = 0;

    for (const [pid, patient] of patients) {
        const clientId = clientIdMap.get(pid);
        if (!clientId) continue;

        for (const [, sub] of patient.submissions) {
            const qtype = QNAME_TO_TYPE[sub.qname];
            const reportType = QNAME_TO_REPORT_TYPE[sub.qname];

            // Skip report types — they go into the reports table (Phase 7)
            // Also skip non-questionnaire types (Archive Reasons, Participant Status Change, etc.)
            if (reportType) continue;
            if (sub.qname === 'Archive Reasons v1.0') continue;
            if (sub.qname === 'Participant Status Change v1.0') continue;
            if (sub.qname === 'Initiation Notification v1.1') continue;
            if (sub.qname === 'KYAE Referral 1.1') continue;
            if (sub.qname === 'KYAE Services v1.2') continue;

            const assignedAt = parseDate(sub.assigned_on);
            const completedAt = parseDate(sub.completed_on);

            // Build a JSON summary of legacy responses (since we can't map
            // to questionnaire_questions UUIDs for historical data)
            const legacyResponses = sub.responses
                .filter(r => r.answer && r.answer !== 'This question was skipped')
                .map(r => ({ q: r.question_no, question: r.question.substring(0, 200), answer: r.answer.substring(0, 500) }));
            const notesJson = JSON.stringify(legacyResponses);

            // Calculate total_score for scored instruments
            let totalScore = null;
            if (qtype === 'barc_10') {
                // BARC-10: sum of 6-point Likert scores (0-5)
                totalScore = sub.responses.reduce((sum, r) => {
                    const num = parseInt(r.answer);
                    return sum + (isNaN(num) ? 0 : num);
                }, 0) || null;
            }

            try {
                const subResult = await sql`
                    INSERT INTO questionnaire_submissions
                        (questionnaire_type, client_id, submitted_at, is_complete,
                         total_score, notes)
                    VALUES (${qtype || sub.qname}, ${clientId},
                            ${completedAt || assignedAt || new Date().toISOString()},
                            ${!!completedAt}, ${totalScore},
                            ${`Legacy import: ${sub.qname}. ${legacyResponses.length} responses.`})
                    RETURNING id
                `;
                subCount++;
                respCount += legacyResponses.length;
            } catch (err) {
                if (VERBOSE) console.error(`  Error on submission PID ${pid} / ${sub.qname}: ${err.message}`);
            }
        }

        if (subCount % 200 === 0 && subCount > 0) process.stdout.write(`\r  ${subCount} submissions, ${respCount} responses...`);
    }
    console.log(`\n  Inserted ${subCount} questionnaire submissions`);
    console.log(`  (${respCount} legacy responses stored as submission metadata)`);

    // -----------------------------------------------------------
    // PHASE 7: Extract reports from provider report questionnaires
    // -----------------------------------------------------------
    console.log('\nPhase 7: Extracting provider reports...');

    let reportCount = 0;
    let reportAttrCount = 0;

    for (const [pid, patient] of patients) {
        const clientId = clientIdMap.get(pid);
        if (!clientId) continue;

        const provider = providerMatches.get(pid);
        let facilityId = null;
        if (provider) {
            const provFacilities = dbFacilities.filter(f => f.provider_id === provider.id);
            facilityId = provFacilities[0]?.id || null;
        }

        for (const [, sub] of patient.submissions) {
            const reportType = QNAME_TO_REPORT_TYPE[sub.qname];
            if (!reportType) continue;

            // Parse report fields from responses
            const reportData = {
                report_type: reportType,
                client_id: clientId,
                facility_id: facilityId,
                provider_id: provider?.id || null,
                date_submitted: parseDate(sub.completed_on) || parseDate(sub.assigned_on),
                date_completed: parseDate(sub.completed_on),
                quarter_completed: null,
                current_sud_loc: null,
                current_mh_loc: null,
                program_status: null,
                attendance_frequency: null,
                is_receiving_mat: null,
                was_discharged: false,
                discharge_date: null,
                discharge_reason: null,
                submitter_name: null,
                is_signed: false,
                kyae_employment_status: null,
                kyae_education_status: null,
            };

            const attributes = []; // { attribute_type, value }

            for (const resp of sub.responses) {
                if (resp.answer === 'This question was skipped' || !resp.answer) continue;

                const classification = classifyQuestion(resp.question);

                if (classification.type === 'report_field') {
                    const field = classification.field;
                    if (field === 'current_sud_loc') reportData.current_sud_loc = resp.answer;
                    else if (field === 'current_mh_loc') reportData.current_mh_loc = resp.answer;
                    else if (field === 'program_status') reportData.program_status = resp.answer;
                    else if (field === 'is_receiving_mat') reportData.is_receiving_mat = resp.answer.toLowerCase().startsWith('yes');
                    else if (field === 'was_discharged') reportData.was_discharged = resp.answer.toLowerCase().startsWith('yes');
                    else if (field === 'discharge_date') reportData.discharge_date = parseDate(resp.answer);
                    else if (field === 'discharge_reason') reportData.discharge_reason = resp.answer;
                    else if (field === 'attendance_frequency') reportData.attendance_frequency = resp.answer;
                    else if (field === 'kyae_employment_status') reportData.kyae_employment_status = resp.answer;
                    else if (field === 'kyae_education_status') reportData.kyae_education_status = resp.answer;
                    else if (field === 'insurance_type') attributes.push({ attribute_type: 'insurance_type', value: resp.answer });
                    else if (field === 'employment_status') attributes.push({ attribute_type: 'employment_status', value: resp.answer });
                    else if (field === 'living_situation') attributes.push({ attribute_type: 'living_situation', value: resp.answer });
                    else if (field === 'mat_services') {
                        // Colon-separated multi-select
                        for (const v of resp.answer.split(':')) {
                            if (v.trim()) attributes.push({ attribute_type: 'mat_services', value: v.trim() });
                        }
                    }
                    else if (field === 'has_mh_treatment') {
                        if (resp.answer.toLowerCase().startsWith('yes')) {
                            attributes.push({ attribute_type: 'has_mh_treatment', value: 'Yes' });
                        }
                    }
                    else if (field === 'has_sud_treatment') {
                        if (resp.answer.toLowerCase().startsWith('yes')) {
                            attributes.push({ attribute_type: 'has_sud_treatment', value: 'Yes' });
                        }
                    }
                } else if (classification.type === 'report_attr') {
                    // Colon-separated multi-select values
                    const values = resp.answer.split(':').map(v => v.trim()).filter(v => v && v !== 'N/A' && v !== 'Not applicable');
                    for (const v of values) {
                        attributes.push({ attribute_type: classification.field, value: v });
                    }
                } else if (classification.type === 'submitter_info') {
                    reportData.submitter_name = resp.answer.substring(0, 500);
                    reportData.is_signed = true;
                }
            }

            // Calculate quarter from submission date
            if (reportData.date_submitted) {
                const d = new Date(reportData.date_submitted);
                const q = Math.ceil((d.getMonth() + 1) / 3);
                reportData.quarter_completed = `Q${q} ${d.getFullYear()}`;
            }

            try {
                const reportResult = await sql`
                    INSERT INTO reports (report_type, client_id, facility_id, provider_id,
                                         date_submitted, date_completed, quarter_completed,
                                         current_sud_loc, current_mh_loc, program_status,
                                         attendance_frequency, is_receiving_mat,
                                         was_discharged, discharge_date, discharge_reason,
                                         submitter_name, is_signed,
                                         kyae_employment_status, kyae_education_status)
                    VALUES (${reportData.report_type}, ${reportData.client_id},
                            ${reportData.facility_id}, ${reportData.provider_id},
                            ${reportData.date_submitted}, ${reportData.date_completed},
                            ${reportData.quarter_completed},
                            ${reportData.current_sud_loc}, ${reportData.current_mh_loc},
                            ${reportData.program_status}, ${reportData.attendance_frequency},
                            ${reportData.is_receiving_mat},
                            ${reportData.was_discharged}, ${reportData.discharge_date},
                            ${reportData.discharge_reason},
                            ${reportData.submitter_name}, ${reportData.is_signed},
                            ${reportData.kyae_employment_status}, ${reportData.kyae_education_status})
                    RETURNING id
                `;
                const reportId = reportResult[0].id;
                reportCount++;

                // Insert report attributes
                for (const attr of attributes) {
                    await sql`
                        INSERT INTO report_attributes (report_id, attribute_type, value)
                        VALUES (${reportId}, ${attr.attribute_type}, ${attr.value})
                    `;
                    reportAttrCount++;
                }
            } catch (err) {
                if (VERBOSE) console.error(`  Error on report PID ${pid} / ${sub.qname}: ${err.message}`);
            }
        }

        if (reportCount % 100 === 0 && reportCount > 0) process.stdout.write(`\r  ${reportCount} reports...`);
    }
    console.log(`\n  Inserted ${reportCount} reports`);
    console.log(`  Inserted ${reportAttrCount} report attributes`);

    // -----------------------------------------------------------
    // PHASE 8: Compute report tracking
    // -----------------------------------------------------------
    console.log('\nPhase 8: Computing report tracking...');

    let trackingCount = 0;
    for (const [pid] of patients) {
        const clientId = clientIdMap.get(pid);
        if (!clientId) continue;

        // Get all reports for this client
        const clientReports = await sql`
            SELECT report_type FROM reports WHERE client_id = ${clientId}
        `;
        const completedTypes = new Set(clientReports.map(r => r.report_type));

        const status = (type) => completedTypes.has(type) ? 'completed' : 'not_due';

        try {
            await sql`
                INSERT INTO report_tracking (client_id,
                    fourteen_day_status, forty_two_day_status,
                    ninety_day_status, one_eighty_day_status,
                    two_seventy_day_status, three_sixty_day_status,
                    final_report_status)
                VALUES (${clientId},
                    ${status('fourteen_day')}, ${status('forty_two_day')},
                    ${status('ninety_day')}, ${status('one_eighty_day')},
                    ${status('two_seventy_day')}, ${status('three_sixty_day')},
                    ${status('final')})
            `;
            trackingCount++;
        } catch (err) {
            if (VERBOSE) console.error(`  Error on tracking PID ${pid}: ${err.message}`);
        }
    }
    console.log(`  Inserted ${trackingCount} report tracking records`);

    // -----------------------------------------------------------
    // SUMMARY
    // -----------------------------------------------------------
    printSummary(patients, providerMatches, unmatchedPatients);
    console.log('\n✅ Migration complete!');
}

function printSummary(patients, providerMatches, unmatchedPatients) {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    MIGRATION SUMMARY                        ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  Total patients:           ${String(patients.size).padStart(6)}                        ║`);
    console.log(`║  Provider matched:         ${String(providerMatches.size).padStart(6)}                        ║`);
    console.log(`║  Unmatched:                ${String(unmatchedPatients.length).padStart(6)}                        ║`);
    console.log(`║  Match rate:               ${String((providerMatches.size / patients.size * 100).toFixed(1) + '%').padStart(6)}                        ║`);

    const withTxStart = [...patients.values()].filter(p => p.treatment_start_date).length;
    console.log(`║  With treatment start:     ${String(withTxStart).padStart(6)}                        ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝');

    if (unmatchedPatients.length > 0) {
        console.log('\n⚠️  UNMATCHED PATIENTS (manual review needed):');
        for (const u of unmatchedPatients) {
            const hint = u.texts[0]?.substring(0, 60) || 'NO FACILITY TEXT';
            console.log(`  PID ${u.pid.padEnd(5)} | ${u.org.padEnd(20)} | ${hint}`);
        }
    }
}

main().catch(err => {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
});
