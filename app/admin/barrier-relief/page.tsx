'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import {
    Loader2, Plus, Search, X, DollarSign, AlertTriangle,
    Home, ShoppingBag, Car, Clock, CheckCircle2, XCircle,
    ChevronRight, Shield
} from 'lucide-react';

const STATUS_CFG: Record<string, { bg: string; text: string; icon: any }> = {
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
    approved: { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle2 },
    disbursed: { bg: 'bg-blue-50', text: 'text-blue-700', icon: DollarSign },
    denied: { bg: 'bg-red-50', text: 'text-red-700', icon: XCircle },
};

export default function BarrierReliefPage() {
    const router = useRouter();
    const { data: session, status: authStatus } = useSession();
    const ddor = (session as any)?.ddor;

    const [requests, setRequests] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => { if (authStatus === 'unauthenticated') router.push('/auth/signin'); }, [authStatus, router]);

    useEffect(() => {
        if (!ddor) return;
        const params = new URLSearchParams();
        if (statusFilter) params.set('status', statusFilter);
        fetch(`/api/barrier-relief?${params}`)
            .then(r => r.json())
            .then(d => { setRequests(d.requests || []); setStats(d.stats || {}); })
            .finally(() => setLoading(false));
    }, [ddor, statusFilter]);

    const filtered = requests.filter(r =>
        !search || `${r.first_name} ${r.last_name} ${r.provider_name || ''} ${r.county_name || ''}`.toLowerCase().includes(search.toLowerCase())
    );

    if (authStatus === 'loading' || loading) {
        return <div className="min-h-screen bg-gray-50"><Header /><div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50"><Header />
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-ddor-navy">Barrier Relief Funding</h1>
                        <p className="text-sm text-gray-500 mt-1">{parseInt(stats.total) || 0} requests • Track and manage participant barrier relief</p>
                    </div>
                    <button onClick={() => router.push('/admin/barrier-relief/new')}
                        className="flex items-center gap-2 px-4 py-2 bg-ddor-blue text-white rounded-lg font-medium hover:bg-[#156090] text-sm">
                        <Plus className="w-4 h-4" /> New Request
                    </button>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <StatCard label="Pending" value={stats.pending || 0} color="#F59E0B" />
                    <StatCard label="Approved" value={stats.approved || 0} color="#10B981" />
                    <StatCard label="Disbursed" value={stats.disbursed || 0} color="#3B82F6" />
                    <StatCard label="Total Approved" value={`$${(parseFloat(stats.total_approved) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`} color="#10B981" />
                </div>

                {parseInt(stats.emergency_pending) > 0 && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <span className="text-sm font-medium text-red-800">{stats.emergency_pending} emergency request{parseInt(stats.emergency_pending) > 1 ? 's' : ''} pending review</span>
                    </div>
                )}

                {/* Filters */}
                <div className="flex gap-3 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, provider, county..." className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm" />
                        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-gray-400" /></button>}
                    </div>
                    <div className="flex rounded-lg border overflow-hidden">
                        {['', 'pending', 'approved', 'disbursed', 'denied'].map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                className={`px-3 py-2 text-xs font-medium ${statusFilter === s ? 'bg-ddor-blue text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                                {s || 'All'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                {filtered.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                        <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No barrier relief requests found.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(req => {
                            const sCfg = STATUS_CFG[req.status] || STATUS_CFG.pending;
                            const SIcon = sCfg.icon;
                            const total = (parseFloat(req.total_requested) || 0);
                            return (
                                <button key={req.id} onClick={() => router.push(`/admin/barrier-relief/${req.id}`)}
                                    className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow text-left">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${req.is_emergency ? 'bg-red-100' : 'bg-gray-100'}`}>
                                        {req.is_emergency ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <ShoppingBag className="w-5 h-5 text-gray-500" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-gray-900">{req.first_name} {req.last_name}</p>
                                            {req.is_emergency && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded font-medium">EMERGENCY</span>}
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <span className="text-xs text-gray-500">{req.provider_name || '—'}</span>
                                            {req.county_name && <span className="text-xs text-gray-400">{req.county_name} Co.</span>}
                                            <span className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            {req.is_housing_assistance && <span className="flex items-center gap-0.5 text-xs text-gray-500"><Home className="w-3 h-3" /> Housing</span>}
                                            {req.is_basic_needs && <span className="flex items-center gap-0.5 text-xs text-gray-500"><ShoppingBag className="w-3 h-3" /> Basic</span>}
                                            {req.is_transportation && <span className="flex items-center gap-0.5 text-xs text-gray-500"><Car className="w-3 h-3" /> Transport</span>}
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        {total > 0 && <p className="font-bold text-ddor-navy">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>}
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sCfg.bg} ${sCfg.text}`}>
                                            <SIcon className="w-3 h-3" /> {req.status}
                                        </span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                </button>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-4" style={{ borderLeft: `4px solid ${color}` }}>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
        </div>
    );
}
