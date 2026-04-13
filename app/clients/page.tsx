'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import {
    Search, Plus, ChevronRight, Loader2, Users,
    AlertTriangle, CheckCircle2, Clock, Archive, X, Building
} from 'lucide-react';
import { STATUS_COLORS } from '@/types';
import type { ReportCompletionStatus } from '@/types';

export default function ClientsPage() {
    const router = useRouter();
    const { data: session, status: authStatus } = useSession();
    const ddor = (session as any)?.ddor;

    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showArchived, setShowArchived] = useState(false);
    const [providerFilter, setProviderFilter] = useState('');
    const [facilityFilter, setFacilityFilter] = useState('');

    useEffect(() => {
        if (authStatus === 'unauthenticated') router.push('/auth/signin');
    }, [authStatus, router]);

    useEffect(() => {
        if (!ddor) return;
        fetchClients();
    }, [ddor, showArchived]);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const status = showArchived ? 'all' : 'active';
            const res = await fetch(`/api/clients?status=${status}`);
            const data = await res.json();
            setClients(data.clients || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    // Extract unique providers and facilities for filter dropdowns
    const providers = useMemo(() => {
        const names = Array.from(new Set(clients.map(c => c.provider_name).filter(Boolean))).sort();
        return names;
    }, [clients]);

    const facilities = useMemo(() => {
        let list = clients.map(c => ({ name: c.facility_name, provider: c.provider_name })).filter(f => f.name);
        if (providerFilter) list = list.filter(f => f.provider === providerFilter);
        const names = Array.from(new Set(list.map(f => f.name))).sort();
        return names;
    }, [clients, providerFilter]);

    const filtered = clients.filter(c => {
        if (providerFilter && c.provider_name !== providerFilter) return false;
        if (facilityFilter && c.facility_name !== facilityFilter) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            c.first_name?.toLowerCase().includes(q) ||
            c.last_name?.toLowerCase().includes(q) ||
            c.ddor_id?.toLowerCase().includes(q) ||
            c.provider_name?.toLowerCase().includes(q) ||
            c.facility_name?.toLowerCase().includes(q)
        );
    });

    const getNextDueReport = (client: any) => {
        const statuses = [
            { key: 'fourteen_day_status', label: '14-Day' },
            { key: 'kyae_referral_status', label: 'KYAE' },
            { key: 'forty_two_day_status', label: '42-Day' },
            { key: 'ninety_day_status', label: '90-Day' },
            { key: 'one_eighty_day_status', label: '180-Day' },
            { key: 'two_seventy_day_status', label: '270-Day' },
            { key: 'three_sixty_day_status', label: '360-Day' },
            { key: 'final_report_status', label: 'Final' },
        ];
        for (const s of statuses) {
            const val = client[s.key] as ReportCompletionStatus;
            if (val === 'pending' || val === 'overdue') return { label: s.label, status: val };
        }
        return null;
    };

    if (authStatus === 'loading') {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>;
    }

    const hasFilters = providerFilter || facilityFilter;

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Page header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-ddor-navy">Referred Clients</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {filtered.length} {showArchived ? 'total' : 'active'} participant{filtered.length !== 1 ? 's' : ''}
                            {hasFilters && ` (filtered)`}
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/clients/new')}
                        className="flex items-center gap-2 px-4 py-2 bg-ddor-blue text-white rounded-lg font-medium hover:bg-[#156090] text-sm"
                    >
                        <Plus className="w-4 h-4" /> New Client
                    </button>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col gap-3 mb-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, DDOR ID, provider, or facility..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ddor-blue/20 focus:border-ddor-blue"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <X className="w-4 h-4 text-gray-400" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowArchived(!showArchived)}
                            className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
                                showArchived ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <Archive className="w-4 h-4" />
                            {showArchived ? 'Showing All' : 'Show Archived'}
                        </button>
                    </div>

                    {/* Provider / Facility filters */}
                    <div className="flex flex-wrap gap-3">
                        <select
                            value={providerFilter}
                            onChange={(e) => { setProviderFilter(e.target.value); setFacilityFilter(''); }}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white min-w-[200px]"
                        >
                            <option value="">All Providers</option>
                            {providers.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>

                        <select
                            value={facilityFilter}
                            onChange={(e) => setFacilityFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white min-w-[200px]"
                        >
                            <option value="">All Facilities</option>
                            {facilities.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>

                        {hasFilters && (
                            <button onClick={() => { setProviderFilter(''); setFacilityFilter(''); }}
                                className="px-3 py-2 text-sm text-ddor-blue hover:underline flex items-center gap-1">
                                <X className="w-3 h-3" /> Clear filters
                            </button>
                        )}
                    </div>
                </div>

                {/* Client List */}
                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">{search || hasFilters ? 'No clients match your search/filters' : 'No active clients yet'}</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        {/* Table header */}
                        <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="col-span-3">Name</div>
                            <div className="col-span-2">Provider</div>
                            <div className="col-span-2">Facility</div>
                            <div className="col-span-1">Tx Start</div>
                            <div className="col-span-1">Dx</div>
                            <div className="col-span-2">Report Status</div>
                            <div className="col-span-1"></div>
                        </div>

                        {/* Rows */}
                        <div className="divide-y">
                            {filtered.map((client) => {
                                const nextDue = getNextDueReport(client);
                                return (
                                    <div
                                        key={client.id}
                                        onClick={() => router.push(`/clients/${client.id}`)}
                                        className={`grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                                            client.is_archived ? 'opacity-60' : ''
                                        }`}
                                    >
                                        {/* Name */}
                                        <div className="lg:col-span-3 flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-ddor-light flex items-center justify-center text-ddor-blue font-semibold text-sm flex-shrink-0">
                                                {client.first_name?.[0]}{client.last_name?.[0]}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-sm text-gray-900 truncate">
                                                    {client.last_name}, {client.first_name}
                                                </p>
                                                {client.ddor_id && (
                                                    <p className="text-xs text-gray-500">ID: {client.ddor_id}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Provider */}
                                        <div className="lg:col-span-2 flex items-center">
                                            <p className="text-sm text-gray-700 truncate font-medium">
                                                {client.provider_abbreviation || client.provider_name || '—'}
                                            </p>
                                        </div>

                                        {/* Facility */}
                                        <div className="lg:col-span-2 flex items-center">
                                            <p className="text-sm text-gray-600 truncate">
                                                {client.facility_name || '—'}
                                            </p>
                                        </div>

                                        {/* Tx Start */}
                                        <div className="lg:col-span-1 flex items-center">
                                            <p className="text-sm text-gray-600">
                                                {client.treatment_start_date
                                                    ? new Date(client.treatment_start_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
                                                    : '—'}
                                            </p>
                                        </div>

                                        {/* Dx */}
                                        <div className="lg:col-span-1 flex items-center">
                                            {client.diagnosis && (
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 font-medium uppercase">
                                                    {client.diagnosis === 'co_occurring' ? 'Co-Oc' : client.diagnosis}
                                                </span>
                                            )}
                                        </div>

                                        {/* Report Status */}
                                        <div className="lg:col-span-2 flex items-center gap-1.5 flex-wrap">
                                            {nextDue ? (
                                                <span
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                                    style={{
                                                        backgroundColor: nextDue.status === 'overdue' ? '#FEE2E2' : '#FEF3C7',
                                                        color: nextDue.status === 'overdue' ? '#991B1B' : '#92400E',
                                                    }}
                                                >
                                                    {nextDue.status === 'overdue' ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                    {nextDue.label}
                                                </span>
                                            ) : client.is_archived ? (
                                                <span className="text-xs text-gray-400">Archived</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                                                    <CheckCircle2 className="w-3 h-3" /> Current
                                                </span>
                                            )}

                                            {/* Mini milestone dots */}
                                            <div className="hidden xl:flex items-center gap-0.5 ml-1">
                                                {['fourteen_day_status', 'forty_two_day_status', 'ninety_day_status', 'one_eighty_day_status', 'two_seventy_day_status', 'three_sixty_day_status', 'final_report_status'].map((key) => {
                                                    const s = client[key] as ReportCompletionStatus;
                                                    return (
                                                        <div
                                                            key={key}
                                                            className="w-2 h-2 rounded-full"
                                                            style={{ backgroundColor: STATUS_COLORS[s] || '#D1D5DB' }}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Arrow */}
                                        <div className="lg:col-span-1 flex items-center justify-end">
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
