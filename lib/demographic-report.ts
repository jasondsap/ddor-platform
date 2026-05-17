/**
 * Single source of truth for "what does submitting a demographic report mean."
 *
 * Called from two callers:
 *   1. POST /api/reports when report_type='demographic' — the staff-driven path.
 *   2. POST /api/demographic-invitations/[token]/respond — the participant-driven
 *      path triggered by an emailed/texted link.
 *
 * Per Option C, every submission does both:
 *   1. UPDATE clients with the snapshot (canonical state for downstream queries)
 *   2. INSERT one row per non-empty field into report_attributes (audit trail
 *      preserving the exact submitted values per submission)
 *
 * Empty/missing values in the incoming body do NOT null-out existing client
 * columns. The form pre-fills from the client; if a participant clears a
 * field intentionally, today there is no way to express "clear this column"
 * — the form treats blank as "don't touch." A future "clear" affordance is
 * out of scope.
 */

import { sql, query } from '@/lib/db';

/**
 * Fields that come through the form keyed the same as the clients column.
 * These get UPDATEd onto clients if non-empty.
 *
 * NOT in this list (handled specially below):
 *   - phone_primary  → mapped to clients.phone
 *   - has_alternate_phone (Yes/No) → mapped to clients.has_alternate_phone (boolean)
 */
const CLIENT_TEXT_FIELDS = [
    // Identity
    'first_name', 'last_name', 'nickname',
    'date_of_birth', 'gender', 'race_ethnicity', 'race_other', 'veteran',
    // Address
    'street_address', 'apt_suite', 'city', 'county', 'zip',
    // Contact
    'phone_alternate', 'email', 'preferred_contact',
    // Emergency contact
    'emergency_name', 'emergency_phone', 'emergency_relation',
    // Current status
    'living_situation',
    'employment_status', 'education_level', 'enrollment_status',
    'insurance_type', 'insurance_id',
] as const;

/**
 * All form keys that should be snapshotted into report_attributes. Includes
 * the CLIENT_TEXT_FIELDS plus form-only fields not on the clients table
 * (treated_sud, treated_mh, etc).
 */
const SNAPSHOT_FIELDS = [
    ...CLIENT_TEXT_FIELDS,
    'phone_primary',
    'has_alternate_phone',
    'treated_sud',
    'treated_mh',
] as const;

export interface DemographicBody {
    first_name?: string;
    last_name?: string;
    nickname?: string;
    date_of_birth?: string;
    gender?: string;
    race_ethnicity?: string;
    race_other?: string;
    veteran?: string;
    street_address?: string;
    apt_suite?: string;
    city?: string;
    county?: string;
    zip?: string;
    phone_primary?: string;
    has_alternate_phone?: string;
    phone_alternate?: string;
    email?: string;
    preferred_contact?: string;
    emergency_name?: string;
    emergency_phone?: string;
    emergency_relation?: string;
    living_situation?: string;
    employment_status?: string;
    education_level?: string;
    enrollment_status?: string;
    insurance_type?: string;
    insurance_id?: string;
    treated_sud?: string;
    treated_mh?: string;
    [k: string]: any;
}

function isEmpty(v: any): boolean {
    return v === undefined || v === null || String(v).trim() === '';
}

function asBool(yesNo: any): boolean | null {
    if (isEmpty(yesNo)) return null;
    return String(yesNo).toLowerCase() === 'yes';
}

/**
 * Apply a demographic report submission.
 *
 * @param reportId  The freshly-inserted reports row id (becomes the FK on
 *                  each report_attributes row).
 * @param clientId  The clients.id to update.
 * @param body      Form payload, snake_case keys matching the demographic form.
 */
export async function applyDemographicReport(params: {
    reportId: string;
    clientId: string;
    body: DemographicBody;
}): Promise<void> {
    const { reportId, clientId, body } = params;

    // ---------------------------------------------------------------------
    // 1. UPDATE clients with non-empty values
    // ---------------------------------------------------------------------
    const setParts: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const formKey of CLIENT_TEXT_FIELDS) {
        const raw = body[formKey];
        if (isEmpty(raw)) continue;
        setParts.push(`${formKey} = $${idx}`);
        values.push(String(raw).trim());
        idx++;
    }

    // phone_primary → clients.phone (different name)
    if (!isEmpty(body.phone_primary)) {
        setParts.push(`phone = $${idx}`);
        values.push(String(body.phone_primary).trim());
        idx++;
    }

    // has_alternate_phone (Yes/No) → clients.has_alternate_phone (boolean)
    const hap = asBool(body.has_alternate_phone);
    if (hap !== null) {
        setParts.push(`has_alternate_phone = $${idx}`);
        values.push(hap);
        idx++;
    }

    if (setParts.length > 0) {
        setParts.push('updated_at = NOW()');
        values.push(clientId);
        await query(
            `UPDATE clients SET ${setParts.join(', ')} WHERE id = $${idx}`,
            values
        );
    }

    // ---------------------------------------------------------------------
    // 2. Snapshot every non-empty field into report_attributes (one INSERT)
    // ---------------------------------------------------------------------
    const seen = new Set<string>();
    const snapshotPairs: Array<[string, string]> = [];
    for (const key of SNAPSHOT_FIELDS) {
        if (seen.has(key)) continue;
        const raw = body[key];
        if (isEmpty(raw)) continue;
        seen.add(key);
        snapshotPairs.push([key, String(raw).trim()]);
    }

    if (snapshotPairs.length > 0) {
        const params2: any[] = [reportId];
        const rows: string[] = [];
        let i = 2;
        for (const [key, val] of snapshotPairs) {
            rows.push(`($1::uuid, $${i}, $${i + 1})`);
            params2.push(key, val);
            i += 2;
        }
        await query(
            `INSERT INTO report_attributes (report_id, attribute_type, value) VALUES ${rows.join(', ')}`,
            params2
        );
    }
}
