import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

// GET /api/assessment-invitations/lookup/[token]
// Public endpoint — no auth required (the token IS the auth)
export async function GET(
    req: NextRequest,
    { params }: { params: { token: string } }
) {
    try {
        const invitation = await queryOne<any>(
            `SELECT * FROM assessment_invitations WHERE token = $1`,
            [params.token]
        );

        if (!invitation) {
            return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
        }

        // Check expiration
        if (new Date(invitation.expires_at) < new Date()) {
            return NextResponse.json({ error: 'This assessment link has expired. Please contact your provider for a new link.' }, { status: 410 });
        }

        // Check if already completed
        if (invitation.status === 'completed') {
            return NextResponse.json({
                error: 'This assessment has already been completed.',
                completed_at: invitation.completed_at,
                total_score: invitation.total_score,
            }, { status: 409 });
        }

        // Mark as opened
        if (invitation.status === 'sent') {
            await query(
                `UPDATE assessment_invitations SET status = 'opened', opened_at = NOW() WHERE id = $1`,
                [invitation.id]
            );
        }

        // Return assessment info (no sensitive data)
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

// POST /api/assessment-invitations/lookup/[token] — submit completed assessment
export async function POST(
    req: NextRequest,
    { params }: { params: { token: string } }
) {
    try {
        const invitation = await queryOne<any>(
            `SELECT * FROM assessment_invitations WHERE token = $1`,
            [params.token]
        );

        if (!invitation) {
            return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
        }

        if (new Date(invitation.expires_at) < new Date()) {
            return NextResponse.json({ error: 'This link has expired' }, { status: 410 });
        }

        if (invitation.status === 'completed') {
            return NextResponse.json({ error: 'Already completed' }, { status: 409 });
        }

        const body = await req.json();
        const { responses, total_score, domain_scores, notes } = body;

        if (!responses || total_score === undefined) {
            return NextResponse.json({ error: 'responses and total_score required' }, { status: 400 });
        }

        // Create questionnaire submission
        const submission = await queryOne<any>(
            `INSERT INTO questionnaire_submissions (
                questionnaire_type, client_id, submitted_at, total_score, is_complete, notes
            ) VALUES ($1, $2, NOW(), $3, true, $4)
            RETURNING *`,
            [invitation.questionnaire_type, invitation.client_id, total_score, notes || 'Submitted via participant link']
        );

        // Insert individual responses
        if (submission) {
            for (const [questionKey, answerValue] of Object.entries(responses)) {
                const numericValue = typeof answerValue === 'number' ? answerValue : null;
                await query(
                    `INSERT INTO questionnaire_responses (submission_id, question_id, answer_text, answer_numeric)
                     VALUES ($1, $2, $3, $4)`,
                    [submission.id, questionKey, String(answerValue), numericValue]
                );
            }
        }

        // Update invitation
        await query(
            `UPDATE assessment_invitations
             SET status = 'completed', completed_at = NOW(), total_score = $1, submission_id = $2
             WHERE id = $3`,
            [total_score, submission?.id, invitation.id]
        );

        // Update report tracking
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
    } catch (error) {
        console.error('Error submitting assessment:', error);
        return NextResponse.json({ error: 'Failed to submit assessment' }, { status: 500 });
    }
}
