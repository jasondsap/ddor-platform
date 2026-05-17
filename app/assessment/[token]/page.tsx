/**
 * /assessment/[token]
 *
 * Public participant-facing page to complete BARC-10 or PHQ-9+GAD-7. No auth —
 * token is the credential. Server component does the invitation lookup +
 * questionnaire fetch; client component (AssessmentForm) handles the form +
 * submit.
 *
 * Pattern mirrors /demographic/invite/[token].
 */

import { sql } from '@/lib/db';
import { AssessmentForm, type QuestionWithOptions } from './AssessmentForm';
import { QUESTIONNAIRE_LABELS, type QuestionnaireType } from '@/lib/assessment-invite/types';

interface PageProps {
    params: { token: string };
}

interface InvitationRow {
    id: string;
    questionnaire_type: QuestionnaireType;
    status: 'sent' | 'opened' | 'completed' | 'expired' | 'superseded';
    expires_at: Date;
    client_first_name: string | null;
    client_facility_name: string | null;
}

export const dynamic = 'force-dynamic';

export default async function AssessmentInvitePage({ params }: PageProps) {
    const token = params.token;

    const rows = (await sql`
        SELECT id, questionnaire_type, status, expires_at,
               client_first_name, client_facility_name
        FROM assessment_invitations
        WHERE token = ${token}
        LIMIT 1
    `) as InvitationRow[];
    const invite = rows[0];

    if (!invite) {
        return <Frame><Notice tone="error" title="Link not recognized">
            This assessment link is invalid or has been removed. If you believe this is
            a mistake, please contact your provider.
        </Notice></Frame>;
    }

    if (invite.status === 'completed') {
        return <Frame><Notice tone="success" title="Thank you — your responses were received">
            We've recorded your latest check-in. There's nothing more to do.
        </Notice></Frame>;
    }
    if (invite.status === 'superseded') {
        return <Frame><Notice tone="info" title="A newer link was sent">
            This link has been replaced by a more recent one. Please check your most
            recent email or text message for the active link.
        </Notice></Frame>;
    }
    if (new Date(invite.expires_at) < new Date()) {
        return <Frame><Notice tone="info" title="This link has expired">
            For your security, assessment links expire after 7 days. Please contact your
            provider to receive a new one.
        </Notice></Frame>;
    }

    // Mark as opened on first valid hit (idempotent if it's already 'opened')
    if (invite.status === 'sent') {
        await sql`UPDATE assessment_invitations SET status = 'opened', opened_at = NOW() WHERE id = ${invite.id}`;
    }

    // Fetch questions + options for the questionnaire type. Same shape as
    // /api/questionnaires/[type] returns.
    const questions = (await sql`
        SELECT q.id, q.question_key, q.question_text, q.display_order, q.answer_type, q.is_required,
               COALESCE(
                   (SELECT json_agg(
                        json_build_object(
                            'id', ao.id,
                            'option_value', ao.option_value,
                            'display_label', ao.display_label,
                            'display_order', ao.display_order,
                            'score_value', ao.score_value
                        ) ORDER BY ao.display_order
                    )
                    FROM questionnaire_answer_options ao
                    WHERE ao.question_id = q.id AND ao.is_active = true),
                   '[]'::json
               ) AS options
        FROM questionnaire_questions q
        WHERE q.questionnaire_type = ${invite.questionnaire_type} AND q.is_active = true
        ORDER BY q.display_order
    `) as QuestionWithOptions[];

    return (
        <Frame wide>
            <AssessmentForm
                token={token}
                questionnaireType={invite.questionnaire_type}
                questionnaireLabel={QUESTIONNAIRE_LABELS[invite.questionnaire_type]}
                recipientFirstName={invite.client_first_name ?? ''}
                questions={questions}
            />
        </Frame>
    );
}

// ---- Layout helpers (same look as /consent + /demographic invite) -----------

function Frame({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
    return (
        <main style={frameStyle}>
            <div style={{ ...cardStyle, maxWidth: wide ? '720px' : '560px' }}>
                <header style={headerStyle}>
                    <div style={brandStyle}>DDOR — Behavioral Health CDP</div>
                </header>
                <div style={contentStyle}>{children}</div>
                <footer style={footerStyle}>
                    Behavioral Health Conditional Dismissal Program · Fletcher Group, Inc.
                </footer>
            </div>
        </main>
    );
}

function Notice({ tone, title, children }: {
    tone: 'success' | 'info' | 'error';
    title: string;
    children: React.ReactNode;
}) {
    const color =
        tone === 'success' ? '#0e7c66' :
        tone === 'error' ? '#b91c1c' : '#0f3a5c';
    return (
        <div>
            <h1 style={{ color, fontSize: '22px', margin: '0 0 12px 0' }}>{title}</h1>
            <p style={{ color: '#374151', lineHeight: '24px', fontSize: '15px' }}>{children}</p>
        </div>
    );
}

const frameStyle: React.CSSProperties = {
    minHeight: '100vh', background: '#e6f1f6', padding: '32px 16px',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};
const cardStyle: React.CSSProperties = {
    width: '100%', background: '#ffffff', borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden',
};
const headerStyle: React.CSSProperties = {
    background: '#0f3a5c', color: '#ffffff', padding: '16px 24px',
};
const brandStyle: React.CSSProperties = {
    fontWeight: 700, fontSize: '14px', letterSpacing: '0.3px',
};
const contentStyle: React.CSSProperties = { padding: '28px 24px' };
const footerStyle: React.CSSProperties = {
    borderTop: '1px solid #e5e7eb', padding: '14px 24px',
    fontSize: '12px', color: '#6b7280', textAlign: 'center',
};
