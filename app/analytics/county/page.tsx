'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import FilteredDashboard from '@/components/FilteredDashboard';
import { Loader2, MapPin, ChevronDown } from 'lucide-react';

export default function CountyAnalyticsPage() {
    const router = useRouter();
    const { data: session, status: authStatus } = useSession();
    const ddor = (session as any)?.ddor;

    const [counties, setCounties] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authStatus === 'unauthenticated') router.push('/auth/signin');
    }, [authStatus, router]);

    useEffect(() => {
        if (!ddor) return;
        // Get counties that have facilities with clients
        fetch('/api/facilities?include_inactive=true')
            .then(r => r.json())
            .then(d => {
                const countyMap = new Map<string, { id: string; name: string; facilityCount: number; clientCount: number }>();
                for (const f of d.facilities || []) {
                    if (!f.county_id || !f.county_name) continue;
                    const existing = countyMap.get(f.county_id);
                    if (existing) {
                        existing.facilityCount++;
                        existing.clientCount += parseInt(f.active_client_count) || 0;
                    } else {
                        countyMap.set(f.county_id, {
                            id: f.county_id, name: f.county_name,
                            facilityCount: 1,
                            clientCount: parseInt(f.active_client_count) || 0,
                        });
                    }
                }
                const list = Array.from(countyMap.values())
                    .filter(c => c.clientCount > 0)
                    .sort((a, b) => b.clientCount - a.clientCount);
                setCounties(list);
                if (list.length > 0) setSelectedId(list[0].id);
            })
            .finally(() => setLoading(false));
    }, [ddor]);

    if (authStatus === 'loading' || loading) {
        return <div className="min-h-screen bg-gray-50"><Header /><div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div></div>;
    }

    const selected = counties.find(c => c.id === selectedId);

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <p className="text-sm text-ddor-blue font-medium mb-1">County Analytics</p>
                        <h1 className="text-2xl font-bold text-ddor-navy">{selected ? `${selected.name} County` : 'Select a County'}</h1>
                        {selected && (
                            <p className="text-sm text-gray-500 mt-1">
                                {selected.facilityCount} facilities • {selected.clientCount} active clients
                            </p>
                        )}
                    </div>
                    <div className="relative min-w-[280px]">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            value={selectedId}
                            onChange={e => setSelectedId(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-ddor-blue/20 focus:border-ddor-blue"
                        >
                            <option value="">— Select County —</option>
                            {counties.map(c => (
                                <option key={c.id} value={c.id}>{c.name} County ({c.clientCount} clients)</option>
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
                    <button onClick={() => router.push('/analytics/provider')}
                        className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-full text-gray-600 hover:bg-gray-50">
                        By Provider
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium bg-ddor-blue text-white rounded-full">
                        By County
                    </button>
                </div>

                {selectedId ? (
                    <FilteredDashboard
                        key={selectedId}
                        apiUrl={`/api/analytics/filtered?county_id=${selectedId}`}
                        title={selected ? `${selected.name} County` : 'County'}
                        subtitle={`${selected?.facilityCount || 0} facilities`}
                    />
                ) : (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                        <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Select a county above to view analytics.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
