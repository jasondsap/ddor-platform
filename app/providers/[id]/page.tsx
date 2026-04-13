'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import {
    ArrowLeft, Building, Users, FileText, ChevronRight, ChevronDown, ChevronUp,
    Loader2, MapPin, Phone, CheckCircle2, AlertTriangle, Clock,
    X, Activity, Stethoscope, Shield, Edit
} from 'lucide-react';
import { STATUS_COLORS, REPORT_TYPE_LABELS } from '@/types';
import type { ReportCompletionStatus } from '@/types';

export default function ProviderDetailPage() {
    const router = useRouter();
    const params = useParams();
    const providerId = params.id as string;
    const { data: session, status: authStatus } = useSession();
    const ddor = (session as any)?.ddor;

    const [loading, setLoading] = useState(true);
    const [provider, setProvider] = useState<any>(null);
    const [facilities, setFacilities] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [reportCounts, setReportCounts] = useState<any[]>([]);
    const [recentReports, setRecentReports] = useState<any[]>([]);
    const [expandedFacility, setExpandedFacility] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'facilities' | 'clients' | 'reports'>('facilities');

    useEffect(() => {
        if (authStatus === 'unauthenticated') router.push('/auth/signin');
    }, [authStatus, router]);

    useEffect(() => {
        if (!ddor || !providerId) return;
        fetch(`/api/providers?id=${providerId}`)
            .then(r => r.json())
            .then(d => {
                setProvider(d.provider);
                setFacilities(d.facilities || []);
                setClients(d.clients || []);
                setReportCounts(d.reportCounts || []);
                setRecentReports(d.recentReports || []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [ddor, providerId]);

    if (authStatus === 'loading' || loading) {
        return <div className="min-h-screen bg-gray-50"><Header /><div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div></div>;
    }

    if (!provider) {
        return <div className="min-h-screen bg-gray-50"><Header /><div className="max-w-4xl mx-auto px-6 py-12 text-center"><p className="text-gray-500">Provider not found.</p></div></div>;
    }

    const activeFacilities = facilities.filter(f => !f.is_inactive);
    const inactiveFacilities = facilities.filter(f => f.is_inactive);
    const activeClients = clients.filter(c => !c.is_archived);
    const getReportCount = (type: string) => {
        const r = reportCounts.find((rc: any) => rc.report_type === type);
        return r ? parseInt(r.count) : 0;
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.push('/providers')} className="p-2 hover:bg-gray-200 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-ddor-navy">{provider.name}</h1>
                        {provider.abbreviation && <p className="text-sm text-gray-500">{provider.abbreviation}</p>}
                    </div>
                    {(ddor?.role === 'super_admin' || ddor?.role === 'business_user') && (
                        <button onClick={() => router.push(`/admin/providers/new?edit=${params.id}`)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                            <Edit className="w-4 h-4" /> Edit Provider
                        </button>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <div className="bg-white rounded-xl p-4 shadow-sm" style={{ borderLeft: '4px solid #2563eb' }}>
                        <p className="text-2xl font-extrabold text-blue-600">{activeFacilities.length}</p>
                        <p className="text-xs text-gray-500 font-medium">Active Facilities</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm" style={{ borderLeft: '4px solid #10B981' }}>
                        <p className="text-2xl font-extrabold text-emerald-600">{activeClients.length}</p>
                        <p className="text-xs text-gray-500 font-medium">Active Clients</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm" style={{ borderLeft: '4px solid #7c3aed' }}>
                        <p className="text-2xl font-extrabold text-purple-600">{getReportCount('fourteen_day') + getReportCount('forty_two_day') + getReportCount('ninety_day')}</p>
                        <p className="text-xs text-gray-500 font-medium">Reports Submitted</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm" style={{ borderLeft: '4px solid #d97706' }}>
                        <p className="text-2xl font-extrabold text-amber-600">{getReportCount('kyae_referral')}</p>
                        <p className="text-xs text-gray-500 font-medium">KYAE Referrals</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-4 bg-white rounded-lg p-1 shadow-sm w-fit">
                    {[
                        { key: 'facilities', label: 'Facilities', icon: Building, count: facilities.length },
                        { key: 'clients', label: 'Clients', icon: Users, count: activeClients.length },
                        { key: 'reports', label: 'Reports', icon: FileText, count: recentReports.length },
                    ].map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeTab === tab.key ? 'bg-ddor-blue text-white' : 'text-gray-600 hover:bg-gray-100'
                            }`}>
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-white/20' : 'bg-gray-200'}`}>{tab.count}</span>
                        </button>
                    ))}
                </div>

                {/* FACILITIES TAB */}
                {activeTab === 'facilities' && (
                    <div className="space-y-3">
                        {activeFacilities.map(fac => (
                            <FacilityCard key={fac.id} facility={fac} expanded={expandedFacility === fac.id}
                                onToggle={() => setExpandedFacility(expandedFacility === fac.id ? null : fac.id)}
                                clients={clients.filter(c => c.facility_name === fac.name)}
                                onClientClick={(id) => router.push(`/clients/${id}`)}
                                onViewDetails={() => router.push(`/facilities/${fac.id}`)}
                            />
                        ))}
                        {inactiveFacilities.length > 0 && (
                            <>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium pt-4">Inactive Facilities ({inactiveFacilities.length})</p>
                                {inactiveFacilities.map(fac => (
                                    <FacilityCard key={fac.id} facility={fac} expanded={expandedFacility === fac.id}
                                        onToggle={() => setExpandedFacility(expandedFacility === fac.id ? null : fac.id)}
                                        clients={[]} onClientClick={() => {}}
                                        onViewDetails={() => router.push(`/facilities/${fac.id}`)}
                                    />
                                ))}
                            </>
                        )}
                    </div>
                )}

                {/* CLIENTS TAB */}
                {activeTab === 'clients' && (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase">
                            <div className="col-span-3">Name</div>
                            <div className="col-span-2">Facility</div>
                            <div className="col-span-2">Tx Start</div>
                            <div className="col-span-1">Dx</div>
                            <div className="col-span-3">Report Status</div>
                            <div className="col-span-1"></div>
                        </div>
                        <div className="divide-y">
                            {activeClients.map(c => (
                                <div key={c.id} onClick={() => router.push(`/clients/${c.id}`)}
                                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer">
                                    <div className="sm:col-span-3 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-ddor-light flex items-center justify-center text-ddor-blue font-semibold text-xs">
                                            {c.first_name?.[0]}{c.last_name?.[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{c.last_name}, {c.first_name}</p>
                                            {c.ddor_id && <p className="text-xs text-gray-400">ID: {c.ddor_id}</p>}
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2 flex items-center text-sm text-gray-600">{c.facility_name || '—'}</div>
                                    <div className="sm:col-span-2 flex items-center text-sm text-gray-600">
                                        {c.treatment_start_date ? new Date(c.treatment_start_date).toLocaleDateString() : '—'}
                                    </div>
                                    <div className="sm:col-span-1 flex items-center">
                                        {c.diagnosis && <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 font-medium uppercase">{c.diagnosis === 'co_occurring' ? 'Co-Oc' : c.diagnosis}</span>}
                                    </div>
                                    <div className="sm:col-span-3 flex items-center gap-0.5">
                                        {['fourteen_day_status', 'forty_two_day_status', 'ninety_day_status', 'one_eighty_day_status', 'final_report_status'].map(key => (
                                            <div key={key} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[c[key] as ReportCompletionStatus] || '#D1D5DB' }} />
                                        ))}
                                    </div>
                                    <div className="sm:col-span-1 flex items-center justify-end"><ChevronRight className="w-4 h-4 text-gray-400" /></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* REPORTS TAB */}
                {activeTab === 'reports' && (
                    <div className="space-y-4">
                        {/* Report type breakdown */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h3 className="font-semibold text-ddor-navy mb-4">Report Summary</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { type: 'fourteen_day', label: '14-Day', color: '#3B82F6' },
                                    { type: 'forty_two_day', label: 'Progress', color: '#10B981' },
                                    { type: 'final_report', label: 'Final', color: '#8B5CF6' },
                                    { type: 'kyae_referral', label: 'KYAE', color: '#F59E0B' },
                                    { type: 'status_change', label: 'Status Change', color: '#EF4444' },
                                    { type: 'initiation_notification', label: 'Initiation', color: '#06B6D4' },
                                    { type: 'demographic', label: 'Demographic', color: '#EC4899' },
                                ].map(r => (
                                    <div key={r.type} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                                        <div>
                                            <p className="text-lg font-bold" style={{ color: r.color }}>{getReportCount(r.type)}</p>
                                            <p className="text-xs text-gray-500">{r.label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent reports */}
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b"><h3 className="font-semibold text-ddor-navy">Recent Reports</h3></div>
                            <div className="divide-y">
                                {recentReports.length === 0 ? (
                                    <p className="px-6 py-8 text-center text-gray-400 text-sm">No reports submitted yet.</p>
                                ) : recentReports.map((r: any) => (
                                    <div key={r.id} onClick={() => router.push(`/clients/${r.client_id || ''}`)}
                                        className="px-6 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-4 h-4 text-ddor-blue" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {REPORT_TYPE_LABELS[r.report_type as keyof typeof REPORT_TYPE_LABELS] || r.report_type}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {r.first_name} {r.last_name} • {r.facility_name} •
                                                    {r.date_submitted ? ` ${new Date(r.date_submitted).toLocaleDateString()}` : ` ${new Date(r.created_at).toLocaleDateString()}`}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

// ======= FACILITY CARD WITH DRILL-DOWN =======

function FacilityCard({ facility, expanded, onToggle, clients, onClientClick, onViewDetails }: {
    facility: any; expanded: boolean; onToggle: () => void;
    clients: any[]; onClientClick: (id: string) => void; onViewDetails: () => void;
}) {
    return (
        <div className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all ${facility.is_inactive ? 'opacity-50' : ''}`}>
            <button onClick={onToggle} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 text-left">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-ddor-light flex items-center justify-center flex-shrink-0">
                        <Building className="w-5 h-5 text-ddor-blue" />
                    </div>
                    <div>
                        <p className="font-semibold text-sm text-ddor-navy">{facility.name}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            {facility.county_name && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{facility.county_name}</span>}
                            {facility.city && <span>{facility.city}</span>}
                            {facility.region && <span className="capitalize">{facility.region}</span>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Users className="w-3 h-3" /> {facility.active_clients || 0}
                    </span>
                    {facility.is_inactive ? (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">Inactive</span>
                    ) : (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700">Active</span>
                    )}
                    {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
            </button>

            {expanded && (
                <div className="border-t px-5 pb-5">
                    {/* Facility Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4 text-sm">
                        <div>
                            <p className="text-xs text-gray-500 mb-0.5">Phone</p>
                            <p className="font-medium text-gray-800">{facility.phone || '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-0.5">Address</p>
                            <p className="font-medium text-gray-800">
                                {[facility.street_address, facility.city, facility.zip].filter(Boolean).join(', ') || '—'}
                            </p>
                        </div>
                        <div className="flex items-end">
                            <button onClick={onViewDetails}
                                className="text-sm text-ddor-blue hover:underline flex items-center gap-1">
                                View Full Details <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* Clients at this facility */}
                    {clients.length > 0 ? (
                        <>
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 pt-2 border-t">
                                Clients ({clients.length})
                            </p>
                            <div className="space-y-1">
                                {clients.map(c => (
                                    <button key={c.id} onClick={() => onClientClick(c.id)}
                                        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 text-left">
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-xs font-medium text-ddor-blue">
                                                {c.first_name?.[0]}{c.last_name?.[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{c.first_name} {c.last_name}</p>
                                                {c.ddor_id && <p className="text-xs text-gray-400">ID: {c.ddor_id}</p>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {c.diagnosis && <span className="text-xs text-gray-400 uppercase">{c.diagnosis === 'co_occurring' ? 'Co-Oc' : c.diagnosis}</span>}
                                            <ChevronRight className="w-3 h-3 text-gray-300" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-gray-400 py-3 border-t">No active clients at this facility.</p>
                    )}
                </div>
            )}
        </div>
    );
}
