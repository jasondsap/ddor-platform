'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { Suspense } from 'react';
import {
    ArrowLeft, ArrowRight, Brain, AlertTriangle,
    CheckCircle2, Loader2, RotateCcw, Shield,
    Heart, Activity
} from 'lucide-react';

// =============================================
// PHQ-9 Questions (Depression)
// =============================================
const PHQ9_QUESTIONS = [
    { id: 1, key: 'phq9_q1', text: 'Little interest or pleasure in doing things.', section: 'phq9' },
    { id: 2, key: 'phq9_q2', text: 'Feeling down, depressed, or hopeless.', section: 'phq9' },
    { id: 3, key: 'phq9_q3', text: 'Trouble falling or staying asleep, or sleeping too much.', section: 'phq9' },
    { id: 4, key: 'phq9_q4', text: 'Feeling tired or having little energy.', section: 'phq9' },
    { id: 5, key: 'phq9_q5', text: 'Poor appetite or overeating.', section: 'phq9' },
    { id: 6, key: 'phq9_q6', text: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down.', section: 'phq9' },
    { id: 7, key: 'phq9_q7', text: 'Trouble concentrating on things, such as reading or watching TV.', section: 'phq9' },
    { id: 8, key: 'phq9_q8', text: 'Moving or speaking so slowly that other people could have noticed. Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual.', section: 'phq9' },
    { id: 9, key: 'phq9_q9', text: 'Thoughts that you would be better off dead, or of hurting yourself in some way.', section: 'phq9', isSafetyItem: true },
];

// =============================================
// GAD-7 Questions (Anxiety)
// =============================================
const GAD7_QUESTIONS = [
    { id: 10, key: 'gad7_q1', text: 'Feeling nervous, anxious, or on edge.', section: 'gad7' },
    { id: 11, key: 'gad7_q2', text: 'Not being able to stop or control worrying.', section: 'gad7' },
    { id: 12, key: 'gad7_q3', text: 'Worrying too much about different things.', section: 'gad7' },
    { id: 13, key: 'gad7_q4', text: 'Trouble relaxing.', section: 'gad7' },
    { id: 14, key: 'gad7_q5', text: 'Being so restless that it is hard to sit still.', section: 'gad7' },
    { id: 15, key: 'gad7_q6', text: 'Becoming easily annoyed or irritable.', section: 'gad7' },
    { id: 16, key: 'gad7_q7', text: 'Feeling afraid, as if something awful might happen.', section: 'gad7' },
];

// Functional impairment question
const FUNCTIONAL_QUESTION = {
    id: 17, key: 'functional_difficulty',
    text: 'How difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?',
    section: 'functional'
};

const ALL_QUESTIONS = [...PHQ9_QUESTIONS, ...GAD7_QUESTIONS, FUNCTIONAL_QUESTION];

const RESPONSE_OPTIONS = [
    { value: 0, label: 'Not at all' },
    { value: 1, label: 'Several days' },
    { value: 2, label: 'More than half the days' },
    { value: 3, label: 'Nearly every day' },
];

const FUNCTIONAL_OPTIONS = [
    { value: 0, label: 'Not difficult at all' },
    { value: 1, label: 'Somewhat difficult' },
    { value: 2, label: 'Very difficult' },
    { value: 3, label: 'Extremely difficult' },
];

interface Answers { [key: string]: number; }

function Phq9Gad7Content() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const ddor = (session as any)?.ddor;
    const preselectedClientId = searchParams.get('client_id');

    const [view, setView] = useState<'intro' | 'assessment' | 'results'>('intro');
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Answers>({});
    const [phq9Score, setPhq9Score] = useState<number | null>(null);
    const [gad7Score, setGad7Score] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [clientName, setClientName] = useState('');
    const [clientId, setClientId] = useState(preselectedClientId || '');
    const [showSafetyAlert, setShowSafetyAlert] = useState(false);

    useEffect(() => {
        if (preselectedClientId) {
            fetch(`/api/clients/${preselectedClientId}`)
                .then(r => r.json())
                .then(data => {
                    if (data.client) setClientName(`${data.client.first_name} ${data.client.last_name}`);
                })
                .catch(console.error);
        }
    }, [preselectedClientId]);

    // Check for safety item (#9) whenever answers change
    useEffect(() => {
        const q9Val = answers['phq9_q9'];
        if (q9Val !== undefined && q9Val > 0) {
            setShowSafetyAlert(true);
        }
    }, [answers]);

    const handleAnswer = (key: string, value: number) => {
        setAnswers(prev => ({ ...prev, [key]: value }));
    };

    const calculateScores = () => {
        let phq9 = 0;
        PHQ9_QUESTIONS.forEach(q => { phq9 += answers[q.key] || 0; });
        let gad7 = 0;
        GAD7_QUESTIONS.forEach(q => { gad7 += answers[q.key] || 0; });
        return { phq9, gad7 };
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        const { phq9, gad7 } = calculateScores();
        setPhq9Score(phq9);
        setGad7Score(gad7);

        try {
            await fetch('/api/questionnaires/phq9_gad7', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: clientId || null,
                    total_score: phq9 + gad7,
                    responses: answers,
                    notes: JSON.stringify({ phq9_score: phq9, gad7_score: gad7, safety_flag: (answers['phq9_q9'] || 0) > 0 }),
                }),
            });
        } catch (e) { console.error(e); }

        setView('results');
        setIsLoading(false);
    };

    const resetAssessment = () => {
        setView('intro');
        setCurrentQuestion(0);
        setAnswers({});
        setPhq9Score(null);
        setGad7Score(null);
        setShowSafetyAlert(false);
    };

    const getPhq9Severity = (score: number) => {
        if (score >= 20) return { level: 'Severe Depression', color: '#991B1B', bg: '#FEE2E2' };
        if (score >= 15) return { level: 'Moderately Severe Depression', color: '#C2410C', bg: '#FFF7ED' };
        if (score >= 10) return { level: 'Moderate Depression', color: '#B45309', bg: '#FFFBEB' };
        if (score >= 5) return { level: 'Mild Depression', color: '#A16207', bg: '#FEFCE8' };
        return { level: 'Minimal Depression', color: '#15803D', bg: '#F0FDF4' };
    };

    const getGad7Severity = (score: number) => {
        if (score >= 15) return { level: 'Severe Anxiety', color: '#991B1B', bg: '#FEE2E2' };
        if (score >= 10) return { level: 'Moderate Anxiety', color: '#B45309', bg: '#FFFBEB' };
        if (score >= 5) return { level: 'Mild Anxiety', color: '#A16207', bg: '#FEFCE8' };
        return { level: 'Minimal Anxiety', color: '#15803D', bg: '#F0FDF4' };
    };

    const progress = (Object.keys(answers).length / ALL_QUESTIONS.length) * 100;
    const currentQ = ALL_QUESTIONS[currentQuestion];
    const canProceed = currentQ && answers[currentQ.key] !== undefined;
    const allAnswered = Object.keys(answers).length === ALL_QUESTIONS.length;
    const isCurrentFunctional = currentQ?.section === 'functional';
    const options = isCurrentFunctional ? FUNCTIONAL_OPTIONS : RESPONSE_OPTIONS;

    return (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

            {/* Safety Alert Modal */}
            {showSafetyAlert && view === 'assessment' && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-red-900">Safety Alert</h3>
                        </div>
                        <p className="text-sm text-gray-700 mb-4">
                            The participant has indicated thoughts of self-harm or suicide (Item #9).
                            Per protocol, a follow-up assessment for suicidal ideation is required.
                        </p>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-800">
                            <p className="font-medium mb-1">Required Action:</p>
                            <p>Follow your organization&apos;s suicidal ideation protocol. If the participant is in immediate danger, call 988 (Suicide & Crisis Lifeline) or 911.</p>
                        </div>
                        <button
                            onClick={() => setShowSafetyAlert(false)}
                            className="w-full py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700"
                        >
                            I Acknowledge — Continue Assessment
                        </button>
                    </div>
                </div>
            )}

            {/* ==================== INTRO ==================== */}
            {view === 'intro' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-8 shadow-sm">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                <Brain className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-ddor-navy mb-1">PHQ-9 / GAD-7</h2>
                                <p className="text-gray-600">Patient Health Questionnaire & Generalized Anxiety Disorder Assessment</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            <div className="rounded-xl p-4 bg-blue-50 border border-blue-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <Heart className="w-5 h-5 text-blue-600" />
                                    <span className="font-medium text-blue-800">PHQ-9 — Depression</span>
                                </div>
                                <p className="text-sm text-blue-700">9 items • Score 0–27</p>
                                <p className="text-xs text-blue-500 mt-1">Screens for depression severity over the past 2 weeks</p>
                            </div>
                            <div className="rounded-xl p-4 bg-purple-50 border border-purple-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <Activity className="w-5 h-5 text-purple-600" />
                                    <span className="font-medium text-purple-800">GAD-7 — Anxiety</span>
                                </div>
                                <p className="text-sm text-purple-700">7 items • Score 0–21</p>
                                <p className="text-xs text-purple-500 mt-1">Screens for generalized anxiety severity over the past 2 weeks</p>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <Shield className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-amber-800">
                                    <p className="font-medium mb-1">Safety Note</p>
                                    <p>Item #9 on the PHQ-9 screens for suicidal ideation. If the participant endorses this item (score 1–3), follow your organization&apos;s safety protocol immediately.</p>
                                </div>
                            </div>
                        </div>

                        {clientName && (
                            <div className="bg-ddor-light rounded-lg p-3 mb-6 flex items-center gap-2">
                                <Brain className="w-4 h-4 text-ddor-blue" />
                                <span className="text-sm font-medium text-ddor-navy">Participant: {clientName}</span>
                            </div>
                        )}

                        <p className="text-sm text-gray-500 mb-4 italic">
                            &ldquo;Over the past 2 weeks, have you been bothered by any of the following?&rdquo;
                        </p>

                        <button
                            onClick={() => setView('assessment')}
                            className="w-full py-3 bg-ddor-blue text-white rounded-xl font-semibold hover:bg-[#156090] flex items-center justify-center gap-2"
                        >
                            Begin Assessment <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* ==================== ASSESSMENT ==================== */}
            {view === 'assessment' && currentQ && (
                <div className="space-y-6">
                    {/* Progress */}
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">
                                Question {currentQuestion + 1} of {ALL_QUESTIONS.length}
                                <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{
                                    backgroundColor: currentQ.section === 'phq9' ? '#EFF6FF' : currentQ.section === 'gad7' ? '#F5F3FF' : '#F9FAFB',
                                    color: currentQ.section === 'phq9' ? '#1D4ED8' : currentQ.section === 'gad7' ? '#7C3AED' : '#6B7280',
                                }}>
                                    {currentQ.section === 'phq9' ? 'PHQ-9 Depression' : currentQ.section === 'gad7' ? 'GAD-7 Anxiety' : 'Functional Impact'}
                                </span>
                            </span>
                            <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{
                                width: `${progress}%`,
                                backgroundColor: currentQ.section === 'phq9' ? '#3B82F6' : currentQ.section === 'gad7' ? '#8B5CF6' : '#6B7280'
                            }} />
                        </div>
                    </div>

                    {/* Question */}
                    <div className="bg-white rounded-2xl p-8 shadow-sm">
                        {(currentQ as any).isSafetyItem && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                <span className="text-sm text-red-700 font-medium">Safety screening item — follow-up required if endorsed</span>
                            </div>
                        )}

                        <p className="text-lg font-medium text-ddor-navy mb-6">{currentQ.text}</p>

                        <div className="space-y-2">
                            {options.map(opt => {
                                const selected = answers[currentQ.key] === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => handleAnswer(currentQ.key, opt.value)}
                                        className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                                            selected
                                                ? 'border-ddor-blue bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                            selected ? 'border-ddor-blue bg-ddor-blue' : 'border-gray-300'
                                        }`}>
                                            {selected && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </div>
                                        <span className={`text-sm ${selected ? 'text-ddor-blue font-medium' : 'text-gray-700'}`}>
                                            {opt.label}
                                        </span>
                                        <span className="ml-auto text-xs text-gray-400">{opt.value}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                            disabled={currentQuestion === 0}
                            className="flex-1 py-3 bg-white border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" /> Previous
                        </button>

                        {currentQuestion < ALL_QUESTIONS.length - 1 ? (
                            <button
                                onClick={() => setCurrentQuestion(currentQuestion + 1)}
                                disabled={!canProceed}
                                className="flex-1 py-3 bg-ddor-blue text-white rounded-xl font-medium hover:bg-[#156090] disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                                Next <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={!allAnswered || isLoading}
                                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                {isLoading ? 'Saving...' : 'Submit Assessment'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ==================== RESULTS ==================== */}
            {view === 'results' && phq9Score !== null && gad7Score !== null && (
                <div className="space-y-6">
                    {/* Safety flag banner */}
                    {(answers['phq9_q9'] || 0) > 0 && (
                        <div className="bg-red-600 text-white rounded-2xl p-6 shadow-lg">
                            <div className="flex items-center gap-3 mb-2">
                                <AlertTriangle className="w-6 h-6" />
                                <h3 className="text-lg font-bold">Safety Follow-Up Required</h3>
                            </div>
                            <p className="text-sm text-red-100">
                                The participant endorsed Item #9 (suicidal ideation) with a score of {answers['phq9_q9']}.
                                Follow your organization&apos;s suicidal ideation assessment protocol. Document the follow-up action taken.
                            </p>
                        </div>
                    )}

                    {/* Score Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* PHQ-9 */}
                        {(() => {
                            const sev = getPhq9Severity(phq9Score);
                            return (
                                <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
                                    <p className="text-sm text-gray-500 mb-1">PHQ-9 Depression Score</p>
                                    <div className="text-5xl font-bold mb-1" style={{ color: sev.color }}>{phq9Score}</div>
                                    <p className="text-gray-400 text-sm mb-3">out of 27</p>
                                    <span className="inline-block px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: sev.bg, color: sev.color }}>
                                        {sev.level}
                                    </span>
                                </div>
                            );
                        })()}

                        {/* GAD-7 */}
                        {(() => {
                            const sev = getGad7Severity(gad7Score);
                            return (
                                <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
                                    <p className="text-sm text-gray-500 mb-1">GAD-7 Anxiety Score</p>
                                    <div className="text-5xl font-bold mb-1" style={{ color: sev.color }}>{gad7Score}</div>
                                    <p className="text-gray-400 text-sm mb-3">out of 21</p>
                                    <span className="inline-block px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: sev.bg, color: sev.color }}>
                                        {sev.level}
                                    </span>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Scoring Guide */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h3 className="font-semibold text-ddor-navy mb-3">PHQ-9 Scoring Guide</h3>
                            <div className="space-y-2">
                                {[
                                    { range: '0–4', label: 'Minimal', color: '#15803D' },
                                    { range: '5–9', label: 'Mild', color: '#A16207' },
                                    { range: '10–14', label: 'Moderate', color: '#B45309' },
                                    { range: '15–19', label: 'Moderately Severe', color: '#C2410C' },
                                    { range: '20–27', label: 'Severe', color: '#991B1B' },
                                ].map(tier => {
                                    const isActive =
                                        (tier.range === '0–4' && phq9Score <= 4) ||
                                        (tier.range === '5–9' && phq9Score >= 5 && phq9Score <= 9) ||
                                        (tier.range === '10–14' && phq9Score >= 10 && phq9Score <= 14) ||
                                        (tier.range === '15–19' && phq9Score >= 15 && phq9Score <= 19) ||
                                        (tier.range === '20–27' && phq9Score >= 20);
                                    return (
                                        <div key={tier.range} className={`flex items-center gap-2 p-2 rounded-lg ${isActive ? 'bg-gray-100 ring-1 ring-gray-300' : ''}`}>
                                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tier.color }} />
                                            <span className="text-sm text-gray-700">{tier.range}: {tier.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h3 className="font-semibold text-ddor-navy mb-3">GAD-7 Scoring Guide</h3>
                            <div className="space-y-2">
                                {[
                                    { range: '0–4', label: 'Minimal', color: '#15803D' },
                                    { range: '5–9', label: 'Mild', color: '#A16207' },
                                    { range: '10–14', label: 'Moderate', color: '#B45309' },
                                    { range: '15–21', label: 'Severe', color: '#991B1B' },
                                ].map(tier => {
                                    const isActive =
                                        (tier.range === '0–4' && gad7Score <= 4) ||
                                        (tier.range === '5–9' && gad7Score >= 5 && gad7Score <= 9) ||
                                        (tier.range === '10–14' && gad7Score >= 10 && gad7Score <= 14) ||
                                        (tier.range === '15–21' && gad7Score >= 15);
                                    return (
                                        <div key={tier.range} className={`flex items-center gap-2 p-2 rounded-lg ${isActive ? 'bg-gray-100 ring-1 ring-gray-300' : ''}`}>
                                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tier.color }} />
                                            <span className="text-sm text-gray-700">{tier.range}: {tier.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Response Summary */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <h3 className="font-semibold text-ddor-navy mb-4">Response Summary</h3>

                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">PHQ-9 — Depression</p>
                        <div className="space-y-1 mb-4">
                            {PHQ9_QUESTIONS.map(q => {
                                const val = answers[q.key];
                                return (
                                    <div key={q.key} className={`flex items-center gap-3 py-1.5 px-2 rounded ${(q as any).isSafetyItem && val > 0 ? 'bg-red-50' : ''}`}>
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                                            val === 0 ? 'bg-green-100 text-green-700' :
                                            val === 1 ? 'bg-yellow-100 text-yellow-700' :
                                            val === 2 ? 'bg-orange-100 text-orange-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                            {val}
                                        </div>
                                        <p className="text-sm text-gray-700 flex-1">{q.text}</p>
                                        {(q as any).isSafetyItem && val > 0 && <AlertTriangle className="w-4 h-4 text-red-500" />}
                                    </div>
                                );
                            })}
                        </div>

                        <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-2">GAD-7 — Anxiety</p>
                        <div className="space-y-1 mb-4">
                            {GAD7_QUESTIONS.map(q => {
                                const val = answers[q.key];
                                return (
                                    <div key={q.key} className="flex items-center gap-3 py-1.5 px-2">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                                            val === 0 ? 'bg-green-100 text-green-700' :
                                            val === 1 ? 'bg-yellow-100 text-yellow-700' :
                                            val === 2 ? 'bg-orange-100 text-orange-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                            {val}
                                        </div>
                                        <p className="text-sm text-gray-700 flex-1">{q.text}</p>
                                    </div>
                                );
                            })}
                        </div>

                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Functional Impact</p>
                        <div className="flex items-center gap-3 py-1.5 px-2">
                            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-700">
                                {answers['functional_difficulty']}
                            </div>
                            <p className="text-sm text-gray-700">{FUNCTIONAL_OPTIONS[answers['functional_difficulty']]?.label}</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button onClick={resetAssessment} className="flex-1 py-3 bg-white border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2">
                            <RotateCcw className="w-4 h-4" /> New Assessment
                        </button>
                        <button
                            onClick={() => clientId ? router.push(`/clients/${clientId}`) : router.push('/clients')}
                            className="flex-1 py-3 bg-ddor-blue text-white rounded-xl font-medium hover:bg-[#156090] flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" /> Done
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}

export default function Phq9Gad7Page() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
            <Header />
            <Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>}>
                <Phq9Gad7Content />
            </Suspense>
        </div>
    );
}
