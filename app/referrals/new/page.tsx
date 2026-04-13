'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import {
    ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2,
    User, Calendar, Phone, MapPin, Shield, AlertTriangle,
    Briefcase, FileText, Scale
} from 'lucide-react';

const ASSESSOR_STATUS = ['Scheduled', 'Attempted to Contact', 'Pending', 'Other', 'Screened'];
const ELIGIBILITY = ['Pretrial Eligible', 'Prosecutor Override', 'Unsure'];
const REFERRAL_TYPE = [
    { value: 'open_within_72_hours', label: 'Open Referral — within 72 hours' },
    { value: 'open_72_to_2_weeks', label: 'Open Referral — 72 hours to 2 weeks' },
    { value: 'open_2_weeks_to_2_months', label: 'Open Referral — 2 weeks to 2 months' },
    { value: 'inactive_2_months_plus', label: 'Inactive Referral — 2 months+' },
    { value: 'closed', label: 'Closed' },
];
const CLOSED_REASONS = ['Screened', 'SA unable to contact after repeated attempts', 'Defendant declined screening', 'Prosecution withdrew'];
const HOUSING_STATUS = ['Housed', 'Homeless', 'Unstable/Temporary Housing', 'Unknown'];
const GENDER_OPTIONS = ['Male', 'Female'];
const SB90_CHARGES = [
    'Alcohol Intoxication', 'Assault 4th (Domestic Violence)', 'Burglary', 'Child Support',
    'Criminal Mischief', 'Disorderly Conduct', 'Drug Possession', 'Drug Trafficking/Selling or Cultivation',
    'Endangering the welfare of a minor', 'Public Intoxication', 'Reckless Driving',
    'Terroristic Threatening', 'Theft', 'Traffic Violations', 'Trespassing',
    'Wanton Endangerment', 'Unknown/Unsure', 'Other',
];
const REASSESSMENT_REASONS = [
    'Assessed, but not started treatment within 30 days',
    'Discharged AMA from approved provider',
    'Interruption in treatment (longer than 30 days)',
    'Moved, and needs a new treatment provider',
    'Received treatment from a non-approved provider',
    'Returned to use',
];

export default function NewReferralPage() {
    const router = useRouter();
    const { data: session, status: authStatus } = useSession();
    const ddor = (session as any)?.ddor;

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [counties, setCounties] = useState<any[]>([]);
    const [facilities, setFacilities] = useState<any[]>([]);

    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: '',
        phone: '',
        alternate_contact: '',
        originating_county_id: '',
        date_received: new Date().toISOString().split('T')[0],
        referral_date: '',
        court_date: '',
        jail_at_referral: false,
        jail_contact_instructions: '',
        assessor_status: 'Pending',
        eligibility: '',
        referral_type_status: 'open_within_72_hours',
        closed_reason: '',
        provider_recommendation_id: '',
        loc_recommendation: '',
        initial_housing: '',
        is_urgent: false,
        urgent_message: '',
        smi_symptoms: false,
        tbi_abi: false,
        major_medical_issues: false,
        prior_participant: '',
        sb90_charges: [] as string[],
        sb90_charges_other: '',
        reassessment_reasons: [] as string[],
        notes: '',
    });

    useEffect(() => {
        if (authStatus === 'unauthenticated') router.push('/auth/signin');
    }, [authStatus, router]);

    useEffect(() => {
        if (!ddor) return;
        fetch('/api/facilities').then(r => r.json()).then(d => setFacilities(d.facilities || []));
        // Fetch counties from facilities (we don't have a dedicated counties API yet)
        fetch('/api/facilities').then(r => r.json()).then(d => {
            const countyMap = new Map<string, any>();
            for (const f of d.facilities || []) {
                if (f.county_id && f.county_name) countyMap.set(f.county_id, { id: f.county_id, name: f.county_name });
            }
            setCounties(Array.from(countyMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
        });
    }, [ddor]);

    const u = (key: string, value: any) => { setForm(prev => ({ ...prev, [key]: value })); setError(''); };
    const toggleCharge = (v: string) => {
        setForm(prev => ({ ...prev, sb90_charges: prev.sb90_charges.includes(v) ? prev.sb90_charges.filter(x => x !== v) : [...prev.sb90_charges, v] }));
    };
    const toggleReassessment = (v: string) => {
        setForm(prev => ({ ...prev, reassessment_reasons: prev.reassessment_reasons.includes(v) ? prev.reassessment_reasons.filter(x => x !== v) : [...prev.reassessment_reasons, v] }));
    };

    const handleSubmit = async () => {
        if (!form.first_name.trim()) { setError('First name is required'); return; }
        if (!form.last_name.trim()) { setError('Last name is required'); return; }

        setSaving(true); setError('');
        try {
            const res = await fetch('/api/referrals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    originating_county_id: form.originating_county_id || null,
                    provider_recommendation_id: form.provider_recommendation_id || null,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Failed to create referral'); setSaving(false); return; }
            setSuccess(true);
            setTimeout(() => router.push('/referrals'), 1500);
        } catch { setError('An error occurred.'); setSaving(false); }
    };

    if (authStatus === 'loading') return <div className="min-h-screen bg-gray-50"><Header /><div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div></div>;

    if (success) return (
        <div className="min-h-screen bg-gray-50"><Header />
            <div className="max-w-2xl mx-auto px-6 py-24 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-ddor-navy mb-2">Referral Created</h2>
                <p className="text-gray-400 text-sm">Redirecting to referrals list...</p>
            </div>
        </div>
    );

    const Inp = ({ label, field, type = 'text', required = false, span = 1, placeholder = '' }: { label: string; field: string; type?: string; required?: boolean; span?: number; placeholder?: string }) => (
        <div className={span === 2 ? 'sm:col-span-2' : span === 3 ? 'sm:col-span-3' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
            <input type={type} value={(form as any)[field] || ''} onChange={e => u(field, e.target.value)} placeholder={placeholder}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ddor-blue/20 focus:border-ddor-blue" />
        </div>
    );

    const Sel = ({ label, field, options, required = false }: { label: string; field: string; options: { value: string; label: string }[]; required?: boolean }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
            <select value={(form as any)[field] || ''} onChange={e => u(field, e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm">
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
                    <button onClick={() => router.push('/referrals')} className="p-2 hover:bg-gray-200 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                    <div><h1 className="text-2xl font-bold text-ddor-navy">New BHCDP Referral</h1><p className="text-sm text-gray-500">Create a new program referral</p></div>
                </div>

                {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-500" /><p className="text-sm text-red-700">{error}</p></div>}

                <div className="space-y-6">
                    {/* Participant Info */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><User className="w-5 h-5 text-ddor-blue" /> Participant Information</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Inp label="First Name" field="first_name" required />
                            <Inp label="Last Name" field="last_name" required />
                            <Inp label="Date of Birth" field="date_of_birth" type="date" />
                            <Sel label="Sex" field="gender" options={GENDER_OPTIONS.map(g => ({ value: g, label: g }))} />
                            <Inp label="Phone" field="phone" type="tel" />
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Originating County</label>
                                <select value={form.originating_county_id} onChange={e => u('originating_county_id', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm">
                                    <option value="">— Select —</option>
                                    {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="sm:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Contact Info</label>
                                <textarea value={form.alternate_contact} onChange={e => u('alternate_contact', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm min-h-[60px]" placeholder="Name, relationship, phone..." />
                            </div>
                        </div>
                    </div>

                    {/* Dates & Status */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Calendar className="w-5 h-5 text-ddor-blue" /> Dates & Status</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Inp label="Date Received" field="date_received" type="date" />
                            <Inp label="Referral Date" field="referral_date" type="date" />
                            <Inp label="Court Date" field="court_date" type="date" />
                            <Sel label="Assessor Status" field="assessor_status" options={ASSESSOR_STATUS.map(s => ({ value: s, label: s }))} />
                            <Sel label="Eligibility" field="eligibility" options={ELIGIBILITY.map(e => ({ value: e, label: e }))} />
                            <Sel label="Referral Status" field="referral_type_status" options={REFERRAL_TYPE} />
                            {form.referral_type_status === 'closed' && (
                                <Sel label="Closed Reason" field="closed_reason" options={CLOSED_REASONS.map(r => ({ value: r, label: r }))} />
                            )}
                            <Sel label="Initial Housing" field="initial_housing" options={HOUSING_STATUS.map(h => ({ value: h, label: h }))} />
                            <Sel label="Prior Participant" field="prior_participant" options={[{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }]} />
                        </div>
                    </div>

                    {/* Custody & Urgency */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Shield className="w-5 h-5 text-ddor-blue" /> Custody & Urgency</h2>
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                                <input type="checkbox" checked={form.jail_at_referral} onChange={e => u('jail_at_referral', e.target.checked)} className="w-4 h-4 rounded" />
                                <span className="text-sm font-medium text-gray-700">In jail at time of referral</span>
                            </label>
                            {form.jail_at_referral && (
                                <textarea value={form.jail_contact_instructions} onChange={e => u('jail_contact_instructions', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm min-h-[60px]" placeholder="Jail contact instructions..." />
                            )}

                            <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${form.is_urgent ? 'bg-red-50' : 'bg-gray-50'}`}>
                                <input type="checkbox" checked={form.is_urgent} onChange={e => u('is_urgent', e.target.checked)} className="w-4 h-4 rounded" />
                                <div>
                                    <span className={`text-sm font-medium ${form.is_urgent ? 'text-red-800' : 'text-gray-700'}`}>Urgent Referral</span>
                                    {form.is_urgent && <p className="text-xs text-red-600 mt-0.5">This will flag the referral for immediate attention</p>}
                                </div>
                            </label>
                            {form.is_urgent && (
                                <textarea value={form.urgent_message} onChange={e => u('urgent_message', e.target.value)}
                                    className="w-full p-2.5 border border-red-200 rounded-lg text-sm min-h-[60px] bg-red-50/50" placeholder="Describe urgency..." />
                            )}
                        </div>
                    </div>

                    {/* Clinical Flags */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><AlertTriangle className="w-5 h-5 text-ddor-blue" /> Clinical Flags</h2>
                        <div className="space-y-2">
                            {[
                                { field: 'smi_symptoms', label: 'Severe Mental Illness (SMI)', color: 'purple' },
                                { field: 'tbi_abi', label: 'Traumatic Brain Injury (TBI/ABI)', color: 'amber' },
                                { field: 'major_medical_issues', label: 'Major Medical Issues', color: 'red' },
                            ].map(flag => (
                                <label key={flag.field} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${(form as any)[flag.field] ? `bg-${flag.color}-50` : 'bg-gray-50'}`}>
                                    <input type="checkbox" checked={(form as any)[flag.field]} onChange={e => u(flag.field, e.target.checked)} className="w-4 h-4 rounded" />
                                    <span className="text-sm font-medium text-gray-700">{flag.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* SB90 Charges */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Scale className="w-5 h-5 text-ddor-blue" /> Current SB90 Charges</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {SB90_CHARGES.map(charge => (
                                <label key={charge} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm ${form.sb90_charges.includes(charge) ? 'bg-blue-50 text-blue-800' : 'hover:bg-gray-50 text-gray-700'}`}>
                                    <input type="checkbox" checked={form.sb90_charges.includes(charge)} onChange={() => toggleCharge(charge)} className="w-4 h-4 rounded" />
                                    {charge}
                                </label>
                            ))}
                        </div>
                        {form.sb90_charges.includes('Other') && (
                            <textarea value={form.sb90_charges_other} onChange={e => u('sb90_charges_other', e.target.value)}
                                className="w-full mt-3 p-2.5 border border-gray-300 rounded-lg text-sm min-h-[60px]" placeholder="Describe other charges..." />
                        )}
                    </div>

                    {/* Reassessment (if prior participant) */}
                    {form.prior_participant === 'Yes' && (
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><FileText className="w-5 h-5 text-ddor-blue" /> Reassessment Reasons</h2>
                            <div className="space-y-1.5">
                                {REASSESSMENT_REASONS.map(reason => (
                                    <label key={reason} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm ${form.reassessment_reasons.includes(reason) ? 'bg-blue-50 text-blue-800' : 'hover:bg-gray-50 text-gray-700'}`}>
                                        <input type="checkbox" checked={form.reassessment_reasons.includes(reason)} onChange={() => toggleReassessment(reason)} className="w-4 h-4 rounded" />
                                        {reason}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy mb-4">Notes</h2>
                        <textarea value={form.notes} onChange={e => u('notes', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-sm min-h-[80px]" placeholder="Additional notes..." />
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3 pb-8">
                        <button onClick={() => router.push('/referrals')}
                            className="flex-1 py-3 bg-white border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button onClick={handleSubmit} disabled={saving}
                            className="flex-1 py-3 bg-ddor-blue text-white rounded-xl font-semibold hover:bg-[#156090] disabled:opacity-40 flex items-center justify-center gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Creating...' : 'Create Referral'}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
