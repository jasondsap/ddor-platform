'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import {
    ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2,
    ChevronDown, ChevronUp, FileText, User, Stethoscope,
    Briefcase, Shield, ClipboardList, Heart
} from 'lucide-react';
import {
    REPORT_TYPES, LIVING_SITUATION, EMPLOYMENT_STATUS, MONTHS_UNEMPLOYED,
    CRIMINAL_JUSTICE, EDUCATION_LEVEL, INSURANCE_TYPE, SUD_LOC, MH_LOC,
    CASE_MGMT_SERVICES, PROGRAM_STATUS, ATTENDANCE, MAT_SERVICES,
    REFERRED_LOC, KYAE_REFERRAL_STATUS, KYAE_EDUCATION_STATUS,
    KYAE_EMPLOYMENT_STATUS, DISCHARGE_REASONS, GOALS_ACHIEVED,
    BARRIERS_TO_TREATMENT, CREDENTIAL, SERVICE_CATEGORIES,
} from '@/lib/report-fields';

type ReportType = keyof typeof REPORT_TYPES;

function ReportFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const ddor = (session as any)?.ddor;

    const clientId = searchParams.get('client_id') || '';
    const typeParam = searchParams.get('type') || '';

    const [client, setClient] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        participant: true, status: true, clinical: false, services: false, signature: false,
        discharge: false, kyae: false,
    });

    const [form, setForm] = useState<Record<string, any>>({
        report_type: typeParam || 'fourteen_day',
        living_situation: [],
        employment_status: [],
        months_unemployed: '',
        criminal_justice: [],
        education_level: '',
        insurance_type: [],
        sud_loc: '',
        mh_loc: '',
        household_income: '',
        dependents: '',
        case_mgmt_services: [],
        program_status: '',
        attendance: '',
        mat_receiving: '',
        mat_services: [],
        discharged: 'No',
        discharge_date: '',
        discharge_reason: '',
        referred_to_provider: 'No',
        referred_loc: '',
        referred_provider_name: '',
        kyae_referral_status: '',
        kyae_education_status: '',
        kyae_employment_status: '',
        goals_achieved: [],
        barriers: [],
        recommendations: '',
        treatment_start_date: '',
        // Service grids
        treatment_provided: [], treatment_planned: [],
        case_mgmt_provided: [], case_mgmt_planned: [],
        medical_provided: [], medical_planned: [],
        aftercare_provided: [], aftercare_planned: [],
        educational_provided: [], educational_planned: [],
        recovery_provided: [], recovery_planned: [],
        // Signature
        submitter_name: '',
        submitter_email: '',
        credential: '',
        sign_now: true,
        signature_date: new Date().toISOString().split('T')[0],
        living_expenses_note: '',
    });

    const reportType = form.report_type as ReportType;
    const is14Day = reportType === 'fourteen_day';
    const isFinal = reportType === 'final_report';
    const isProgress = !is14Day && !isFinal;

    useEffect(() => {
        if (!clientId) { setLoading(false); return; }
        fetch(`/api/clients/${clientId}`)
            .then(r => r.json())
            .then(data => {
                setClient(data.client);
                if (data.client?.treatment_start_date) {
                    setForm(prev => ({ ...prev, treatment_start_date: data.client.treatment_start_date.split('T')[0] }));
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [clientId]);

    const updateField = (key: string, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }));
        setError('');
    };

    const toggleMulti = (key: string, value: string) => {
        setForm(prev => {
            const arr = prev[key] as string[];
            return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
        });
    };

    const toggleSection = (key: string) => {
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSubmit = async () => {
        if (!clientId) { setError('No client selected'); return; }
        setSaving(true); setError('');

        try {
            const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, client_id: clientId }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Failed to submit'); setSaving(false); return; }
            setSuccess(true);
            setTimeout(() => router.push(`/clients/${clientId}`), 1500);
        } catch (e) {
            setError('An unexpected error occurred.');
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>;

    if (success) return (
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-ddor-navy mb-2">Report Submitted</h2>
            <p className="text-gray-500">Redirecting to client page...</p>
        </div>
    );

    return (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => clientId ? router.push(`/clients/${clientId}`) : router.back()} className="p-2 hover:bg-gray-200 rounded-lg">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-ddor-navy">Submit Report</h1>
                    {client && <p className="text-sm text-gray-500">{client.first_name} {client.last_name}</p>}
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Report Type Selector */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                <select value={form.report_type} onChange={e => updateField('report_type', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg text-sm font-medium">
                    {Object.entries(REPORT_TYPES).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                    ))}
                </select>
            </div>

            <div className="space-y-4">
                {/* SECTION: Participant Status */}
                <FormSection title="Participant Status" icon={User} id="status" expanded={expandedSections.status} onToggle={toggleSection}>
                    <MultiCheckGroup label="Current Living Situation" options={LIVING_SITUATION} selected={form.living_situation} onToggle={v => toggleMulti('living_situation', v)} />
                    <MultiCheckGroup label="Current Employment Status" options={EMPLOYMENT_STATUS} selected={form.employment_status} onToggle={v => toggleMulti('employment_status', v)} />

                    {is14Day && (
                        <>
                            <SelectField label="Months Unemployed (past 12 months)" value={form.months_unemployed} onChange={v => updateField('months_unemployed', v)} options={MONTHS_UNEMPLOYED} />
                            <MultiCheckGroup label="In the last 12 months, was the participant..." options={CRIMINAL_JUSTICE} selected={form.criminal_justice} onToggle={v => toggleMulti('criminal_justice', v)} />
                            <SelectField label="Highest Education Level" value={form.education_level} onChange={v => updateField('education_level', v)} options={EDUCATION_LEVEL} />
                        </>
                    )}

                    <MultiCheckGroup label="Insurance Type" options={INSURANCE_TYPE} selected={form.insurance_type} onToggle={v => toggleMulti('insurance_type', v)} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Household Income</label>
                            <input type="text" value={form.household_income} onChange={e => updateField('household_income', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="$0.00" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dependents / Household Members</label>
                            <input type="text" value={form.dependents} onChange={e => updateField('dependents', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="0" />
                        </div>
                    </div>

                    <MultiCheckGroup label="Case Management Services Received" options={CASE_MGMT_SERVICES} selected={form.case_mgmt_services} onToggle={v => toggleMulti('case_mgmt_services', v)} />
                </FormSection>

                {/* SECTION: Clinical */}
                <FormSection title="Clinical Information" icon={Stethoscope} id="clinical" expanded={expandedSections.clinical} onToggle={toggleSection}>
                    <SelectField label={isFinal ? 'LOC for SUD at Discharge' : 'Current LOC for SUD'} value={form.sud_loc} onChange={v => updateField('sud_loc', v)} options={SUD_LOC} />
                    <SelectField label={isFinal ? 'LOC for MH at Discharge' : 'Current LOC for MH'} value={form.mh_loc} onChange={v => updateField('mh_loc', v)} options={MH_LOC} />
                    <SelectField label="Program Status" value={form.program_status} onChange={v => updateField('program_status', v)} options={PROGRAM_STATUS} />
                    <SelectField label="Treatment Attendance" value={form.attendance} onChange={v => updateField('attendance', v)} options={ATTENDANCE} />

                    <SelectField label="Receiving MAT?" value={form.mat_receiving} onChange={v => updateField('mat_receiving', v)} options={['Yes', 'No']} />
                    {form.mat_receiving === 'Yes' && (
                        <MultiCheckGroup label="MAT Services" options={MAT_SERVICES} selected={form.mat_services} onToggle={v => toggleMulti('mat_services', v)} />
                    )}

                    {is14Day && (
                        <>
                            <SelectField label="Treated for SUD in last year?" value={form.treated_sud} onChange={v => updateField('treated_sud', v)} options={['Yes', 'No', 'Not known']} />
                            <SelectField label="Treated for MH in last year?" value={form.treated_mh} onChange={v => updateField('treated_mh', v)} options={['Yes', 'No', 'Not known']} />
                        </>
                    )}

                    {isFinal && (
                        <>
                            <SelectField label="Discharge Reason" value={form.discharge_reason} onChange={v => updateField('discharge_reason', v)} options={DISCHARGE_REASONS} />
                            <MultiCheckGroup label="Goals Achieved" options={GOALS_ACHIEVED} selected={form.goals_achieved} onToggle={v => toggleMulti('goals_achieved', v)} />
                            <MultiCheckGroup label="Barriers to Treatment" options={BARRIERS_TO_TREATMENT} selected={form.barriers} onToggle={v => toggleMulti('barriers', v)} />
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Program Recommendations</label>
                                <textarea value={form.recommendations} onChange={e => updateField('recommendations', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm min-h-[80px]" placeholder="Any recommendations for the participant..." />
                            </div>
                        </>
                    )}
                </FormSection>

                {/* SECTION: Discharge & Referral */}
                {!isFinal && (
                    <FormSection title="Discharge & Referral" icon={Shield} id="discharge" expanded={expandedSections.discharge} onToggle={toggleSection}>
                        <SelectField label="Was the participant discharged?" value={form.discharged} onChange={v => updateField('discharged', v)} options={['No', 'Yes']} />
                        {form.discharged === 'Yes' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Discharge Date</label>
                                <input type="date" value={form.discharge_date} onChange={e => updateField('discharge_date', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" />
                            </div>
                        )}
                        <SelectField label="Referred to another provider?" value={form.referred_to_provider} onChange={v => updateField('referred_to_provider', v)} options={['No', 'Yes']} />
                        {form.referred_to_provider === 'Yes' && (
                            <>
                                <SelectField label="Referred LOC" value={form.referred_loc} onChange={v => updateField('referred_loc', v)} options={REFERRED_LOC} />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Referred Provider Name</label>
                                    <input type="text" value={form.referred_provider_name} onChange={e => updateField('referred_provider_name', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="Provider name" />
                                </div>
                            </>
                        )}
                    </FormSection>
                )}

                {/* SECTION: KYAE */}
                <FormSection title="KYAE Education & Employment" icon={Briefcase} id="kyae" expanded={expandedSections.kyae} onToggle={toggleSection}>
                    <SelectField label="KYAE Referral Status" value={form.kyae_referral_status} onChange={v => updateField('kyae_referral_status', v)} options={KYAE_REFERRAL_STATUS} />
                    {isProgress && (
                        <>
                            <SelectField label="Education Status with KYAE" value={form.kyae_education_status} onChange={v => updateField('kyae_education_status', v)} options={KYAE_EDUCATION_STATUS} />
                            <SelectField label="Employment Training Status with KYAE" value={form.kyae_employment_status} onChange={v => updateField('kyae_employment_status', v)} options={KYAE_EMPLOYMENT_STATUS} />
                        </>
                    )}
                    {isFinal && (
                        <>
                            <SelectField label="Education Status with KYAE" value={form.kyae_education_status} onChange={v => updateField('kyae_education_status', v)} options={KYAE_EDUCATION_STATUS} />
                            <SelectField label="Employment Training Status with KYAE" value={form.kyae_employment_status} onChange={v => updateField('kyae_employment_status', v)} options={KYAE_EMPLOYMENT_STATUS} />
                        </>
                    )}
                </FormSection>

                {/* SECTION: Service Grids */}
                <FormSection title="Services Provided & Planned" icon={ClipboardList} id="services" expanded={expandedSections.services} onToggle={toggleSection}>
                    {Object.entries(SERVICE_CATEGORIES).map(([key, cat]) => {
                        // Map SERVICE_CATEGORIES keys to form state keys
                        const formKey = key === 'case_management' ? 'case_mgmt' : key === 'recovery_support' ? 'recovery' : key;
                        return (
                            <ServiceGrid
                                key={key}
                                label={cat.label}
                                options={cat.options}
                                provided={form[`${formKey}_provided`] || []}
                                planned={form[`${formKey}_planned`] || []}
                                onToggleProvided={v => toggleMulti(`${formKey}_provided`, v)}
                                onTogglePlanned={v => toggleMulti(`${formKey}_planned`, v)}
                            />
                        );
                    })}
                </FormSection>

                {/* SECTION: Signature */}
                <FormSection title="Submitter & Signature" icon={FileText} id="signature" expanded={expandedSections.signature} onToggle={toggleSection}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                            <input type="text" value={form.submitter_name} onChange={e => updateField('submitter_name', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="First Last" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Your Email</label>
                            <input type="email" value={form.submitter_email} onChange={e => updateField('submitter_email', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="email@provider.com" />
                        </div>
                    </div>
                    <SelectField label="Credential" value={form.credential} onChange={v => updateField('credential', v)} options={CREDENTIAL} />
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <input type="checkbox" checked={form.sign_now} onChange={e => updateField('sign_now', e.target.checked)} className="w-4 h-4 rounded" />
                        <span className="text-sm text-blue-800 font-medium">Sign NOW — selecting this serves as your electronic signature</span>
                    </div>
                    {form.sign_now && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Signature Date</label>
                            <input type="date" value={form.signature_date} onChange={e => updateField('signature_date', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm max-w-xs" />
                        </div>
                    )}
                </FormSection>
            </div>

            {/* Submit */}
            <div className="flex gap-3 mt-8 mb-12">
                <button onClick={() => clientId ? router.push(`/clients/${clientId}`) : router.back()} className="flex-1 py-3 bg-white border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50">
                    Cancel
                </button>
                <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 bg-ddor-blue text-white rounded-xl font-semibold hover:bg-[#156090] disabled:opacity-40 flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Submitting...' : 'Submit Report'}
                </button>
            </div>
        </main>
    );
}

export default function NewReportPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>}>
                <ReportFormContent />
            </Suspense>
        </div>
    );
}

// ======= HELPER COMPONENTS =======

function FormSection({ title, icon: Icon, id, expanded, onToggle, children }: {
    title: string; icon: any; id: string; expanded: boolean; onToggle: (id: string) => void; children: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <button onClick={() => onToggle(id)} className="w-full flex items-center justify-between p-5 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-ddor-blue" />
                    <h2 className="font-semibold text-ddor-navy">{title}</h2>
                </div>
                {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {expanded && <div className="px-5 pb-5 space-y-4 border-t">{children}</div>}
        </div>
    );
}

function SelectField({ label, value, onChange, options }: {
    label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm">
                <option value="">— Select —</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    );
}

function MultiCheckGroup({ label, options, selected, onToggle }: {
    label: string; options: string[]; selected: string[]; onToggle: (v: string) => void;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {options.map(opt => (
                    <label key={opt} className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer text-sm transition-colors ${
                        selected.includes(opt) ? 'bg-blue-50 text-blue-800' : 'hover:bg-gray-50 text-gray-700'
                    }`}>
                        <input type="checkbox" checked={selected.includes(opt)} onChange={() => onToggle(opt)}
                            className="w-4 h-4 rounded border-gray-300 text-ddor-blue mt-0.5 flex-shrink-0" />
                        <span className="leading-tight">{opt}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

function ServiceGrid({ label, options, provided = [], planned = [], onToggleProvided, onTogglePlanned }: {
    label: string; options: string[]; provided?: string[]; planned?: string[];
    onToggleProvided: (v: string) => void; onTogglePlanned: (v: string) => void;
}) {
    return (
        <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-ddor-navy mb-3">{label}</h3>
            <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-6 text-xs font-medium text-gray-500 uppercase">Service</div>
                <div className="col-span-3 text-xs font-medium text-gray-500 uppercase text-center">Provided</div>
                <div className="col-span-3 text-xs font-medium text-gray-500 uppercase text-center">Planned</div>
            </div>
            <div className="space-y-1">
                {options.map(opt => (
                    <div key={opt} className="grid grid-cols-12 gap-2 items-center py-1">
                        <div className="col-span-6 text-sm text-gray-700">{opt}</div>
                        <div className="col-span-3 flex justify-center">
                            <input type="checkbox" checked={provided.includes(opt)} onChange={() => onToggleProvided(opt)}
                                className="w-4 h-4 rounded border-gray-300 text-ddor-blue" />
                        </div>
                        <div className="col-span-3 flex justify-center">
                            <input type="checkbox" checked={planned.includes(opt)} onChange={() => onTogglePlanned(opt)}
                                className="w-4 h-4 rounded border-gray-300 text-ddor-teal" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
