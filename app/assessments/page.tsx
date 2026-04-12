'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Activity, TrendingUp, Brain, ArrowRight, Shield } from 'lucide-react';

const ASSESSMENTS = [
    {
        type: 'barc_10',
        name: 'BARC-10',
        fullName: 'Brief Assessment of Recovery Capital',
        description: '10-item measure of recovery capital across four domains. Scores of 47+ sustained over time indicate higher chances for long-term remission.',
        items: 10,
        scoring: '6-point Likert (10–60)',
        href: '/assessments/barc10',
        color: '#10B981',
        icon: TrendingUp,
        when: 'At screening, 90-Day report, and Final Report',
        who: 'SUD primary or Co-occurring diagnosis',
    },
    {
        type: 'phq9_gad7',
        name: 'PHQ-9 / GAD-7',
        fullName: 'Patient Health Questionnaire / General Anxiety Disorder',
        description: 'Screens for depression severity (PHQ-9, 0–27) and anxiety severity (GAD-7, 0–21). Includes safety screening for suicidal ideation.',
        items: 17,
        scoring: 'PHQ-9: 0–27 / GAD-7: 0–21',
        href: '/assessments/phq9-gad7',
        color: '#3B82F6',
        icon: Brain,
        when: 'At screening, 90-Day report, and Final Report',
        who: 'MH primary or Co-occurring diagnosis',
    },
    {
        type: 'gain_ss',
        name: 'GAIN-SS',
        fullName: 'Global Appraisal of Individual Needs — Short Screener',
        description: '23-item screener across 4 subscales: Internalizing, Externalizing, Substance Use, and Crime/Violence. Uses recency-based scoring.',
        items: 23,
        scoring: 'Binary recency (0–23)',
        href: '/gain-ss/new',
        color: '#F59E0B',
        icon: Shield,
        when: 'At screening with state assessor',
        who: 'All participants at referral',
    },
];

export default function AssessmentsPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-ddor-navy flex items-center gap-2">
                        <Activity className="w-6 h-6" /> Assessments
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Standardized instruments for participant self-survey and outcome measurement.
                    </p>
                </div>

                <div className="space-y-4">
                    {ASSESSMENTS.map((a) => {
                        const Icon = a.icon;
                        return (
                            <div
                                key={a.type}
                                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                                onClick={() => router.push(a.href)}
                            >
                                <div className="flex items-start gap-5 p-6">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${a.color}15` }}>
                                        <Icon className="w-6 h-6" style={{ color: a.color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-lg font-semibold text-ddor-navy">{a.name}</h2>
                                            <ArrowRight className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <p className="text-sm text-gray-500 mb-2">{a.fullName}</p>
                                        <p className="text-sm text-gray-600 mb-3">{a.description}</p>
                                        <div className="flex flex-wrap gap-3 text-xs">
                                            <span className="px-2 py-1 rounded bg-gray-100 text-gray-600">{a.items} items</span>
                                            <span className="px-2 py-1 rounded bg-gray-100 text-gray-600">{a.scoring}</span>
                                            <span className="px-2 py-1 rounded bg-blue-50 text-blue-700">{a.who}</span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">{a.when}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
