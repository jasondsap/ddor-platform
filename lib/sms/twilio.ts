/**
 * Twilio wrapper for SMS send + webhook signature validation.
 *
 * HIPAA NOTES:
 * - This integration assumes Twilio's HIPAA Eligible Service mode is enabled
 *   AND a signed BAA is in place with Anthropic Inc d/b/a Fletcher Group.
 *   Do not deploy to production until both are confirmed.
 * - Avoid putting any PHI in URL paths or query strings sent to Twilio (the
 *   tokenized consent URL contains no patient identifiers — that's by design).
 * - Twilio's debug logging may persist message bodies; configure your account
 *   to redact bodies for HIPAA compliance.
 *
 * 10DLC:
 * - Sending requires an approved Messaging Service. Use the Messaging Service
 *   SID rather than a single From number — it routes across pooled numbers and
 *   handles sticky sender automatically.
 */

import twilio, { Twilio } from 'twilio';

let _client: Twilio | null = null;

function getClient(): Twilio {
  if (_client) return _client;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set');
  }
  _client = twilio(sid, token);
  return _client;
}

/**
 * Normalize a US phone number to E.164. Accepts common formats:
 *   "(606) 356-6779", "606-356-6779", "6063566779", "+16063566779"
 *
 * Returns null if it can't be confidently coerced — caller should handle that
 * as a validation failure, NOT silently send to a wrong number.
 */
export function normalizeUsPhoneE164(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (input.trim().startsWith('+') && digits.length >= 11) return `+${digits}`;
  return null;
}

export interface SendSmsParams {
  to: string;          // E.164
  body: string;
  /** Optional override; defaults to TWILIO_MESSAGING_SERVICE_SID */
  messagingServiceSid?: string;
  /** Optional status callback URL for delivery tracking */
  statusCallback?: string;
}

export interface SendSmsResult {
  sid: string;
  status: string;
}

export async function sendSms(params: SendSmsParams): Promise<SendSmsResult> {
  const messagingServiceSid =
    params.messagingServiceSid ?? process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!messagingServiceSid) {
    throw new Error('TWILIO_MESSAGING_SERVICE_SID must be set');
  }

  const client = getClient();
  const message = await client.messages.create({
    to: params.to,
    body: params.body,
    messagingServiceSid,
    ...(params.statusCallback ? { statusCallback: params.statusCallback } : {}),
  });

  return { sid: message.sid, status: message.status };
}

/**
 * Validate an incoming Twilio webhook request.
 *
 * Twilio signs every webhook with HMAC-SHA1 using your auth token. Reject
 * any request that doesn't validate — never trust the body otherwise.
 *
 * `url` should be the EXACT public URL Twilio called, including protocol and
 * any query string. `params` should be the form-encoded body parsed to an
 * object.
 */
export function validateTwilioSignature(
  signature: string | null,
  url: string,
  params: Record<string, string>
): boolean {
  if (!signature) return false;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) {
    throw new Error('TWILIO_AUTH_TOKEN must be set for webhook validation');
  }
  return twilio.validateRequest(token, signature, url, params);
}

/**
 * Helper to render an SMS body for the consent request.
 *
 * SMS specifics:
 * - 160 chars per segment for plain GSM-7. Carriers concatenate up to 6 ish
 *   segments cleanly. Two short URLs is fine.
 * - Twilio auto-appends an opt-out footer ("Reply STOP to unsubscribe") on
 *   the first message of a conversation IF you've configured it on the
 *   Messaging Service. Don't double it up here.
 */
export function renderConsentSms(params: {
  consentText: string;
  yesUrl: string;
  noUrl: string;
  senderDisplayName: string;
}): string {
  return (
    `${params.senderDisplayName}: ${params.consentText}\n\n` +
    `YES: ${params.yesUrl}\n` +
    `NO: ${params.noUrl}`
  );
}
