/**
 * POST /api/demographic-invitations/[token]/respond
 *
 * No auth: the token IS the credential. The body is the demographic form
 * payload (same shape as POST /api/reports with report_type='demographic').
 *
 * Returns: { ok: true, clientId, reportId } on success,
 *          { ok: false, reason } on invalid/expired/superseded/already_completed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { respondToDemographicInvite } from '@/lib/demographic-invite/responder';

export const runtime = 'nodejs';

export async function POST(
    req: NextRequest,
    { params }: { params: { token: string } }
) {
    const token = params.token;
    if (!token) {
        return NextResponse.json({ ok: false, reason: 'not_found' }, { status: 404 });
    }

    let body: Record<string, any>;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const userAgent = req.headers.get('user-agent') || null;

    try {
        const result = await respondToDemographicInvite({ token, body, ip, userAgent });
        if (!result.ok) {
            const status =
                result.reason === 'not_found' ? 404 :
                result.reason === 'already_completed' ? 409 :
                result.reason === 'expired' ? 410 :
                result.reason === 'superseded' ? 409 : 400;
            return NextResponse.json(result, { status });
        }
        return NextResponse.json(result, { status: 200 });
    } catch (err) {
        console.error('[demographic-invitations/respond] error', {
            token: token.slice(0, 8) + '…',
            error: err instanceof Error ? err.message : String(err),
        });
        return NextResponse.json(
            { error: 'Internal error processing demographic update' },
            { status: 500 }
        );
    }
}
