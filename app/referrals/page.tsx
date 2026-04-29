'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import {
    Search, Plus, ChevronRight, Loader2, UserPlus,
    CheckCircle2, X, MapPin, AlertTriangle, Filter
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    'open_within_72_hours': { label: 'Within 72hr', bg: 'bg-red-50', text: 'text-red-700' },
    'open_72_to_2_weeks': { label: '72hr–2wk', bg: 'bg-amber-50', text: 'text-amber-700' },
    'open_2_weeks_to_2_months': { label: '2wk–2mo', bg: 'bg-blue-50', text: 'text-blue-700' },
    'inactive_2_months_plus': { label: 'Inactive 2mo+', bg: 'bg-gray-100', text: 'text-gray-600' },
    'closed': { label: 'Closed', bg: 'bg-gray-200', text: 'text-gray-700' },
};

const ASSESSOR_OPTIONS = ['Scheduled', 'Attempted to Contact', 'Pending', 'Other', 'Screened'];

export default function ReferralsPage() {
    const router = useRouter();
    const { data: session, status: authStatus } = useSession();
    const ddor = (session as any)?.ddor;

    const [referrals, setReferrals] = useState<any[]>([]);
    const [counties, setCounties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('open');
    const [countyFilter, setCountyFilter] = useState('');
    const [assessorFilter, setAssessorFilter] = useState('');
    const [referralStatusFilter, setReferralStatusFilter] = useState('');

    useEffect(() => { if (authStatus === 'unauthenticated') router.push('/auth/signin'); }, [authStatus, router]);

    useEffect(() => {
        if (!ddor?.userId) return;
        fetchReferrals();
    }, [ddor?.userId, statusFilter, countyFilter, assessorFilter, referralStatusFilter]);

    const fetchReferrals = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('status', statusFilter);
        if (countyFilter) params.set('county_id', countyFilter);
        if (assessorFilter) params.set('assessor_status', assessorFilter);
        if (referralStatusFilter) params.set('referral_type_status', referralStatusFilter);
        const data = await fetch(`/api/referrals?${params}`).then(r => r.json());
        setReferrals(data.referrals || []);
        if (data.counties) setCounties(data.counties);
        setLoading(false);
    };

    const filtered = referrals.filter(r => {
        if (!search) return true;
        const q = search.toLowerCase();
        return `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) || r.referral_number?.toString().includes(q);
    });

    const hasFilters = countyFilter || assessorFilter || referralStatusFilter;
    const clearFilters = () => { setCountyFilter(''); setAssessorFilter(''); setReferralStatusFilter(''); };

    // Stats
    const urgentCount = filtered.filter(r => r.is_urgent).length;
    const linkedCount = filtered.filter(r => r.linked_client_id).length;

    if (authStatus === 'loading') return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>;

    return (
        <div className="min-h-screen bg-gray-50"><Header />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-ddor-navy">Referrals</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {filtered.length} referral{filtered.length !== 1 ? 's' : ''}
                            {urgentCount > 0 && <span className="text-red-600 ml-2">{urgentCount} urgent</span>}
                            {linkedCount > 0 && <span className="text-green-600 ml-2">{linkedCount} linked to clients</span>}
                        </p>
                    </div>
                    <button onClick={() => router.push('/referrals/new')}
                        className="flex items-center gap-2 px-4 py-2 bg-ddor-blue text-white rounded-lg font-medium hover:bg-[#156090] text-sm">
                        <Plus className="w-4 h-4" /> New Referral
                    </button>
                </div>

                {/* Filters Row */}
                <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
                    <div className="flex flex-wrap gap-3 items-end">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input type="text" placeholder="Name or referral #..." value={search} onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" />
                            </div>
                        </div>

                        {/* Open/Closed/All */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                            <div className="flex rounded-lg border overflow-hidden">
                                {['open', 'closed', 'all'].map(s => (
                                    <button key={s} onClick={() => setStatusFilter(s)}
                                        className={`px-3 py-2 text-xs font-medium capitalize ${statusFilter === s ? 'bg-ddor-blue text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* County */}
                        <div className="min-w-[150px]">
                            <label className="block text-xs font-medium text-gray-500 mb-1">County</label>
                            <select value={countyFilter} onChange={e => setCountyFilter(e.target.value)}
                                className="w-full p-2 border rounded-lg text-sm">
                                <option value="">All Counties</option>
                                {counties.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        {/* Assessor Status */}
                        <div className="min-w-[150px]">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Assessor Status</label>
                            <select value={assessorFilter} onChange={e => setAssessorFilter(e.target.value)}
                                className="w-full p-2 border rounded-lg text-sm">
                                <option value="">All</option>
                                {ASSESSOR_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {/* Referral Status */}
                        <div className="min-w-[150px]">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Referral Status</label>
                            <select value={referralStatusFilter} onChange={e => setReferralStatusFilter(e.target.value)}
                                className="w-full p-2 border rounded-lg text-sm">
                                <option value="">All</option>
                                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        </div>

                        {hasFilters && (
                            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg">
                                <X className="w-3 h-3" /> Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                        <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No referrals found.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b">
                                        <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600">County</th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600">Referral Date</th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600">Assessor Status</th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600">Referral Status</th>
                                        <th className="text-center px-4 py-3 font-medium text-gray-600">Client</th>
                                        <th className="text-right px-4 py-3 font-medium text-gray-600"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(ref => {
                                        const sCfg = STATUS_CONFIG[ref.referral_type_status] || { label: ref.referral_type_status, bg: 'bg-gray-50', text: 'text-gray-500' };
                                        return (
                                            <tr key={ref.id} onClick={() => router.push(`/referrals/${ref.id}`)}
                                                className="border-b last:border-0 hover:bg-gray-50 cursor-pointer">
                                                {/* Name */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-ddor-light flex items-center justify-center text-ddor-blue font-semibold text-xs flex-shrink-0">
                                                            {ref.first_name?.[0]}{ref.last_name?.[0]}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900">{ref.last_name}, {ref.first_name}</p>
                                                            {ref.is_urgent && (
                                                                <span className="inline-flex items-center gap-0.5 text-xs text-red-600 font-medium">
                                                                    <AlertTriangle className="w-3 h-3" /> Urgent
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* County */}
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-gray-700">{ref.county_name || '—'}</span>
                                                </td>

                                                {/* Referral Date */}
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-gray-700">
                                                        {ref.referral_date ? new Date(ref.referral_date).toLocaleDateString() : ref.date_received ? new Date(ref.date_received).toLocaleDateString() : '—'}
                                                    </span>
                                                </td>

                                                {/* Assessor Status */}
                                                <td className="px-4 py-3">
                                                    {ref.assessor_status ? (
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            ref.assessor_status === 'Screened' ? 'bg-green-50 text-green-700' :
                                                            ref.assessor_status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                                                            ref.assessor_status === 'Scheduled' ? 'bg-blue-50 text-blue-700' :
                                                            ref.assessor_status === 'Attempted to Contact' ? 'bg-orange-50 text-orange-700' :
                                                            'bg-gray-100 text-gray-600'
                                                        }`}>
                                                            {ref.assessor_status}
                                                        </span>
                                                    ) : <span className="text-gray-400">—</span>}
                                                </td>

                                                {/* Referral Status */}
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sCfg.bg} ${sCfg.text}`}>
                                                        {sCfg.label}
                                                    </span>
                                                </td>

                                                {/* Linked Client */}
                                                <td className="px-4 py-3 text-center">
                                                    {ref.linked_client_id ? (
                                                        <span title={ref.linked_client_name}><CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /></span>
                                                    ) : (
                                                        <span className="text-gray-300">—</span>
                                                    )}
                                                </td>

                                                {/* Arrow */}
                                                <td className="px-4 py-3 text-right">
                                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
