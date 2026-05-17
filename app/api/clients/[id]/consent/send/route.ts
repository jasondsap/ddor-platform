/**
 * POST /api/clients/[id]/consent/send
 *
 * Body: { channel: 'email' | 'sms' }
 *
 * Auth/Authz: uses requireClientAccess(clientId) which:
 *   - Throws 'Unauthorized' if no session
 *   - Throws 'Client not found' if client doesn't exist
 *   - Throws 'Facility access denied' if user can't access this client's facility
 *   - Returns full DDORSession on success (super_admin/business_user bypass
 *     the facility check; navigators are checked against assigned counties;
 *     provider staff are checked against their facility + additional facilities)
 *
 * The internal user UUID for audit recording is session.ddor.userId.
 *
 * Returns: { success, message, consentRecordId, providerMessageId? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendConsent } from '@/lib/consent/sender';
import { ConsentChannel } from '@/lib/consent/types';
import { validateUUID } from '@/lib/db';
import { requireClientAccess } from '@/lib/auth';

export const runtime = 'nodejs'; // Node runtime required (twilio SDK, crypto)

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // ---- Input validation ------------------------------------------------------
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

  const channel = body.channel as ConsentChannel | undefined;
  if (channel !== 'email' && channel !== 'sms') {
    return NextResponse.json(
      { error: "channel must be 'email' or 'sms'" },
      { status: 400 }
    );
  }

  // ---- Auth + per-client authorization ---------------------------------------
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

  // ---- Send ------------------------------------------------------------------
  try {
    const result = await sendConsent({
      clientId,
      channel,
      sentByUserId: session.ddor.userId,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 422 });
    }
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    // Never leak full error details to the client (could contain provider
    // tokens or PHI). Log server-side, return a generic message.
    console.error('[consent/send] unexpected error', {
      clientId,
      channel,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: 'Internal error sending consent request' },
      { status: 500 }
    );
  }
}
