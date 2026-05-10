// app/reports/new/_components/Form14Day.tsx
//
// 14-Day Stabilization Report — updated to FGI May 2026 spec.
//
// Spec source: Updated_DDOR_Reports_14-360___Final___Status_Change.xlsx, "14 Day Report" tab.
// 24 questions total. Questions 1-2 in the spec are FGI showing OLD vs NEW living_situation —
// we use the NEW combined list (with both NARR variants).
//
// Key changes from the previous unified form:
//   - household_income: free text → INCOME_RANGES select
//   - dependents: free text → DEPENDENTS_OPTIONS select
//   - mh_loc: switched to Roman numeral options
//   - living_situation: NARR split into "Application in progress" + "Currently residing"
//   - NEW: enrollment_status (post-secondary education enrollment)
//   - treatment_start_date: now editable, defaults to client value
//   - Service grids: 6 categories → 3, "planned" tracking removed
//   - KYAE section removed (KYAE is its own report now)
//
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Stethoscope, ClipboardList, FileText, Shield } from 'lucide-react';
import {
    LIVING_SITUATION, EMPLOYMENT_STATUS, ENROLLMENT_STATUS, MONTHS_UNEMPLOYED,
    CRIMINAL_JUSTICE, EDUCATION_LEVEL, INSURANCE_TYPE, SUD_LOC, MH_LOC,
    INCOME_RANGES, DEPENDENTS_OPTIONS, ATTENDANCE, MAT_SERVICES,
    SERVICE_CATEGORIES, YES_NO, YES_NO_UNKNOWN,
} from '@/lib/report-fields';
import {
    useParticipantSelection, useReportSubmit,
    FormSection, SelectField, MultiCheckGroup, ServiceGrid, SignatureSection,
    FormHeader, ReportTypeSelector, ErrorBanner, SuccessScreen, SubmitFooter, CommonLoading,
    ParticipantPicker,
} from './shared';

const INITIAL_FORM = {
    report_type: 'fourteen_day',
    living_situation: '',
    months_unemployed: '',
    employment_status: '',
    enrollment_status: '',
    criminal_justice: [] as string[],
    education_level: '',
    insurance_type: [] as string[],
    treated_sud: '',
    treated_mh: '',
    treatment_start_date: '',
    sud_loc: '',
    mh_loc: '',
    household_income: '',
    dependents: '',
    attendance: '',
    mat_receiving: '',
    mat_services: [] as string[],
    // Service grids (provided to date only — planned tracking removed)
    case_mgmt_provided: [] as string[],
    treatment_provided: [] as string[],
    recovery_provided: [] as string[],
    // Signature
    submitter_name: '',
    submitter_email: '',
    credential: '',
    sign_now: true,
    signature_date: new Date().toISOString().split('T')[0],
};

export default function Form14Day() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const clientId = searchParams.get('client_id') || '';

    const { selectedClient, selectClient, clearClient, loading } = useParticipantSelection(clientId);
    const { submit, saving, error, success, setError } = useReportSubmit();

    const [form, setForm] = useState<Record<string, any>>(INITIAL_FORM);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        participant: true, clinical: false, mat: false, services: false, signature: false,
    });

    // Default treatment_start_date from the selected client. Re-runs on participant
    // change so a different participant gets THEIR start date defaulted.
    useEffect(() => {
        if (selectedClient?.treatment_start_date) {
            setForm(prev => ({
                ...prev,
                treatment_start_date: selectedClient.treatment_start_date.split('T')[0],
            }));
        } else if (selectedClient) {
            setForm(prev => ({ ...prev, treatment_start_date: '' }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedClient?.id]);

    const updateField = (key: string, value: any) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const toggleMulti = (key: string, value: string) =>
        setForm(prev => {
            const arr = prev[key] as string[];
            return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
        });

    const toggleSection = (key: string) =>
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

    const handleSubmit = () => {
        if (!selectedClient) {
            setError('Please select a participant before submitting.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        submit(selectedClient.id, form);
    };

    const handleTypeChange = (newType: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('type', newType);
        router.push(`/reports/new?${params.toString()}`);
    };

    if (loading) return <CommonLoading />;
    if (success) return <SuccessScreen />;

    return (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
            <FormHeader
                client={selectedClient}
                clientId={selectedClient?.id || ''}
                onBack={() => selectedClient ? router.push(`/clients/${selectedClient.id}`) : router.back()}
            />

            <ErrorBanner message={error} />

            <ParticipantPicker
                selectedClient={selectedClient}
                onSelect={selectClient}
                onClear={clearClient}
            />

            <ReportTypeSelector value="fourteen_day" onChange={handleTypeChange} />

            <div className="space-y-4">

                {/* PARTICIPANT STATUS */}
                <FormSection
                    title="Participant Status"
                    icon={User}
                    id="participant"
                    expanded={expandedSections.participant}
                    onToggle={toggleSection}
                >
                    <SelectField
                        label="Current Living Situation"
                        value={form.living_situation}
                        onChange={v => updateField('living_situation', v)}
                        options={LIVING_SITUATION}
                        required
                    />
                    <SelectField
                        label="Months Unemployed (past 12 months)"
                        value={form.months_unemployed}
                        onChange={v => updateField('months_unemployed', v)}
                        options={MONTHS_UNEMPLOYED}
                        required
                    />
                    <SelectField
                        label="Current Employment Status"
                        value={form.employment_status}
                        onChange={v => updateField('employment_status', v)}
                        options={EMPLOYMENT_STATUS}
                        required
                    />
                    <SelectField
                        label="Education Enrollment Status"
                        value={form.enrollment_status}
                        onChange={v => updateField('enrollment_status', v)}
                        options={ENROLLMENT_STATUS}
                        required
                    />
                    <MultiCheckGroup
                        label="In the last 12 months, was the participant..."
                        options={CRIMINAL_JUSTICE}
                        selected={form.criminal_justice}
                        onToggle={v => toggleMulti('criminal_justice', v)}
                        required
                    />
                    <SelectField
                        label="Highest Level of Education Completed"
                        value={form.education_level}
                        onChange={v => updateField('education_level', v)}
                        options={EDUCATION_LEVEL}
                        required
                    />
                    <MultiCheckGroup
                        label="Insurance Type"
                        options={INSURANCE_TYPE}
                        selected={form.insurance_type}
                        onToggle={v => toggleMulti('insurance_type', v)}
                        required
                    />
                    <SelectField
                        label="Annual Household Income"
                        value={form.household_income}
                        onChange={v => updateField('household_income', v)}
                        options={INCOME_RANGES}
                        required
                    />
                    <SelectField
                        label="Dependents the participant can claim"
                        value={form.dependents}
                        onChange={v => updateField('dependents', v)}
                        options={DEPENDENTS_OPTIONS}
                        required
                    />
                </FormSection>

                {/* CLINICAL */}
                <FormSection
                    title="Clinical Information"
                    icon={Stethoscope}
                    id="clinical"
                    expanded={expandedSections.clinical}
                    onToggle={toggleSection}
                >
                    <SelectField
                        label="Treated for SUD in the past year?"
                        value={form.treated_sud}
                        onChange={v => updateField('treated_sud', v)}
                        options={YES_NO_UNKNOWN}
                        required
                    />
                    <SelectField
                        label="Treated for MH condition in the past year?"
                        value={form.treated_mh}
                        onChange={v => updateField('treated_mh', v)}
                        options={YES_NO_UNKNOWN}
                        required
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Treatment Start Date<span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                            type="date"
                            value={form.treatment_start_date}
                            onChange={e => updateField('treatment_start_date', e.target.value)}
                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm max-w-xs"
                        />
                        {selectedClient?.treatment_start_date && (
                            <p className="text-xs text-gray-500 mt-1">Defaulted from client record. Edit if needed.</p>
                        )}
                    </div>
                    <SelectField
                        label="Current Level of Care for SUD"
                        value={form.sud_loc}
                        onChange={v => updateField('sud_loc', v)}
                        options={SUD_LOC}
                        required
                    />
                    <SelectField
                        label="Current Level of Care for Mental Health"
                        value={form.mh_loc}
                        onChange={v => updateField('mh_loc', v)}
                        options={MH_LOC}
                        required
                    />
                    <SelectField
                        label="Treatment Attendance"
                        value={form.attendance}
                        onChange={v => updateField('attendance', v)}
                        options={ATTENDANCE}
                        required
                    />
                </FormSection>

                {/* MAT */}
                <FormSection
                    title="Medication for SUD (MAT)"
                    icon={Shield}
                    id="mat"
                    expanded={expandedSections.mat}
                    onToggle={toggleSection}
                >
                    <SelectField
                        label="Is the participant currently receiving medication for MOUD/MAUD?"
                        value={form.mat_receiving}
                        onChange={v => updateField('mat_receiving', v)}
                        options={YES_NO}
                        required
                    />
                    {form.mat_receiving === 'Yes' && (
                        <MultiCheckGroup
                            label="Which MAT services is the participant currently receiving?"
                            options={MAT_SERVICES}
                            selected={form.mat_services}
                            onToggle={v => toggleMulti('mat_services', v)}
                        />
                    )}
                </FormSection>

                {/* SERVICES — case mgmt, treatment, recovery support (provided to date only) */}
                <FormSection
                    title="Services Provided to Date"
                    icon={ClipboardList}
                    id="services"
                    expanded={expandedSections.services}
                    onToggle={toggleSection}
                >
                    <ServiceGrid
                        label={SERVICE_CATEGORIES.case_management.label}
                        options={SERVICE_CATEGORIES.case_management.options}
                        selected={form.case_mgmt_provided}
                        onToggle={v => toggleMulti('case_mgmt_provided', v)}
                        required
                    />
                    <ServiceGrid
                        label={SERVICE_CATEGORIES.treatment.label}
                        options={SERVICE_CATEGORIES.treatment.options}
                        selected={form.treatment_provided}
                        onToggle={v => toggleMulti('treatment_provided', v)}
                        required
                    />
                    <ServiceGrid
                        label={SERVICE_CATEGORIES.recovery_support.label}
                        options={SERVICE_CATEGORIES.recovery_support.options}
                        selected={form.recovery_provided}
                        onToggle={v => toggleMulti('recovery_provided', v)}
                        required
                    />
                </FormSection>

                {/* SIGNATURE */}
                <FormSection
                    title="Submitter & Signature"
                    icon={FileText}
                    id="signature"
                    expanded={expandedSections.signature}
                    onToggle={toggleSection}
                >
                    <SignatureSection form={form} updateField={updateField} />
                </FormSection>

            </div>

            <SubmitFooter
                saving={saving}
                onCancel={() => selectedClient ? router.push(`/clients/${selectedClient.id}`) : router.back()}
                onSubmit={handleSubmit}
            />
        </main>
    );
}
