'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { Suspense } from 'react';
import {
    ArrowLeft, ArrowRight, Heart, Users, Home, Brain,
    TrendingUp, CheckCircle2, Loader2, RotateCcw,
    Volume2, Square, Search, X
} from 'lucide-react';

const BARC10_QUESTIONS = [
    { id: 1, text: "There are more important things to me in life than using substances.", domain: "human", shortLabel: "Purpose & Meaning" },
    { id: 2, text: "In general I am happy with my life.", domain: "human", shortLabel: "Life Satisfaction" },
    { id: 3, text: "I have enough energy to complete the tasks I set myself.", domain: "human", shortLabel: "Energy & Vitality" },
    { id: 4, text: "I am proud of the community I live in and feel part of it.", domain: "social", shortLabel: "Community Connection" },
    { id: 5, text: "I get lots of support from friends.", domain: "social", shortLabel: "Friend Support" },
    { id: 6, text: "I regard my life as challenging and fulfilling without the need for using drugs or alcohol.", domain: "human", shortLabel: "Fulfillment in Recovery" },
    { id: 7, text: "My living space has helped to drive my recovery journey.", domain: "physical", shortLabel: "Supportive Environment" },
    { id: 8, text: "I take full responsibility for my actions.", domain: "human", shortLabel: "Personal Responsibility" },
    { id: 9, text: "I am happy dealing with a range of professional people.", domain: "cultural", shortLabel: "Professional Engagement" },
    { id: 10, text: "I am making good progress on my recovery journey.", domain: "cultural", shortLabel: "Recovery Progress" }
];

const RESPONSE_OPTIONS = [
    { value: 1, label: "Strongly Disagree" },
    { value: 2, label: "Disagree" },
    { value: 3, label: "Somewhat Disagree" },
    { value: 4, label: "Somewhat Agree" },
    { value: 5, label: "Agree" },
    { value: 6, label: "Strongly Agree" }
];

const DOMAIN_INFO: Record<string, { name: string; icon: any; color: string; bgColor: string }> = {
    human:    { name: "Human Capital",   icon: Brain, color: "#3B82F6", bgColor: "#EFF6FF" },
    social:   { name: "Social Capital",  icon: Users, color: "#8B5CF6", bgColor: "#F5F3FF" },
    physical: { name: "Physical Capital", icon: Home,  color: "#F59E0B", bgColor: "#FFFBEB" },
    cultural: { name: "Cultural Capital", icon: Heart, color: "#EC4899", bgColor: "#FDF2F8" },
};

interface Answers { [key: string]: number; }

function Barc10Content() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const ddor = (session as any)?.ddor;

    const preselectedClientId = searchParams.get('client_id');

    const [view, setView] = useState<'intro' | 'assessment' | 'results'>('intro');
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Answers>({});
    const [totalScore, setTotalScore] = useState<number | null>(null);
    const [domainScores, setDomainScores] = useState<Record<string, number> | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [clientName, setClientName] = useState('');
    const [clientId, setClientId] = useState(preselectedClientId || '');

    // Fetch client name if preselected
    useEffect(() => {
        if (preselectedClientId) {
            fetch(`/api/clients/${preselectedClientId}`)
                .then(r => r.json())
                .then(data => {
                    if (data.client) {
                        setClientName(`${data.client.first_name} ${data.client.last_name}`);
                    }
                })
                .catch(console.error);
        }
    }, [preselectedClientId]);

    const calculateScores = (ans: Answers) => {
        const domains: Record<string, number> = { human: 0, social: 0, physical: 0, cultural: 0 };
        let total = 0;
        BARC10_QUESTIONS.forEach(q => {
            const val = ans[`q${q.id}`] || 0;
            total += val;
            domains[q.domain] += val;
        });
        return { total, domains };
    };

    const handleAnswer = (questionId: number, value: number) => {
        setAnswers(prev => ({ ...prev, [`q${questionId}`]: value }));
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        const { total, domains } = calculateScores(answers);
        setTotalScore(total);
        setDomainScores(domains);

        try {
            // Map answers to question UUIDs from the database
            // For now we store using the questionnaire submission API
            const questionMap: Record<string, string> = {};
            // We'll submit via the simpler recovery-assessment-style approach
            await fetch(`/api/questionnaires/barc_10`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: clientId || null,
                    total_score: total,
                    responses: answers,
                    notes: null,
                }),
            });
        } catch (e) {
            console.error(e);
        }

        setView('results');
        setIsLoading(false);
    };

    const resetAssessment = () => {
        setView('intro');
        setCurrentQuestion(0);
        setAnswers({});
        setTotalScore(null);
        setDomainScores(null);
    };

    const getScoreColor = (score: number, max: number) => {
        const pct = score / max;
        if (pct >= 0.75) return '#10B981';
        if (pct >= 0.5) return '#F59E0B';
        if (pct >= 0.25) return '#F97316';
        return '#EF4444';
    };

    const getInterpretation = (score: number) => {
        const pct = Math.round((score / 60) * 100);
        if (pct >= 75) return { level: 'Strong Recovery Capital', desc: 'Robust recovery capital across domains.' };
        if (pct >= 50) return { level: 'Moderate Recovery Capital', desc: 'Developing recovery capital with room for growth.' };
        if (pct >= 25) return { level: 'Low Recovery Capital', desc: 'Significant gaps in recovery resources.' };
        return { level: 'Very Low Recovery Capital', desc: 'Critical need for recovery capital development.' };
    };

    const progress = (Object.keys(answers).length / BARC10_QUESTIONS.length) * 100;
    const canProceed = answers[`q${BARC10_QUESTIONS[currentQuestion]?.id}`] !== undefined;
    const allAnswered = Object.keys(answers).length === BARC10_QUESTIONS.length;

    return (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
            {/* ==================== INTRO ==================== */}
            {view === 'intro' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-8 shadow-sm">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-ddor-teal to-ddor-blue flex items-center justify-center shadow-lg">
                                <TrendingUp className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-ddor-navy mb-1">BARC-10</h2>
                                <p className="text-gray-600">Brief Assessment of Recovery Capital — 10 items, 6-point Likert scale.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                            {Object.entries(DOMAIN_INFO).map(([key, info]) => {
                                const Icon = info.icon;
                                const count = BARC10_QUESTIONS.filter(q => q.domain === key).length;
                                return (
                                    <div key={key} className="rounded-xl p-3 text-center" style={{ backgroundColor: info.bgColor }}>
                                        <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: info.color }} />
                                        <p className="text-xs font-medium" style={{ color: info.color }}>{info.name}</p>
                                        <p className="text-xs text-gray-500">{count} items</p>
                                    </div>
                                );
                            })}
                        </div>

                        {clientName && (
                            <div className="bg-ddor-light rounded-lg p-3 mb-6 flex items-center gap-2">
                                <Users className="w-4 h-4 text-ddor-blue" />
                                <span className="text-sm font-medium text-ddor-navy">Participant: {clientName}</span>
                            </div>
                        )}

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
            {view === 'assessment' && (
                <div className="space-y-6">
                    {/* Progress */}
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">
                                Question {currentQuestion + 1} of {BARC10_QUESTIONS.length}
                            </span>
                            <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-ddor-teal rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                    </div>

                    {/* Question */}
                    {(() => {
                        const q = BARC10_QUESTIONS[currentQuestion];
                        const info = DOMAIN_INFO[q.domain];
                        const Icon = info.icon;
                        return (
                            <div className="bg-white rounded-2xl p-8 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: info.bgColor }}>
                                        <Icon className="w-4 h-4" style={{ color: info.color }} />
                                    </div>
                                    <span className="text-sm font-medium" style={{ color: info.color }}>{info.name}</span>
                                </div>

                                <p className="text-lg font-medium text-ddor-navy mb-6">{q.text}</p>

                                <div className="space-y-2">
                                    {RESPONSE_OPTIONS.map(opt => {
                                        const selected = answers[`q${q.id}`] === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => handleAnswer(q.id, opt.value)}
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
                        );
                    })()}

                    {/* Navigation */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                            disabled={currentQuestion === 0}
                            className="flex-1 py-3 bg-white border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" /> Previous
                        </button>

                        {currentQuestion < BARC10_QUESTIONS.length - 1 ? (
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
            {view === 'results' && totalScore !== null && domainScores && (
                <div className="space-y-6">
                    {/* Score Card */}
                    <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                        <p className="text-sm text-gray-500 mb-2">
                            {clientName ? `${clientName} — ` : ''}BARC-10 Total Score
                        </p>
                        <div className="text-6xl font-bold mb-2" style={{ color: getScoreColor(totalScore, 60) }}>
                            {totalScore}
                        </div>
                        <p className="text-gray-500 mb-4">out of 60 ({Math.round((totalScore / 60) * 100)}%)</p>
                        <div className="inline-block px-4 py-2 rounded-full text-sm font-medium" style={{
                            backgroundColor: `${getScoreColor(totalScore, 60)}20`,
                            color: getScoreColor(totalScore, 60)
                        }}>
                            {getInterpretation(totalScore).level}
                        </div>
                        <p className="text-sm text-gray-600 mt-3 max-w-md mx-auto">{getInterpretation(totalScore).desc}</p>
                    </div>

                    {/* Domain Breakdown */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <h3 className="font-semibold text-ddor-navy mb-4">Domain Scores</h3>
                        <div className="space-y-4">
                            {Object.entries(DOMAIN_INFO).map(([key, info]) => {
                                const score = domainScores[key] || 0;
                                const max = BARC10_QUESTIONS.filter(q => q.domain === key).length * 6;
                                const pct = Math.round((score / max) * 100);
                                const Icon = info.icon;
                                return (
                                    <div key={key}>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <Icon className="w-4 h-4" style={{ color: info.color }} />
                                                <span className="text-sm font-medium text-gray-800">{info.name}</span>
                                                <span className="text-xs text-gray-400">{score}/{max}</span>
                                            </div>
                                            <span className="text-sm font-bold" style={{ color: info.color }}>{pct}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: info.color }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Response Summary */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <h3 className="font-semibold text-ddor-navy mb-4">Response Summary</h3>
                        <div className="space-y-2">
                            {BARC10_QUESTIONS.map(q => {
                                const val = answers[`q${q.id}`];
                                const info = DOMAIN_INFO[q.domain];
                                return (
                                    <div key={q.id} className="flex items-center gap-3 py-2">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium" style={{ backgroundColor: info.bgColor, color: info.color }}>
                                            {val}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800">{q.shortLabel}</p>
                                            <p className="text-xs text-gray-500">{info.name}</p>
                                        </div>
                                    </div>
                                );
                            })}
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

export default function Barc10Page() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
            <Header />
            <Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>}>
                <Barc10Content />
            </Suspense>
        </div>
    );
}
