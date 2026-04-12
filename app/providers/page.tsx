'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import {
    Search, Building, Users, FileText, ChevronRight,
    Loader2, X, MapPin
} from 'lucide-react';

export default function ProvidersPage() {
    const router = useRouter();
    const { data: session, status: authStatus } = useSession();
    const ddor = (session as any)?.ddor;

    const [providers, setProviders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (authStatus === 'unauthenticated') router.push('/auth/signin');
    }, [authStatus, router]);

    useEffect(() => {
        if (!ddor) return;
        fetch('/api/providers')
            .then(r => r.json())
            .then(d => setProviders(d.providers || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [ddor]);

    const filtered = providers.filter(p => {
        if (!search) return true;
        const q = search.toLowerCase();
        return p.name?.toLowerCase().includes(q) || p.abbreviation?.toLowerCase().includes(q);
    });

    const totalClients = providers.reduce((s, p) => s + (parseInt(p.active_client_count) || 0), 0);
    const totalFacilities = providers.reduce((s, p) => s + (parseInt(p.facility_count) || 0), 0);

    if (authStatus === 'loading') return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-ddor-navy">Providers</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {providers.length} providers • {totalFacilities} facilities • {totalClients} active clients
                        </p>
                    </div>
                </div>

                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search providers..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ddor-blue/20" />
                    {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-gray-400" /></button>}
                </div>

                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map(p => (
                            <button
                                key={p.id}
                                onClick={() => router.push(`/providers/${p.id}`)}
                                className="bg-white rounded-xl shadow-sm p-5 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                                style={{ borderLeft: parseInt(p.active_client_count) > 0 ? '4px solid #2563eb' : '4px solid #e5e7eb' }}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-9 h-9 rounded-lg bg-ddor-light flex items-center justify-center">
                                            <Building className="w-4 h-4 text-ddor-blue" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-ddor-navy leading-tight">{p.name}</p>
                                            {p.abbreviation && <p className="text-xs text-gray-400">{p.abbreviation}</p>}
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                </div>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> {p.facility_count || 0} facilities
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        <span className={parseInt(p.active_client_count) > 0 ? 'text-ddor-blue font-medium' : ''}>
                                            {p.active_client_count || 0} clients
                                        </span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <FileText className="w-3 h-3" /> {p.total_reports || 0} reports
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
