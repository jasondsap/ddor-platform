import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireClientAccess, getUserId } from '@/lib/auth';
import { query, insert, logAuditEvent } from '@/lib/db';

// GET /api/questionnaires/[type] — get questions + options for a questionnaire type
export async function GET(req: NextRequest, { params }: { params: { type: string } }) {
    try {
        await requireAuth();
        const qType = params.type;

        const questions = await query(
            `SELECT q.*, 
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', ao.id,
                            'option_value', ao.option_value,
                            'display_label', ao.display_label,
                            'display_order', ao.display_order,
                            'score_value', ao.score_value
                        ) ORDER BY ao.display_order
                    ) FILTER (WHERE ao.id IS NOT NULL),
                    '[]'::json
                ) AS options
            FROM questionnaire_questions q
            LEFT JOIN questionnaire_answer_options ao ON ao.question_id = q.id AND ao.is_active = true
            WHERE q.questionnaire_type = $1 AND q.is_active = true
            GROUP BY q.id
            ORDER BY q.display_order`,
            [qType]
        );

        const definition = await query(
            `SELECT * FROM questionnaire_definitions WHERE questionnaire_type = $1`,
            [qType]
        );

        return NextResponse.json({
            definition: definition[0] || null,
            questions,
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error fetching questionnaire:', error);
        return NextResponse.json({ error: 'Failed to fetch questionnaire' }, { status: 500 });
    }
}

// POST /api/questionnaires/[type] — submit a completed questionnaire
export async function POST(req: NextRequest, { params }: { params: { type: string } }) {
    try {
        const session = await requireAuth();
        const body = await req.json();
        const qType = params.type;

        const { client_id, referral_id, responses, total_score, notes } = body;

        if (!responses || typeof responses !== 'object') {
            return NextResponse.json({ error: 'responses object required' }, { status: 400 });
        }

        // Verify access if client_id provided
        if (client_id) {
            await requireClientAccess(client_id);
        }

        // Create submission
        const submission = await insert('questionnaire_submissions', {
            questionnaire_type: qType,
            client_id: client_id || null,
            referral_id: referral_id || null,
            submitted_by: getUserId(session),
            total_score: total_score ?? null,
            is_complete: true,
            notes: notes || null,
            submitted_at: new Date().toISOString(),
        });

        const submissionId = (submission as any).id;

        // Insert individual responses
        for (const [questionId, answerValue] of Object.entries(responses)) {
            const numericValue = typeof answerValue === 'number' ? answerValue : null;
            const textValue = typeof answerValue === 'string' ? answerValue : String(answerValue);

            await insert('questionnaire_responses', {
                submission_id: submissionId,
                question_id: questionId,
                answer_text: textValue,
                answer_numeric: numericValue,
            });
        }

        // Update report tracking if this is a BARC-10 or PHQ-9/GAD-7 linked to a client
        if (client_id) {
            if (qType === 'barc_10') {
                await query(
                    `UPDATE report_tracking SET barc10_status = 'completed', updated_at = NOW() WHERE client_id = $1`,
                    [client_id]
                );
            } else if (qType === 'phq9_gad7') {
                await query(
                    `UPDATE report_tracking SET phq9_gad7_status = 'completed', updated_at = NOW() WHERE client_id = $1`,
                    [client_id]
                );
            }
        }

        await logAuditEvent(
            getUserId(session),
            'create',
            'questionnaire_submissions',
            submissionId,
            undefined,
            { questionnaire_type: qType, client_id, total_score }
        );

        return NextResponse.json({ success: true, submission });
    } catch (error: any) {
        if (error.message === 'Unauthorized' || error.message === 'Facility access denied') {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        console.error('Error submitting questionnaire:', error);
        return NextResponse.json({ error: 'Failed to submit questionnaire' }, { status: 500 });
    }
}
