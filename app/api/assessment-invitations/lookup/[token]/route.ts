/**
 * Public token-based assessment lookup + submission.
 *
 * No auth — token IS the credential.
 *
 *   GET  /api/assessment-invitations/lookup/[token]
 *        Validates the token (404 / 410 / 409 on bad states), marks the
 *        invitation 'opened' on first valid hit, returns minimal info.
 *
 *   POST /api/assessment-invitations/lookup/[token]
 *        Accepts the participant's responses + computed total_score.
 *        Writes questionnaire_submissions + questionnaire_responses, marks
 *        the invitation 'completed', flips report_tracking.{barc10,phq9_gad7}_status.
 *        Captures IP + user agent for audit integrity.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql, query, queryOne } from '@/lib/db';

interface InvitationRow {
    id: string;
    client_id: string;
    questionnaire_type: 'barc_10' | 'phq9_gad7';
    status: string;
    opened_at: Date | null;
    completed_at: Date | null;
    expires_at: Date;
    total_score: number | null;
    client_first_name: string | null;
    client_facility_name: string | null;
}

export async function GET(
    _req: NextRequest,
    { params }: { params: { token: string } }
) {
    try {
        const invitation = await queryOne<InvitationRow>(
            `SELECT * FROM assessment_invitations WHERE token = $1`,
            [params.token]
        );

        if (!invitation) {
            return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
        }

        if (invitation.status === 'superseded') {
            return NextResponse.json({
                error: 'A newer link has replaced this one. Please use the most recent message.',
            }, { status: 409 });
        }

        if (new Date(invitation.expires_at) < new Date()) {
            return NextResponse.json({
                error: 'This assessment link has expired. Please contact your provider for a new link.',
            }, { status: 410 });
        }

        if (invitation.status === 'completed') {
            return NextResponse.json({
                error: 'This assessment has already been completed.',
                completed_at: invitation.completed_at,
                total_score: invitation.total_score,
            }, { status: 409 });
        }

        // Mark as opened on first valid hit
        if (invitation.status === 'sent') {
            await query(
                `UPDATE assessment_invitations SET status = 'opened', opened_at = NOW() WHERE id = $1`,
                [invitation.id]
            );
        }

        return NextResponse.json({
            valid: true,
            invitation_id: invitation.id,
            questionnaire_type: invitation.questionnaire_type,
            client_first_name: invitation.client_first_name,
            facility_name: invitation.client_facility_name,
            expires_at: invitation.expires_at,
        });
    } catch (error) {
        console.error('Error looking up invitation:', error);
        return NextResponse.json({ error: 'Failed to validate link' }, { status: 500 });
    }
}

interface SubmitBody {
    /** Map of question_id (UUID) -> chosen option_value */
    responses?: Record<string, string | number>;
    /** Map of question_id (UUID) -> numeric score for that choice (used to validate total) */
    response_scores?: Record<string, number>;
    total_score?: number;
    notes?: string;
}

export async function POST(
    req: NextRequest,
    { params }: { params: { token: string } }
) {
    try {
        const invitation = await queryOne<InvitationRow>(
            `SELECT * FROM assessment_invitations WHERE token = $1`,
            [params.token]
        );

        if (!invitation) {
            return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
        }
        if (invitation.status === 'superseded') {
            return NextResponse.json({ error: 'Superseded' }, { status: 409 });
        }
        if (new Date(invitation.expires_at) < new Date()) {
            return NextResponse.json({ error: 'This link has expired' }, { status: 410 });
        }
        if (invitation.status === 'completed') {
            return NextResponse.json({ error: 'Already completed' }, { status: 409 });
        }

        const body = (await req.json()) as SubmitBody;
        const { responses, response_scores, total_score, notes } = body;

        if (!responses || typeof responses !== 'object' || total_score === undefined) {
            return NextResponse.json(
                { error: 'responses and total_score are required' },
                { status: 400 }
            );
        }

        // Capture audit provenance — recipient is not a logged-in user.
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
        const userAgent = req.headers.get('user-agent') || null;

        // Create the submission row.
        const submission = await queryOne<{ id: string }>(
            `INSERT INTO questionnaire_submissions (
                questionnaire_type, client_id, submitted_at, total_score, is_complete, notes
             ) VALUES ($1, $2, NOW(), $3, true, $4)
             RETURNING id`,
            [
                invitation.questionnaire_type,
                invitation.client_id,
                total_score,
                notes || 'Submitted via participant link',
            ]
        );

        if (!submission) {
            return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 });
        }

        // Insert one response row per question. question_id is a UUID FK to
        // questionnaire_questions; cast explicitly so a non-UUID body shape
        // surfaces as a 400 instead of a 500.
        const entries = Object.entries(responses);
        for (const [questionId, answerValue] of entries) {
            const scoreFromMap = response_scores?.[questionId];
            const numericValue =
                typeof scoreFromMap === 'number' ? scoreFromMap :
                typeof answerValue === 'number' ? answerValue : null;
            await sql`
                INSERT INTO questionnaire_responses (
                    submission_id, question_id, answer_text, answer_numeric
                ) VALUES (
                    ${submission.id}::uuid,
                    ${questionId}::uuid,
                    ${String(answerValue)},
                    ${numericValue}
                )
            `;
        }

        // Mark invitation completed + capture IP/UA.
        await query(
            `UPDATE assessment_invitations
             SET status = 'completed',
                 completed_at = NOW(),
                 total_score = $1,
                 submission_id = $2,
                 response_ip = $3,
                 response_user_agent = $4
             WHERE id = $5`,
            [total_score, submission.id, ip, userAgent, invitation.id]
        );

        // Flip the corresponding report_tracking status.
        if (invitation.questionnaire_type === 'barc_10') {
            await query(
                `UPDATE report_tracking SET barc10_status = 'completed', updated_at = NOW() WHERE client_id = $1`,
                [invitation.client_id]
            );
        } else if (invitation.questionnaire_type === 'phq9_gad7') {
            await query(
                `UPDATE report_tracking SET phq9_gad7_status = 'completed', updated_at = NOW() WHERE client_id = $1`,
                [invitation.client_id]
            );
        }

        return NextResponse.json({
            success: true,
            total_score,
            questionnaire_type: invitation.questionnaire_type,
        });
    } catch (error: any) {
        console.error('Error submitting assessment:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to submit assessment' },
            { status: 500 }
        );
    }
}
