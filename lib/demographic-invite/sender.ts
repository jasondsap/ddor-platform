/**
 * Send a demographic-update invitation to a participant via email or SMS.
 *
 * Mirrors lib/consent/sender.ts. Differences:
 *   - One CTA (no grant/decline duality)
 *   - Writes to demographic_invitations table, not consent_records
 *   - Does not touch client cached-consent columns
 *   - Reuses the same Twilio + Resend wrappers
 *
 * Each new send for the same client+channel supersedes any prior pending
 * invitation for that pair. The old token stops working immediately.
 */

import { randomBytes } from 'node:crypto';
import { createElement } from 'react';
import { render as renderEmail } from '@react-email/render';
import { sql, logAuditEvent } from '@/lib/db';
import { SENDER_DISPLAY_NAME } from '@/lib/consent/templates';
import { normalizeUsPhoneE164, sendSms } from '@/lib/sms/twilio';
import { sendEmail } from '@/lib/email/resend';
import { DemographicInviteEmail } from '@/emails/DemographicInviteEmail';
import {
    SendDemographicInviteInput,
    SendDemographicInviteResult,
} from '@/lib/demographic-invite/types';

function generateToken(): string {
    return randomBytes(32).toString('base64url');
}

function buildInviteUrl(token: string): string {
    const base = process.env.CONSENT_BASE_URL;
    if (!base) throw new Error('CONSENT_BASE_URL must be set');
    const root = base.endsWith('/') ? base.slice(0, -1) : base;
    return `${root}/demographic/invite/${token}`;
}

function redactAddress(address: string, channel: 'email' | 'sms'): string {
    if (channel === 'sms') {
        const digits = address.replace(/\D/g, '');
        return `***-***-${digits.slice(-4)}`;
    }
    const at = address.indexOf('@');
    if (at <= 0) return '***';
    return `***@${address.slice(at + 1)}`;
}

/**
 * SMS body. Twilio's Messaging Service appends the STOP footer automatically
 * if configured; don't double it up here.
 */
function renderDemographicInviteSms(params: {
    inviteUrl: string;
    senderDisplayName: string;
}): string {
    return (
        `${params.senderDisplayName}: please review and update your information at the link below.\n\n` +
        params.inviteUrl
    );
}

function renderDemographicInviteEmailText(params: {
    inviteUrl: string;
    senderDisplayName: string;
}): string {
    return [
        params.senderDisplayName,
        '',
        'Please review your information',
        '',
        "We'd like to make sure the information we have on file for you is current.",
        'Open the link below to review and update your contact details, address,',
        'and other information whenever convenient.',
        '',
        params.inviteUrl,
        '',
        'If you did not expect this message, you can safely ignore it.',
        'The link will expire in 30 days.',
    ].join('\n');
}

interface ClientRow {
    id: string;
    first_name: string | null;
    email: string | null;
    phone: string | null;
}

export async function sendDemographicInvite(
    input: SendDemographicInviteInput
): Promise<SendDemographicInviteResult> {
    const { clientId, channel, sentByUserId } = input;

    // 1. Load client basics
    const clientRows = (await sql`
        SELECT id, first_name, email, phone
        FROM clients
        WHERE id = ${clientId}
        LIMIT 1
    `) as ClientRow[];
    const client = clientRows[0];
    if (!client) {
        return {
            invitationId: '',
            channel,
            success: false,
            message: 'Client not found.',
        };
    }

    // 2. Resolve recipient address
    let recipientAddress: string;
    if (channel === 'email') {
        if (!client.email || !client.email.includes('@')) {
            return {
                invitationId: '',
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
                invitationId: '',
                channel,
                success: false,
                message: 'Client has no valid phone number on file.',
            };
        }
        recipientAddress = e164;
    }

    // 3. Generate token
    const token = generateToken();

    // 4. Transactionally supersede prior pending + insert new row
    const inserted = await sql.transaction([
        sql`
            UPDATE demographic_invitations
            SET status = 'superseded'
            WHERE client_id = ${clientId}
              AND channel = ${channel}
              AND status = 'pending'
        `,
        sql`
            INSERT INTO demographic_invitations (
                client_id, channel, status, token, recipient_address, sent_by
            ) VALUES (
                ${clientId}, ${channel}, 'pending', ${token}, ${recipientAddress}, ${sentByUserId}::uuid
            )
            RETURNING id
        `,
    ]);
    const invitationId = (inserted[1] as Array<{ id: string }>)[0].id;

    // 5. Send via chosen channel
    const inviteUrl = buildInviteUrl(token);
    let providerMessageId: string;

    try {
        if (channel === 'sms') {
            const body = renderDemographicInviteSms({
                inviteUrl,
                senderDisplayName: SENDER_DISPLAY_NAME,
            });
            const result = await sendSms({
                to: recipientAddress,
                body,
                statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL,
            });
            providerMessageId = result.sid;
            await sql`
                UPDATE demographic_invitations
                SET sent_at = now(),
                    send_provider_message_id = ${providerMessageId},
                    send_status = ${result.status}
                WHERE id = ${invitationId}
            `;
        } else {
            const html = await renderEmail(
                createElement(DemographicInviteEmail, {
                    inviteUrl,
                    senderDisplayName: SENDER_DISPLAY_NAME,
                    recipientFirstName: client.first_name ?? undefined,
                })
            );
            const text = renderDemographicInviteEmailText({
                inviteUrl,
                senderDisplayName: SENDER_DISPLAY_NAME,
            });
            const result = await sendEmail({
                to: recipientAddress,
                subject: `Please update your information — ${SENDER_DISPLAY_NAME}`,
                html,
                text,
            });
            providerMessageId = result.id;
            await sql`
                UPDATE demographic_invitations
                SET sent_at = now(),
                    send_provider_message_id = ${providerMessageId},
                    send_status = 'sent'
                WHERE id = ${invitationId}
            `;
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown send error';
        await sql`
            UPDATE demographic_invitations
            SET send_status = 'failed',
                send_error = ${message}
            WHERE id = ${invitationId}
        `;
        await logAuditEvent(
            sentByUserId,
            `demographic_invite_${channel}_send_failed`,
            'demographic_invitations',
            invitationId,
            undefined,
            {
                channel,
                recipient_redacted: redactAddress(recipientAddress, channel),
                error: message,
            }
        );
        return {
            invitationId,
            channel,
            success: false,
            message: `Send failed: ${message}`,
        };
    }

    // 6. Audit the successful send
    await logAuditEvent(
        sentByUserId,
        `demographic_invite_${channel}_sent`,
        'demographic_invitations',
        invitationId,
        undefined,
        {
            channel,
            recipient_redacted: redactAddress(recipientAddress, channel),
            provider_message_id: providerMessageId,
        }
    );

    return {
        invitationId,
        channel,
        success: true,
        message:
            channel === 'sms'
                ? 'Demographic update link sent. The participant will receive an SMS shortly.'
                : 'Demographic update email sent. Delivery typically takes under a minute.',
        providerMessageId,
    };
}
