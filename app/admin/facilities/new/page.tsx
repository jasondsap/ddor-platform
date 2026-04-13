'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import {
    ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2,
    Building, Phone, MapPin, ClipboardCheck, Shield, Stethoscope
} from 'lucide-react';
import { Suspense } from 'react';

const SERVICE_OPTIONS = ['SUD Primary', 'SUD Only', 'MH Primary', 'MH Only', 'Co-occurring'];
const GENDER_OPTIONS = ['Co-ed', 'Men', 'Women'];
const REGION_OPTIONS = ['North', 'Central', 'East', 'West', 'South', 'Statewide'];

const FACILITY_TYPES = ['Outpatient', 'Residential', 'CSU', 'MAT Clinic - OBOT/OPT', 'CMHC', 'FQHC', 'Recovery House NARR 2', 'Recovery House NARR 3', 'Recovery Kentucky Center', 'Telehealth', 'CCBHC', 'Not Applicable'];
const SUD_SERVICES = ['0.5 Early Intervention', '1.0 Outpatient', '1.7 MAT', '2.1 IOP', '2.5 PHP', '3.1 CM Low Intensity Residential', '3.3 CM Pop-Specific H.I. Residential', '3.5 CM High Intensity Residential', '3.7 M-Monitored Intensive Inpatient', '4.0 Medically Managed Inpatient', 'Peer Support', 'Recovery Housing', 'Targeted Case Management', 'TRP', 'All Services Provided', 'Not Applicable'];
const MH_SERVICES = ['I. Recovery Maintenance(OP)', 'II. OP', 'III. IOP', 'IV. PHP', 'V. Medically Monitored Residential', 'VI. Medically Managed Inpatient', 'Peer Support', 'Targeted Case Management', 'TRP', 'Mental Health Housing', 'All Services Provided', 'Not Applicable', 'SUD Primary Only'];
const SPECIALTIES = ['Hospital Co-location', 'In-home services', 'IOP with boarding', 'Long term - 30+ days', 'Methadone', 'No insurance required', 'Pharmacy', 'Pregnant/Parenting', 'Primary Care', 'SMI', 'Suboxone', 'Telehealth', 'Transitional Housing', 'Transportation - general', 'Transportation - To treatment', 'Walk-ins', 'Workforce Development', 'Not Applicable'];

const ONBOARDING_STEPS = [
    { key: 'onboard_ddor_training', label: 'DDOR Training', group: 'Training' },
    { key: 'onboard_ddor_poc', label: 'DDOR Point of Contact Designated', group: 'Training' },
    { key: 'onboard_ddor_logins', label: 'DDOR Logins Created', group: 'Training' },
    { key: 'onboard_kickoff_call', label: 'Kick-Off Call Done', group: 'Onboarding' },
    { key: 'onboard_provider_training', label: 'New Provider Training', group: 'Onboarding' },
    { key: 'onboard_next_steps_email', label: 'Next Steps Email Sent', group: 'Onboarding' },
    { key: 'onboard_reimbursement_training', label: 'Reimbursement Training Call', group: 'Onboarding' },
    { key: 'onboard_monthly_checkins', label: 'Monthly Check-ins Scheduled', group: 'Onboarding' },
    { key: 'onboard_contract', label: 'Contract FY26', group: 'Compliance' },
    { key: 'onboard_baa', label: 'BAA FY26', group: 'Compliance' },
    { key: 'onboard_w9', label: 'W-9', group: 'Compliance' },
    { key: 'onboard_ach', label: 'ACH/Lockbox', group: 'Compliance' },
    { key: 'onboard_sent_executed_contract', label: 'Sent Executed Contract to Provider', group: 'Compliance' },
    { key: 'onboard_complete', label: 'Onboarding Complete', group: 'Sign-Off' },
    { key: 'onboard_complete_kathy', label: 'Onboarded — Kathy', group: 'Sign-Off' },
    { key: 'onboard_complete_tanya', label: 'Onboarded — Tanya', group: 'Sign-Off' },
    { key: 'onboard_complete_jade', label: 'Onboarded — Jade', group: 'Sign-Off' },
];

function FacilityFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('edit');
    const preselectedProvider = searchParams.get('provider_id');
    const { data: session } = useSession();
    const ddor = (session as any)?.ddor;
    const isAdmin = ddor?.role === 'super_admin' || ddor?.role === 'business_user';

    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(!!editId);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [providers, setProviders] = useState<any[]>([]);
    const [counties, setCounties] = useState<any[]>([]);

    const [form, setForm] = useState<Record<string, any>>({
        name: '', provider_id: preselectedProvider || '', county_id: '', phone: '',
        street_address: '', city: '', zip: '', region: '',
        primary_service: '', facility_gender: '',
        // Service tags (multi-select)
        facility_type: [] as string[],
        sud_services: [] as string[],
        mh_services: [] as string[],
        specialties: [] as string[],
        // Onboarding checkboxes
        ...Object.fromEntries(ONBOARDING_STEPS.map(s => [s.key, false])),
    });

    useEffect(() => {
        if (!ddor) return;
        fetch('/api/providers').then(r => r.json()).then(d => setProviders(d.providers || []));
        // Get counties
        fetch('/api/facilities?include_inactive=true').then(r => r.json()).then(d => {
            const countyMap = new Map<string, any>();
            for (const f of d.facilities || []) {
                if (f.county_id && f.county_name) countyMap.set(f.county_id, { id: f.county_id, name: f.county_name });
            }
            setCounties(Array.from(countyMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
        });
    }, [ddor]);

    useEffect(() => {
        if (!editId || !ddor) return;
        fetch(`/api/facilities/${editId}`)
            .then(r => r.json())
            .then(d => {
                if (d.facility) {
                    const f = d.facility;
                    const attrs = d.attributes || {};
                    setForm(prev => ({
                        ...prev,
                        name: f.name || '', provider_id: f.provider_id || '', county_id: f.county_id || '',
                        phone: f.phone || '', street_address: f.street_address || '',
                        city: f.city || '', zip: f.zip || '', region: f.region || '',
                        primary_service: f.primary_service || '', facility_gender: f.facility_gender || '',
                        facility_type: attrs.facility_type || [],
                        sud_services: attrs.sud_services || [],
                        mh_services: attrs.mh_services || [],
                        specialties: attrs.specialties || [],
                        ...Object.fromEntries(ONBOARDING_STEPS.map(s => [s.key, f[s.key] || false])),
                    }));
                }
            })
            .finally(() => setLoading(false));
    }, [editId, ddor]);

    const u = (k: string, v: any) => { setForm(p => ({ ...p, [k]: v })); setError(''); };
    const toggleTag = (field: string, value: string) => {
        setForm(p => {
            const arr = (p[field] || []) as string[];
            return { ...p, [field]: arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value] };
        });
    };

    const completedCount = ONBOARDING_STEPS.filter(s => form[s.key]).length;
    const totalSteps = ONBOARDING_STEPS.length;
    const progressPct = Math.round((completedCount / totalSteps) * 100);

    const handleSubmit = async () => {
        if (!form.name.trim()) { setError('Facility name is required'); return; }
        if (!form.provider_id) { setError('Provider is required'); return; }
        setSaving(true); setError('');
        try {
            const url = editId ? `/api/facilities/${editId}` : '/api/facilities';
            const method = editId ? 'PATCH' : 'POST';
            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); setSaving(false); return; }
            setSuccess(true);
            setTimeout(() => router.push('/facilities'), 1500);
        } catch { setError('An error occurred.'); setSaving(false); }
    };

    if (!isAdmin) return <div className="min-h-screen bg-gray-50"><Header /><div className="text-center py-12 text-gray-500">Admin access required.</div></div>;
    if (loading) return <div className="min-h-screen bg-gray-50"><Header /><div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div></div>;

    if (success) return (
        <div className="min-h-screen bg-gray-50"><Header />
            <div className="max-w-2xl mx-auto px-6 py-24 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-ddor-navy mb-2">{editId ? 'Facility Updated' : 'Facility Created'}</h2>
            </div>
        </div>
    );

    const groups = ['Training', 'Onboarding', 'Compliance', 'Sign-Off'];

    return (
        <div className="min-h-screen bg-gray-50"><Header />
            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.push('/facilities')} className="p-2 hover:bg-gray-200 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                    <div><h1 className="text-2xl font-bold text-ddor-navy">{editId ? 'Edit Facility' : 'New Facility'}</h1><p className="text-sm text-gray-500">{editId ? 'Update facility and onboarding status' : 'Add a new treatment facility'}</p></div>
                </div>

                {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-500" /><p className="text-sm text-red-700">{error}</p></div>}

                <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Building className="w-5 h-5 text-ddor-blue" /> Facility Information</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Facility Name *</label>
                                <input value={form.name} onChange={e => u('name', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="e.g. Jefferson County Outpatient" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Provider *</label>
                                <select value={form.provider_id} onChange={e => u('provider_id', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm">
                                    <option value="">— Select Provider —</option>
                                    {providers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
                                <select value={form.county_id} onChange={e => u('county_id', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm">
                                    <option value="">— Select County —</option>
                                    {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Service</label>
                                <select value={form.primary_service} onChange={e => u('primary_service', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm">
                                    <option value="">— Select —</option>
                                    {SERVICE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                <select value={form.facility_gender} onChange={e => u('facility_gender', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm">
                                    <option value="">— Select —</option>
                                    {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                                <select value={form.region} onChange={e => u('region', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm">
                                    <option value="">— Select —</option>
                                    {REGION_OPTIONS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input value={form.phone} onChange={e => u('phone', e.target.value)} type="tel"
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" />
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><MapPin className="w-5 h-5 text-ddor-blue" /> Address</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                                <input value={form.street_address} onChange={e => u('street_address', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                <input value={form.city} onChange={e => u('city', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                                <input value={form.zip} onChange={e => u('zip', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" />
                            </div>
                        </div>
                    </div>

                    {/* Services & Capabilities */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Stethoscope className="w-5 h-5 text-ddor-blue" /> Services & Capabilities</h2>

                        <TagSection label="FACILITY TYPE" options={FACILITY_TYPES} selected={form.facility_type || []} onToggle={(v) => toggleTag('facility_type', v)} />
                        <TagSection label="SUD SERVICES" options={SUD_SERVICES} selected={form.sud_services || []} onToggle={(v) => toggleTag('sud_services', v)} />
                        <TagSection label="MH SERVICES" options={MH_SERVICES} selected={form.mh_services || []} onToggle={(v) => toggleTag('mh_services', v)} />
                        <TagSection label="SPECIALTIES" options={SPECIALTIES} selected={form.specialties || []} onToggle={(v) => toggleTag('specialties', v)} />
                    </div>

                    {/* Onboarding Checklist */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-ddor-navy flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-ddor-blue" /> Onboarding Checklist</h2>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-ddor-navy">{completedCount}/{totalSteps}</span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${progressPct === 100 ? 'bg-green-100 text-green-700' : progressPct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{progressPct}%</span>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-2 bg-gray-100 rounded-full mb-6 overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${progressPct === 100 ? 'bg-green-500' : progressPct >= 50 ? 'bg-amber-500' : 'bg-ddor-blue'}`}
                                style={{ width: `${progressPct}%` }} />
                        </div>

                        {groups.map(group => {
                            const groupSteps = ONBOARDING_STEPS.filter(s => s.group === group);
                            const groupDone = groupSteps.filter(s => form[s.key]).length;
                            return (
                                <div key={group} className="mb-4 last:mb-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{group}</span>
                                        <span className="text-xs text-gray-400">{groupDone}/{groupSteps.length}</span>
                                    </div>
                                    <div className="space-y-1">
                                        {groupSteps.map(step => (
                                            <label key={step.key}
                                                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${form[step.key] ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                                                <input type="checkbox" checked={form[step.key] || false}
                                                    onChange={e => u(step.key, e.target.checked)}
                                                    className="w-4 h-4 rounded text-green-600" />
                                                <span className={`text-sm ${form[step.key] ? 'text-green-800 font-medium' : 'text-gray-700'}`}>{step.label}</span>
                                                {form[step.key] && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3 pb-8">
                        <button onClick={() => router.push('/facilities')} className="flex-1 py-3 bg-white border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button onClick={handleSubmit} disabled={saving}
                            className="flex-1 py-3 bg-ddor-blue text-white rounded-xl font-semibold hover:bg-[#156090] disabled:opacity-40 flex items-center justify-center gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Saving...' : editId ? 'Update Facility' : 'Create Facility'}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function NewFacilityPage() {
    return <Suspense fallback={<div className="min-h-screen bg-gray-50" />}><FacilityFormContent /></Suspense>;
}

function TagSection({ label, options, selected, onToggle }: { label: string; options: string[]; selected: string[]; onToggle: (v: string) => void }) {
    return (
        <div className="mb-5 last:mb-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
            <div className="flex flex-wrap gap-1.5">
                {options.map(opt => {
                    const isSelected = selected.includes(opt);
                    return (
                        <button key={opt} type="button" onClick={() => onToggle(opt)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${isSelected ? 'bg-ddor-blue text-white border-ddor-blue' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                            {opt}
                        </button>
                    );
                })}
            </div>
            {selected.length > 0 && <p className="text-xs text-gray-400 mt-1">{selected.length} selected</p>}
        </div>
    );
}
