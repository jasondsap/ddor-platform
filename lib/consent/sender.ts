/**
 * Core consent send logic.
 *
 * Responsibilities:
 *   1. Validate the client has the required address for the channel
 *   2. Supersede any existing pending request for the same client+channel
 *   3. Snapshot the consent text + version
 *   4. Generate a cryptographically random token (32 bytes -> base64url)
 *   5. Insert the consent_records row inside a transaction
 *   6. Send via Twilio (SMS) or Resend (email)
 *   7. Update send_status / send_provider_message_id
 *   8. Update clients.{channel}_consent_status to 'pending' IFF not already 'granted'
 *   9. Write audit_log entry
 *
 * Idempotency: callers should not retry blindly. If send fails after the row
 * is inserted, the row remains with send_status='failed' and a new attempt
 * creates a fresh record (the failed one ends up superseded).
 */

import { randomBytes } from 'node:crypto';
import { createElement } from 'react';
import { sql, logAuditEvent } from '@/lib/db';
import { render as renderEmail } from '@react-email/render';
import {
  getCommunicationConsentText,
  SENDER_DISPLAY_NAME,
} from '@/lib/consent/templates';
import {
  SendConsentInput,
  SendConsentResult,
} from '@/lib/consent/types';
import {
  normalizeUsPhoneE164,
  renderConsentSms,
  sendSms,
} from '@/lib/sms/twilio';
import {
  renderConsentEmailText,
  sendEmail,
} from '@/lib/email/resend';
import { ConsentRequestEmail } from '@/emails/ConsentRequestEmail';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function generateToken(): string {
  // 32 random bytes -> base64url -> 43 chars, URL-safe, ~256 bits of entropy
  return randomBytes(32).toString('base64url');
}

function buildConsentUrl(token: string, action: 'grant' | 'decline'): string {
  const base = process.env.CONSENT_BASE_URL;
  if (!base) throw new Error('CONSENT_BASE_URL must be set');
  // Trim trailing slash if present
  const root = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${root}/consent/${token}?action=${action}`;
}

/**
 * Redact a contact address for audit logs. We log enough to investigate
 * (last 4 of phone, domain of email) without persisting full PHI in the
 * audit table.
 */
function redactAddress(address: string, channel: 'email' | 'sms'): string {
  if (channel === 'sms') {
    const digits = address.replace(/\D/g, '');
    return `***-***-${digits.slice(-4)}`;
  }
  const at = address.indexOf('@');
  if (at <= 0) return '***';
  return `***@${address.slice(at + 1)}`;
}

interface ClientRow {
  id: string;
  first_name: string | null;
  email: string | null;
  phone: string | null;
  email_consent_status: string;
  sms_consent_status: string;
}

// ----------------------------------------------------------------------------
// Main entry point
// ----------------------------------------------------------------------------

export async function sendConsent(
  input: SendConsentInput
): Promise<SendConsentResult> {
  const { clientId, channel, sentByUserId } = input;

  // 1. Load the client
  const clientRows = (await sql`
    SELECT id, first_name, email, phone,
           email_consent_status, sms_consent_status
    FROM clients
    WHERE id = ${clientId}
    LIMIT 1
  `) as ClientRow[];
  const client = clientRows[0];
  if (!client) {
    return {
      consentRecordId: '',
      channel,
      success: false,
      message: 'Client not found.',
    };
  }

  // 2. Resolve and validate the recipient address for the channel
  let recipientAddress: string;
  if (channel === 'email') {
    if (!client.email || !client.email.includes('@')) {
      return {
        consentRecordId: '',
        channel,
        success: false,
        message: 'Client has no valid email address on file.',
      };
    }
    recipientAddress = client.email;
  } else {
    const e164 = normalizeUsPhoneE164(client.phone);
    if (!e164) {
      return {
        consentRecordId: '',
        channel,
        success: false,
        message: 'Client has no valid phone number on file.',
      };
    }
    recipientAddress = e164;
  }

  // 3. Snapshot consent text and version
  const { text: consentText, version: consentVersion } =
    getCommunicationConsentText();

  // 4. Generate token
  const token = generateToken();

  // 5. Transactionally supersede prior pending and insert new row
  const inserted = await sql.transaction([
    sql`
      UPDATE consent_records
      SET status = 'superseded'
      WHERE client_id = ${clientId}
        AND channel = ${channel}
        AND status = 'pending'
    `,
    sql`
      INSERT INTO consent_records (
        client_id, channel, status, token, recipient_address,
        consent_text, consent_version, sent_by
      ) VALUES (
        ${clientId}, ${channel}, 'pending', ${token}, ${recipientAddress},
        ${consentText}, ${consentVersion}, ${sentByUserId}
      )
      RETURNING id
    `,
  ]);
  const consentRecordId = (inserted[1] as Array<{ id: string }>)[0].id;

  // 6. Send via the chosen channel
  const yesUrl = buildConsentUrl(token, 'grant');
  const noUrl = buildConsentUrl(token, 'decline');

  let providerMessageId: string;
  try {
    if (channel === 'sms') {
      const body = renderConsentSms({
        consentText,
        yesUrl,
        noUrl,
        senderDisplayName: SENDER_DISPLAY_NAME,
      });
      const result = await sendSms({
        to: recipientAddress,
        body,
        statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL,
      });
      providerMessageId = result.sid;
      await sql`
        UPDATE consent_records
        SET sent_at = now(),
            send_provider_message_id = ${providerMessageId},
            send_status = ${result.status}
        WHERE id = ${consentRecordId}
      `;
    } else {
      const html = await renderEmail(
        createElement(ConsentRequestEmail, {
          consentText,
          yesUrl,
          noUrl,
          senderDisplayName: SENDER_DISPLAY_NAME,
          recipientFirstName: client.first_name ?? undefined,
        })
      );
      const text = renderConsentEmailText({
        consentText,
        yesUrl,
        noUrl,
        senderDisplayName: SENDER_DISPLAY_NAME,
      });
      const result = await sendEmail({
        to: recipientAddress,
        subject: `Permission request from ${SENDER_DISPLAY_NAME}`,
        html,
        text,
        listUnsubscribeUrl: noUrl,
      });
      providerMessageId = result.id;
      await sql`
        UPDATE consent_records
        SET sent_at = now(),
            send_provider_message_id = ${providerMessageId},
            send_status = 'sent'
        WHERE id = ${consentRecordId}
      `;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown send error';
    await sql`
      UPDATE consent_records
      SET send_status = 'failed',
          send_error = ${message}
      WHERE id = ${consentRecordId}
    `;

    // Audit the failure (HIPAA: track unsuccessful disclosure attempts too)
    await logAuditEvent(
      sentByUserId,
      `consent_${channel}_send_failed`,
      'consent_records',
      consentRecordId,
      undefined,
      {
        channel,
        recipient_redacted: redactAddress(recipientAddress, channel),
        error: message,
      }
    );

    return {
      consentRecordId,
      channel,
      success: false,
      message: `Send failed: ${message}`,
    };
  }

  // 7. Update client cached status to 'pending' UNLESS already granted.
  //    Granted state is sticky; a pending re-confirmation does not lose
  //    existing consent until the recipient explicitly responds.
  const currentStatus =
    channel === 'email' ? client.email_consent_status : client.sms_consent_status;

  if (currentStatus !== 'granted') {
    if (channel === 'email') {
      await sql`UPDATE clients SET email_consent_status = 'pending' WHERE id = ${clientId}`;
    } else {
      await sql`UPDATE clients SET sms_consent_status = 'pending' WHERE id = ${clientId}`;
    }
  }

  // 8. Audit the successful send (no PHI: only redacted recipient + version)
  await logAuditEvent(
    sentByUserId,
    `consent_${channel}_sent`,
    'consent_records',
    consentRecordId,
    undefined,
    {
      channel,
      consent_version: consentVersion,
      recipient_redacted: redactAddress(recipientAddress, channel),
      provider_message_id: providerMessageId,
    }
  );

  return {
    consentRecordId,
    channel,
    success: true,
    message:
      channel === 'sms'
        ? 'Consent text sent. The participant will receive an SMS shortly.'
        : 'Consent email sent. Delivery typically takes under a minute.',
    providerMessageId,
  };
}
