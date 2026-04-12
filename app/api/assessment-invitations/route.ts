import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireClientAccess, getUserId } from '@/lib/auth';
import { query, insert, queryOne, logAuditEvent } from '@/lib/db';
import crypto from 'crypto';

// GET /api/assessment-invitations — list invitations for a client
export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth();
        const { searchParams } = new URL(req.url);
        const clientId = searchParams.get('client_id');

        if (!clientId) {
            return NextResponse.json({ error: 'client_id required' }, { status: 400 });
        }

        await requireClientAccess(clientId);

        const invitations = await query(
            `SELECT * FROM assessment_invitations
             WHERE client_id = $1
             ORDER BY created_at DESC`,
            [clientId]
        );

        return NextResponse.json({ invitations });
    } catch (error: any) {
        if (error.message === 'Unauthorized' || error.message === 'Facility access denied') {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        console.error('Error fetching invitations:', error);
        return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }
}

// POST /api/assessment-invitations — create and send an invitation
export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        const body = await req.json();

        const { client_id, questionnaire_type, delivery_method } = body;

        if (!client_id || !questionnaire_type) {
            return NextResponse.json({ error: 'client_id and questionnaire_type required' }, { status: 400 });
        }

        if (!['barc_10', 'phq9_gad7'].includes(questionnaire_type)) {
            return NextResponse.json({ error: 'questionnaire_type must be barc_10 or phq9_gad7' }, { status: 400 });
        }

        await requireClientAccess(client_id);

        // Get client info
        const client = await queryOne<any>(
            `SELECT c.*, f.name AS facility_name
             FROM clients c
             LEFT JOIN facilities f ON c.facility_id = f.id
             WHERE c.id = $1`,
            [client_id]
        );

        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        const method = delivery_method || 'text';
        const sentTo = method === 'email' ? client.email : client.phone;

        if (!sentTo) {
            return NextResponse.json({
                error: `Client has no ${method === 'email' ? 'email address' : 'phone number'} on file`
            }, { status: 400 });
        }

        // Generate secure token
        const token = crypto.randomBytes(32).toString('hex');

        // Create invitation
        const invitation = await insert('assessment_invitations', {
            token,
            client_id,
            questionnaire_type,
            delivery_method: method,
            sent_to: sentTo,
            sent_by: getUserId(session),
            client_first_name: client.first_name,
            client_facility_name: client.facility_name || null,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        });

        // Build the assessment URL
        const portalBaseUrl = process.env.PARTICIPANT_PORTAL_URL || 'http://localhost:3001';
        const assessmentUrl = `${portalBaseUrl}/assess/${token}`;

        // TODO: Send via Resend (email) or SMS provider (text)
        // For now, return the URL so it can be manually shared
        // When Resend/SMS is configured, this will auto-send

        const typeName = questionnaire_type === 'barc_10' ? 'BARC-10' : 'PHQ-9/GAD-7';

        await logAuditEvent(
            getUserId(session),
            'create',
            'assessment_invitations',
            (invitation as any).id,
            undefined,
            { questionnaire_type, delivery_method: method, client_id }
        );

        return NextResponse.json({
            success: true,
            invitation,
            assessment_url: assessmentUrl,
            message: `${typeName} assessment link created for ${client.first_name}. ${
                method === 'email'
                    ? `Email will be sent to ${sentTo}`
                    : `Text will be sent to ${sentTo}`
            }`,
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized' || error.message === 'Facility access denied') {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        console.error('Error creating invitation:', error);
        return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }
}
