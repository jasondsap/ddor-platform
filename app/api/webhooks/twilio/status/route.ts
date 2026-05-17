/**
 * POST /api/webhooks/twilio/status
 *
 * Twilio calls this with delivery status updates for messages we sent.
 * Configured via the statusCallback URL on each outbound message AND/OR at
 * the Messaging Service level.
 *
 * Statuses we'll see (in order): queued -> sending -> sent -> delivered
 *                                                   \-> undelivered (failed)
 *                                                   \-> failed
 *
 * We match by MessageSid -> consent_records.send_provider_message_id and
 * update send_status accordingly. This is informational only; the legal
 * status flips happen on user response, not delivery.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { validateTwilioSignature } from '@/lib/sms/twilio';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = typeof value === 'string' ? value : '';
  });

  const signature = req.headers.get('x-twilio-signature');
  const url =
    process.env.TWILIO_STATUS_WEBHOOK_PUBLIC_URL ??
    `${req.nextUrl.protocol}//${req.nextUrl.host}${req.nextUrl.pathname}`;

  if (!validateTwilioSignature(signature, url, params)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const messageSid = params.MessageSid;
  const messageStatus = params.MessageStatus;
  const errorCode = params.ErrorCode || null;

  if (!messageSid || !messageStatus) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  await sql`
    UPDATE consent_records
    SET send_status = ${messageStatus},
        send_error = CASE
          WHEN ${errorCode} IS NOT NULL THEN ${`Twilio error ${errorCode}`}
          ELSE send_error
        END
    WHERE send_provider_message_id = ${messageSid}
  `;

  return NextResponse.json({ ok: true }, { status: 200 });
}
