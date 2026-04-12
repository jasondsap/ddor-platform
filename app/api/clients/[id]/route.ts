import { NextRequest, NextResponse } from 'next/server';
import { requireClientAccess, getUserId } from '@/lib/auth';
import { queryOne, query, update, logAuditEvent } from '@/lib/db';

// GET /api/clients/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await requireClientAccess(params.id);

        const client = await queryOne(
            `SELECT
                c.*,
                f.name AS facility_name,
                p.name AS provider_name,
                p.id AS provider_id,
                p.abbreviation AS provider_abbreviation,
                rt.*,
                (c.treatment_start_date + INTERVAL '14 days')::DATE - CURRENT_DATE AS fourteen_day_days_remaining,
                (c.treatment_start_date + INTERVAL '42 days')::DATE - CURRENT_DATE AS forty_two_day_days_remaining,
                (c.treatment_start_date + INTERVAL '90 days')::DATE - CURRENT_DATE AS ninety_day_days_remaining,
                (c.treatment_start_date + INTERVAL '180 days')::DATE - CURRENT_DATE AS one_eighty_day_days_remaining,
                (c.treatment_start_date + INTERVAL '270 days')::DATE - CURRENT_DATE AS two_seventy_day_days_remaining,
                (c.treatment_start_date + INTERVAL '360 days')::DATE - CURRENT_DATE AS three_sixty_day_days_remaining
            FROM clients c
            LEFT JOIN facilities f ON c.facility_id = f.id
            LEFT JOIN providers p ON f.provider_id = p.id
            LEFT JOIN report_tracking rt ON rt.client_id = c.id
            WHERE c.id = $1`,
            [params.id]
        );

        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        // Get referral info
        const referral = await queryOne(
            `SELECT r.*, cn.first_name || ' ' || cn.last_name AS navigator_name
             FROM referrals r
             LEFT JOIN users cn ON r.case_navigator_id = cn.id
             WHERE r.client_id = $1`,
            [params.id]
        );

        // Get reports
        const reports = await query(
            `SELECT * FROM reports WHERE client_id = $1 ORDER BY date_submitted DESC`,
            [params.id]
        );

        // Get questionnaire submissions
        const questionnaires = await query(
            `SELECT qs.*, qd.name AS questionnaire_name
             FROM questionnaire_submissions qs
             LEFT JOIN questionnaire_definitions qd ON qs.questionnaire_type = qd.questionnaire_type
             WHERE qs.client_id = $1
             ORDER BY qs.submitted_at DESC`,
            [params.id]
        );

        return NextResponse.json({ client, referral, reports, questionnaires });
    } catch (error: any) {
        if (error.message === 'Unauthorized' || error.message === 'Facility access denied') {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        console.error('Error fetching client:', error);
        return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
    }
}

// PATCH /api/clients/[id] — update client
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await requireClientAccess(params.id);
        const body = await req.json();

        // Only allow updating specific fields
        const allowedFields = [
            'first_name', 'last_name', 'email', 'phone', 'date_of_birth',
            'gender', 'zip', 'alternate_contact', 'facility_id', 'diagnosis',
            'secondary_diagnosis', 'has_oud', 'eligibility_status', 'ddor_id',
            'treatment_start_date', 'agreement_signed_date', 'agreement_end_date',
            'agreement_length_days', 'is_archived', 'archive_reason',
            'archive_requested_date', 'archived_date', 'is_mia', 'insurance_status',
            'notes',
        ];

        const updateData: Record<string, unknown> = {};
        for (const key of allowedFields) {
            if (body[key] !== undefined) {
                updateData[key] = body[key];
            }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const result = await update('clients', updateData, { id: params.id });

        await logAuditEvent(
            getUserId(session),
            'update',
            'clients',
            params.id,
            undefined,
            updateData
        );

        return NextResponse.json({ success: true, client: result[0] });
    } catch (error: any) {
        if (error.message === 'Unauthorized' || error.message === 'Facility access denied') {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        console.error('Error updating client:', error);
        return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
    }
}
