/**
 * Shared types for the demographic-invitation flow.
 *
 * This mirrors lib/consent/types.ts at structural level so future invite
 * types (assessments etc.) can copy this folder verbatim and adjust.
 */

export type DemographicInviteChannel = 'email' | 'sms';

export type DemographicInviteStatus =
    | 'pending'
    | 'completed'
    | 'expired'
    | 'superseded';

export interface SendDemographicInviteInput {
    clientId: string;
    channel: DemographicInviteChannel;
    /** Internal user UUID of the staff member initiating the send */
    sentByUserId: string;
}

export interface SendDemographicInviteResult {
    invitationId: string;
    channel: DemographicInviteChannel;
    /** false if recipient address missing/invalid or comm provider failed */
    success: boolean;
    /** Human-readable message safe to display in the staff UI */
    message: string;
    /** When success, the provider's message id (Twilio SID or Resend id) */
    providerMessageId?: string;
}

export interface DemographicInviteRespondInput {
    token: string;
    body: Record<string, any>;
    ip: string | null;
    userAgent: string | null;
}

export type DemographicInviteRespondResult =
    | { ok: true; clientId: string; reportId: string }
    | { ok: false; reason: 'not_found' | 'already_completed' | 'expired' | 'superseded' };
