'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import KentuckyMap from '@/components/KentuckyMap';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
import {
    Loader2, Users, FileText, Building, DollarSign,
    TrendingUp, AlertTriangle, CheckCircle2, Clock,
    Activity, BarChart3, PieChart as PieChartIcon, MapPin
} from 'lucide-react';
import { REPORT_TYPE_LABELS } from '@/types';

const COLORS = ['#1A73A8', '#2DD4BF', '#F59E0B', '#8B5CF6', '#EF4444', '#10B981', '#EC4899', '#6366F1'];
const DIAGNOSIS_COLORS: Record<string, string> = { sud: '#1A73A8', mh: '#8B5CF6', co_occurring: '#2DD4BF', unspecified: '#9CA3AF' };
const DIAGNOSIS_LABELS: Record<string, string> = { sud: 'SUD', mh: 'Mental Health', co_occurring: 'Co-Occurring', unspecified: 'Unspecified' };
const MILESTONE_LABELS: Record<string, string> = { fourteen_day: '14-Day', forty_two_day: '42-Day', ninety_day: '90-Day', final_report: 'Final' };

export default function AnalyticsPage() {
    const router = useRouter();
    const { data: session, status: authStatus } = useSession();
    const ddor = (session as any)?.ddor;
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        if (authStatus === 'unauthenticated') router.push('/auth/signin');
    }, [authStatus, router]);

    useEffect(() => {
        if (!ddor) return;
        fetch('/api/analytics')
            .then(r => r.json())
            .then(d => setData(d))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [ddor]);

    if (authStatus === 'loading' || loading) {
        return <div className="min-h-screen bg-gray-50"><Header /><div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div></div>;
    }

    if (!data) return null;

    const stats = data.programStats || {};
    const safe = (v: any) => parseInt(v) || 0;
    const completionData = (data.reportCompletionRates || []).map((r: any) => ({
        milestone: MILESTONE_LABELS[r.milestone] || r.milestone,
        Completed: parseInt(r.completed) || 0,
        Overdue: parseInt(r.overdue) || 0,
        Pending: parseInt(r.pending) || 0,
    }));

    const diagnosisData = (data.diagnosisBreakdown || []).map((d: any) => ({
        name: DIAGNOSIS_LABELS[d.diagnosis] || d.diagnosis,
        value: parseInt(d.count),
        color: DIAGNOSIS_COLORS[d.diagnosis] || '#9CA3AF',
    }));

    const reportTypeData = (data.reportsByType || []).map((r: any) => ({
        name: REPORT_TYPE_LABELS[r.report_type as keyof typeof REPORT_TYPE_LABELS]?.replace(' Report', '').replace(' Stabilization', '') || r.report_type,
        count: parseInt(r.count),
    })).slice(0, 8);

    const monthlyData = (data.reportsByMonth || []).map((r: any) => ({
        month: r.month,
        reports: parseInt(r.count),
    }));

    const providerData = (data.providerStats || []).map((p: any) => ({
        name: p.abbreviation || p.provider_name?.substring(0, 20),
        clients: parseInt(p.client_count),
        reports: parseInt(p.report_count),
        facilities: parseInt(p.facility_count),
    }));

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-ddor-navy">Program Analytics</h1>
                    <p className="text-sm text-gray-500 mt-1">BHCDP/SB90 Program — Data Driven Outcomes</p>
                </div>

                {/* View switcher */}
                <div className="flex gap-2 mb-6">
                    <button className="px-3 py-1.5 text-xs font-medium bg-ddor-blue text-white rounded-full">
                        Program-Wide
                    </button>
                    <button onClick={() => router.push('/analytics/provider')}
                        className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-full text-gray-600 hover:bg-gray-50">
                        By Provider
                    </button>
                    <button onClick={() => router.push('/analytics/county')}
                        className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-full text-gray-600 hover:bg-gray-50">
                        By County
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                    <KPICard icon={Users} label="Active Participants" value={safe(stats.active_clients)} color="#2563eb" />
                    <KPICard icon={FileText} label="Reports Submitted" value={safe(stats.total_reports)} color="#10B981" />
                    <KPICard icon={AlertTriangle} label="Clients w/ Overdue" value={safe(stats.clients_with_overdue)} color="#EF4444" />
                    <KPICard icon={Building} label="Active Facilities" value={safe(stats.active_facilities)} color="#8B5CF6" />
                    <KPICard icon={DollarSign} label="Total Paid" value={`$${(parseFloat(stats.total_paid) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`} color="#10B981" />
                    <KPICard icon={Activity} label="Total Referrals" value={safe(stats.total_referrals)} color="#F59E0B" />
                </div>

                {/* Row 1: Report Completion + Diagnosis */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Report Completion Rates */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="w-5 h-5 text-ddor-blue" />
                            <h2 className="font-semibold text-ddor-navy">Report Completion by Milestone</h2>
                        </div>
                        {completionData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={completionData} barCategoryGap="20%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="milestone" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                    <Bar dataKey="Completed" fill="#10B981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Pending" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Overdue" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <EmptyChart />}
                    </div>

                    {/* Diagnosis Breakdown */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <PieChartIcon className="w-5 h-5 text-ddor-blue" />
                            <h2 className="font-semibold text-ddor-navy">Diagnosis Breakdown</h2>
                        </div>
                        {diagnosisData.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={diagnosisData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                                            {diagnosisData.map((entry: any, i: number) => (
                                                <Cell key={i} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-wrap gap-3 justify-center mt-2">
                                    {diagnosisData.map((d: any) => (
                                        <div key={d.name} className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                                            <span className="text-xs text-gray-600">{d.name} ({d.value})</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : <EmptyChart />}
                    </div>
                </div>

                {/* Row 2: Monthly Trend + Reports by Type */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Monthly Report Volume */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="w-5 h-5 text-ddor-blue" />
                            <h2 className="font-semibold text-ddor-navy">Monthly Report Volume</h2>
                        </div>
                        {monthlyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
                                    <Area type="monotone" dataKey="reports" stroke="#1A73A8" fill="#1A73A8" fillOpacity={0.15} strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : <EmptyChart />}
                    </div>

                    {/* Reports by Type */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText className="w-5 h-5 text-ddor-blue" />
                            <h2 className="font-semibold text-ddor-navy">Reports by Type</h2>
                        </div>
                        {reportTypeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={reportTypeData} layout="vertical" margin={{ left: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 12 }} />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
                                    <Bar dataKey="count" fill="#1A73A8" radius={[0, 4, 4, 0]}>
                                        {reportTypeData.map((_: any, i: number) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <EmptyChart />}
                    </div>
                </div>

                {/* Row 3: Provider Comparison */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Building className="w-5 h-5 text-ddor-blue" />
                        <h2 className="font-semibold text-ddor-navy">Provider Overview</h2>
                    </div>
                    {providerData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={providerData} barCategoryGap="15%">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="clients" name="Clients" fill="#1A73A8" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="reports" name="Reports" fill="#2DD4BF" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <EmptyChart />}
                </div>

                {/* Row 4: Kentucky Map */}
                <div className="mb-6">
                    <KentuckyMap
                        data={(data.countyStats || []).map((c: any) => ({
                            county_name: c.county_name,
                            client_count: parseInt(c.client_count) || 0,
                            facility_count: parseInt(c.facility_count) || 0,
                        }))}
                        title="Kentucky Program Coverage"
                        colorScheme="blue"
                        valueLabel="Participants"
                    />
                </div>

                {/* Row 5: County Stats + Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* County Participation */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <MapPin className="w-5 h-5 text-ddor-blue" />
                            <h2 className="font-semibold text-ddor-navy">County Participation</h2>
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {(data.countyStats || []).map((c: any, i: number) => {
                                const maxCount = Math.max(...(data.countyStats || []).map((x: any) => parseInt(x.client_count)));
                                const pct = maxCount > 0 ? (parseInt(c.client_count) / maxCount) * 100 : 0;
                                return (
                                    <div key={c.county_name} className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500 w-24 truncate">{c.county_name}</span>
                                        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                                        </div>
                                        <span className="text-xs font-medium text-ddor-navy w-8 text-right">{c.client_count}</span>
                                    </div>
                                );
                            })}
                            {(!data.countyStats || data.countyStats.length === 0) && <p className="text-sm text-gray-400 text-center py-8">No county data yet.</p>}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock className="w-5 h-5 text-ddor-blue" />
                            <h2 className="font-semibold text-ddor-navy">Recent Activity</h2>
                        </div>
                        <div className="space-y-3">
                            {(data.recentActivity || []).map((a: any, i: number) => (
                                <div key={i} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${a.type === 'report' ? 'bg-blue-50' : 'bg-green-50'}`}>
                                        {a.type === 'report' ? <FileText className="w-4 h-4 text-ddor-blue" /> : <Users className="w-4 h-4 text-green-600" />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {a.type === 'report'
                                                ? `${REPORT_TYPE_LABELS[a.subtype as keyof typeof REPORT_TYPE_LABELS] || a.subtype}`
                                                : 'New Referral'}
                                        </p>
                                        <p className="text-xs text-gray-500">{a.name}{a.facility ? ` • ${a.facility}` : ''}</p>
                                        <p className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString()} {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            ))}
                            {(!data.recentActivity || data.recentActivity.length === 0) && <p className="text-sm text-gray-400 text-center py-8">No recent activity.</p>}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// ======= COMPONENTS =======

function KPICard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-4 overflow-hidden" style={{ borderLeft: `4px solid ${color}` }}>
            <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
            </div>
            <p className="text-2xl font-extrabold tracking-tight" style={{ color }}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        </div>
    );
}

function EmptyChart() {
    return <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">No data available yet</div>;
}
