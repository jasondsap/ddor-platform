'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import {
    ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2,
    User, Calendar, Phone, MapPin, Shield, AlertTriangle,
    Briefcase, FileText, Scale, Mail, Building
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
const HOUSING_STATUS = [
    { value: 'Housed', label: 'Housed' },
    { value: 'Unhoused', label: 'Unhoused' },
    { value: 'Unstable/Temporary Housing', label: 'Unstable/Temporary Housing — Hotel/Motel, Couch Surfing, In danger of losing housing' },
    { value: 'Unknown', label: 'Unknown' },
];
const GENDER_OPTIONS = ['Male', 'Female'];
const INSURANCE_OPTIONS = ['Yes', 'No', 'Unsure'];
const LOCATION_OPTIONS = ['Community', 'Courthouse', 'Jail', 'Treatment Facility', 'Other'];
const SB90_SUBSTANCE_CHARGES = ['Alcohol Intoxication', 'Drug Possession or Paraphernalia Possession', 'Drug Trafficking/Cultivation', 'Public Intoxication', 'Any other charge related to Illicit Substances or Alcohol', 'Unknown/Unsure', 'Not Applicable'];
const SB90_CHARGES = ['Assault 2nd, 3rd, or 4th', 'Burglary', 'Child Support', 'Criminal Mischief', 'Disorderly Conduct', 'Endangering the welfare of a minor', 'Reckless Driving', 'Resisting Arrest', 'Terroristic Threatening/Menacing/Harassment', 'Theft - including shoplifting, TBUT, receiving stolen property', 'Traffic Violations', 'Trespassing', 'Wanton Endangerment', 'Unknown/Unsure', 'Other'];
const REASSESSMENT_REASONS = ['Assessed, but not started treatment within 30 days', 'Discharged AMA from approved provider', 'Interruption in treatment (longer than 30 days)', 'Moved, and needs a new treatment provider', 'Received treatment from a non-approved provider', 'Returned to use'];
const NAVIGATOR_EMAILS = ['amyrouse@kycourts.net', 'bethanyfulton@kycourts.net', 'bridgetbaker@kycourts.net', 'brooklynJones@kycourts.net', 'christiepattinson@kycourts.net', 'davidBowling@kycourts.net', 'hollybrown@kycourts.net', 'jacquelinecooksey@kycourts.net', 'kristiwilliams@kycourts.net', 'laurawillcut@kycourts.net', 'rachelpetterson@kycourts.net', 'savannahgentry@kycourts.net', 'skylagrief@kycourts.net', 'tammyfannin@kycourts.net', 'tashamaher@kycourts.net', 'terryjustice@kycourts.net'];

// ======= HELPER COMPONENTS (outside main component to prevent focus loss) =======

function Inp({ label, field, value, onChange, type = 'text', required = false, span = 1, placeholder = '' }: { label: string; field: string; value: string; onChange: (f: string, v: string) => void; type?: string; required?: boolean; span?: number; placeholder?: string }) {
    return (
        <div className={span === 2 ? 'sm:col-span-2' : span === 3 ? 'sm:col-span-3' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
            <input type={type} value={value} onChange={e => onChange(field, e.target.value)} placeholder={placeholder}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ddor-blue/20 focus:border-ddor-blue" />
        </div>
    );
}

function Sel({ label, field, value, onChange, options, required = false }: { label: string; field: string; value: string; onChange: (f: string, v: string) => void; options: { value: string; label: string }[]; required?: boolean }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
            <select value={value} onChange={e => onChange(field, e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm">
                <option value="">— Select —</option>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
    );
}

function ChkGroup({ options, field, selected, onToggle }: { options: string[]; field: string; selected: string[]; onToggle: (f: string, v: string) => void }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {options.map(opt => (
                <label key={opt} className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer text-sm ${selected.includes(opt) ? 'bg-blue-50 text-blue-800 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}>
                    <input type="checkbox" checked={selected.includes(opt)} onChange={() => onToggle(field, opt)} className="w-4 h-4 rounded" />
                    {opt}
                </label>
            ))}
        </div>
    );
}

// ======= MAIN COMPONENT =======

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
        first_name: '', last_name: '', date_of_birth: '', gender: '',
        phone: '', alternate_contact: '', originating_county_id: '',
        date_received: new Date().toISOString().split('T')[0],
        referral_date: '', court_date: '', location_at_referral: '',
        jail_at_referral: false, jail_contact_instructions: '',
        assessor_status: 'Pending', eligibility: '',
        referral_type_status: 'open_within_72_hours', closed_reason: '',
        provider_recommendation_id: '', loc_recommendation: '',
        initial_housing: '', has_insurance: '',
        is_urgent: false, urgent_message: '',
        smi_symptoms: false, tbi_abi: false, major_medical_issues: false,
        prior_participant: '',
        sb90_substance_charges: [] as string[], sb90_charges: [] as string[], sb90_charges_other: '',
        needs_reassessment: false, reassessment_reasons: [] as string[],
        case_navigator_name: '', case_navigator_email: '', notes: '',
    });

    useEffect(() => { if (authStatus === 'unauthenticated') router.push('/auth/signin'); }, [authStatus, router]);
    useEffect(() => {
        if (!ddor) return;
        fetch('/api/facilities').then(r => r.json()).then(d => {
            setFacilities(d.facilities || []);
            const cm = new Map<string, any>();
            for (const f of d.facilities || []) { if (f.county_id && f.county_name) cm.set(f.county_id, { id: f.county_id, name: f.county_name }); }
            setCounties(Array.from(cm.values()).sort((a, b) => a.name.localeCompare(b.name)));
        });
    }, [ddor]);

    const u = (key: string, value: any) => { setForm(prev => ({ ...prev, [key]: value })); setError(''); };
    const toggleArr = (field: string, value: string) => {
        setForm(prev => { const arr = (prev as any)[field] as string[]; return { ...prev, [field]: arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value] }; });
    };

    const handleSubmit = async () => {
        if (!form.first_name.trim()) { setError('First name is required'); return; }
        if (!form.last_name.trim()) { setError('Last name is required'); return; }
        setSaving(true); setError('');
        try {
            const res = await fetch('/api/referrals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, originating_county_id: form.originating_county_id || null, provider_recommendation_id: form.provider_recommendation_id || null }) });
            if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); setSaving(false); return; }
            setSuccess(true); setTimeout(() => router.push('/referrals'), 1500);
        } catch { setError('An error occurred'); setSaving(false); }
    };

    if (authStatus === 'loading') return <div className="min-h-screen bg-gray-50"><Header /><div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div></div>;
    if (success) return <div className="min-h-screen bg-gray-50"><Header /><div className="max-w-2xl mx-auto px-6 py-24 text-center"><CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" /><h2 className="text-2xl font-bold text-ddor-navy mb-2">Referral Created</h2></div></div>;

    return (
        <div className="min-h-screen bg-gray-50"><Header />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.push('/referrals')} className="p-2 hover:bg-gray-200 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                    <div><h1 className="text-2xl font-bold text-ddor-navy">AOC Case Navigator Referral to the State Assessor</h1><p className="text-sm text-gray-500">Create a new BHCDP program referral</p></div>
                </div>
                {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-500" /><p className="text-sm text-red-700">{error}</p></div>}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><User className="w-5 h-5 text-ddor-blue" /> BHCDP Candidate Information</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Inp label="Candidate's First Name" field="first_name" value={form.first_name} onChange={u} required />
                            <Inp label="Candidate's Last Name" field="last_name" value={form.last_name} onChange={u} required />
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label><input type="date" value={form.date_of_birth} onChange={e => u('date_of_birth', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" /><p className="text-xs text-gray-400 mt-0.5">If DOB not available, enter 09/09/1999 as placeholder</p></div>
                            <Sel label="Gender" field="gender" value={form.gender} onChange={u} options={GENDER_OPTIONS.map(g => ({ value: g, label: g }))} />
                            <Inp label="Candidate's Phone Number" field="phone" value={form.phone} onChange={u} type="tel" />
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">County of Originating Charge</label><select value={form.originating_county_id} onChange={e => u('originating_county_id', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"><option value="">— Select County —</option>{counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                            <div className="sm:col-span-3"><label className="block text-sm font-medium text-gray-700 mb-1">Alternative Contact</label><textarea value={form.alternate_contact} onChange={e => u('alternate_contact', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm min-h-[60px]" placeholder="Name, relationship, phone number..." /></div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><MapPin className="w-5 h-5 text-ddor-blue" /> Location, Housing & Insurance</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Sel label="Location" field="location_at_referral" value={form.location_at_referral} onChange={u} options={LOCATION_OPTIONS.map(l => ({ value: l, label: l }))} />
                            <Sel label="Candidate's Housing Status" field="initial_housing" value={form.initial_housing} onChange={u} options={HOUSING_STATUS} />
                            <Sel label="Health insurance?" field="has_insurance" value={form.has_insurance} onChange={u} options={INSURANCE_OPTIONS.map(i => ({ value: i, label: i }))} />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer"><input type="checkbox" checked={form.needs_reassessment} onChange={e => u('needs_reassessment', e.target.checked)} className="w-4 h-4 rounded" /><span className="text-sm font-medium text-gray-700">Does this candidate need a reassessment?</span></label>
                        {form.needs_reassessment && (<div className="mt-4"><p className="text-sm font-medium text-gray-700 mb-2">Reassessment Reasons</p><div className="space-y-1.5">{REASSESSMENT_REASONS.map(reason => (<label key={reason} className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer text-sm ${form.reassessment_reasons.includes(reason) ? 'bg-blue-50 text-blue-800 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}><input type="checkbox" checked={form.reassessment_reasons.includes(reason)} onChange={() => toggleArr('reassessment_reasons', reason)} className="w-4 h-4 rounded" />{reason}</label>))}</div></div>)}
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Calendar className="w-5 h-5 text-ddor-blue" /> Dates & Status</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Inp label="Referral Date" field="referral_date" value={form.referral_date} onChange={u} type="date" />
                            <Inp label="Date Received" field="date_received" value={form.date_received} onChange={u} type="date" />
                            <Inp label="Court Date" field="court_date" value={form.court_date} onChange={u} type="date" />
                            <Sel label="Assessor Status" field="assessor_status" value={form.assessor_status} onChange={u} options={ASSESSOR_STATUS.map(s => ({ value: s, label: s }))} />
                            <Sel label="Eligibility" field="eligibility" value={form.eligibility} onChange={u} options={ELIGIBILITY.map(e => ({ value: e, label: e }))} />
                            <Sel label="Referral Status" field="referral_type_status" value={form.referral_type_status} onChange={u} options={REFERRAL_TYPE} />
                            {form.referral_type_status === 'closed' && <Sel label="Closed Reason" field="closed_reason" value={form.closed_reason} onChange={u} options={CLOSED_REASONS.map(r => ({ value: r, label: r }))} />}
                            <Sel label="Prior Participant" field="prior_participant" value={form.prior_participant} onChange={u} options={[{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }]} />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Shield className="w-5 h-5 text-ddor-blue" /> Custody & Urgency</h2>
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer"><input type="checkbox" checked={form.jail_at_referral} onChange={e => u('jail_at_referral', e.target.checked)} className="w-4 h-4 rounded" /><span className="text-sm font-medium text-gray-700">In jail at time of referral</span></label>
                            {form.jail_at_referral && <textarea value={form.jail_contact_instructions} onChange={e => u('jail_contact_instructions', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm min-h-[60px]" placeholder="Jail contact instructions..." />}
                            <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${form.is_urgent ? 'bg-red-50' : 'bg-gray-50'}`}><input type="checkbox" checked={form.is_urgent} onChange={e => u('is_urgent', e.target.checked)} className="w-4 h-4 rounded" /><div><span className={`text-sm font-medium ${form.is_urgent ? 'text-red-800' : 'text-gray-700'}`}>Urgent — Needs assessment within the hour</span>{form.is_urgent && <p className="text-xs text-red-600 mt-0.5">This will flag the referral for immediate attention</p>}</div></label>
                            {form.is_urgent && <textarea value={form.urgent_message} onChange={e => u('urgent_message', e.target.value)} className="w-full p-2.5 border border-red-200 rounded-lg text-sm min-h-[60px] bg-red-50/50" placeholder="Describe urgency..." />}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><AlertTriangle className="w-5 h-5 text-ddor-blue" /> Clinical Flags</h2>
                        <div className="space-y-2">
                            {[{ field: 'smi_symptoms', label: 'Severe Mental Illness (SMI)', color: 'purple' }, { field: 'tbi_abi', label: 'Traumatic Brain Injury (TBI/ABI)', color: 'amber' }, { field: 'major_medical_issues', label: 'Major Medical Issues', color: 'red' }].map(flag => (
                                <label key={flag.field} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${(form as any)[flag.field] ? `bg-${flag.color}-50` : 'bg-gray-50'}`}><input type="checkbox" checked={(form as any)[flag.field]} onChange={e => u(flag.field, e.target.checked)} className="w-4 h-4 rounded" /><span className="text-sm font-medium text-gray-700">{flag.label}</span></label>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Scale className="w-5 h-5 text-ddor-blue" /> SB90 Charges — Substance Related</h2>
                        <p className="text-sm text-gray-500 mb-3">Current charges directly related to substances, illicit substances and/or alcohol</p>
                        <ChkGroup options={SB90_SUBSTANCE_CHARGES} field="sb90_substance_charges" selected={form.sb90_substance_charges} onToggle={toggleArr} />
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Scale className="w-5 h-5 text-ddor-blue" /> Current SB90 Charges</h2>
                        <ChkGroup options={SB90_CHARGES} field="sb90_charges" selected={form.sb90_charges} onToggle={toggleArr} />
                        {form.sb90_charges.includes('Other') && <textarea value={form.sb90_charges_other} onChange={e => u('sb90_charges_other', e.target.value)} className="w-full mt-3 p-2.5 border border-gray-300 rounded-lg text-sm min-h-[60px]" placeholder="Describe other charges..." />}
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Mail className="w-5 h-5 text-ddor-blue" /> Case Navigator</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Inp label="Name of Case Navigator" field="case_navigator_name" value={form.case_navigator_name} onChange={u} placeholder="Full name" />
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Case Navigator Email</label><select value={form.case_navigator_email} onChange={e => u('case_navigator_email', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"><option value="">— Select —</option>{NAVIGATOR_EMAILS.map(em => <option key={em} value={em}>{em}</option>)}</select></div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy mb-4">Notes</h2>
                        <textarea value={form.notes} onChange={e => u('notes', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg text-sm min-h-[80px]" placeholder="Additional notes..." />
                    </div>
                    <div className="flex gap-3 pb-8">
                        <button onClick={() => router.push('/referrals')} className="flex-1 py-3 bg-white border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 bg-ddor-blue text-white rounded-xl font-semibold hover:bg-[#156090] disabled:opacity-40 flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? 'Creating...' : 'Submit Referral'}</button>
                    </div>
                </div>
            </main>
        </div>
    );
}
