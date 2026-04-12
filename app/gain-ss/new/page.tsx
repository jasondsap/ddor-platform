'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import {
    ArrowLeft, ArrowRight, Save, Loader2, AlertCircle, CheckCircle2,
    Search, User, X, Brain, AlertTriangle
} from 'lucide-react';

const RECENCY_OPTIONS = [
    { value: 'never', label: 'Never', score: 0 },
    { value: '1_plus_years', label: '1+ years ago', score: 0 },
    { value: '4_12_months', label: '4-12 months ago', score: 1 },
    { value: '2_3_months', label: '2-3 months ago', score: 1 },
    { value: 'past_month', label: 'Past month', score: 1 },
];

// GAIN-SS: 4 subscales, 23 total items
const GAIN_SS_SECTIONS = [
    {
        id: 'internalizing',
        name: 'Internalizing Disorders',
        description: 'When was the last time you had significant problems with...',
        questions: [
            { key: 'id1', text: 'Feeling very trapped, lonely, sad, blue, depressed, or hopeless about the future' },
            { key: 'id2', text: 'Sleep trouble, such as bad dreams, sleeping restlessly, or falling asleep during the day' },
            { key: 'id3', text: 'Feeling very anxious, nervous, tense, scared, panicked, or like something bad was going to happen' },
            { key: 'id4', text: 'Becoming very distressed and upset when something reminded you of the past' },
            { key: 'id5', text: 'Thinking about ending your life or dying by suicide', isSafety: true },
            { key: 'id6', text: 'Seeing or hearing things that no one else could see or hear or feeling that someone else could read or control your thoughts' },
        ],
    },
    {
        id: 'externalizing',
        name: 'Externalizing Disorders',
        description: 'When was the last time you...',
        questions: [
            { key: 'ed1', text: 'Had a hard time paying attention at school, work, or home' },
            { key: 'ed2', text: 'Had a hard time listening to instructions at school, work, or home' },
            { key: 'ed3', text: 'Had a hard time waiting for your turn' },
            { key: 'ed4', text: 'Were a bully or threatened other people' },
            { key: 'ed5', text: 'Started physical fights with other people' },
            { key: 'ed6', text: 'Tried to win back your gambling losses by going back another day' },
        ],
    },
    {
        id: 'substance',
        name: 'Substance Use Disorders',
        description: 'When was the last time...',
        questions: [
            { key: 'su1', text: 'You used alcohol or other drugs weekly or more often' },
            { key: 'su2', text: 'You spent a lot of time either getting, using, or recovering from the effects of alcohol or other drugs' },
            { key: 'su3', text: 'You kept using alcohol or other drugs even though it was causing social problems, leading to fights, or getting you into trouble' },
            { key: 'su4', text: 'Your use of alcohol or other drugs caused you to give up or reduce your involvement in activities at work, school, home, or social events' },
            { key: 'su5', text: 'You had withdrawal problems from alcohol or other drugs like shaky hands, throwing up, having trouble sitting still or sleeping, or used any to stop being sick' },
        ],
    },
    {
        id: 'crime_violence',
        name: 'Crime/Violence',
        description: 'When was the last time you...',
        questions: [
            { key: 'cv1', text: 'Had a disagreement in which you pushed, grabbed, or shoved someone' },
            { key: 'cv2', text: 'Took something from a store without paying for it' },
            { key: 'cv3', text: 'Sold, distributed, or helped to make illegal drugs' },
            { key: 'cv4', text: 'Drove a vehicle while under the influence of alcohol or illegal drugs' },
            { key: 'cv5', text: 'Purposely damaged or destroyed property that did not belong to you' },
        ],
    },
];

const ALL_QUESTIONS = GAIN_SS_SECTIONS.flatMap(s => s.questions);

function GainSSContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const preselectedClientId = searchParams.get('client_id');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showSafetyAlert, setShowSafetyAlert] = useState(false);
    const [clientSearch, setClientSearch] = useState('');
    const [clients, setClients] = useState<any[]>([]);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [showDropdown, setShowDropdown] = useState(false);

    const [view, setView] = useState<'select' | 'questions' | 'results'>('select');
    const [currentSection, setCurrentSection] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [scores, setScores] = useState<Record<string, number>>({});
    const [totalScore, setTotalScore] = useState(0);

    useEffect(() => {
        if (preselectedClientId) {
            fetch(`/api/clients/${preselectedClientId}`).then(r => r.json()).then(d => { if (d.client) setSelectedClient(d.client); });
        }
    }, [preselectedClientId]);

    useEffect(() => {
        if (clientSearch.length < 2) { setClients([]); return; }
        const t = setTimeout(() => { fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}&status=active`).then(r => r.json()).then(d => setClients(d.clients || [])); }, 300);
        return () => clearTimeout(t);
    }, [clientSearch]);

    // Check for safety item
    useEffect(() => {
        const val = answers['id5'];
        if (val && val !== 'never' && val !== '1_plus_years') {
            setShowSafetyAlert(true);
        }
    }, [answers]);

    const handleAnswer = (key: string, value: string) => {
        setAnswers(prev => ({ ...prev, [key]: value }));
    };

    const calculateScores = () => {
        const sectionScores: Record<string, number> = {};
        let total = 0;
        GAIN_SS_SECTIONS.forEach(s => {
            let score = 0;
            s.questions.forEach(q => {
                const opt = RECENCY_OPTIONS.find(o => o.value === answers[q.key]);
                if (opt) score += opt.score;
            });
            sectionScores[s.id] = score;
            total += score;
        });
        return { sectionScores, total };
    };

    const handleSubmit = async () => {
        if (!selectedClient) return;
        setSaving(true); setError('');

        const { sectionScores, total } = calculateScores();
        setScores(sectionScores);
        setTotalScore(total);

        try {
            const res = await fetch('/api/questionnaires/gain_ss', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: selectedClient.id,
                    responses: answers,
                    total_score: total,
                    notes: JSON.stringify(sectionScores),
                }),
            });
            if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); setSaving(false); return; }
            setSuccess(true);
            setView('results');
        } catch { setError('Error occurred.'); }
        setSaving(false);
    };

    const section = GAIN_SS_SECTIONS[currentSection];
    const allSectionAnswered = section?.questions.every(q => answers[q.key]);
    const allAnswered = ALL_QUESTIONS.every(q => answers[q.key]);
    const progress = (Object.keys(answers).length / ALL_QUESTIONS.length) * 100;

    return (
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => view === 'questions' && currentSection > 0 ? setCurrentSection(currentSection - 1) : router.back()} className="p-2 hover:bg-gray-200 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                <div><h1 className="text-2xl font-bold text-ddor-navy">GAIN-SS Screener</h1><p className="text-sm text-gray-500">Global Appraisal of Individual Needs — Short Screener</p></div>
            </div>

            {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-500" /><p className="text-sm text-red-700">{error}</p></div>}

            {/* Safety alert */}
            {showSafetyAlert && view === 'questions' && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md shadow-xl">
                        <div className="flex items-center gap-3 mb-4"><AlertTriangle className="w-6 h-6 text-red-600" /><h3 className="text-lg font-bold text-red-900">Safety Alert</h3></div>
                        <p className="text-sm text-gray-700 mb-4">The participant has indicated recent thoughts of suicide. Follow your organization&apos;s safety protocol. Call 988 if immediate danger.</p>
                        <button onClick={() => setShowSafetyAlert(false)} className="w-full py-3 bg-red-600 text-white rounded-xl font-medium">I Acknowledge — Continue</button>
                    </div>
                </div>
            )}

            {/* CLIENT SELECT */}
            {view === 'select' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><User className="w-5 h-5 text-ddor-blue" /> Participant</h2>
                        {selectedClient ? (
                            <div className="flex items-center justify-between p-4 bg-ddor-light rounded-lg">
                                <p className="font-medium">{selectedClient.first_name} {selectedClient.last_name}</p>
                                <button onClick={() => setSelectedClient(null)}><X className="w-4 h-4 text-gray-400" /></button>
                            </div>
                        ) : (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input type="text" value={clientSearch} onChange={e => { setClientSearch(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} placeholder="Search..." className="w-full pl-10 py-3 border rounded-lg text-sm" />
                                {showDropdown && clients.length > 0 && <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">{clients.map(c => <button key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(''); setShowDropdown(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b text-sm">{c.first_name} {c.last_name}</button>)}</div>}
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-3"><Brain className="w-5 h-5 text-ddor-blue" /> About the GAIN-SS</h2>
                        <p className="text-sm text-gray-600 mb-3">23 items across 4 subscales. Each item asks &ldquo;When was the last time...&rdquo; with recency-based scoring (past year = 1 point).</p>
                        <div className="grid grid-cols-2 gap-2">{GAIN_SS_SECTIONS.map(s => (
                            <div key={s.id} className="p-2 bg-gray-50 rounded-lg"><p className="text-xs font-medium text-gray-700">{s.name}</p><p className="text-xs text-gray-400">{s.questions.length} items</p></div>
                        ))}</div>
                    </div>

                    <button onClick={() => { if (selectedClient) setView('questions'); else setError('Select a participant first'); }} disabled={!selectedClient}
                        className="w-full py-3 bg-ddor-blue text-white rounded-xl font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
                        Begin Screener <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* QUESTIONS */}
            {view === 'questions' && section && (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-gray-500">Section {currentSection + 1} of {GAIN_SS_SECTIONS.length}: {section.name}</span>
                            <span className="text-xs text-gray-400">{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-ddor-teal rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <p className="text-sm text-gray-500 italic mb-4">{section.description}</p>
                        <div className="space-y-4">
                            {section.questions.map(q => (
                                <div key={q.key} className={`p-4 rounded-xl border ${(q as any).isSafety ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
                                    {(q as any).isSafety && <div className="flex items-center gap-1 mb-2 text-xs text-red-600 font-medium"><AlertTriangle className="w-3 h-3" /> Safety item</div>}
                                    <p className="text-sm font-medium text-ddor-navy mb-3">{q.text}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {RECENCY_OPTIONS.map(opt => (
                                            <button key={opt.value} onClick={() => handleAnswer(q.key, opt.value)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                                    answers[q.key] === opt.value ? 'bg-ddor-blue text-white border-ddor-blue' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                                                }`}>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => currentSection > 0 ? setCurrentSection(currentSection - 1) : setView('select')}
                            className="flex-1 py-3 bg-white border border-gray-300 rounded-xl font-medium text-gray-700 flex items-center justify-center gap-1">
                            <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                        {currentSection < GAIN_SS_SECTIONS.length - 1 ? (
                            <button onClick={() => setCurrentSection(currentSection + 1)} disabled={!allSectionAnswered}
                                className="flex-1 py-3 bg-ddor-blue text-white rounded-xl font-medium disabled:opacity-40 flex items-center justify-center gap-1">
                                Next Section <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button onClick={handleSubmit} disabled={!allAnswered || saving}
                                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold disabled:opacity-40 flex items-center justify-center gap-1">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Submit
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* RESULTS */}
            {view === 'results' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <h2 className="text-2xl font-bold text-ddor-navy mb-1">GAIN-SS Complete</h2>
                        <p className="text-4xl font-extrabold text-ddor-blue mt-4">{totalScore}<span className="text-lg text-gray-400">/{ALL_QUESTIONS.length}</span></p>
                        <p className="text-sm text-gray-500 mt-1">Total Score (past-year recency)</p>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <h3 className="font-semibold text-ddor-navy mb-4">Subscale Scores</h3>
                        {GAIN_SS_SECTIONS.map(s => {
                            const score = scores[s.id] || 0;
                            const max = s.questions.length;
                            const pct = Math.round((score / max) * 100);
                            return (
                                <div key={s.id} className="mb-3">
                                    <div className="flex justify-between mb-1"><span className="text-sm font-medium text-gray-700">{s.name}</span><span className="text-sm text-ddor-blue font-bold">{score}/{max}</span></div>
                                    <div className="h-2 bg-gray-100 rounded-full"><div className="h-full bg-ddor-blue rounded-full" style={{ width: `${pct}%` }} /></div>
                                </div>
                            );
                        })}
                    </div>

                    <button onClick={() => router.push(`/clients/${selectedClient?.id || ''}`)} className="w-full py-3 bg-ddor-blue text-white rounded-xl font-semibold">
                        Done
                    </button>
                </div>
            )}
        </main>
    );
}

export default function GainSSPage() {
    return (<div className="min-h-screen bg-gray-50"><Header /><Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>}><GainSSContent /></Suspense></div>);
}
