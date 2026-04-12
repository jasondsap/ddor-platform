'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import {
    ArrowLeft, Loader2, User, Calendar, Save,
    Stethoscope, Building, AlertCircle, CheckCircle2,
    Mail, Phone, Archive, AlertTriangle
} from 'lucide-react';

const DIAGNOSIS_OPTIONS = ['sud', 'mh', 'co_occurring'];
const GENDER_OPTIONS = ['Female', 'Male', 'Transgender'];
const ELIGIBILITY_OPTIONS = ['Eligible', 'Pending', 'Ineligible', 'Conditional'];
const ARCHIVE_REASONS = [
    'Successful completion',
    'Left AMA',
    'Transferred',
    'Incarcerated',
    'Discharged - non-compliance',
    'Death',
    'Other',
];

export default function EditClientPage() {
    const router = useRouter();
    const params = useParams();
    const clientId = params.id as string;
    const { data: session, status: authStatus } = useSession();
    const ddor = (session as any)?.ddor;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [facilities, setFacilities] = useState<any[]>([]);
    const [showArchive, setShowArchive] = useState(false);

    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        zip: '',
        gender: '',
        facility_id: '',
        diagnosis: '',
        secondary_diagnosis: '',
        has_oud: false,
        eligibility_status: '',
        ddor_id: '',
        treatment_start_date: '',
        agreement_signed_date: '',
        agreement_length_days: '',
        alternate_contact: '',
        notes: '',
        is_archived: false,
        archive_reason: '',
        is_mia: false,
    });

    useEffect(() => {
        if (authStatus === 'unauthenticated') router.push('/auth/signin');
    }, [authStatus, router]);

    useEffect(() => {
        if (!ddor || !clientId) return;
        Promise.all([
            fetch(`/api/clients/${clientId}`).then(r => r.json()),
            fetch('/api/facilities').then(r => r.json()),
        ]).then(([clientData, facData]) => {
            setFacilities(facData.facilities || []);
            if (clientData.client) {
                const c = clientData.client;
                setForm({
                    first_name: c.first_name || '',
                    last_name: c.last_name || '',
                    email: c.email || '',
                    phone: c.phone || '',
                    date_of_birth: c.date_of_birth?.split('T')[0] || '',
                    zip: c.zip || '',
                    gender: c.gender || '',
                    facility_id: c.facility_id || '',
                    diagnosis: c.diagnosis || '',
                    secondary_diagnosis: c.secondary_diagnosis || '',
                    has_oud: c.has_oud || false,
                    eligibility_status: c.eligibility_status || '',
                    ddor_id: c.ddor_id || '',
                    treatment_start_date: c.treatment_start_date?.split('T')[0] || '',
                    agreement_signed_date: c.agreement_signed_date?.split('T')[0] || '',
                    agreement_length_days: c.agreement_length_days?.toString() || '',
                    alternate_contact: c.alternate_contact || '',
                    notes: c.notes || '',
                    is_archived: c.is_archived || false,
                    archive_reason: c.archive_reason || '',
                    is_mia: c.is_mia || false,
                });
            }
        }).catch(console.error).finally(() => setLoading(false));
    }, [ddor, clientId]);

    const u = (field: string, value: any) => { setForm(prev => ({ ...prev, [field]: value })); setError(''); };

    const handleSubmit = async () => {
        if (!form.first_name.trim()) { setError('First name is required.'); return; }
        if (!form.last_name.trim()) { setError('Last name is required.'); return; }

        setSaving(true); setError('');
        try {
            const res = await fetch(`/api/clients/${clientId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: form.first_name.trim(),
                    last_name: form.last_name.trim(),
                    email: form.email.trim() || null,
                    phone: form.phone.trim() || null,
                    date_of_birth: form.date_of_birth || null,
                    zip: form.zip.trim() || null,
                    gender: form.gender || null,
                    facility_id: form.facility_id || null,
                    diagnosis: form.diagnosis || null,
                    secondary_diagnosis: form.secondary_diagnosis || null,
                    has_oud: form.has_oud,
                    eligibility_status: form.eligibility_status || null,
                    ddor_id: form.ddor_id.trim() || null,
                    treatment_start_date: form.treatment_start_date || null,
                    agreement_signed_date: form.agreement_signed_date || null,
                    agreement_length_days: form.agreement_length_days ? parseInt(form.agreement_length_days) : null,
                    alternate_contact: form.alternate_contact.trim() || null,
                    notes: form.notes.trim() || null,
                    is_archived: form.is_archived,
                    archive_reason: form.archive_reason || null,
                    is_mia: form.is_mia,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Failed to update'); setSaving(false); return; }
            setSuccess(true);
            setTimeout(() => router.push(`/clients/${clientId}`), 1200);
        } catch { setError('An error occurred.'); setSaving(false); }
    };

    if (authStatus === 'loading' || loading) {
        return <div className="min-h-screen bg-gray-50"><Header /><div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div></div>;
    }

    if (success) {
        return <div className="min-h-screen bg-gray-50"><Header /><div className="max-w-2xl mx-auto px-6 py-24 text-center"><CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" /><h2 className="text-2xl font-bold text-ddor-navy mb-2">Client Updated</h2><p className="text-gray-400 text-sm">Redirecting...</p></div></div>;
    }

    const Inp = ({ label, field, type = 'text', required = false, span = 1 }: { label: string; field: string; type?: string; required?: boolean; span?: number }) => (
        <div className={span === 2 ? 'sm:col-span-2' : span === 3 ? 'sm:col-span-3' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
            <input type={type} value={(form as any)[field] || ''} onChange={e => u(field, e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ddor-blue/20 focus:border-ddor-blue" />
        </div>
    );

    const Sel = ({ label, field, options, required = false }: { label: string; field: string; options: { value: string; label: string }[]; required?: boolean }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
            <select value={(form as any)[field] || ''} onChange={e => u(field, e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ddor-blue/20 focus:border-ddor-blue">
                <option value="">— Select —</option>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.push(`/clients/${clientId}`)} className="p-2 hover:bg-gray-200 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                    <div>
                        <h1 className="text-2xl font-bold text-ddor-navy">Edit Client</h1>
                        <p className="text-sm text-gray-500">{form.first_name} {form.last_name}{form.ddor_id ? ` • ID: ${form.ddor_id}` : ''}</p>
                    </div>
                </div>

                {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-500" /><p className="text-sm text-red-700">{error}</p></div>}

                <div className="space-y-6">
                    {/* Identity */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><User className="w-5 h-5 text-ddor-blue" /> Identity</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Inp label="First Name" field="first_name" required />
                            <Inp label="Last Name" field="last_name" required />
                            <Inp label="DDOR ID" field="ddor_id" />
                            <Inp label="Date of Birth" field="date_of_birth" type="date" required />
                            <Sel label="Gender" field="gender" options={GENDER_OPTIONS.map(g => ({ value: g, label: g }))} />
                            <Inp label="Zip Code" field="zip" />
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Phone className="w-5 h-5 text-ddor-blue" /> Contact</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Inp label="Phone" field="phone" type="tel" />
                            <Inp label="Email" field="email" type="email" />
                            <Inp label="Alternate Contact" field="alternate_contact" />
                        </div>
                    </div>

                    {/* Clinical */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Stethoscope className="w-5 h-5 text-ddor-blue" /> Clinical</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Sel label="Diagnosis" field="diagnosis" options={DIAGNOSIS_OPTIONS.map(d => ({ value: d, label: d === 'co_occurring' ? 'Co-Occurring' : d.toUpperCase() }))} />
                            <Inp label="Secondary Diagnosis" field="secondary_diagnosis" />
                            <Sel label="Eligibility" field="eligibility_status" options={ELIGIBILITY_OPTIONS.map(e => ({ value: e, label: e }))} />
                            <label className="flex items-center gap-2 sm:col-span-3 p-3 bg-blue-50 rounded-lg cursor-pointer">
                                <input type="checkbox" checked={form.has_oud} onChange={e => u('has_oud', e.target.checked)} className="w-4 h-4 rounded" />
                                <span className="text-sm text-blue-800">Has Opioid Use Disorder (OUD)</span>
                            </label>
                        </div>
                    </div>

                    {/* Program */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Building className="w-5 h-5 text-ddor-blue" /> Program & Facility</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Facility</label>
                                <select value={form.facility_id} onChange={e => u('facility_id', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm">
                                    <option value="">— Select —</option>
                                    {facilities.map((f: any) => <option key={f.id} value={f.id}>{f.provider_name ? `${f.provider_name} — ` : ''}{f.name}</option>)}
                                </select>
                            </div>
                            <Inp label="Treatment Start Date" field="treatment_start_date" type="date" />
                            <Inp label="Agreement Signed Date" field="agreement_signed_date" type="date" />
                            <Inp label="Agreement Length (Days)" field="agreement_length_days" type="number" />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy mb-4">Notes</h2>
                        <textarea value={form.notes} onChange={e => u('notes', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-sm min-h-[80px]" placeholder="Notes about this participant..." />
                    </div>

                    {/* Archive / MIA */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <button onClick={() => setShowArchive(!showArchive)}
                            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800">
                            <Archive className="w-4 h-4" /> {showArchive ? 'Hide' : 'Show'} Archive & Status Options
                        </button>

                        {showArchive && (
                            <div className="mt-4 space-y-4 pt-4 border-t">
                                <label className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg cursor-pointer">
                                    <input type="checkbox" checked={form.is_mia} onChange={e => u('is_mia', e.target.checked)} className="w-4 h-4 rounded" />
                                    <span className="text-sm text-amber-800 font-medium">Mark as MIA (Missing in Action)</span>
                                </label>

                                <label className="flex items-center gap-2 p-3 bg-red-50 rounded-lg cursor-pointer">
                                    <input type="checkbox" checked={form.is_archived} onChange={e => u('is_archived', e.target.checked)} className="w-4 h-4 rounded" />
                                    <span className="text-sm text-red-800 font-medium">Archive this client</span>
                                </label>

                                {form.is_archived && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Archive Reason</label>
                                        <select value={form.archive_reason} onChange={e => u('archive_reason', e.target.value)}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm">
                                            <option value="">— Select reason —</option>
                                            {ARCHIVE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                )}

                                {form.is_archived && (
                                    <div className="p-3 bg-red-100 border border-red-200 rounded-lg flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-red-800">Archiving will remove this client from active lists. Reports and data are preserved.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3 pb-8">
                        <button onClick={() => router.push(`/clients/${clientId}`)}
                            className="flex-1 py-3 bg-white border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50">
                            Cancel
                        </button>
                        <button onClick={handleSubmit} disabled={saving}
                            className="flex-1 py-3 bg-ddor-blue text-white rounded-xl font-semibold hover:bg-[#156090] disabled:opacity-40 flex items-center justify-center gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
