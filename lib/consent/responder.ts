/**
 * Consent response handler.
 *
 * Called when a recipient clicks the AGREE/DECLINE link in their email or SMS.
 *
 * Responsibilities:
 *   1. Look up by token
 *   2. Validate state (must be 'pending', not expired, not superseded)
 *   3. Record the response with IP/UA for audit
 *   4. Flip client cached status
 *   5. Write audit_log entry
 *
 * Idempotency: if the same token is hit twice, the second call returns
 * 'already_responded'. We don't change the recorded response — first click
 * wins. (User-experience-wise the page just shows them their existing state.)
 */

import { sql, logAuditEvent } from '@/lib/db';
import {
  ConsentChannel,
  ConsentResponseInput,
  ConsentResponseResult,
  ConsentStatus,
} from '@/lib/consent/types';

interface ConsentRecordLookup {
  id: string;
  client_id: string;
  channel: ConsentChannel;
  status: ConsentStatus;
  expires_at: Date;
}

export async function respondToConsent(
  input: ConsentResponseInput
): Promise<ConsentResponseResult> {
  const { token, action, ip, userAgent } = input;

  // 1. Lookup
  const rows = (await sql`
    SELECT id, client_id, channel, status, expires_at
    FROM consent_records
    WHERE token = ${token}
    LIMIT 1
  `) as ConsentRecordLookup[];
  const record = rows[0];
  if (!record) return { ok: false, reason: 'not_found' };

  // 2. State checks
  if (record.status === 'granted' || record.status === 'declined') {
    return { ok: false, reason: 'already_responded' };
  }
  if (record.status === 'superseded') {
    return { ok: false, reason: 'superseded' };
  }
  if (record.status === 'expired' || new Date(record.expires_at) < new Date()) {
    // Lazy-expire if past due
    if (record.status !== 'expired') {
      await sql`UPDATE consent_records SET status = 'expired' WHERE id = ${record.id}`;
    }
    return { ok: false, reason: 'expired' };
  }

  // 3. Record the response. Use the cached status column matching the channel.
  const newStatus: 'granted' | 'declined' =
    action === 'grant' ? 'granted' : 'declined';

  await sql.transaction([
    sql`
      UPDATE consent_records
      SET status = ${newStatus},
          responded_at = now(),
          response_ip = ${ip},
          response_user_agent = ${userAgent}
      WHERE id = ${record.id}
    `,
    record.channel === 'email'
      ? sql`
          UPDATE clients
          SET email_consent_status = ${newStatus},
              email_consent_granted_at = CASE
                WHEN ${newStatus} = 'granted' THEN now()
                ELSE email_consent_granted_at
              END
          WHERE id = ${record.client_id}
        `
      : sql`
          UPDATE clients
          SET sms_consent_status = ${newStatus},
              sms_consent_granted_at = CASE
                WHEN ${newStatus} = 'granted' THEN now()
                ELSE sms_consent_granted_at
              END
          WHERE id = ${record.client_id}
        `,
  ]);

  // 4. Audit. Recipient is not a logged-in user, so user_id is null.
  //    The client_id is captured in newValues so it's queryable per-participant.
  await logAuditEvent(
    null,
    `consent_${record.channel}_${newStatus}`,
    'consent_records',
    record.id,
    { status: 'pending' },
    {
      status: newStatus,
      channel: record.channel,
      client_id: record.client_id,
    },
    ip ?? undefined
  );

  return { ok: true, channel: record.channel, status: newStatus };
}

/**
 * Revoke an existing granted consent. Used for:
 *   - Inbound STOP keyword on SMS (Twilio webhook)
 *   - Email List-Unsubscribe one-click
 *   - Manual admin revocation
 *
 * This creates a new consent_records row with status='revoked' so the audit
 * trail is preserved, and flips the client cache.
 */
export async function revokeConsent(params: {
  clientId: string;
  channel: ConsentChannel;
  source: 'sms_stop' | 'email_unsubscribe' | 'admin';
  recipientAddress: string;
  consentText: string;
  consentVersion: string;
  /** Optional: Cognito userId if revocation was admin-initiated */
  initiatedByUserId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const inserted = await sql.transaction([
    sql`
      INSERT INTO consent_records (
        client_id, channel, status, token, recipient_address,
        consent_text, consent_version, responded_at, response_ip,
        response_user_agent, expires_at
      ) VALUES (
        ${params.clientId},
        ${params.channel},
        'revoked',
        encode(gen_random_bytes(32), 'base64'),
        ${params.recipientAddress},
        ${params.consentText},
        ${params.consentVersion},
        now(),
        ${params.ip ?? null},
        ${params.userAgent ?? `revocation:${params.source}`},
        now()
      )
      RETURNING id
    `,
    params.channel === 'email'
      ? sql`
          UPDATE clients
          SET email_consent_status = 'revoked',
              email_consent_revoked_at = now()
          WHERE id = ${params.clientId}
        `
      : sql`
          UPDATE clients
          SET sms_consent_status = 'revoked',
              sms_consent_revoked_at = now()
          WHERE id = ${params.clientId}
        `,
  ]);

  const recordId = (inserted[0] as Array<{ id: string }>)[0]?.id;

  await logAuditEvent(
    params.initiatedByUserId ?? null,
    `consent_${params.channel}_revoked`,
    'consent_records',
    recordId,
    { status: 'granted' },
    {
      status: 'revoked',
      channel: params.channel,
      client_id: params.clientId,
      source: params.source,
    },
    params.ip ?? undefined
  );
}
