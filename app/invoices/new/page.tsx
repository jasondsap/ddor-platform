'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import {
    ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2,
    DollarSign, User, Building, Calendar, FileText
} from 'lucide-react';

const INSURANCE_TYPES = ['UNINSURED', 'MEDICAID', 'MEDICARE', 'TRICARE', 'CHAMPVA', 'GROUP HEALTH PLAN/Commercial', 'VA benefits', 'OTHER'];
const STEPS_INSURED = ['Application process for Medicaid started.', 'Applied to Medicaid but participant still showing inactive.', 'Does not meet Medicaid eligibility criteria.', 'Participant has agreed to apply for Medicaid without assistance.', "Provider's treatment team will assist in Medicaid application.", 'Participant will not/cannot apply for Medicaid.'];
const BILLING_REASONS = ['Health insurance plan has copays, a deductible, and/co-insurance.', 'Health insurance plan does not cover the service lines provided.', 'Provider is not paneled with this insurance.', 'Insurance denied coverage due to not meeting medical necessity.', 'Other: FGI will contact you to follow up.', 'N/A'];

export default function NewInvoicePage() {
    const router = useRouter();
    const { data: session } = useSession();
    const ddor = (session as any)?.ddor;
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [facilities, setFacilities] = useState<any[]>([]);

    const [form, setForm] = useState({
        patient_name: '', patient_dob: '', account_number: '', facility_id: '',
        service_date_from: '', service_date_to: '',
        total_charge: '', payment_due: '',
        insurance_types: [] as string[], steps_insured: [] as string[], billing_reasons: [] as string[],
        medicaid_explanation: '',
        provider_attestation: false, submitter_signature: '',
    });

    useEffect(() => { if (ddor) fetch('/api/facilities').then(r => r.json()).then(d => setFacilities(d.facilities || [])); }, [ddor]);

    const u = (k: string, v: any) => { setForm(p => ({ ...p, [k]: v })); setError(''); };
    const toggle = (k: string, v: string) => { setForm(p => { const arr = (p as any)[k] as string[]; return { ...p, [k]: arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v] }; }); };

    const handleSubmit = async () => {
        if (!form.patient_name.trim()) { setError('Patient name is required'); return; }
        if (!form.provider_attestation) { setError('Provider attestation is required'); return; }
        setSaving(true); setError('');
        try {
            const attributes = [
                ...form.insurance_types.map(v => ({ type: 'insurance_type', value: v })),
                ...form.steps_insured.map(v => ({ type: 'steps_insured', value: v })),
                ...form.billing_reasons.map(v => ({ type: 'billing_reason', value: v })),
            ];
            const res = await fetch('/api/invoices', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_name: form.patient_name, patient_dob: form.patient_dob || null,
                    account_number: form.account_number || null, facility_id: form.facility_id || null,
                    service_date_from: form.service_date_from || null, service_date_to: form.service_date_to || null,
                    total_charge: form.total_charge ? parseFloat(form.total_charge) : null,
                    payment_due: form.payment_due ? parseFloat(form.payment_due) : null,
                    provider_attestation: form.provider_attestation, submitter_signature: form.submitter_signature || null,
                    attributes,
                }),
            });
            if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); setSaving(false); return; }
            setSuccess(true);
            setTimeout(() => router.push('/invoices'), 1500);
        } catch { setError('Error occurred.'); setSaving(false); }
    };

    if (success) return <div className="min-h-screen bg-gray-50"><Header /><div className="max-w-2xl mx-auto px-6 py-24 text-center"><CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" /><h2 className="text-2xl font-bold text-ddor-navy mb-2">Invoice Submitted</h2><p className="text-sm text-gray-500">It will now go through the FGI review process.</p></div></div>;

    return (
        <div className="min-h-screen bg-gray-50"><Header />
            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.push('/invoices')} className="p-2 hover:bg-gray-200 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                    <div><h1 className="text-2xl font-bold text-ddor-navy">Submit Invoice</h1><p className="text-sm text-gray-500">Provider reimbursement request</p></div>
                </div>
                {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-500" /><p className="text-sm text-red-700">{error}</p></div>}

                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><User className="w-5 h-5 text-ddor-blue" /> Patient & Facility</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Patient Name *</label><input value={form.patient_name} onChange={e => u('patient_name', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Patient DOB</label><input type="date" value={form.patient_dob} onChange={e => u('patient_dob', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label><input value={form.account_number} onChange={e => u('account_number', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" /></div>
                            <div className="sm:col-span-3"><label className="block text-sm font-medium text-gray-700 mb-1">Facility</label>
                                <select value={form.facility_id} onChange={e => u('facility_id', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm"><option value="">— Select —</option>{facilities.map((f: any) => <option key={f.id} value={f.id}>{f.provider_name ? `${f.provider_name} — ` : ''}{f.name}</option>)}</select></div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Calendar className="w-5 h-5 text-ddor-blue" /> Service Dates & Charges</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">From Date</label><input type="date" value={form.service_date_from} onChange={e => u('service_date_from', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">To Date</label><input type="date" value={form.service_date_to} onChange={e => u('service_date_to', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Total Charge ($)</label><input type="number" step="0.01" value={form.total_charge} onChange={e => u('total_charge', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" placeholder="0.00" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Payment Due ($)</label><input type="number" step="0.01" value={form.payment_due} onChange={e => u('payment_due', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" placeholder="0.00" /></div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><FileText className="w-5 h-5 text-ddor-blue" /> Insurance</h2>
                        <p className="text-xs text-gray-500 mb-2">Insurance Type</p>
                        <div className="flex flex-wrap gap-1.5 mb-4">{INSURANCE_TYPES.map(t => (
                            <label key={t} className={`px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer ${form.insurance_types.includes(t) ? 'bg-ddor-blue text-white border-ddor-blue' : 'bg-white text-gray-600 border-gray-300'}`}>
                                <input type="checkbox" checked={form.insurance_types.includes(t)} onChange={() => toggle('insurance_types', t)} className="sr-only" />{t}
                            </label>
                        ))}</div>
                        {form.insurance_types.includes('UNINSURED') && (<>
                            <p className="text-xs text-gray-500 mb-2">Steps Taken to Get Patient Insured</p>
                            <div className="space-y-1 mb-4">{STEPS_INSURED.map(s => (
                                <label key={s} className={`flex items-start gap-2 p-2 rounded-lg text-xs cursor-pointer ${form.steps_insured.includes(s) ? 'bg-blue-50 text-blue-800' : 'hover:bg-gray-50'}`}>
                                    <input type="checkbox" checked={form.steps_insured.includes(s)} onChange={() => toggle('steps_insured', s)} className="w-3.5 h-3.5 mt-0.5 rounded" />{s}
                                </label>
                            ))}</div>
                        </>)}
                        <p className="text-xs text-gray-500 mb-2">Billing Reasons (if insured)</p>
                        <div className="space-y-1">{BILLING_REASONS.map(r => (
                            <label key={r} className={`flex items-start gap-2 p-2 rounded-lg text-xs cursor-pointer ${form.billing_reasons.includes(r) ? 'bg-blue-50 text-blue-800' : 'hover:bg-gray-50'}`}>
                                <input type="checkbox" checked={form.billing_reasons.includes(r)} onChange={() => toggle('billing_reasons', r)} className="w-3.5 h-3.5 mt-0.5 rounded" />{r}
                            </label>
                        ))}</div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><DollarSign className="w-5 h-5 text-ddor-blue" /> Attestation</h2>
                        <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer ${form.provider_attestation ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                            <input type="checkbox" checked={form.provider_attestation} onChange={e => u('provider_attestation', e.target.checked)} className="w-5 h-5 mt-0.5 rounded" />
                            <div><p className="text-sm font-medium text-gray-900">Provider Attestation *</p><p className="text-xs text-gray-500 mt-1">I attest that the services listed were provided and that the charges are accurate and in accordance with the SB90/BHCDP program guidelines.</p></div>
                        </label>
                        <div className="mt-4"><label className="block text-sm font-medium text-gray-700 mb-1">Electronic Signature</label><input value={form.submitter_signature} onChange={e => u('submitter_signature', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" placeholder="Type your full name" /></div>
                    </div>

                    <div className="flex gap-3 pb-8">
                        <button onClick={() => router.push('/invoices')} className="flex-1 py-3 bg-white border border-gray-300 rounded-xl font-medium text-gray-700">Cancel</button>
                        <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 bg-ddor-blue text-white rounded-xl font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {saving ? 'Submitting...' : 'Submit Invoice'}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
