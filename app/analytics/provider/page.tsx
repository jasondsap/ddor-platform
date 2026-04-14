'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import FilteredDashboard from '@/components/FilteredDashboard';
import { Loader2, Building, ChevronDown } from 'lucide-react';

export default function ProviderAnalyticsPage() {
    const router = useRouter();
    const { data: session, status: authStatus } = useSession();
    const ddor = (session as any)?.ddor;

    const [providers, setProviders] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authStatus === 'unauthenticated') router.push('/auth/signin');
    }, [authStatus, router]);

    useEffect(() => {
        if (!ddor) return;
        fetch('/api/providers')
            .then(r => r.json())
            .then(d => {
                const list = (d.providers || []).filter((p: any) => parseInt(p.active_client_count) > 0);
                setProviders(list);
                if (list.length > 0) setSelectedId(list[0].id);
            })
            .finally(() => setLoading(false));
    }, [ddor]);

    if (authStatus === 'loading' || loading) {
        return <div className="min-h-screen bg-gray-50"><Header /><div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div></div>;
    }

    const selected = providers.find(p => p.id === selectedId);

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <p className="text-sm text-ddor-blue font-medium mb-1">Provider Analytics</p>
                        <h1 className="text-2xl font-bold text-ddor-navy">{selected?.name || 'Select a Provider'}</h1>
                        {selected && (
                            <p className="text-sm text-gray-500 mt-1">
                                {selected.abbreviation ? `${selected.abbreviation} • ` : ''}{selected.facility_count || 0} facilities • {selected.active_client_count || 0} active clients
                            </p>
                        )}
                    </div>
                    <div className="relative min-w-[280px]">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            value={selectedId}
                            onChange={e => setSelectedId(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-ddor-blue/20 focus:border-ddor-blue"
                        >
                            <option value="">— Select Provider —</option>
                            {providers.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.active_client_count || 0} clients)</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Quick nav */}
                <div className="flex gap-2 mb-6">
                    <button onClick={() => router.push('/analytics')}
                        className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-full text-gray-600 hover:bg-gray-50">
                        Program-Wide
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium bg-ddor-blue text-white rounded-full">
                        By Provider
                    </button>
                    <button onClick={() => router.push('/analytics/county')}
                        className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-full text-gray-600 hover:bg-gray-50">
                        By County
                    </button>
                </div>

                {selectedId ? (
                    <FilteredDashboard
                        key={selectedId}
                        apiUrl={`/api/analytics/filtered?provider_id=${selectedId}`}
                        title={selected?.name || 'Provider'}
                        subtitle={`${selected?.facility_count || 0} facilities`}
                    />
                ) : (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                        <Building className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Select a provider above to view their analytics.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
