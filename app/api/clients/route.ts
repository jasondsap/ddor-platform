import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAdmin, getUserId } from '@/lib/auth';
import { query, queryOne, insert, update, logAuditEvent } from '@/lib/db';

// GET /api/clients — list clients scoped by facility/role
export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth();
        const { role, facilityId, userId } = session.ddor;
        const { searchParams } = new URL(req.url);

        const facilityFilter = searchParams.get('facility_id');
        const search = searchParams.get('search');
        const includeArchived = searchParams.get('include_archived') === 'true';
        const status = searchParams.get('status'); // 'active', 'archived', 'all'

        let sql = `
            SELECT
                c.*,
                f.name AS facility_name,
                p.name AS provider_name,
                p.abbreviation AS provider_abbreviation,
                rt.fourteen_day_status,
                rt.kyae_referral_status,
                rt.forty_two_day_status,
                rt.barc10_status,
                rt.phq9_gad7_status,
                rt.ninety_day_status,
                rt.one_eighty_day_status,
                rt.two_seventy_day_status,
                rt.three_sixty_day_status,
                rt.final_report_status
            FROM clients c
            LEFT JOIN facilities f ON c.facility_id = f.id
            LEFT JOIN providers p ON f.provider_id = p.id
            LEFT JOIN report_tracking rt ON rt.client_id = c.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramIdx = 1;

        // Archive filter
        if (status === 'archived') {
            sql += ` AND c.is_archived = true`;
        } else if (status !== 'all' && !includeArchived) {
            sql += ` AND c.is_archived = false`;
        }

        // Role-based scoping
        if (isAdmin(session)) {
            if (facilityFilter) {
                sql += ` AND c.facility_id = $${paramIdx}`;
                params.push(facilityFilter);
                paramIdx++;
            }
        } else if (role === 'navigator') {
            sql += ` AND f.county_id IN (
                SELECT county_id FROM user_counties WHERE user_id = $${paramIdx}::uuid
            )`;
            params.push(userId);
            paramIdx++;
        } else {
            sql += ` AND c.facility_id = $${paramIdx}`;
            params.push(facilityId);
            paramIdx++;
        }

        // Search
        if (search && search.length >= 2) {
            sql += ` AND (
                c.first_name ILIKE $${paramIdx} OR
                c.last_name ILIKE $${paramIdx} OR
                c.ddor_id ILIKE $${paramIdx}
            )`;
            params.push(`%${search}%`);
            paramIdx++;
        }

        sql += ` ORDER BY c.last_name, c.first_name`;

        const clients = await query(sql, params);
        return NextResponse.json({ clients });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error fetching clients:', error);
        return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }
}

// All status columns on report_tracking. New rows start at 'pending'.
// Schema defaults handle this too (see migrations/0XX_report_tracking_defaults.sql)
// but we set them explicitly here as a second layer of defense, AND the
// schema migration's dynamic DO block catches any *_status column we
// don't know about by name. So even if this list is incomplete, inserts
// still succeed once the migration has been run.
const TRACKING_DEFAULTS = {
    fourteen_day_status: 'pending',
    forty_two_day_status: 'pending',
    ninety_day_status: 'pending',
    one_eighty_day_status: 'pending',
    two_seventy_day_status: 'pending',
    three_sixty_day_status: 'pending',
    final_report_status: 'pending',
    final_provider_status: 'pending',  // Distinct from final_report_status — both are NOT NULL on the schema
    kyae_referral_status: 'pending',
    barc10_status: 'pending',
    phq9_gad7_status: 'pending',
};

// POST /api/clients — create a new client
//
// Two callers:
//   1. Manual creation (e.g. admin add): body has client fields directly.
//   2. Create-from-referral: body has { referral_id }, optionally with overrides.
//      Server fetches the referral, merges its fields into the insert, then
//      links the referral back to the new client via referrals.client_id.
//      This is what makes the originating-county JOIN on the client detail
//      page work — it queries `WHERE r.client_id = $1`, so the link must exist.
//
// Always creates the report_tracking row with all status columns set to 'pending'.
export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        const body = await req.json();
        const { referral_id, ...overrides } = body;

        // If creating from a referral, fetch its data and validate.
        let referralData: any = null;
        if (referral_id) {
            referralData = await queryOne(
                `SELECT * FROM referrals WHERE id = $1`,
                [referral_id]
            );
            if (!referralData) {
                return NextResponse.json({ error: 'Referral not found' }, { status: 404 });
            }
            if (referralData.client_id) {
                return NextResponse.json({
                    error: 'This referral is already linked to a client',
                    existing_client_id: referralData.client_id,
                }, { status: 409 });
            }
        }

        // Merge: explicit overrides win, then referral data, then defaults.
        // Fields commented "—" don't have a referral source and stay null until
        // the provider fills them in later through the client edit form.
        const merged = {
            first_name:           overrides.first_name           ?? referralData?.first_name           ?? null,
            last_name:            overrides.last_name            ?? referralData?.last_name            ?? null,
            email:                overrides.email                ?? referralData?.email                ?? null,
            phone:                overrides.phone                ?? referralData?.phone                ?? null,
            date_of_birth:        overrides.date_of_birth        ?? referralData?.date_of_birth        ?? null,
            gender:               overrides.gender               ?? referralData?.gender               ?? null,
            alternate_contact:    overrides.alternate_contact    ?? referralData?.alternate_contact    ?? null,
            eligibility_status:   overrides.eligibility_status   ?? referralData?.eligibility          ?? null,
            // facility_id: a referral hasn't picked a facility yet, so that path
            // sends null and the column is nullable. The manual-create path
            // (no referral_id) defaults to the user's facility — preserves
            // existing behavior where providers create their own clients.
            facility_id:          overrides.facility_id          ?? (referral_id ? null : session.ddor.facilityId ?? null),
            zip:                  overrides.zip                  ?? null,  // —
            diagnosis:            overrides.diagnosis            ?? null,  // —
            secondary_diagnosis:  overrides.secondary_diagnosis  ?? null,  // —
            has_oud:              overrides.has_oud              ?? false, // —
            ddor_id:              overrides.ddor_id              ?? null,  // —
            treatment_start_date: overrides.treatment_start_date ?? null,  // — (set later, e.g. on 14-Day report)
            agreement_signed_date: overrides.agreement_signed_date ?? null,// —
            agreement_length_days: overrides.agreement_length_days ?? null,// —
            insurance_status:     overrides.insurance_status     ?? null,  // — (referral.has_insurance is Yes/No, not the same as insurance type)
            notes:                overrides.notes                ?? null,
        };

        if (!merged.first_name || !merged.last_name) {
            return NextResponse.json({ error: 'first_name and last_name are required' }, { status: 400 });
        }

        // 1. Insert the client row
        const client = await insert('clients', merged);
        const newClientId = (client as any).id;

        // 2. Insert the tracking row with all status columns explicitly defaulted
        //    to 'pending'. Will succeed whether or not schema defaults are in place.
        await insert('report_tracking', {
            client_id: newClientId,
            ...TRACKING_DEFAULTS,
        });

        // 3. If created from a referral, link the referral row back to the new client.
        //    The originating-county JOIN on the client detail page depends on this.
        if (referral_id) {
            await update('referrals', { client_id: newClientId }, { id: referral_id });
        }

        await logAuditEvent(
            getUserId(session),
            'create',
            'clients',
            newClientId,
            undefined,
            {
                first_name: merged.first_name,
                last_name: merged.last_name,
                facility_id: merged.facility_id,
                from_referral_id: referral_id || undefined,
            }
        );

        return NextResponse.json({ success: true, client });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error creating client:', error);
        // Surface the actual error message so the UI can show something useful
        // instead of a generic "Failed to create client".
        return NextResponse.json({
            error: error?.message || 'Failed to create client',
        }, { status: 500 });
    }
}
