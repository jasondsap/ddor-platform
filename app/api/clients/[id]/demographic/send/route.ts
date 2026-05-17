/**
 * POST /api/clients/[id]/demographic/send
 *
 * Body: { channel: 'email' | 'sms' }
 *
 * Mirrors POST /api/clients/[id]/consent/send. Auth via requireClientAccess
 * (same role/facility/county rules from lib/auth.ts).
 *
 * Returns: { success, message, invitationId, providerMessageId? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendDemographicInvite } from '@/lib/demographic-invite/sender';
import { DemographicInviteChannel } from '@/lib/demographic-invite/types';
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

    let body: { channel?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const channel = body.channel as DemographicInviteChannel | undefined;
    if (channel !== 'email' && channel !== 'sms') {
        return NextResponse.json(
            { error: "channel must be 'email' or 'sms'" },
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
        const result = await sendDemographicInvite({
            clientId,
            channel,
            sentByUserId: session.ddor.userId,
        });
        if (!result.success) {
            return NextResponse.json(result, { status: 422 });
        }
        return NextResponse.json(result, { status: 200 });
    } catch (err) {
        console.error('[demographic/send] unexpected error', {
            clientId,
            channel,
            error: err instanceof Error ? err.message : String(err),
        });
        return NextResponse.json(
            { error: 'Internal error sending demographic invitation' },
            { status: 500 }
        );
    }
}
