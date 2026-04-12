'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import {
    Search, Plus, Building, MapPin, Phone, Users,
    ChevronRight, Loader2, X, Filter, CheckCircle2,
    XCircle, Globe
} from 'lucide-react';

export default function FacilitiesPage() {
    const router = useRouter();
    const { data: session, status: authStatus } = useSession();
    const ddor = (session as any)?.ddor;

    const [facilities, setFacilities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const [regionFilter, setRegionFilter] = useState('');

    useEffect(() => {
        if (authStatus === 'unauthenticated') router.push('/auth/signin');
    }, [authStatus, router]);

    useEffect(() => {
        if (!ddor) return;
        fetchFacilities();
    }, [ddor, showInactive]);

    const fetchFacilities = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (showInactive) params.set('include_inactive', 'true');
            const res = await fetch(`/api/facilities?${params}`);
            const data = await res.json();
            setFacilities(data.facilities || []);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const filtered = facilities.filter(f => {
        if (regionFilter && f.region !== regionFilter) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            f.name?.toLowerCase().includes(q) ||
            f.provider_name?.toLowerCase().includes(q) ||
            f.provider_abbreviation?.toLowerCase().includes(q) ||
            f.county_name?.toLowerCase().includes(q) ||
            f.city?.toLowerCase().includes(q)
        );
    });

    const regions = [...new Set(facilities.map(f => f.region).filter(Boolean))].sort();
    const totalActive = facilities.filter(f => !f.is_inactive).length;
    const totalInactive = facilities.filter(f => f.is_inactive).length;

    if (authStatus === 'loading') {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-ddor-navy">Facilities</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {totalActive} active{showInactive ? `, ${totalInactive} inactive` : ''} • {filtered.length} shown
                        </p>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by facility, provider, county, or city..."
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

                    <select
                        value={regionFilter}
                        onChange={(e) => setRegionFilter(e.target.value)}
                        className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                        <option value="">All Regions</option>
                        {regions.map(r => (
                            <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => setShowInactive(!showInactive)}
                        className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
                            showInactive ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        {showInactive ? <XCircle className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
                        {showInactive ? 'Showing Inactive' : 'Show Inactive'}
                    </button>
                </div>

                {/* Facility List */}
                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                        <Building className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">{search ? 'No facilities match your search' : 'No facilities found'}</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        {/* Table header */}
                        <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="col-span-3">Facility</div>
                            <div className="col-span-2">Provider</div>
                            <div className="col-span-2">Location</div>
                            <div className="col-span-1">Region</div>
                            <div className="col-span-2">Phone</div>
                            <div className="col-span-1">Clients</div>
                            <div className="col-span-1">Status</div>
                        </div>

                        <div className="divide-y">
                            {filtered.map((fac) => (
                                <div
                                    key={fac.id}
                                    onClick={() => router.push(`/facilities/${fac.id}`)}
                                    className={`grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                                        fac.is_inactive ? 'opacity-50' : ''
                                    }`}
                                >
                                    {/* Facility Name */}
                                    <div className="lg:col-span-3 flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-ddor-light flex items-center justify-center flex-shrink-0">
                                            <Building className="w-4 h-4 text-ddor-blue" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{fac.name}</p>
                                        </div>
                                    </div>

                                    {/* Provider */}
                                    <div className="lg:col-span-2 flex items-center">
                                        <p className="text-sm text-gray-600 truncate">
                                            {fac.provider_abbreviation || fac.provider_name || '—'}
                                        </p>
                                    </div>

                                    {/* Location */}
                                    <div className="lg:col-span-2 flex items-center">
                                        <div className="flex items-center gap-1 text-sm text-gray-600">
                                            {fac.city || fac.county_name ? (
                                                <>
                                                    <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                    <span className="truncate">{[fac.city, fac.county_name].filter(Boolean).join(', ')}</span>
                                                </>
                                            ) : '—'}
                                        </div>
                                    </div>

                                    {/* Region */}
                                    <div className="lg:col-span-1 flex items-center">
                                        {fac.region && (
                                            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 font-medium capitalize">
                                                {fac.region}
                                            </span>
                                        )}
                                    </div>

                                    {/* Phone */}
                                    <div className="lg:col-span-2 flex items-center">
                                        {fac.phone ? (
                                            <div className="flex items-center gap-1 text-sm text-gray-600">
                                                <Phone className="w-3 h-3 text-gray-400" />
                                                <span>{fac.phone}</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400">—</span>
                                        )}
                                    </div>

                                    {/* Client Count */}
                                    <div className="lg:col-span-1 flex items-center">
                                        <div className="flex items-center gap-1 text-sm">
                                            <Users className="w-3 h-3 text-gray-400" />
                                            <span className={fac.active_client_count > 0 ? 'text-ddor-blue font-medium' : 'text-gray-400'}>
                                                {fac.active_client_count || 0}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div className="lg:col-span-1 flex items-center">
                                        {fac.is_inactive ? (
                                            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500 font-medium">Inactive</span>
                                        ) : (
                                            <span className="px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700 font-medium">Active</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
