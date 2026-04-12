'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { Suspense } from 'react';
import {
    AlertTriangle, Clock, CheckCircle2, ChevronRight,
    Loader2, Filter, Users, Search
} from 'lucide-react';
import { STATUS_COLORS } from '@/types';
import type { ReportCompletionStatus } from '@/types';

function ReportTrackingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session, status: authStatus } = useSession();
    const ddor = (session as any)?.ddor;

    const [tracking, setTracking] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState(searchParams.get('filter') || 'overdue');

    useEffect(() => {
        if (authStatus === 'unauthenticated') router.push('/auth/signin');
    }, [authStatus, router]);

    useEffect(() => {
        if (!ddor?.userId) return;
        fetchTracking();
    }, [ddor?.userId, filter]);

    const fetchTracking = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/report-tracking?filter=${filter}&limit=100`);
            const data = await res.json();
            setTracking(data.tracking || []);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const milestoneKeys = [
        { key: 'fourteen_day', label: '14d', remain: 'fourteen_day_remaining' },
        { key: 'forty_two_day', label: '42d', remain: 'forty_two_day_remaining' },
        { key: 'ninety_day', label: '90d', remain: 'ninety_day_remaining' },
        { key: 'one_eighty_day', label: '180d', remain: 'one_eighty_day_remaining' },
        { key: 'two_seventy_day', label: '270d', remain: 'two_seventy_day_remaining' },
        { key: 'three_sixty_day', label: '360d', remain: 'three_sixty_day_remaining' },
    ];

    const getActionableMilestones = (item: any) => {
        return milestoneKeys.filter(m => {
            const status = item[`${m.key}_status`] as ReportCompletionStatus;
            const remaining = item[m.remain] as number;
            if (filter === 'overdue') return status !== 'completed' && status !== 'not_applicable' && status !== 'not_due' && remaining < 0;
            if (filter === 'upcoming') return status !== 'completed' && status !== 'not_applicable' && status !== 'not_due' && remaining >= 0 && remaining <= 14;
            return status !== 'completed' && status !== 'not_applicable' && status !== 'not_due';
        });
    };

    if (authStatus === 'loading') {
        return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>;
    }

    return (
        <>
            {/* Filters */}
            <div className="flex gap-2 mb-6">
                {[
                    { key: 'overdue', label: 'Overdue', icon: AlertTriangle, color: 'red' },
                    { key: 'upcoming', label: 'Upcoming (14d)', icon: Clock, color: 'amber' },
                    { key: 'all', label: 'All Active', icon: Users, color: 'blue' },
                ].map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filter === f.key
                                ? f.color === 'red' ? 'bg-red-100 text-red-800 border border-red-300'
                                : f.color === 'amber' ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-blue-100 text-blue-800 border border-blue-300'
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        <f.icon className="w-4 h-4" />
                        {f.label}
                        {!loading && filter === f.key && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/50 text-xs">{tracking.length}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Results */}
            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>
            ) : tracking.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                    {filter === 'overdue' ? (
                        <>
                            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                            <p className="text-gray-600 font-medium">No overdue reports!</p>
                            <p className="text-sm text-gray-400 mt-1">All reports are on track.</p>
                        </>
                    ) : (
                        <>
                            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No reports match this filter.</p>
                        </>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="col-span-3">Participant</div>
                        <div className="col-span-2">Facility</div>
                        <div className="col-span-2">Tx Start</div>
                        <div className="col-span-4">Reports Due</div>
                        <div className="col-span-1"></div>
                    </div>

                    <div className="divide-y">
                        {tracking.map((item) => {
                            const actionable = getActionableMilestones(item);
                            return (
                                <div
                                    key={item.client_id}
                                    onClick={() => router.push(`/clients/${item.client_id}`)}
                                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer"
                                >
                                    <div className="sm:col-span-3">
                                        <p className="text-sm font-medium text-gray-900">{item.client_name}</p>
                                        {item.diagnosis && (
                                            <span className="text-xs text-gray-500 uppercase">{item.diagnosis.replace('_', '-')}</span>
                                        )}
                                    </div>
                                    <div className="sm:col-span-2">
                                        <p className="text-sm text-gray-600">{item.facility_name}</p>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <p className="text-sm text-gray-600">
                                            {item.treatment_start_date ? new Date(item.treatment_start_date).toLocaleDateString() : '—'}
                                        </p>
                                    </div>
                                    <div className="sm:col-span-4 flex flex-wrap gap-1">
                                        {actionable.map(m => {
                                            const remaining = item[m.remain];
                                            const isOverdue = remaining < 0;
                                            return (
                                                <span
                                                    key={m.key}
                                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                    }`}
                                                >
                                                    {m.label}: {isOverdue ? `${Math.abs(remaining)}d late` : `${remaining}d`}
                                                </span>
                                            );
                                        })}
                                    </div>
                                    <div className="sm:col-span-1 flex items-center justify-end">
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
}

export default function ReportTrackingPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <h1 className="text-2xl font-bold text-ddor-navy mb-6">Report Tracking</h1>
                <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>}>
                    <ReportTrackingContent />
                </Suspense>
            </main>
        </div>
    );
}
