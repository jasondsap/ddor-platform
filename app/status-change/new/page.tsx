'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import {
    ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2,
    Search, User, X, AlertTriangle, RefreshCw
} from 'lucide-react';

const STATUS_REASONS = [
    { value: 'discharge', label: 'Discharge' },
    { value: 'non_adherent', label: 'Non-Adherent' },
];

const DISCHARGE_REASONS = [
    'Successful completion',
    'Left AMA',
    'Transferred to a higher level of care',
    'Discharged due to medical reasons',
    'Discharged by treatment provider due to non-compliance',
    'Incarcerated',
    'Death',
];

const NON_COMPLIANT_REASONS = [
    'No call/No show - First time',
    'No call/No Show - Intake or Initial appt.',
    'No call/No shows or missed appointments - Multiple times',
    'Never started treatment',
    'Not adherent to the treatment plan',
    'Refusing a higher level of care recommendation',
    'Participant cannot be reached for more than 14 days [Review Needed]',
    'Participant cannot be reached for more than 30 days [Recommended Dismissal from Program]',
    'Other',
];

function StatusChangeContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const preselectedClientId = searchParams.get('client_id');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [clientSearch, setClientSearch] = useState('');
    const [clients, setClients] = useState<any[]>([]);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [showDropdown, setShowDropdown] = useState(false);

    const [form, setForm] = useState({
        status_reason: '',
        discharge_reason: '',
        non_compliant_reasons: [] as string[],
        other_reasons: '',
        staff_name: '',
        staff_email: session?.user?.email || '',
        agency: '',
    });

    useEffect(() => {
        if (preselectedClientId) {
            fetch(`/api/clients/${preselectedClientId}`).then(r => r.json()).then(d => { if (d.client) setSelectedClient(d.client); });
        }
    }, [preselectedClientId]);

    useEffect(() => {
        if (clientSearch.length < 2) { setClients([]); return; }
        const t = setTimeout(() => {
            fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}&status=active`).then(r => r.json()).then(d => setClients(d.clients || []));
        }, 300);
        return () => clearTimeout(t);
    }, [clientSearch]);

    const updateField = (key: string, value: any) => { setForm(prev => ({ ...prev, [key]: value })); setError(''); };
    const toggleNonCompliant = (v: string) => {
        setForm(prev => ({ ...prev, non_compliant_reasons: prev.non_compliant_reasons.includes(v) ? prev.non_compliant_reasons.filter(x => x !== v) : [...prev.non_compliant_reasons, v] }));
    };

    const handleSubmit = async () => {
        if (!selectedClient) { setError('Please select a participant'); return; }
        if (!form.status_reason) { setError('Please select a status change reason'); return; }
        if (form.status_reason === 'discharge' && !form.discharge_reason) { setError('Please select a discharge reason'); return; }

        setSaving(true); setError('');
        try {
            const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: selectedClient.id,
                    report_type: 'status_change',
                    submitter_name: form.staff_name,
                    submitter_email: form.staff_email,
                    sign_now: true,
                    signature_date: new Date().toISOString().split('T')[0],
                    status_reason: form.status_reason,
                    discharge_reason: form.discharge_reason,
                    non_compliant_reasons: form.non_compliant_reasons,
                    other_reasons: form.other_reasons,
                    agency: form.agency,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Failed to submit'); setSaving(false); return; }
            setSuccess(true);
            setTimeout(() => router.push(`/clients/${selectedClient.id}`), 1500);
        } catch { setError('An unexpected error occurred.'); setSaving(false); }
    };

    if (success) return (
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-ddor-navy mb-2">Status Change Submitted</h2>
            <p className="text-gray-400 text-sm">Redirecting...</p>
        </div>
    );

    return (
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                <div>
                    <h1 className="text-2xl font-bold text-ddor-navy">Status Change</h1>
                    <p className="text-sm text-gray-500">Report a change in participant status</p>
                </div>
            </div>

            {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" /><p className="text-sm text-red-700">{error}</p></div>}

            <div className="space-y-6">
                {/* Client Search */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><User className="w-5 h-5 text-ddor-blue" /> Participant</h2>
                    {selectedClient ? (
                        <div className="flex items-center justify-between p-4 bg-ddor-light rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-ddor-blue/10 flex items-center justify-center text-ddor-blue font-semibold">{selectedClient.first_name?.[0]}{selectedClient.last_name?.[0]}</div>
                                <div><p className="font-medium text-gray-900">{selectedClient.first_name} {selectedClient.last_name}</p><p className="text-xs text-gray-500">{selectedClient.facility_name || 'No facility'}</p></div>
                            </div>
                            <button onClick={() => setSelectedClient(null)} className="p-1 hover:bg-white rounded"><X className="w-4 h-4 text-gray-400" /></button>
                        </div>
                    ) : (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" value={clientSearch} onChange={e => { setClientSearch(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} placeholder="Search participant..." className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm" />
                            {showDropdown && clients.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {clients.map((c: any) => (
                                        <button key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(''); setShowDropdown(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-0">
                                            <p className="text-sm font-medium">{c.first_name} {c.last_name}</p><p className="text-xs text-gray-500">{c.facility_name || '—'}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Reason */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><RefreshCw className="w-5 h-5 text-ddor-blue" /> Status Change Reason</h2>
                    <div className="space-y-2">
                        {STATUS_REASONS.map(r => (
                            <label key={r.value} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.status_reason === r.value ? 'border-ddor-blue bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                <input type="radio" name="reason" value={r.value} checked={form.status_reason === r.value} onChange={() => updateField('status_reason', r.value)} className="w-4 h-4 text-ddor-blue" />
                                <span className={`text-sm ${form.status_reason === r.value ? 'text-ddor-blue font-medium' : 'text-gray-700'}`}>{r.label}</span>
                            </label>
                        ))}
                    </div>

                    {form.status_reason === 'discharge' && (
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Discharge Reason</label>
                            <select value={form.discharge_reason} onChange={e => updateField('discharge_reason', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm">
                                <option value="">— Select —</option>
                                {DISCHARGE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    )}

                    {form.status_reason === 'non_adherent' && (
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Non-Compliant Reasons</label>
                            <div className="space-y-1.5">
                                {NON_COMPLIANT_REASONS.map(r => (
                                    <label key={r} className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer text-sm ${form.non_compliant_reasons.includes(r) ? 'bg-blue-50 text-blue-800' : 'hover:bg-gray-50 text-gray-700'}`}>
                                        <input type="checkbox" checked={form.non_compliant_reasons.includes(r)} onChange={() => toggleNonCompliant(r)} className="w-4 h-4 rounded mt-0.5" />
                                        <span>{r}</span>
                                    </label>
                                ))}
                            </div>
                            {form.non_compliant_reasons.includes('Other') && (
                                <textarea value={form.other_reasons} onChange={e => updateField('other_reasons', e.target.value)} className="w-full mt-3 p-2.5 border border-gray-300 rounded-lg text-sm min-h-[60px]" placeholder="Describe other reasons..." />
                            )}
                        </div>
                    )}
                </div>

                {/* Staff Info */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="font-semibold text-ddor-navy mb-4">Staff Information</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Staff Name</label><input type="text" value={form.staff_name} onChange={e => updateField('staff_name', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Staff Email</label><input type="email" value={form.staff_email} onChange={e => updateField('staff_email', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" /></div>
                        <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Agency</label><input type="text" value={form.agency} onChange={e => updateField('agency', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" /></div>
                    </div>
                </div>

                <div className="flex gap-3 pb-8">
                    <button onClick={() => router.back()} className="flex-1 py-3 bg-white border border-gray-300 rounded-xl font-medium text-gray-700">Cancel</button>
                    <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 bg-ddor-blue text-white rounded-xl font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {saving ? 'Submitting...' : 'Submit Status Change'}
                    </button>
                </div>
            </div>
        </main>
    );
}

export default function StatusChangePage() {
    return (<div className="min-h-screen bg-gray-50"><Header /><Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>}><StatusChangeContent /></Suspense></div>);
}
