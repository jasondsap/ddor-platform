'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import {
    ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2,
    User, Home, ShoppingBag, Car, AlertTriangle, DollarSign, FileText
} from 'lucide-react';

const LANGUAGES = ['English', 'Spanish', 'Sign Language', 'French', 'Arabic', 'Other'];
const REASONS = [
    'Needs tied directly to remaining in housing and/or treatment',
    'Needs tied directly to career or education related goals (such as travel to school, work clothes, tools, etc.)',
    'These items are not essential to treatment, housing, career or education needs, but are things the participant would like to have.',
];
const EXCLUSIONS = [
    'For education and career related goods and services, complete the KYAE Form located at kyproviders.com/KYAE',
    'For nonessential items contact Jade Hampton at FGI for assistance at jhampton@fletchergroup.org',
];

export default function NewBarrierReliefPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const ddor = (session as any)?.ddor;
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [providers, setProviders] = useState<any[]>([]);
    const [facilities, setFacilities] = useState<any[]>([]);
    const [counties, setCounties] = useState<any[]>([]);

    const [form, setForm] = useState<Record<string, any>>({
        first_name: '', last_name: '', address: '', phone: '', email: '',
        primary_language: 'English', county_id: '',
        is_emergency: false, is_housing_assistance: false, is_emergency_housing: false,
        is_basic_needs: false, is_transportation: false,
        description: '', reason_for_services: '', alternative_resources: '',
        provider_id: '', facility_id: '', staff_name: '', staff_phone: '', staff_email: '',
        vendor_1: '', vendor_1_contact: '', vendor_1_amount: '',
        vendor_2: '', vendor_2_contact: '', vendor_2_amount: '',
        vendor_3: '', vendor_3_contact: '', vendor_3_amount: '',
        vendor_4: '', vendor_4_contact: '', vendor_4_amount: '',
        product_links: '', signature: '', signature_date: new Date().toISOString().split('T')[0],
        is_verbal_signature: false, funding_exclusion: '',
    });

    useEffect(() => {
        if (!ddor) return;
        fetch('/api/providers').then(r => r.json()).then(d => setProviders(d.providers || []));
        fetch('/api/facilities').then(r => r.json()).then(d => {
            setFacilities(d.facilities || []);
            const cm = new Map<string, any>();
            for (const f of d.facilities || []) {
                if (f.county_id && f.county_name) cm.set(f.county_id, { id: f.county_id, name: f.county_name });
            }
            setCounties(Array.from(cm.values()).sort((a, b) => a.name.localeCompare(b.name)));
        });
    }, [ddor]);

    const u = (k: string, v: any) => { setForm(p => ({ ...p, [k]: v })); setError(''); };
    const totalRequested = [form.vendor_1_amount, form.vendor_2_amount, form.vendor_3_amount, form.vendor_4_amount]
        .reduce((s, v) => s + (parseFloat(v) || 0), 0);

    const handleSubmit = async () => {
        if (!form.first_name.trim() || !form.last_name.trim()) { setError('Participant name is required'); return; }
        setSaving(true); setError('');
        try {
            const payload = { ...form,
                vendor_1_amount: form.vendor_1_amount ? parseFloat(form.vendor_1_amount) : null,
                vendor_2_amount: form.vendor_2_amount ? parseFloat(form.vendor_2_amount) : null,
                vendor_3_amount: form.vendor_3_amount ? parseFloat(form.vendor_3_amount) : null,
                vendor_4_amount: form.vendor_4_amount ? parseFloat(form.vendor_4_amount) : null,
            };
            const res = await fetch('/api/barrier-relief', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); setSaving(false); return; }
            setSuccess(true);
            setTimeout(() => router.push('/admin/barrier-relief'), 1500);
        } catch { setError('An error occurred.'); setSaving(false); }
    };

    if (success) return <div className="min-h-screen bg-gray-50"><Header /><div className="max-w-2xl mx-auto px-6 py-24 text-center"><CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" /><h2 className="text-2xl font-bold text-ddor-navy mb-2">Request Submitted</h2></div></div>;

    const Inp = ({ label, field, type = 'text', span = 1, placeholder = '' }: any) => (
        <div className={span === 2 ? 'sm:col-span-2' : span === 3 ? 'sm:col-span-3' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input type={type} value={form[field] || ''} onChange={e => u(field, e.target.value)} placeholder={placeholder}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" />
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50"><Header />
            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.push('/admin/barrier-relief')} className="p-2 hover:bg-gray-200 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                    <div><h1 className="text-2xl font-bold text-ddor-navy">Barrier Relief Request</h1><p className="text-sm text-gray-500">Submit a funding request for a participant</p></div>
                </div>
                {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-500" /><p className="text-sm text-red-700">{error}</p></div>}

                <div className="space-y-6">
                    {/* Participant */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><User className="w-5 h-5 text-ddor-blue" /> Participant Information</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Inp label="First Name *" field="first_name" />
                            <Inp label="Last Name *" field="last_name" />
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                                <select value={form.primary_language} onChange={e => u('primary_language', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm">
                                    {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                                </select></div>
                            <Inp label="Phone" field="phone" type="tel" />
                            <Inp label="Email" field="email" type="email" />
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">County</label>
                                <select value={form.county_id} onChange={e => u('county_id', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm">
                                    <option value="">— Select —</option>{counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select></div>
                            <Inp label="Address" field="address" span={3} />
                        </div>
                    </div>

                    {/* Request Type */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><ShoppingBag className="w-5 h-5 text-ddor-blue" /> Request Type</h2>
                        <div className="space-y-2">
                            {[
                                { key: 'is_emergency', label: 'Emergency Request', icon: AlertTriangle, color: 'red' },
                                { key: 'is_housing_assistance', label: 'Housing Assistance', icon: Home, color: 'blue' },
                                { key: 'is_emergency_housing', label: 'Emergency Housing Assistance', icon: Home, color: 'orange' },
                                { key: 'is_basic_needs', label: 'Basic Needs', icon: ShoppingBag, color: 'green' },
                                { key: 'is_transportation', label: 'Transportation', icon: Car, color: 'purple' },
                            ].map(({ key, label, icon: Icon, color }) => (
                                <label key={key} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${form[key] ? `bg-${color}-50` : 'bg-gray-50 hover:bg-gray-100'}`}>
                                    <input type="checkbox" checked={form[key]} onChange={e => u(key, e.target.checked)} className="w-4 h-4 rounded" />
                                    <Icon className={`w-4 h-4 ${form[key] ? `text-${color}-600` : 'text-gray-400'}`} />
                                    <span className={`text-sm font-medium ${form[key] ? `text-${color}-800` : 'text-gray-700'}`}>{label}</span>
                                </label>
                            ))}
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description of Need</label>
                            <textarea value={form.description} onChange={e => u('description', e.target.value)}
                                className="w-full p-3 border rounded-lg text-sm min-h-[80px]" placeholder="Describe the barrier and what is needed..." />
                        </div>
                        <div className="mt-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Services</label>
                            <select value={form.reason_for_services} onChange={e => u('reason_for_services', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm">
                                <option value="">— Select —</option>{REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <Inp label="Alternative Resources Explored" field="alternative_resources" span={3} />
                    </div>

                    {/* Provider */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><FileText className="w-5 h-5 text-ddor-blue" /> Provider & Staff</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                                <select value={form.provider_id} onChange={e => u('provider_id', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm">
                                    <option value="">— Select —</option>{providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Facility</label>
                                <select value={form.facility_id} onChange={e => u('facility_id', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm">
                                    <option value="">— Select —</option>{facilities.filter(f => !form.provider_id || f.provider_id === form.provider_id).map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select></div>
                            <Inp label="Staff Name" field="staff_name" />
                            <Inp label="Staff Phone" field="staff_phone" type="tel" />
                            <Inp label="Staff Email" field="staff_email" type="email" span={2} />
                        </div>
                    </div>

                    {/* Vendors */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><DollarSign className="w-5 h-5 text-ddor-blue" /> Vendors & Costs</h2>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3 pb-3 border-b border-gray-100 last:border-0 last:mb-0">
                                <Inp label={`Vendor ${i}`} field={`vendor_${i}`} placeholder="Vendor name" />
                                <Inp label="Contact Info" field={`vendor_${i}_contact`} placeholder="Phone or email" />
                                <Inp label="Amount ($)" field={`vendor_${i}_amount`} type="number" placeholder="0.00" />
                            </div>
                        ))}
                        {totalRequested > 0 && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg flex justify-between items-center">
                                <span className="text-sm font-medium text-blue-700">Total Requested</span>
                                <span className="text-lg font-bold text-blue-800">${totalRequested.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        <div className="mt-3"><Inp label="Product Links" field="product_links" span={3} placeholder="URLs to items..." /></div>
                    </div>

                    {/* Signature */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy mb-4">Signature</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Inp label="Electronic Signature" field="signature" placeholder="Type full name" />
                            <Inp label="Date" field="signature_date" type="date" />
                        </div>
                        <label className="flex items-center gap-3 mt-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                            <input type="checkbox" checked={form.is_verbal_signature} onChange={e => u('is_verbal_signature', e.target.checked)} className="w-4 h-4 rounded" />
                            <span className="text-sm text-gray-700">Verbal signature obtained</span>
                        </label>
                    </div>

                    <div className="flex gap-3 pb-8">
                        <button onClick={() => router.push('/admin/barrier-relief')} className="flex-1 py-3 bg-white border border-gray-300 rounded-xl font-medium text-gray-700">Cancel</button>
                        <button onClick={handleSubmit} disabled={saving}
                            className="flex-1 py-3 bg-ddor-blue text-white rounded-xl font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {saving ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
