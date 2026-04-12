'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import {
    Users, AlertTriangle, Clock, FileText, TrendingUp,
    ChevronRight, Loader2, Activity, ClipboardList,
    DollarSign, MapPin, ArrowRight, Bell
} from 'lucide-react';
import type { ReportCompletionStatus } from '@/types';
import { STATUS_COLORS } from '@/types';

interface DashboardData {
    activeClients: number;
    overdueReports: any[];
    upcomingReports: any[];
    recentReports: any[];
    pendingInvoices: number;
    newReferrals: number;
}

export default function DashboardPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const ddor = (session as any)?.ddor;

    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/auth/signin');
    }, [status, router]);

    useEffect(() => {
        if (!ddor) return;

        const fetchDashboard = async () => {
            setLoading(true);
            try {
                const [clientsRes, overdueRes, upcomingRes] = await Promise.all([
                    fetch('/api/clients?status=active'),
                    fetch('/api/report-tracking?filter=overdue&limit=10'),
                    fetch('/api/report-tracking?filter=upcoming&limit=10'),
                ]);

                const clients = await clientsRes.json();
                const overdue = await overdueRes.json();
                const upcoming = await upcomingRes.json();

                setData({
                    activeClients: clients.clients?.length || 0,
                    overdueReports: overdue.tracking || [],
                    upcomingReports: upcoming.tracking || [],
                    recentReports: [],
                    pendingInvoices: 0,
                    newReferrals: 0,
                });
            } catch (e) {
                console.error('Dashboard fetch error:', e);
            }
            setLoading(false);
        };

        fetchDashboard();
    }, [ddor]);

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-ddor-blue" />
            </div>
        );
    }

    if (!ddor) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">No facility assigned to your account.</p>
                    <p className="text-sm text-gray-500">Contact your administrator for access.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    <StatCard
                        icon={Users}
                        label="Active Participants"
                        value={data?.activeClients || 0}
                        color="#2563eb"
                        onClick={() => router.push('/clients')}
                    />
                    <StatCard
                        icon={AlertTriangle}
                        label="Overdue Reports"
                        value={data?.overdueReports.length || 0}
                        color={data?.overdueReports.length ? '#dc2626' : '#10B981'}
                        onClick={() => router.push('/report-tracking?filter=overdue')}
                    />
                    <StatCard
                        icon={Clock}
                        label="Reports Due (14 days)"
                        value={data?.upcomingReports.length || 0}
                        color="#d97706"
                        onClick={() => router.push('/report-tracking?filter=upcoming')}
                    />
                    <StatCard
                        icon={DollarSign}
                        label="Pending Invoices"
                        value={data?.pendingInvoices || 0}
                        color="#7c3aed"
                        onClick={() => router.push('/invoices')}
                    />
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-10">
                    {[
                        { label: 'Referred Clients', icon: Users, href: '/clients', color: '#2563eb' },
                        { label: 'Report Tracking', icon: ClipboardList, href: '/report-tracking', color: '#d97706' },
                        { label: 'Submit Report', icon: FileText, href: '/reports/new', color: '#10B981' },
                        { label: 'Initiation', icon: Bell, href: '/initiation/new', color: '#dc2626' },
                        { label: 'Assessments', icon: Activity, href: '/assessments', color: '#7c3aed' },
                    ].map((action) => (
                        <button
                            key={action.label}
                            onClick={() => router.push(action.href)}
                            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col items-center gap-2 text-center group"
                        >
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors" style={{ backgroundColor: `${action.color}10` }}>
                                <action.icon className="w-5 h-5" style={{ color: action.color }} />
                            </div>
                            <span className="text-sm font-medium text-gray-700 group-hover:text-ddor-navy">{action.label}</span>
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Overdue Reports */}
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ borderLeft: '4px solid #dc2626' }}>
                        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ background: 'rgba(220, 38, 38, 0.03)' }}>
                            <h2 className="font-semibold text-ddor-navy flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                Overdue Reports
                            </h2>
                            <button
                                onClick={() => router.push('/report-tracking?filter=overdue')}
                                className="text-sm text-ddor-blue hover:underline flex items-center gap-1"
                            >
                                View All <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="divide-y max-h-80 overflow-y-auto">
                            {data?.overdueReports.length === 0 ? (
                                <div className="p-6 text-center text-gray-500 text-sm">
                                    No overdue reports — great work!
                                </div>
                            ) : (
                                data?.overdueReports.map((item: any) => (
                                    <div
                                        key={item.client_id}
                                        className="px-6 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                                        onClick={() => router.push(`/clients/${item.client_id}`)}
                                    >
                                        <div>
                                            <p className="font-medium text-sm text-gray-900">{item.client_name}</p>
                                            <p className="text-xs text-gray-500">{item.facility_name}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <OverdueIndicators tracking={item} />
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Upcoming Reports */}
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ borderLeft: '4px solid #d97706' }}>
                        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ background: 'rgba(217, 119, 6, 0.03)' }}>
                            <h2 className="font-semibold text-ddor-navy flex items-center gap-2">
                                <Clock className="w-5 h-5 text-amber-500" />
                                Upcoming Reports (Next 14 Days)
                            </h2>
                            <button
                                onClick={() => router.push('/report-tracking?filter=upcoming')}
                                className="text-sm text-ddor-blue hover:underline flex items-center gap-1"
                            >
                                View All <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="divide-y max-h-80 overflow-y-auto">
                            {data?.upcomingReports.length === 0 ? (
                                <div className="p-6 text-center text-gray-500 text-sm">
                                    No reports due in the next 14 days
                                </div>
                            ) : (
                                data?.upcomingReports.map((item: any) => (
                                    <div
                                        key={item.client_id}
                                        className="px-6 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                                        onClick={() => router.push(`/clients/${item.client_id}`)}
                                    >
                                        <div>
                                            <p className="font-medium text-sm text-gray-900">{item.client_name}</p>
                                            <p className="text-xs text-gray-500">{item.facility_name}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <UpcomingIndicators tracking={item} />
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// === Helper Components ===

function StatCard({ icon: Icon, label, value, color, onClick }: {
    icon: any; label: string; value: number; color: string; onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="bg-white rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-left w-full overflow-hidden"
            style={{ borderLeft: `4px solid ${color}` }}
        >
            <div className="p-5" style={{ background: `linear-gradient(135deg, ${color}06 0%, transparent 50%)` }}>
                <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
                        <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
                <p className="text-3xl font-extrabold tracking-tight" style={{ color }}>{value}</p>
                <p className="text-sm text-gray-500 mt-1 font-medium">{label}</p>
            </div>
        </button>
    );
}

function OverdueIndicators({ tracking }: { tracking: any }) {
    const milestones = [
        { key: 'fourteen_day', label: '14d', remaining: tracking.fourteen_day_remaining },
        { key: 'forty_two_day', label: '42d', remaining: tracking.forty_two_day_remaining },
        { key: 'ninety_day', label: '90d', remaining: tracking.ninety_day_remaining },
    ];

    return (
        <div className="flex gap-1">
            {milestones.map(m => {
                const status = tracking[`${m.key}_status`];
                if (status === 'completed' || status === 'not_applicable' || status === 'not_due') return null;
                if (m.remaining >= 0) return null;
                return (
                    <span key={m.key} className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-medium">
                        {m.label}: {Math.abs(m.remaining)}d late
                    </span>
                );
            })}
        </div>
    );
}

function UpcomingIndicators({ tracking }: { tracking: any }) {
    const milestones = [
        { key: 'fourteen_day', label: '14d', remaining: tracking.fourteen_day_remaining },
        { key: 'forty_two_day', label: '42d', remaining: tracking.forty_two_day_remaining },
        { key: 'ninety_day', label: '90d', remaining: tracking.ninety_day_remaining },
        { key: 'one_eighty_day', label: '180d', remaining: tracking.one_eighty_day_remaining },
    ];

    return (
        <div className="flex gap-1">
            {milestones.map(m => {
                const status = tracking[`${m.key}_status`];
                if (status === 'completed' || status === 'not_applicable' || status === 'not_due') return null;
                if (m.remaining < 0 || m.remaining > 14) return null;
                return (
                    <span key={m.key} className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 font-medium">
                        {m.label}: {m.remaining}d
                    </span>
                );
            })}
        </div>
    );
}
