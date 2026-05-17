/**
 * Send an assessment-completion invitation to a participant via email or SMS.
 *
 * Mirrors lib/demographic-invite/sender.ts. Differences:
 *   - Three-way supersede match: (client_id, questionnaire_type, channel)
 *   - Writes to assessment_invitations (existing table)
 *   - 7-day expiry (kept from existing default — per CLAUDE.md, assessments
 *     are milestone-tied so a long expiry is undesirable)
 *   - Email/SMS copy varies by questionnaire label
 */

import { randomBytes } from 'node:crypto';
import { createElement } from 'react';
import { render as renderEmail } from '@react-email/render';
import { sql, logAuditEvent } from '@/lib/db';
import { SENDER_DISPLAY_NAME } from '@/lib/consent/templates';
import { normalizeUsPhoneE164, sendSms } from '@/lib/sms/twilio';
import { sendEmail } from '@/lib/email/resend';
import { AssessmentInviteEmail } from '@/emails/AssessmentInviteEmail';
import {
    QUESTIONNAIRE_LABELS,
    SendAssessmentInviteInput,
    SendAssessmentInviteResult,
} from '@/lib/assessment-invite/types';

function generateToken(): string {
    return randomBytes(32).toString('base64url');
}

function buildInviteUrl(token: string): string {
    const base = process.env.CONSENT_BASE_URL;
    if (!base) throw new Error('CONSENT_BASE_URL must be set');
    const root = base.endsWith('/') ? base.slice(0, -1) : base;
    return `${root}/assessment/${token}`;
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

function renderAssessmentInviteSms(params: {
    inviteUrl: string;
    senderDisplayName: string;
    questionnaireLabel: string;
}): string {
    return (
        `${params.senderDisplayName}: please complete your ${params.questionnaireLabel} check-in at the link below.\n\n` +
        params.inviteUrl
    );
}

function renderAssessmentInviteEmailText(params: {
    inviteUrl: string;
    senderDisplayName: string;
    questionnaireLabel: string;
}): string {
    return [
        params.senderDisplayName,
        '',
        `Please complete your ${params.questionnaireLabel} check-in`,
        '',
        'Your provider has asked you to complete a brief questionnaire as part of',
        'your care plan. It takes about 5 minutes.',
        '',
        params.inviteUrl,
        '',
        'If you did not expect this message, you can safely ignore it.',
        'The link expires in 7 days.',
    ].join('\n');
}

interface ClientRow {
    id: string;
    first_name: string | null;
    email: string | null;
    phone: string | null;
    facility_name: string | null;
}

export async function sendAssessmentInvite(
    input: SendAssessmentInviteInput
): Promise<SendAssessmentInviteResult> {
    const { clientId, questionnaireType, channel, sentByUserId } = input;
    const questionnaireLabel = QUESTIONNAIRE_LABELS[questionnaireType];

    // 1. Load client + facility name (snapshot fields on assessment_invitations)
    const clientRows = (await sql`
        SELECT c.id, c.first_name, c.email, c.phone, f.name AS facility_name
        FROM clients c
        LEFT JOIN facilities f ON c.facility_id = f.id
        WHERE c.id = ${clientId}
        LIMIT 1
    `) as ClientRow[];
    const client = clientRows[0];
    if (!client) {
        return {
            invitationId: '', channel, questionnaireType,
            success: false, message: 'Client not found.',
        };
    }

    // 2. Resolve recipient address
    let recipientAddress: string;
    if (channel === 'email') {
        if (!client.email || !client.email.includes('@')) {
            return {
                invitationId: '', channel, questionnaireType,
                success: false, message: 'Client has no valid email address on file.',
            };
        }
        recipientAddress = client.email;
    } else {
        const e164 = normalizeUsPhoneE164(client.phone);
        if (!e164) {
            return {
                invitationId: '', channel, questionnaireType,
                success: false, message: 'Client has no valid phone number on file.',
            };
        }
        recipientAddress = e164;
    }

    // 3. Generate token
    const token = generateToken();

    // 4. Transactional supersede prior pending + insert new row.
    //    delivery_method on this table mirrors the channel param. We map
    //    channel='sms' → 'text' to stay consistent with the existing 'text'
    //    default on assessment_invitations.delivery_method.
    const deliveryMethod = channel === 'sms' ? 'text' : 'email';
    const inserted = await sql.transaction([
        sql`
            UPDATE assessment_invitations
            SET status = 'superseded'
            WHERE client_id = ${clientId}
              AND questionnaire_type = ${questionnaireType}
              AND delivery_method = ${deliveryMethod}
              AND status IN ('sent', 'opened')
        `,
        sql`
            INSERT INTO assessment_invitations (
                token, client_id, questionnaire_type, delivery_method, sent_to,
                sent_by, client_first_name, client_facility_name, status
            ) VALUES (
                ${token}, ${clientId}, ${questionnaireType}, ${deliveryMethod}, ${recipientAddress},
                ${sentByUserId}::uuid, ${client.first_name ?? ''}, ${client.facility_name ?? null}, 'sent'
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
            const body = renderAssessmentInviteSms({
                inviteUrl,
                senderDisplayName: SENDER_DISPLAY_NAME,
                questionnaireLabel,
            });
            const result = await sendSms({
                to: recipientAddress,
                body,
                statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL,
            });
            providerMessageId = result.sid;
            await sql`
                UPDATE assessment_invitations
                SET send_provider_message_id = ${providerMessageId},
                    send_status = ${result.status}
                WHERE id = ${invitationId}
            `;
        } else {
            const html = await renderEmail(
                createElement(AssessmentInviteEmail, {
                    inviteUrl,
                    senderDisplayName: SENDER_DISPLAY_NAME,
                    questionnaireLabel,
                    recipientFirstName: client.first_name ?? undefined,
                })
            );
            const text = renderAssessmentInviteEmailText({
                inviteUrl,
                senderDisplayName: SENDER_DISPLAY_NAME,
                questionnaireLabel,
            });
            const result = await sendEmail({
                to: recipientAddress,
                subject: `Please complete your ${questionnaireLabel} check-in — ${SENDER_DISPLAY_NAME}`,
                html,
                text,
            });
            providerMessageId = result.id;
            await sql`
                UPDATE assessment_invitations
                SET send_provider_message_id = ${providerMessageId},
                    send_status = 'sent'
                WHERE id = ${invitationId}
            `;
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown send error';
        await sql`
            UPDATE assessment_invitations
            SET send_status = 'failed',
                send_error = ${message}
            WHERE id = ${invitationId}
        `;
        await logAuditEvent(
            sentByUserId,
            `assessment_invite_${channel}_send_failed`,
            'assessment_invitations',
            invitationId,
            undefined,
            {
                channel,
                questionnaire_type: questionnaireType,
                recipient_redacted: redactAddress(recipientAddress, channel),
                error: message,
            }
        );
        return {
            invitationId, channel, questionnaireType,
            success: false, message: `Send failed: ${message}`,
        };
    }

    await logAuditEvent(
        sentByUserId,
        `assessment_invite_${channel}_sent`,
        'assessment_invitations',
        invitationId,
        undefined,
        {
            channel,
            questionnaire_type: questionnaireType,
            recipient_redacted: redactAddress(recipientAddress, channel),
            provider_message_id: providerMessageId,
        }
    );

    return {
        invitationId, channel, questionnaireType,
        success: true,
        message:
            channel === 'sms'
                ? `${questionnaireLabel} link sent. The participant will receive an SMS shortly.`
                : `${questionnaireLabel} email sent. Delivery typically takes under a minute.`,
        providerMessageId,
    };
}
