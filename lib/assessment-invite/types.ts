/**
 * Shared types for the assessment-invitation flow.
 *
 * Mirrors lib/demographic-invite/types.ts. Differences:
 *   - questionnaireType discriminator (BARC-10 vs PHQ-9 + GAD-7)
 *   - 7-day expiry (per CLAUDE.md — assessments are milestone-tied)
 */

export type AssessmentInviteChannel = 'email' | 'sms';

export type AssessmentInviteStatus =
    | 'sent'
    | 'opened'
    | 'completed'
    | 'expired'
    | 'superseded';

/**
 * Vocabulary used by the existing assessment_invitations table and the
 * questionnaire_* tables. 'phq9_gad7' is a single invitation covering BOTH
 * questionnaires rendered together — 17 items total.
 */
export type QuestionnaireType = 'barc_10' | 'phq9_gad7';

export const QUESTIONNAIRE_LABELS: Record<QuestionnaireType, string> = {
    barc_10: 'BARC-10',
    phq9_gad7: 'PHQ-9 and GAD-7',
};

export interface SendAssessmentInviteInput {
    clientId: string;
    questionnaireType: QuestionnaireType;
    channel: AssessmentInviteChannel;
    /** Internal user UUID of the staff member initiating the send */
    sentByUserId: string;
}

export interface SendAssessmentInviteResult {
    invitationId: string;
    channel: AssessmentInviteChannel;
    questionnaireType: QuestionnaireType;
    success: boolean;
    message: string;
    providerMessageId?: string;
}
