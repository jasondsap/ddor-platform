import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAdmin, getUserId } from '@/lib/auth';
import { query, insert, logAuditEvent } from '@/lib/db';

// GET /api/referrals
export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth();
        const { role, facilityId, userId } = session.ddor;
        const { searchParams } = new URL(req.url);

        const status = searchParams.get('status'); // 'open', 'closed', 'all'
        const countyId = searchParams.get('county_id');
        const search = searchParams.get('search');
        const assessorStatus = searchParams.get('assessor_status');
        const referralStatus = searchParams.get('referral_type_status');

        let sql = `
            SELECT
                r.*,
                co.name AS county_name,
                sa.first_name || ' ' || sa.last_name AS assessor_name,
                cn.first_name || ' ' || cn.last_name AS navigator_name,
                f.name AS recommended_facility_name,
                c.id AS linked_client_id,
                c.first_name || ' ' || c.last_name AS linked_client_name
            FROM referrals r
            LEFT JOIN counties co ON r.originating_county_id = co.id
            LEFT JOIN users sa ON r.state_assessor_id = sa.id
            LEFT JOIN users cn ON r.case_navigator_id = cn.id
            LEFT JOIN facilities f ON r.provider_recommendation_id = f.id
            LEFT JOIN clients c ON r.client_id = c.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramIdx = 1;

        // Status filter
        if (status === 'open') {
            sql += ` AND r.referral_type_status != 'closed'`;
        } else if (status === 'closed') {
            sql += ` AND r.referral_type_status = 'closed'`;
        }

        // Role-based scoping
        if (role === 'navigator') {
            // Navigators see referrals in their counties
            sql += ` AND r.originating_county_id IN (
                SELECT county_id FROM user_counties WHERE user_id = $${paramIdx}::uuid
            )`;
            params.push(userId);
            paramIdx++;
        } else if (!isAdmin(session)) {
            // Providers see referrals recommended to their facility
            sql += ` AND r.provider_recommendation_id = $${paramIdx}`;
            params.push(facilityId);
            paramIdx++;
        }

        if (countyId) {
            sql += ` AND r.originating_county_id = $${paramIdx}`;
            params.push(countyId);
            paramIdx++;
        }

        if (search && search.length >= 2) {
            sql += ` AND (r.first_name ILIKE $${paramIdx} OR r.last_name ILIKE $${paramIdx})`;
            params.push(`%${search}%`);
            paramIdx++;
        }

        if (assessorStatus) {
            sql += ` AND r.assessor_status = $${paramIdx}`;
            params.push(assessorStatus);
            paramIdx++;
        }

        if (referralStatus) {
            sql += ` AND r.referral_type_status = $${paramIdx}`;
            params.push(referralStatus);
            paramIdx++;
        }

        sql += ` ORDER BY r.is_urgent DESC, r.date_received DESC NULLS LAST, r.created_at DESC`;

        const referrals = await query(sql, params);

        // Get counties for filter dropdown
        const counties = await query(`SELECT DISTINCT co.id, co.name FROM referrals r JOIN counties co ON r.originating_county_id = co.id WHERE co.name IS NOT NULL ORDER BY co.name`);

        return NextResponse.json({ referrals, counties });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error fetching referrals:', error);
        return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 });
    }
}

// POST /api/referrals — create a new referral
export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        const body = await req.json();

        if (!body.first_name || !body.last_name) {
            return NextResponse.json({ error: 'first_name and last_name required' }, { status: 400 });
        }

        const referral = await insert('referrals', {
            first_name: body.first_name,
            last_name: body.last_name,
            date_of_birth: body.date_of_birth || null,
            gender: body.gender || null,
            phone: body.phone || null,
            alternate_contact: body.alternate_contact || null,
            originating_county_id: body.originating_county_id || null,
            residence_county: body.residence_county || null,
            location_at_referral: body.location_at_referral || null,
            jail_at_referral: body.jail_at_referral || false,
            jail_contact_instructions: body.jail_contact_instructions || null,
            date_received: body.date_received || null,
            referral_date: body.referral_date || null,
            court_date: body.court_date || null,
            assessor_status: body.assessor_status || 'pending',
            eligibility: body.eligibility || null,
            referral_type_status: body.referral_type_status || 'open_within_72_hours',
            case_navigator_id: body.case_navigator_id || null,
            provider_recommendation_id: body.provider_recommendation_id || null,
            loc_recommendation: body.loc_recommendation || null,
            initial_housing: body.initial_housing || null,
            has_insurance: body.has_insurance || null,
            is_urgent: body.is_urgent || false,
            urgent_message: body.urgent_message || null,
            smi_symptoms: body.smi_symptoms || false,
            tbi_abi: body.tbi_abi || false,
            major_medical_issues: body.major_medical_issues || false,
            prior_participant: body.prior_participant || null,
            notes: body.notes || null,
            case_navigator_name: body.case_navigator_name || null,
            case_navigator_email: body.case_navigator_email || null,
            created_by: getUserId(session),
        });

        // Insert multi-value attributes (charges, etc.)
        if (body.sb90_charges && Array.isArray(body.sb90_charges)) {
            for (const charge of body.sb90_charges) {
                await insert('referral_attributes', {
                    referral_id: (referral as any).id,
                    attribute_type: 'sb90_charge',
                    value: charge,
                });
            }
        }

        // Insert substance charges
        if (body.sb90_substance_charges && Array.isArray(body.sb90_substance_charges)) {
            for (const charge of body.sb90_substance_charges) {
                await insert('referral_attributes', {
                    referral_id: (referral as any).id,
                    attribute_type: 'sb90_substance_charge',
                    value: charge,
                });
            }
        }

        // Insert reassessment reasons
        if (body.reassessment_reasons && Array.isArray(body.reassessment_reasons)) {
            for (const reason of body.reassessment_reasons) {
                await insert('referral_attributes', {
                    referral_id: (referral as any).id,
                    attribute_type: 'reassessment_reason',
                    value: reason,
                });
            }
        }

        await logAuditEvent(
            getUserId(session),
            'create',
            'referrals',
            (referral as any).id,
            undefined,
            { first_name: body.first_name, last_name: body.last_name }
        );

        return NextResponse.json({ success: true, referral });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error creating referral:', error);
        return NextResponse.json({ error: 'Failed to create referral' }, { status: 500 });
    }
}
