'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import {
    ArrowLeft, Loader2, User, Calendar,
    Stethoscope, Building, AlertCircle, CheckCircle2,
    Mail, Phone, Send, MessageSquare
} from 'lucide-react';

export default function NewClientPage() {
    const router = useRouter();
    const { data: session, status: authStatus } = useSession();
    const ddor = (session as any)?.ddor;

    const [saving, setSaving] = useState(false);
    const [saveAction, setSaveAction] = useState<'create' | 'consent_email' | 'consent_text'>('create');
    const [error, setError] = useState('');
    const [facilities, setFacilities] = useState<any[]>([]);

    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        phone_confirm: '',
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
    });

    useEffect(() => {
        if (authStatus === 'unauthenticated') router.push('/auth/signin');
    }, [authStatus, router]);

    useEffect(() => {
        if (ddor?.facilityId && !form.facility_id) {
            setForm(prev => ({ ...prev, facility_id: ddor.facilityId }));
        }
    }, [ddor?.facilityId]);

    useEffect(() => {
        if (!ddor) return;
        fetch('/api/facilities')
            .then(r => r.json())
            .then(data => setFacilities(data.facilities || []))
            .catch(console.error);
    }, [ddor]);

    const updateField = (field: string, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    const validate = (): string | null => {
        if (!form.first_name.trim()) return 'First name is required.';
        if (!form.last_name.trim()) return 'Last name is required.';
        if (!form.phone.trim()) return 'Phone number is required.';
        if (form.phone !== form.phone_confirm) return 'Phone numbers do not match.';
        if (!form.date_of_birth) return 'Date of birth is required.';
        if (!form.eligibility_status) return 'Please select an eligibility status.';
        if (saveAction === 'consent_email' && !form.email.trim()) return 'Email is required to send consent email.';
        if (saveAction === 'consent_text' && !form.phone.trim()) return 'Phone is required to send consent text.';
        return null;
    };

    const handleSubmit = async (action: 'create' | 'consent_email' | 'consent_text') => {
        setSaveAction(action);
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setSaving(true);
        setError('');

        try {
            const res = await fetch('/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: form.first_name.trim(),
                    last_name: form.last_name.trim(),
                    email: form.email.trim() || null,
                    phone: form.phone.trim() || null,
                    date_of_birth: form.date_of_birth || null,
                    zip: form.zip.trim() || null,
                    gender: form.gender || null,
                    facility_id: form.facility_id || ddor?.facilityId || null,
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
                    send_consent_email: action === 'consent_email',
                    send_consent_text: action === 'consent_text',
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to create client');
                setSaving(false);
                return;
            }

            router.push(`/clients/${data.client.id}`);
        } catch (e) {
            console.error(e);
            setError('An unexpected error occurred.');
            setSaving(false);
        }
    };

    if (authStatus === 'loading') {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>
            </div>
        );
    }

    const isAdmin = ddor?.role === 'super_admin' || ddor?.role === 'business_user';
    const hasEmail = form.email.trim().length > 0;
    const hasPhone = form.phone.trim().length > 0;

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.push('/clients')} className="p-2 hover:bg-gray-200 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-ddor-navy">Create Client</h1>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Participant Information */}
                    <Section title="Participant Information" icon={User}>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Field label="First Name" required>
                                <input type="text" value={form.first_name} onChange={(e) => updateField('first_name', e.target.value)} className="input" placeholder="First name" autoFocus />
                            </Field>
                            <Field label="Last Name" required>
                                <input type="text" value={form.last_name} onChange={(e) => updateField('last_name', e.target.value)} className="input" placeholder="Last name" />
                            </Field>
                            <Field label="Email">
                                <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} className="input" placeholder="participant@email.com" />
                            </Field>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                            <Field label="Phone Number" required>
                                <input type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className="input" placeholder="(555) 555-5555" />
                            </Field>
                            <Field label="Confirm Phone Number" required>
                                <input
                                    type="tel"
                                    value={form.phone_confirm}
                                    onChange={(e) => updateField('phone_confirm', e.target.value)}
                                    className={`input ${form.phone_confirm && form.phone !== form.phone_confirm ? 'border-red-400' : ''}`}
                                    placeholder="(555) 555-5555"
                                />
                                {form.phone_confirm && form.phone !== form.phone_confirm && (
                                    <p className="text-xs text-red-500 mt-1">Phone numbers do not match</p>
                                )}
                            </Field>
                            <Field label="Date of Birth" required>
                                <input type="date" value={form.date_of_birth} onChange={(e) => updateField('date_of_birth', e.target.value)} className="input" />
                            </Field>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                            <Field label="Zip Code">
                                <input type="text" value={form.zip} onChange={(e) => updateField('zip', e.target.value)} className="input" placeholder="40202" maxLength={10} />
                            </Field>
                            <Field label="Gender">
                                <select value={form.gender} onChange={(e) => updateField('gender', e.target.value)} className="input">
                                    <option value="">— Select —</option>
                                    <option value="female">Female</option>
                                    <option value="male">Male</option>
                                    <option value="transgender">Transgender</option>
                                </select>
                            </Field>
                            <Field label="Alternate Contact">
                                <input type="text" value={form.alternate_contact} onChange={(e) => updateField('alternate_contact', e.target.value)} className="input" placeholder="Name and phone" />
                            </Field>
                        </div>
                    </Section>

                    {/* Treatment Provider & Program */}
                    <Section title="Program Information" icon={Building}>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Field label="Treatment Provider" className="sm:col-span-2">
                                <select value={form.facility_id} onChange={(e) => updateField('facility_id', e.target.value)} className="input">
                                    <option value="">— Select Facility —</option>
                                    {facilities.map((f: any) => (
                                        <option key={f.id} value={f.id}>
                                            {f.provider_abbreviation ? `${f.provider_abbreviation} — ` : ''}{f.name}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Length of Agreement (days)">
                                <input type="number" value={form.agreement_length_days} onChange={(e) => updateField('agreement_length_days', e.target.value)} className="input" placeholder="e.g. 365" min={1} />
                            </Field>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                            <Field label="Participant Agreement Start Date">
                                <input type="date" value={form.agreement_signed_date} onChange={(e) => updateField('agreement_signed_date', e.target.value)} className="input" />
                            </Field>
                            <Field label="Treatment Start Date">
                                <input type="date" value={form.treatment_start_date} onChange={(e) => updateField('treatment_start_date', e.target.value)} className="input" />
                            </Field>
                            <Field label="Eligibility Status" required>
                                <select value={form.eligibility_status} onChange={(e) => updateField('eligibility_status', e.target.value)} className={`input ${!form.eligibility_status && error ? 'border-red-400' : ''}`}>
                                    <option value="">— Select —</option>
                                    <option value="pretrial_eligible">Pretrial Eligible</option>
                                    <option value="prosecutor_override">Prosecutor Override</option>
                                    <option value="unsure">Unsure</option>
                                </select>
                            </Field>
                        </div>

                        {!form.treatment_start_date && (
                            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-amber-700">Report due dates are calculated from the treatment start date. You can add this later, but reports won&apos;t show as due until it&apos;s set.</p>
                            </div>
                        )}
                    </Section>

                    {/* Clinical */}
                    <Section title="Clinical Information" icon={Stethoscope}>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Field label="Primary Diagnosis">
                                <select value={form.diagnosis} onChange={(e) => updateField('diagnosis', e.target.value)} className="input">
                                    <option value="">— Select —</option>
                                    <option value="sud">SUD (Substance Use Disorder)</option>
                                    <option value="mh">MH (Mental Health)</option>
                                    <option value="co_occurring">Co-Occurring</option>
                                </select>
                            </Field>
                            <Field label="Secondary Diagnosis">
                                <select value={form.secondary_diagnosis} onChange={(e) => updateField('secondary_diagnosis', e.target.value)} className="input">
                                    <option value="">— None —</option>
                                    <option value="sud">SUD (Substance Use Disorder)</option>
                                    <option value="mh">MH (Mental Health)</option>
                                </select>
                            </Field>
                            <Field label="OUD Diagnosis">
                                <div className="flex items-center gap-3 h-[42px]">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={form.has_oud} onChange={(e) => updateField('has_oud', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-ddor-blue focus:ring-ddor-blue" />
                                        <span className="text-sm text-gray-700">Opioid Use Disorder</span>
                                    </label>
                                </div>
                            </Field>
                        </div>
                        <Field label="DDOR ID (Legacy)" className="mt-4 max-w-xs">
                            <input type="text" value={form.ddor_id} onChange={(e) => updateField('ddor_id', e.target.value)} className="input" placeholder="e.g. 12345" />
                        </Field>
                    </Section>

                    {/* Questionnaire Subscription */}
                    <Section title="Questionnaire Delivery" icon={Send}>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                                <Mail className={`w-5 h-5 ${hasEmail ? 'text-ddor-blue' : 'text-gray-300'}`} />
                                <p className="text-sm text-gray-700 flex-1">
                                    {hasEmail ? `Questionnaires can be sent to ${form.email}` : 'The client is not subscribed to receive questionnaires by email.'}
                                </p>
                                {hasEmail && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                                <MessageSquare className={`w-5 h-5 ${hasPhone ? 'text-ddor-blue' : 'text-gray-300'}`} />
                                <p className="text-sm text-gray-700 flex-1">
                                    {hasPhone ? `Questionnaires can be sent via text to ${form.phone}` : 'The client is not subscribed to receive questionnaires by TEXT.'}
                                </p>
                                {hasPhone && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                            </div>
                        </div>
                    </Section>

                    {/* Notes */}
                    <Section title="Notes" icon={User}>
                        <textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} className="input min-h-[100px] resize-y" placeholder="Optional notes about this participant..." />
                    </Section>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2 pb-8">
                        <button onClick={() => router.push('/clients')} className="py-3 px-6 bg-ddor-navy text-white rounded-xl font-medium hover:bg-[#162d42]">
                            BACK
                        </button>
                        <button onClick={() => handleSubmit('create')} disabled={saving} className="py-3 px-6 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 disabled:opacity-40 flex items-center justify-center gap-2">
                            {saving && saveAction === 'create' && <Loader2 className="w-4 h-4 animate-spin" />}
                            CREATE
                        </button>
                        <button onClick={() => handleSubmit('consent_email')} disabled={saving || !hasEmail} className="py-3 px-6 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 disabled:opacity-40 flex items-center justify-center gap-2" title={!hasEmail ? 'Add an email address to enable' : ''}>
                            {saving && saveAction === 'consent_email' && <Loader2 className="w-4 h-4 animate-spin" />}
                            <Mail className="w-4 h-4" />
                            CREATE AND SEND CONSENT EMAIL
                        </button>
                        <button onClick={() => handleSubmit('consent_text')} disabled={saving || !hasPhone} className="py-3 px-6 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 disabled:opacity-40 flex items-center justify-center gap-2" title={!hasPhone ? 'Add a phone number to enable' : ''}>
                            {saving && saveAction === 'consent_text' && <Loader2 className="w-4 h-4 animate-spin" />}
                            <MessageSquare className="w-4 h-4" />
                            CREATE AND SEND CONSENT TEXT
                        </button>
                    </div>
                </div>
            </main>

            <style jsx>{`
                .input {
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    border: 1px solid #D1D5DB;
                    border-radius: 0.5rem;
                    font-size: 0.875rem;
                    outline: none;
                    transition: border-color 0.15s, box-shadow 0.15s;
                }
                .input:focus {
                    border-color: #1A73A8;
                    box-shadow: 0 0 0 3px rgba(26, 115, 168, 0.1);
                }
            `}</style>
        </div>
    );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4">
                <Icon className="w-5 h-5 text-ddor-blue" /> {title}
            </h2>
            {children}
        </div>
    );
}

function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
    return (
        <div className={className}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
        </div>
    );
}
