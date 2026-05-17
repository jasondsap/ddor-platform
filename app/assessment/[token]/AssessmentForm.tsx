'use client';

/**
 * Public assessment form. Renders one radio group per question (from
 * questionnaire_questions + questionnaire_answer_options) and posts the
 * full response set to /api/assessment-invitations/lookup/[token].
 *
 * Score computation is client-side: total_score = sum of selected option's
 * score_value. The server doesn't re-validate (which would require a second
 * round-trip to look up scores) — if integrity matters more than latency
 * later, move the sum into the responder.
 */

import { useMemo, useState } from 'react';

export interface AnswerOption {
    id: string;
    option_value: string;
    display_label: string;
    display_order: number;
    score_value: number | null;
}

export interface QuestionWithOptions {
    id: string;
    question_key: string;
    question_text: string;
    display_order: number;
    answer_type: string;
    is_required: boolean;
    options: AnswerOption[];
}

interface FormProps {
    token: string;
    questionnaireType: 'barc_10' | 'phq9_gad7';
    questionnaireLabel: string;
    recipientFirstName: string;
    questions: QuestionWithOptions[];
}

interface Response {
    optionValue: string;
    score: number | null;
}

export function AssessmentForm({
    token,
    questionnaireType,
    questionnaireLabel,
    recipientFirstName,
    questions,
}: FormProps) {
    const [responses, setResponses] = useState<Record<string, Response>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState<{ total_score: number } | null>(null);

    const required = useMemo(() => questions.filter(q => q.is_required), [questions]);
    const unanswered = required.filter(q => !responses[q.id]);

    const totalScore = useMemo(
        () => Object.values(responses).reduce((sum, r) => sum + (r.score ?? 0), 0),
        [responses]
    );

    const setResponse = (questionId: string, opt: AnswerOption) => {
        setResponses(prev => ({
            ...prev,
            [questionId]: {
                optionValue: opt.option_value,
                score: opt.score_value,
            },
        }));
        setError('');
    };

    const handleSubmit = async () => {
        if (unanswered.length > 0) {
            setError(`Please answer ${unanswered.length === 1 ? 'the remaining required question' : `the ${unanswered.length} remaining required questions`}.`);
            // Scroll the first unanswered question into view
            const el = document.getElementById(`q-${unanswered[0].id}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        setSaving(true);
        setError('');
        try {
            const responseValues: Record<string, string> = {};
            const responseScores: Record<string, number> = {};
            for (const [qid, r] of Object.entries(responses)) {
                responseValues[qid] = r.optionValue;
                if (r.score !== null && r.score !== undefined) {
                    responseScores[qid] = r.score;
                }
            }
            const res = await fetch(`/api/assessment-invitations/lookup/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    responses: responseValues,
                    response_scores: responseScores,
                    total_score: totalScore,
                }),
            });
            if (!res.ok) {
                let msg = 'Submission failed. Please try again.';
                try {
                    const data = await res.json();
                    if (res.status === 410) msg = 'This link has expired. Please contact your provider for a new one.';
                    else if (res.status === 409) msg = data.error || 'This assessment has already been submitted.';
                    else if (data?.error) msg = data.error;
                } catch { /* keep default */ }
                setError(msg);
                setSaving(false);
                return;
            }
            const data = await res.json();
            setSuccess({ total_score: data.total_score ?? totalScore });
        } catch {
            setError('Network error. Please check your connection and try again.');
            setSaving(false);
        }
    };

    if (success) {
        return (
            <div>
                <h1 style={{ color: '#0e7c66', fontSize: 22, margin: '0 0 12px 0' }}>
                    Thank you — your responses have been recorded
                </h1>
                <p style={{ color: '#374151', lineHeight: '24px', fontSize: 15 }}>
                    Your provider will review your answers. If they need to follow up,
                    they'll be in touch.
                </p>
            </div>
        );
    }

    const greeting = recipientFirstName ? `Hello ${recipientFirstName},` : 'Hello,';

    return (
        <div>
            <h1 style={titleStyle}>{questionnaireLabel} check-in</h1>
            <p style={leadStyle}>{greeting}</p>
            <p style={leadStyle}>
                Please answer each question below as honestly as you can. There are no right
                or wrong answers — your responses help your treatment team support you.
            </p>

            {error && <div style={errorStyle}>{error}</div>}

            <div style={{ marginTop: 16 }}>
                {questions.map((q, qIdx) => {
                    const selected = responses[q.id];
                    const isUnansweredRequired = q.is_required && !selected;
                    return (
                        <div
                            key={q.id}
                            id={`q-${q.id}`}
                            style={{
                                ...questionCardStyle,
                                border: isUnansweredRequired && error ? '1px solid #fca5a5' : questionCardStyle.border,
                            }}
                        >
                            <div style={questionHeaderStyle}>
                                <span style={questionNumberStyle}>{qIdx + 1}.</span>
                                <span style={questionTextStyle}>
                                    {q.question_text}
                                    {q.is_required && <span style={{ color: '#b91c1c', marginLeft: 4 }}>*</span>}
                                </span>
                            </div>
                            <div style={optionsStyle}>
                                {q.options.map(opt => {
                                    const isSelected = selected?.optionValue === opt.option_value;
                                    return (
                                        <label
                                            key={opt.id}
                                            style={{
                                                ...optionLabelStyle,
                                                background: isSelected ? '#dbeafe' : '#ffffff',
                                                borderColor: isSelected ? '#1a73a8' : '#d1d5db',
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name={q.id}
                                                value={opt.option_value}
                                                checked={isSelected}
                                                onChange={() => setResponse(q.id, opt)}
                                                style={{ marginRight: 8 }}
                                            />
                                            <span style={{ fontSize: 14, color: '#1f2937' }}>
                                                {opt.display_label}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24 }}>
                <button type="button" onClick={handleSubmit} disabled={saving} style={primaryButtonStyle}>
                    {saving ? 'Submitting…' : 'Submit Responses'}
                </button>
                <span style={{ fontSize: 13, color: '#6b7280' }}>
                    {Object.keys(responses).length} of {questions.length} answered
                </span>
            </div>
        </div>
    );
}

const titleStyle: React.CSSProperties = {
    color: '#0f3a5c', fontSize: 22, margin: '0 0 8px 0', fontWeight: 700,
};
const leadStyle: React.CSSProperties = {
    color: '#374151', lineHeight: '22px', fontSize: 14, margin: '0 0 12px 0',
};
const errorStyle: React.CSSProperties = {
    background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b',
    padding: '10px 14px', borderRadius: 6, fontSize: 14, marginBottom: 16,
};
const questionCardStyle: React.CSSProperties = {
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '16px 18px',
    marginBottom: 12,
    background: '#fafbfc',
};
const questionHeaderStyle: React.CSSProperties = {
    display: 'flex', gap: 8, marginBottom: 12, alignItems: 'baseline',
};
const questionNumberStyle: React.CSSProperties = {
    color: '#0f3a5c', fontWeight: 600, fontSize: 14, flexShrink: 0,
};
const questionTextStyle: React.CSSProperties = {
    color: '#1f2937', fontSize: 14, lineHeight: '20px',
};
const optionsStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 22,
};
const optionLabelStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 12px', border: '1px solid #d1d5db',
    borderRadius: 6, cursor: 'pointer', transition: 'all 0.1s',
};
const primaryButtonStyle: React.CSSProperties = {
    backgroundColor: '#10B981', color: '#ffffff', fontWeight: 600,
    fontSize: 14, padding: '12px 28px', borderRadius: 6, border: 'none',
    cursor: 'pointer',
};
