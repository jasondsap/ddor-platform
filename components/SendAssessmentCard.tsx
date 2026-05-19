'use client';

import { useState } from 'react';
import { Mail, Phone, Send } from 'lucide-react';

type QuestionnaireType = 'barc_10' | 'phq9_gad7';

const TYPE_LABELS: Record<QuestionnaireType, string> = {
    barc_10: 'BARC-10',
    phq9_gad7: 'PHQ-9 / GAD-7',
};

export function SendAssessmentCard({
    clientId,
    questionnaireType,
    clientEmail,
    clientPhone,
}: {
    clientId: string;
    questionnaireType: QuestionnaireType;
    clientEmail: string | null;
    clientPhone: string | null;
}) {
    const [sending, setSending] = useState<'email' | 'sms' | null>(null);
    const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

    const send = async (channel: 'email' | 'sms') => {
        setSending(channel);
        setMsg(null);
        try {
            const res = await fetch(`/api/clients/${clientId}/assessment/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channel, questionnaire_type: questionnaireType }),
            });
            const data = await res.json();
            if (!res.ok || data.success === false) {
                setMsg({ kind: 'error', text: data.message || data.error || 'Send failed.' });
            } else {
                setMsg({ kind: 'success', text: data.message || 'Sent.' });
            }
        } catch {
            setMsg({ kind: 'error', text: 'Network error. Please try again.' });
        } finally {
            setSending(null);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <Send className="w-4 h-4 text-green-600" />
                        <h3 className="font-semibold text-ddor-navy text-sm">
                            Or send the {TYPE_LABELS[questionnaireType]} link to the participant
                        </h3>
                    </div>
                    <p className="text-xs text-gray-500">
                        Sends a tokenized link so the participant can complete the assessment on
                        their own. Link expires in 7 days.
                    </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    <button
                        type="button"
                        disabled={!clientEmail || sending !== null}
                        onClick={() => send('email')}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-40 flex items-center gap-1"
                        title={!clientEmail ? 'No email address on file' : ''}
                    >
                        <Mail className="w-3.5 h-3.5" />
                        {sending === 'email' ? 'Sending…' : 'Send by Email'}
                    </button>
                    <button
                        type="button"
                        disabled={!clientPhone || sending !== null}
                        onClick={() => send('sms')}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-40 flex items-center gap-1"
                        title={!clientPhone ? 'No phone number on file' : ''}
                    >
                        <Phone className="w-3.5 h-3.5" />
                        {sending === 'sms' ? 'Sending…' : 'Send by Text'}
                    </button>
                </div>
            </div>
            {msg && (
                <div className={`mt-3 p-2.5 rounded-lg text-xs ${
                    msg.kind === 'success'
                        ? 'bg-green-50 border border-green-200 text-green-700'
                        : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                    {msg.text}
                </div>
            )}
        </div>
    );
}
