/**
 * POST /api/webhooks/twilio/inbound
 *
 * Twilio calls this when an inbound SMS is received on a number routed
 * through the Messaging Service. Configured at:
 *   Twilio Console > Messaging > Services > [your service] > Integration
 *   "Send a webhook" -> https://<your-domain>/api/webhooks/twilio/inbound
 *
 * STOP/START/HELP keywords:
 * Twilio's Messaging Service has built-in opt-out keyword handling and will
 * automatically reply with the configured response AND block further sends
 * to that number. We mirror the state in our DB by listening to inbound
 * messages and matching on the keyword set.
 *
 * Security: validates the Twilio HMAC signature on every request. Never
 * trust the body otherwise — the URL is public.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { revokeConsent } from '@/lib/consent/responder';
import {
  normalizeUsPhoneE164,
  validateTwilioSignature,
} from '@/lib/sms/twilio';
import {
  COMMUNICATION_CONSENT_TEXT,
  COMMUNICATION_CONSENT_VERSION,
} from '@/lib/consent/templates';

export const runtime = 'nodejs';

const STOP_KEYWORDS = new Set([
  'STOP',
  'STOPALL',
  'UNSUBSCRIBE',
  'CANCEL',
  'END',
  'QUIT',
]);

export async function POST(req: NextRequest) {
  // Twilio sends application/x-www-form-urlencoded
  const formData = await req.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    params[key] = typeof value === 'string' ? value : '';
  }

  // ---- Signature validation --------------------------------------------------
  const signature = req.headers.get('x-twilio-signature');
  // Reconstruct the exact public URL Twilio called. Behind a proxy/CDN you
  // may need to read x-forwarded-proto and x-forwarded-host instead of
  // req.nextUrl. Set TWILIO_WEBHOOK_PUBLIC_URL to override if needed.
  const url =
    process.env.TWILIO_WEBHOOK_PUBLIC_URL ??
    `${req.nextUrl.protocol}//${req.nextUrl.host}${req.nextUrl.pathname}`;

  if (!validateTwilioSignature(signature, url, params)) {
    console.warn('[twilio/inbound] signature validation failed', {
      from: params.From,
      hasSignature: !!signature,
    });
    return new NextResponse('Forbidden', { status: 403 });
  }

  // ---- Process the message ---------------------------------------------------
  const from = params.From; // E.164
  const bodyText = (params.Body ?? '').trim().toUpperCase();

  if (!from || !bodyText) {
    return twimlEmpty();
  }

  // Only act on STOP-style keywords. Other inbound messages are ignored;
  // Twilio's auto-reply for HELP is configured at the Messaging Service.
  if (!STOP_KEYWORDS.has(bodyText)) {
    return twimlEmpty();
  }

  // Find the client by phone number
  const normalized = normalizeUsPhoneE164(from);
  if (!normalized) return twimlEmpty();

  // Match on the last 10 digits to absorb formatting differences between
  // the stored phone (often "(606) 356-6779") and the E.164 inbound
  // (always "+16063566779").
  // Match on the last 10 digits to absorb formatting differences between
  // the stored phone (often "(606) 356-6779") and the E.164 inbound
  // (always "+16063566779").
  const last10 = normalized.replace(/\D/g, '').slice(-10);
  const clients = (await sql`
    SELECT id FROM clients
    WHERE phone IS NOT NULL
      AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = ${last10}
    LIMIT 1
  `) as Array<{ id: string }>;
  const client = clients[0];
  if (!client) {
    // Unknown number — Twilio still blocks sends to it on its end, we just
    // can't update our DB. Log and move on.
    console.info('[twilio/inbound] STOP from unknown number', {
      fromPrefix: from.slice(0, 5),
    });
    return twimlEmpty();
  }

  await revokeConsent({
    clientId: client.id,
    channel: 'sms',
    source: 'sms_stop',
    recipientAddress: normalized,
    consentText: COMMUNICATION_CONSENT_TEXT,
    consentVersion: COMMUNICATION_CONSENT_VERSION,
    userAgent: 'twilio-inbound-stop',
  });

  // Empty TwiML — Twilio Messaging Service will send the configured STOP
  // auto-reply itself. Don't double up.
  return twimlEmpty();
}

function twimlEmpty(): NextResponse {
  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response/>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  });
}
