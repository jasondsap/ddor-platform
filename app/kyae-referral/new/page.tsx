'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import {
    ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2,
    Search, User, X, GraduationCap, Building, Phone
} from 'lucide-react';

const FACILITY_ADDRESSES = [
    'Oldham County Clinic, 2141 Spencer Court, LaGrange, KY 40031',
    'Henry County Clinic, 684 Elm Street, Eminence, KY 40019',
    'Addiction Recovery Center, 601 South Preston St., Louisville, KY 40202 (Jefferson County)',
    'Shelby County Clinic, 250 Alpine Drive Shelbyville, KY 40065',
    'Spencer County Clinic, 47 W Main Street Taylorsville, KY 40071',
    'Bullitt County Office 527 N. Joe B. Hall Avenue Shepherdsville, KY 40165',
    'Trimble County Office 18 Alexander Avenue, Suite C Bedford, KY 40006',
    'South Office 2105 Crums Lane Louisville, KY 40218',
    'West Office 2650 W. Broadway Louisville, KY 40211',
    'Downtown Office 708 Magazine St., Suite 100 Louisville, KY 40203',
    'East Office 4710 Champions Trace #102 Louisville, KY 40218',
];

const LOC_OPTIONS = ['Outpatient', 'Intensive Outpatient/Partial Hospitalization', 'Inpatient/Residential', 'Recovery Housing'];
const EDUCATION_LEVEL = ['Less than High School', 'High School/GED', 'Some College', "Associate's Degree", "Bachelor's Degree", "Master's Degree", 'Vocational Training'];
const CONTACT_TIMES = ['Morning', 'Afternoon', 'Evening', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function KyaeReferralContent() {
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
        facility_address: '',
        staff_name: '',
        staff_email: session?.user?.email || '',
        staff_phone: '',
        best_contact_times: [] as string[],
        participant_address: '',
        participant_phone: '',
        alternate_contact: '',
        kyae_screen_notes: '',
        needs_transportation: false,
        level_of_care: '',
        education_level: [] as string[],
        todays_date: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        if (preselectedClientId) {
            fetch(`/api/clients/${preselectedClientId}`).then(r => r.json()).then(d => {
                if (d.client) {
                    setSelectedClient(d.client);
                    setForm(prev => ({
                        ...prev,
                        participant_phone: d.client.phone || '',
                        participant_address: [d.client.street_address, d.client.city, d.client.zip].filter(Boolean).join(', ') || '',
                    }));
                }
            });
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
    const toggleMulti = (key: string, v: string) => {
        setForm(prev => {
            const arr = prev[key as keyof typeof prev] as string[];
            return { ...prev, [key]: arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v] };
        });
    };

    const handleSubmit = async () => {
        if (!selectedClient) { setError('Please select a participant'); return; }
        setSaving(true); setError('');
        try {
            const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: selectedClient.id,
                    report_type: 'kyae_referral',
                    submitter_name: form.staff_name,
                    submitter_email: form.staff_email,
                    sign_now: true,
                    signature_date: form.todays_date,
                    // Store everything as attributes via the API
                    facility_address: form.facility_address,
                    staff_phone: form.staff_phone,
                    best_contact_times: form.best_contact_times,
                    participant_address: form.participant_address,
                    participant_phone: form.participant_phone,
                    alternate_contact: form.alternate_contact,
                    kyae_screen_notes: form.kyae_screen_notes,
                    needs_transportation: form.needs_transportation,
                    level_of_care: form.level_of_care,
                    education_level: form.education_level,
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
            <h2 className="text-2xl font-bold text-ddor-navy mb-2">KYAE Referral Submitted</h2>
            <p className="text-gray-400 text-sm">Redirecting...</p>
        </div>
    );

    return (
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                <div><h1 className="text-2xl font-bold text-ddor-navy">KYAE Referral</h1><p className="text-sm text-gray-500">Refer participant to Kentucky Adult Education & Workforce Development</p></div>
            </div>

            {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-500" /><p className="text-sm text-red-700">{error}</p></div>}

            <div className="space-y-6">
                {/* Client */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><User className="w-5 h-5 text-ddor-blue" /> Participant</h2>
                    {selectedClient ? (
                        <div className="flex items-center justify-between p-4 bg-ddor-light rounded-lg">
                            <div><p className="font-medium">{selectedClient.first_name} {selectedClient.last_name}</p><p className="text-xs text-gray-500">{selectedClient.facility_name || '—'}</p></div>
                            <button onClick={() => setSelectedClient(null)}><X className="w-4 h-4 text-gray-400" /></button>
                        </div>
                    ) : (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" value={clientSearch} onChange={e => { setClientSearch(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} placeholder="Search..." className="w-full pl-10 pr-4 py-3 border rounded-lg text-sm" />
                            {showDropdown && clients.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {clients.map((c: any) => (<button key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(''); setShowDropdown(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-0"><p className="text-sm font-medium">{c.first_name} {c.last_name}</p></button>))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Facility & Staff */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Building className="w-5 h-5 text-ddor-blue" /> Facility & Staff</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Facility Name & Address</label>
                            <select value={form.facility_address} onChange={e => updateField('facility_address', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm">
                                <option value="">— Select —</option>
                                {FACILITY_ADDRESSES.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Staff Name</label><input type="text" value={form.staff_name} onChange={e => updateField('staff_name', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Staff Email</label><input type="email" value={form.staff_email} onChange={e => updateField('staff_email', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Staff Phone</label><input type="tel" value={form.staff_phone} onChange={e => updateField('staff_phone', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" /></div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Best Time to Contact</label>
                                <div className="flex flex-wrap gap-2">{CONTACT_TIMES.map(t => (
                                    <label key={t} className={`px-3 py-1 rounded-full text-xs cursor-pointer border ${form.best_contact_times.includes(t) ? 'bg-ddor-blue text-white border-ddor-blue' : 'bg-white text-gray-600 border-gray-300'}`}>
                                        <input type="checkbox" checked={form.best_contact_times.includes(t)} onChange={() => toggleMulti('best_contact_times', t)} className="sr-only" />{t}
                                    </label>
                                ))}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Participant Info */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Phone className="w-5 h-5 text-ddor-blue" /> Participant Contact</h2>
                    <div className="space-y-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Participant Address</label><textarea value={form.participant_address} onChange={e => updateField('participant_address', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm min-h-[60px]" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Participant Phone</label><input type="tel" value={form.participant_phone} onChange={e => updateField('participant_phone', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Alternate Contact (name, relationship, phone)</label><textarea value={form.alternate_contact} onChange={e => updateField('alternate_contact', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm min-h-[60px]" /></div>
                    </div>
                </div>

                {/* Education & LOC */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><GraduationCap className="w-5 h-5 text-ddor-blue" /> Education & Treatment</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Level of Care</label>
                            <select value={form.level_of_care} onChange={e => updateField('level_of_care', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm">
                                <option value="">— Select —</option>
                                {LOC_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Education Level</label>
                            <div className="grid grid-cols-2 gap-1.5">{EDUCATION_LEVEL.map(e => (
                                <label key={e} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm ${form.education_level.includes(e) ? 'bg-blue-50 text-blue-800' : 'hover:bg-gray-50'}`}>
                                    <input type="checkbox" checked={form.education_level.includes(e)} onChange={() => toggleMulti('education_level', e)} className="w-4 h-4 rounded" />{e}
                                </label>
                            ))}</div>
                        </div>
                        <label className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg cursor-pointer">
                            <input type="checkbox" checked={form.needs_transportation} onChange={e => updateField('needs_transportation', e.target.checked)} className="w-4 h-4 rounded" />
                            <span className="text-sm text-amber-800">Needs assistance with transportation to the KYAE screen</span>
                        </label>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">KYAE Screen Notes</label><textarea value={form.kyae_screen_notes} onChange={e => updateField('kyae_screen_notes', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm min-h-[80px]" /></div>
                    </div>
                </div>

                <div className="flex gap-3 pb-8">
                    <button onClick={() => router.back()} className="flex-1 py-3 bg-white border border-gray-300 rounded-xl font-medium text-gray-700">Cancel</button>
                    <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 bg-ddor-blue text-white rounded-xl font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {saving ? 'Submitting...' : 'Submit KYAE Referral'}
                    </button>
                </div>
            </div>
        </main>
    );
}

export default function KyaeReferralPage() {
    return (<div className="min-h-screen bg-gray-50"><Header /><Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>}><KyaeReferralContent /></Suspense></div>);
}
