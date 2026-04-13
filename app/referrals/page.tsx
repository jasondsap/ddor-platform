'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import {
    Search, Plus, ChevronRight, Loader2, UserPlus,
    AlertCircle, CheckCircle2, Clock, X, MapPin, Phone
} from 'lucide-react';

export default function ReferralsPage() {
    const router = useRouter();
    const { data: session, status: authStatus } = useSession();
    const ddor = (session as any)?.ddor;

    const [referrals, setReferrals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('open');

    useEffect(() => {
        if (authStatus === 'unauthenticated') router.push('/auth/signin');
    }, [authStatus, router]);

    useEffect(() => {
        if (!ddor?.userId) return;
        fetchReferrals();
    }, [ddor?.userId, statusFilter]);

    const fetchReferrals = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/referrals?status=${statusFilter}`);
            const data = await res.json();
            setReferrals(data.referrals || []);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const filtered = referrals.filter(r => {
        if (!search) return true;
        const q = search.toLowerCase();
        return r.first_name?.toLowerCase().includes(q) || r.last_name?.toLowerCase().includes(q);
    });

    const getStatusBadge = (ref: any) => {
        const s = ref.referral_type_status;
        if (s === 'closed') return { label: ref.closed_reason?.replace(/_/g, ' ') || 'Closed', bg: 'bg-gray-100', text: 'text-gray-600' };
        if (s === 'open_within_72_hours') return { label: 'Within 72hr', bg: 'bg-red-50', text: 'text-red-700' };
        if (s === 'open_72hr_to_2_weeks') return { label: '72hr–2wk', bg: 'bg-amber-50', text: 'text-amber-700' };
        if (s === 'open_2_weeks_to_2_months') return { label: '2wk–2mo', bg: 'bg-blue-50', text: 'text-blue-700' };
        if (s === 'inactive_2_months_plus') return { label: 'Inactive 2mo+', bg: 'bg-gray-50', text: 'text-gray-500' };
        return { label: s?.replace(/_/g, ' ') || 'Unknown', bg: 'bg-gray-50', text: 'text-gray-500' };
    };

    if (authStatus === 'loading') {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-ddor-navy">Referrals</h1>
                        <p className="text-sm text-gray-500 mt-1">{filtered.length} referral{filtered.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                        onClick={() => router.push('/referrals/new')}
                        className="flex items-center gap-2 px-4 py-2 bg-ddor-blue text-white rounded-lg font-medium hover:bg-[#156090] text-sm"
                    >
                        <Plus className="w-4 h-4" /> New Referral
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ddor-blue/20 focus:border-ddor-blue"
                        />
                    </div>
                    <div className="flex gap-2">
                        {['open', 'closed', 'all'].map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                                    statusFilter === s ? 'bg-ddor-blue text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                        <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No referrals found.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm divide-y">
                        {filtered.map((ref) => {
                            const badge = getStatusBadge(ref);
                            return (
                                <div
                                    key={ref.id}
                                    onClick={() => router.push(`/referrals/${ref.id}`)}
                                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 cursor-pointer"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-ddor-light flex items-center justify-center text-ddor-blue font-semibold text-sm">
                                            {ref.first_name?.[0]}{ref.last_name?.[0]}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-gray-900">{ref.last_name}, {ref.first_name}</p>
                                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                                {ref.county_name && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ref.county_name}</span>}
                                                {ref.date_received && <span>Recv: {new Date(ref.date_received).toLocaleDateString()}</span>}
                                                {ref.assessor_status && <span className="capitalize">{ref.assessor_status.replace(/_/g, ' ')}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {ref.is_urgent && (
                                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">URGENT</span>
                                        )}
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                                            {badge.label}
                                        </span>
                                        {ref.linked_client_id && <span title="Linked to client"><CheckCircle2 className="w-4 h-4 text-green-500" /></span>}
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
