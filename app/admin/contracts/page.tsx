'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import {
    Loader2, CheckCircle2, XCircle, FileText, Search, X,
    Save, AlertCircle, Building
} from 'lucide-react';

export default function ContractsPage() {
    const router = useRouter();
    const { data: session, status: authStatus } = useSession();
    const ddor = (session as any)?.ddor;
    const isAdmin = ddor?.role === 'super_admin' || ddor?.role === 'business_user';

    const [providers, setProviders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => { if (authStatus === 'unauthenticated') router.push('/auth/signin'); }, [authStatus, router]);

    useEffect(() => {
        if (!ddor) return;
        fetch('/api/providers').then(r => r.json()).then(d => {
            setProviders(d.providers || []);
            setLoading(false);
        });
    }, [ddor]);

    const toggleField = async (providerId: string, field: string, currentVal: boolean) => {
        setSaving(providerId);
        const res = await fetch(`/api/providers/${providerId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [field]: !currentVal }),
        });
        if (res.ok) {
            setProviders(prev => prev.map(p => p.id === providerId ? { ...p, [field]: !currentVal } : p));
            setSuccessMsg('Updated'); setTimeout(() => setSuccessMsg(''), 2000);
        }
        setSaving(null);
    };

    const filtered = providers.filter(p =>
        !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.abbreviation?.toLowerCase().includes(search.toLowerCase())
    );

    const totalProviders = providers.length;
    const withContract = providers.filter(p => p.contract_signed).length;
    const withBaa = providers.filter(p => p.baa_signed).length;
    const withW9 = providers.filter(p => p.w9_received).length;
    const withAch = providers.filter(p => p.ach_received).length;
    const fullyCompliant = providers.filter(p => p.contract_signed && p.baa_signed && p.w9_received && p.ach_received).length;

    if (!isAdmin) return <div className="min-h-screen bg-gray-50"><Header /><div className="text-center py-12 text-gray-500">Admin access required.</div></div>;

    const Check = ({ checked, onClick, disabled }: { checked: boolean; onClick: () => void; disabled: boolean }) => (
        <button onClick={onClick} disabled={disabled} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${checked ? 'bg-green-100 hover:bg-green-200' : 'bg-gray-100 hover:bg-gray-200'}`}>
            {checked ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-gray-300" />}
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-50"><Header />
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-ddor-navy">Contract Tracking</h1>
                    <p className="text-sm text-gray-500 mt-1">Provider compliance status — click to toggle</p>
                </div>

                {successMsg && <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /><p className="text-xs text-green-700">{successMsg}</p></div>}

                {/* KPI Row */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                    <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                        <p className="text-2xl font-bold text-ddor-navy">{fullyCompliant}/{totalProviders}</p>
                        <p className="text-xs text-gray-500">Fully Compliant</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                        <p className="text-2xl font-bold text-green-600">{withContract}</p>
                        <p className="text-xs text-gray-500">Contract</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                        <p className="text-2xl font-bold text-blue-600">{withBaa}</p>
                        <p className="text-xs text-gray-500">BAA</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                        <p className="text-2xl font-bold text-purple-600">{withW9}</p>
                        <p className="text-xs text-gray-500">W-9</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                        <p className="text-2xl font-bold text-amber-600">{withAch}</p>
                        <p className="text-xs text-gray-500">ACH</p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search providers..." className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm" />
                    {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-gray-400" /></button>}
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b">
                                        <th className="text-left px-4 py-3 font-medium text-gray-600">Provider</th>
                                        <th className="text-center px-3 py-3 font-medium text-gray-600">Participants</th>
                                        <th className="text-center px-3 py-3 font-medium text-gray-600">Contract</th>
                                        <th className="text-center px-3 py-3 font-medium text-gray-600">BAA</th>
                                        <th className="text-center px-3 py-3 font-medium text-gray-600">W-9</th>
                                        <th className="text-center px-3 py-3 font-medium text-gray-600">ACH</th>
                                        <th className="text-center px-3 py-3 font-medium text-gray-600">Status</th>
                                        <th className="text-center px-3 py-3 font-medium text-gray-600">Docs</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(p => {
                                        const allDone = p.contract_signed && p.baa_signed && p.w9_received && p.ach_received;
                                        const count = [p.contract_signed, p.baa_signed, p.w9_received, p.ach_received].filter(Boolean).length;
                                        const isSaving = saving === p.id;
                                        const docCount = [p.doc_w9_key, p.doc_baa_key, p.doc_contract_key, p.doc_ach_key].filter(Boolean).length;

                                        return (
                                            <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <button onClick={() => router.push(`/admin/contracts/${p.id}`)} className="text-left hover:underline">
                                                        <p className="font-medium text-gray-900">{p.name}</p>
                                                    </button>
                                                    <p className="text-xs text-gray-500">
                                                        {p.abbreviation || ''} • {p.facility_count || 0} facilities • {p.active_client_count || 0} clients
                                                        {p.contract_contact_name && <span className="ml-1">• {p.contract_contact_name}</span>}
                                                    </p>
                                                    {p.contract_assignee && <p className="text-xs text-ddor-blue">{p.contract_assignee}</p>}
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <Check checked={p.has_participants || false} onClick={() => toggleField(p.id, 'has_participants', p.has_participants)} disabled={isSaving} />
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <Check checked={p.contract_signed || false} onClick={() => toggleField(p.id, 'contract_signed', p.contract_signed)} disabled={isSaving} />
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <Check checked={p.baa_signed || false} onClick={() => toggleField(p.id, 'baa_signed', p.baa_signed)} disabled={isSaving} />
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <Check checked={p.w9_received || false} onClick={() => toggleField(p.id, 'w9_received', p.w9_received)} disabled={isSaving} />
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <Check checked={p.ach_received || false} onClick={() => toggleField(p.id, 'ach_received', p.ach_received)} disabled={isSaving} />
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    {allDone ? (
                                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">Complete</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">{count}/4</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <button onClick={() => router.push(`/admin/contracts/${p.id}`)}
                                                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${docCount > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                                        {docCount}/4
                                                    </button>
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
