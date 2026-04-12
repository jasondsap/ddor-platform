'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import {
    ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2,
    Search, User, X, Home, Heart, Shield, Phone
} from 'lucide-react';

const GENDER = ['Male', 'Female'];
const RACE_ETHNICITY = ['White', 'Black/African American', 'Hispanic/Latino', 'Asian', 'Native American/Alaskan', 'Pacific Islander or Hawaiian', 'Multiple Races', 'Other'];
const CONTACT_METHOD = ['Cell Phone', 'Home Phone', 'Text', 'Email'];
const VETERAN_OPTIONS = ['Yes', 'No'];

const LIVING_SITUATION = [
    'Housed - Own/Rental Apartment, Room, Trailer, or House',
    'Housed - Dormitory/College Residence',
    'Housed - Transitional Housing/Recovery Housing',
    'Housed - 90 day+ Residential Treatment',
    'Currently residing in KRHN Certified Recovery Housing',
    'Homeless - Residing in Public place not meant for habitation',
    'Homeless - Residing in Shelter, hotel/motel',
    'Homeless - Currently in inpatient/residential treatment (<90 days)',
    'Unstable Housing: Couch Surfing',
    'Unstable Housing: Moved 2+ times in last 60 days',
    'Living with family or Partner',
    'Other',
];

const EMPLOYMENT = [
    'Employed - full-time (35 hours+)', 'Employed - part-time',
    'Unemployed, but looking for work', 'Unemployed, not looking for work',
    'SSI/Disability - not employed', 'SSI/Disability - employed part-time',
    'Retired', 'Not in Labor Force', 'Unknown',
];

const EDUCATION = ['No Schooling', 'Less than 12th Grade', 'High School or GED', 'Vocational/Technical Diploma', 'Some College', 'Two-Year Degree', "Bachelor's Degree", 'Graduate Degree'];
const ENROLLMENT = ['Not enrolled', 'Enrolled, Full-time', 'Enrolled, Part-time'];
const INSURANCE = ['Medicaid', 'Medicare', 'Medicare/Medicaid', 'Private Insurance (you are policy holder)', 'Private Insurance (family member is policy holder)', 'VA/Tricare/Champus', 'Unsure'];

function DemographicContent() {
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
        first_name: '', last_name: '', nickname: '',
        date_of_birth: '', gender: '', race_ethnicity: '', race_other: '',
        veteran: '',
        street_address: '', apt_suite: '', city: '', county: '', zip: '',
        phone_primary: '', has_alternate_phone: 'No', phone_alternate: '', email: '',
        emergency_name: '', emergency_phone: '', emergency_relation: '',
        preferred_contact: '',
        living_situation: '', employment: '', education: '', enrollment: '',
        insurance: '', insurance_id: '',
        treated_sud: '', treated_mh: '',
        date_submitted: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        if (preselectedClientId) {
            fetch(`/api/clients/${preselectedClientId}`).then(r => r.json()).then(d => {
                if (d.client) {
                    const c = d.client;
                    setSelectedClient(c);
                    setForm(prev => ({
                        ...prev,
                        first_name: c.first_name || '', last_name: c.last_name || '',
                        date_of_birth: c.date_of_birth?.split('T')[0] || '',
                        gender: c.gender || '', phone_primary: c.phone || '', email: c.email || '',
                        zip: c.zip || '',
                    }));
                }
            });
        }
    }, [preselectedClientId]);

    useEffect(() => {
        if (clientSearch.length < 2) { setClients([]); return; }
        const t = setTimeout(() => { fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}&status=active`).then(r => r.json()).then(d => setClients(d.clients || [])); }, 300);
        return () => clearTimeout(t);
    }, [clientSearch]);

    const u = (key: string, value: any) => { setForm(prev => ({ ...prev, [key]: value })); setError(''); };

    const handleSubmit = async () => {
        if (!selectedClient) { setError('Please select a participant'); return; }
        if (!form.first_name || !form.last_name) { setError('Name is required'); return; }
        setSaving(true); setError('');
        try {
            const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ client_id: selectedClient.id, report_type: 'demographic', ...form, sign_now: true }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Failed'); setSaving(false); return; }
            setSuccess(true);
            setTimeout(() => router.push(`/clients/${selectedClient.id}`), 1500);
        } catch { setError('Error occurred.'); setSaving(false); }
    };

    if (success) return <div className="max-w-2xl mx-auto px-6 py-24 text-center"><CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" /><h2 className="text-2xl font-bold text-ddor-navy mb-2">Demographic Report Submitted</h2></div>;

    const Sel = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) => (
        <div><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <select value={value} onChange={e => onChange(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"><option value="">— Select —</option>{options.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
    );
    const Inp = ({ label, value, onChange, type = 'text', placeholder = '' }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) => (
        <div><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label><input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder={placeholder} /></div>
    );

    return (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                <div><h1 className="text-2xl font-bold text-ddor-navy">SB90 Demographic Report</h1><p className="text-sm text-gray-500">Intake demographic information</p></div>
            </div>

            {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-500" /><p className="text-sm text-red-700">{error}</p></div>}

            <div className="space-y-6">
                {/* Client */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><User className="w-5 h-5 text-ddor-blue" /> Participant</h2>
                    {selectedClient ? (
                        <div className="flex items-center justify-between p-4 bg-ddor-light rounded-lg">
                            <p className="font-medium">{selectedClient.first_name} {selectedClient.last_name}</p>
                            <button onClick={() => setSelectedClient(null)}><X className="w-4 h-4 text-gray-400" /></button>
                        </div>
                    ) : (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" value={clientSearch} onChange={e => { setClientSearch(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} placeholder="Search..." className="w-full pl-10 pr-4 py-3 border rounded-lg text-sm" />
                            {showDropdown && clients.length > 0 && <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">{clients.map(c => <button key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(''); setShowDropdown(false); setForm(prev => ({ ...prev, first_name: c.first_name, last_name: c.last_name, date_of_birth: c.date_of_birth?.split('T')[0] || '', phone_primary: c.phone || '', email: c.email || '' })); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b text-sm">{c.first_name} {c.last_name}</button>)}</div>}
                        </div>
                    )}
                </div>

                {/* Personal */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><User className="w-5 h-5 text-ddor-blue" /> Personal Information</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Inp label="First Name" value={form.first_name} onChange={v => u('first_name', v)} />
                        <Inp label="Last Name" value={form.last_name} onChange={v => u('last_name', v)} />
                        <Inp label="Nickname/Alias" value={form.nickname} onChange={v => u('nickname', v)} />
                        <Inp label="Date of Birth" value={form.date_of_birth} onChange={v => u('date_of_birth', v)} type="date" />
                        <Sel label="Gender" value={form.gender} onChange={v => u('gender', v)} options={GENDER} />
                        <Sel label="Race/Ethnicity" value={form.race_ethnicity} onChange={v => u('race_ethnicity', v)} options={RACE_ETHNICITY} />
                        {form.race_ethnicity === 'Other' && <Inp label="Race (Other)" value={form.race_other} onChange={v => u('race_other', v)} />}
                        <Sel label="Veteran" value={form.veteran} onChange={v => u('veteran', v)} options={VETERAN_OPTIONS} />
                    </div>
                </div>

                {/* Address */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Home className="w-5 h-5 text-ddor-blue" /> Address & Contact</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2"><Inp label="Street Address" value={form.street_address} onChange={v => u('street_address', v)} /></div>
                        <Inp label="Apt/Suite" value={form.apt_suite} onChange={v => u('apt_suite', v)} />
                        <Inp label="City" value={form.city} onChange={v => u('city', v)} />
                        <Inp label="County" value={form.county} onChange={v => u('county', v)} />
                        <Inp label="Zip" value={form.zip} onChange={v => u('zip', v)} />
                        <Inp label="Phone (Primary)" value={form.phone_primary} onChange={v => u('phone_primary', v)} type="tel" />
                        <Sel label="Has Alternate Phone" value={form.has_alternate_phone} onChange={v => u('has_alternate_phone', v)} options={['Yes', 'No']} />
                        {form.has_alternate_phone === 'Yes' && <Inp label="Phone (Alternate)" value={form.phone_alternate} onChange={v => u('phone_alternate', v)} type="tel" />}
                        <Inp label="Email" value={form.email} onChange={v => u('email', v)} type="email" />
                        <Sel label="Preferred Contact Method" value={form.preferred_contact} onChange={v => u('preferred_contact', v)} options={CONTACT_METHOD} />
                    </div>
                    <h3 className="font-medium text-gray-700 mt-6 mb-3">Emergency Contact</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Inp label="Name" value={form.emergency_name} onChange={v => u('emergency_name', v)} />
                        <Inp label="Phone" value={form.emergency_phone} onChange={v => u('emergency_phone', v)} type="tel" />
                        <Inp label="Relationship" value={form.emergency_relation} onChange={v => u('emergency_relation', v)} />
                    </div>
                </div>

                {/* Status */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Shield className="w-5 h-5 text-ddor-blue" /> Current Status</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Sel label="Living Situation" value={form.living_situation} onChange={v => u('living_situation', v)} options={LIVING_SITUATION} />
                        <Sel label="Employment Status" value={form.employment} onChange={v => u('employment', v)} options={EMPLOYMENT} />
                        <Sel label="Highest Education" value={form.education} onChange={v => u('education', v)} options={EDUCATION} />
                        <Sel label="School Enrollment" value={form.enrollment} onChange={v => u('enrollment', v)} options={ENROLLMENT} />
                        <Sel label="Insurance" value={form.insurance} onChange={v => u('insurance', v)} options={INSURANCE} />
                        <Inp label="Insurance Policy ID" value={form.insurance_id} onChange={v => u('insurance_id', v)} />
                        <Sel label="Treated for SUD in Last Year" value={form.treated_sud} onChange={v => u('treated_sud', v)} options={['Yes', 'No', 'Unknown']} />
                        <Sel label="Treated for MH in Last Year" value={form.treated_mh} onChange={v => u('treated_mh', v)} options={['Yes', 'No', 'Unknown']} />
                    </div>
                </div>

                <div className="flex gap-3 pb-8">
                    <button onClick={() => router.back()} className="flex-1 py-3 bg-white border border-gray-300 rounded-xl font-medium text-gray-700">Cancel</button>
                    <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 bg-ddor-blue text-white rounded-xl font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {saving ? 'Submitting...' : 'Submit Demographic Report'}
                    </button>
                </div>
            </div>
        </main>
    );
}

export default function DemographicPage() {
    return (<div className="min-h-screen bg-gray-50"><Header /><Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>}><DemographicContent /></Suspense></div>);
}
