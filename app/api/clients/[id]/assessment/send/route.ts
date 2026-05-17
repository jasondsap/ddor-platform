/**
 * POST /api/clients/[id]/assessment/send
 *
 * Body: { channel: 'email' | 'sms', questionnaire_type: 'barc_10' | 'phq9_gad7' }
 *
 * Mirrors POST /api/clients/[id]/demographic/send. Auth via requireClientAccess.
 *
 * Returns: { success, message, invitationId, questionnaireType, providerMessageId? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendAssessmentInvite } from '@/lib/assessment-invite/sender';
import {
    AssessmentInviteChannel,
    QuestionnaireType,
} from '@/lib/assessment-invite/types';
import { validateUUID } from '@/lib/db';
import { requireClientAccess } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const clientId = params.id;
    if (!clientId || !validateUUID(clientId)) {
        return NextResponse.json({ error: 'Invalid client id' }, { status: 400 });
    }

    let body: { channel?: string; questionnaire_type?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const channel = body.channel as AssessmentInviteChannel | undefined;
    if (channel !== 'email' && channel !== 'sms') {
        return NextResponse.json(
            { error: "channel must be 'email' or 'sms'" },
            { status: 400 }
        );
    }

    const questionnaireType = body.questionnaire_type as QuestionnaireType | undefined;
    if (questionnaireType !== 'barc_10' && questionnaireType !== 'phq9_gad7') {
        return NextResponse.json(
            { error: "questionnaire_type must be 'barc_10' or 'phq9_gad7'" },
            { status: 400 }
        );
    }

    let session;
    try {
        session = await requireClientAccess(clientId);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unauthorized';
        const status =
            message === 'Client not found' ? 404 :
            message === 'Facility access denied' ? 403 : 401;
        return NextResponse.json({ error: message }, { status });
    }

    try {
        const result = await sendAssessmentInvite({
            clientId,
            questionnaireType,
            channel,
            sentByUserId: session.ddor.userId,
        });
        if (!result.success) {
            return NextResponse.json(result, { status: 422 });
        }
        return NextResponse.json(result, { status: 200 });
    } catch (err) {
        console.error('[assessment/send] unexpected error', {
            clientId,
            questionnaireType,
            channel,
            error: err instanceof Error ? err.message : String(err),
        });
        return NextResponse.json(
            { error: 'Internal error sending assessment invitation' },
            { status: 500 }
        );
    }
}
