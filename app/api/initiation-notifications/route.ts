import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserId } from '@/lib/auth';
import { query, insert, logAuditEvent } from '@/lib/db';
import { notifyInitiation } from '@/lib/email';

// GET /api/initiation-notifications — list recent notifications
export async function GET(req: NextRequest) {
    try {
        await requireAuth();
        const { searchParams } = new URL(req.url);
        const clientId = searchParams.get('client_id');

        let sql = `
            SELECT r.*, c.first_name, c.last_name
            FROM reports r
            JOIN clients c ON r.client_id = c.id
            WHERE r.report_type = 'initiation_notification'
        `;
        const params: any[] = [];
        let paramIdx = 1;

        if (clientId) {
            sql += ` AND r.client_id = $${paramIdx}`;
            params.push(clientId);
            paramIdx++;
        }

        sql += ` ORDER BY r.created_at DESC LIMIT 50`;

        const notifications = await query(sql, params);
        return NextResponse.json({ notifications });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Error fetching initiation notifications:', error);
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }
}

// POST /api/initiation-notifications — submit initiation notification
export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        const body = await req.json();

        const { client_id, participant_action, scheduled_date, treatment_initiation_date, level_of_care, facility_county, submitter_email, notes } = body;

        if (!client_id) {
            return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
        }

        if (!participant_action) {
            return NextResponse.json({ error: 'Please select what the participant did' }, { status: 400 });
        }

        // Get client info
        const clientRows = await query(
            `SELECT c.*, f.name AS facility_name, f.provider_id FROM clients c LEFT JOIN facilities f ON c.facility_id = f.id WHERE c.id = $1`,
            [client_id]
        );
        if (clientRows.length === 0) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }
        const client = clientRows[0] as any;

        // Create the report record
        const report = await insert('reports', {
            report_type: 'initiation_notification',
            client_id,
            facility_id: client.facility_id,
            provider_id: client.provider_id,
            submitted_by: getUserId(session),
            date_submitted: new Date().toISOString(),
            submitter_email: submitter_email || null,
            notes: notes || null,
            is_signed: true,
            signature_date: new Date().toISOString().split('T')[0],
        });

        const reportId = (report as any).id;

        // Store form-specific fields as report attributes
        await insert('report_attributes', { report_id: reportId, attribute_type: 'participant_action', value: participant_action });

        if (level_of_care) {
            await insert('report_attributes', { report_id: reportId, attribute_type: 'level_of_care', value: level_of_care });
        }
        if (facility_county) {
            await insert('report_attributes', { report_id: reportId, attribute_type: 'facility_county', value: facility_county });
        }
        if (scheduled_date) {
            await insert('report_attributes', { report_id: reportId, attribute_type: 'scheduled_date', value: scheduled_date });
        }
        if (treatment_initiation_date) {
            await insert('report_attributes', { report_id: reportId, attribute_type: 'treatment_initiation_date', value: treatment_initiation_date });
        }

        // CRITICAL: If treatment was initiated, update the client's treatment_start_date
        // This is what kicks off the entire report due date timeline
        if (participant_action === 'initiated_treatment' && treatment_initiation_date) {
            await query(
                `UPDATE clients SET treatment_start_date = $1, updated_at = NOW() WHERE id = $2`,
                [treatment_initiation_date, client_id]
            );

            // Also create report_tracking if it doesn't exist
            const existing = await query(
                `SELECT id FROM report_tracking WHERE client_id = $1`,
                [client_id]
            );
            if (existing.length === 0) {
                await insert('report_tracking', { client_id });
            }
        }

        await logAuditEvent(
            getUserId(session),
            'create',
            'reports',
            reportId,
            undefined,
            { report_type: 'initiation_notification', client_id, participant_action, treatment_initiation_date }
        );

        // Send email notification (non-blocking)
        try {
            notifyInitiation({
                clientName: `${client.first_name} ${client.last_name}`,
                clientId: client_id,
                ddorId: client.ddor_id,
                facilityName: client.facility_name,
                providerName: '',
                reportType: 'initiation_notification',
                reportTypeLabel: 'Initiation Notification',
                submitterName: session.user?.name || '',
                submitterEmail: submitter_email,
                dateSubmitted: new Date().toLocaleDateString(),
                participantAction: participant_action,
                treatmentDate: treatment_initiation_date || scheduled_date,
                levelOfCare: level_of_care,
            });
        } catch (emailErr) {
            console.error('[Email] Non-blocking notification error:', emailErr);
        }

        return NextResponse.json({
            success: true,
            report,
            treatment_date_set: participant_action === 'initiated_treatment' && !!treatment_initiation_date,
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        console.error('Error creating initiation notification:', error);
        return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
    }
}
