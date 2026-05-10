// app/reports/new/_components/FormProgress.tsx
//
// 42 / 90 / 180 / 270 / 360-Day Progress Report — updated to FGI May 2026 spec.
//
// Spec source: Updated_DDOR_Reports_14-360___Final___Status_Change.xlsx, "42-360 Day Report" tab.
// 15 questions. Identical structure across the 5 progress intervals — the day-cadence
// is the only difference (handled via report_type).
//
// Stripped down vs. 14-Day:
//   - No criminal_justice, education_completed, household_income, dependents
//   - No treated_sud / treated_mh (those are intake-only)
//   - No months_unemployed
//   - No discharge / referral section
//   - No KYAE section
//
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Stethoscope, ClipboardList, FileText, Shield } from 'lucide-react';
import {
    LIVING_SITUATION, EMPLOYMENT_STATUS, ENROLLMENT_STATUS,
    INSURANCE_TYPE, SUD_LOC, MH_LOC, ATTENDANCE, MAT_SERVICES,
    SERVICE_CATEGORIES, YES_NO, isProgressReport,
} from '@/lib/report-fields';
import {
    useParticipantSelection, useReportSubmit,
    FormSection, SelectField, MultiCheckGroup, ServiceGrid, SignatureSection,
    FormHeader, ReportTypeSelector, ErrorBanner, SuccessScreen, SubmitFooter, CommonLoading,
    ParticipantPicker,
} from './shared';

const INITIAL_FORM = {
    report_type: 'forty_two_day',
    living_situation: '',
    employment_status: '',
    enrollment_status: '',
    insurance_type: [] as string[],
    sud_loc: '',
    mh_loc: '',
    attendance: '',
    mat_receiving: '',
    mat_services: [] as string[],
    case_mgmt_provided: [] as string[],
    treatment_provided: [] as string[],
    recovery_provided: [] as string[],
    submitter_name: '',
    submitter_email: '',
    credential: '',
    sign_now: true,
    signature_date: new Date().toISOString().split('T')[0],
};

export default function FormProgress({ initialType }: { initialType?: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const clientId = searchParams.get('client_id') || '';
    const typeParam = (initialType || searchParams.get('type') || 'forty_two_day');

    const { selectedClient, selectClient, clearClient, loading } = useParticipantSelection(clientId);
    const { submit, saving, error, success, setError } = useReportSubmit();

    const [form, setForm] = useState<Record<string, any>>({
        ...INITIAL_FORM,
        report_type: isProgressReport(typeParam) ? typeParam : 'forty_two_day',
    });
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        participant: true, clinical: false, mat: false, services: false, signature: false,
    });

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
        // If user picks a non-progress type, jump to the URL so the dispatcher routes correctly
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

            <ReportTypeSelector value={form.report_type} onChange={handleTypeChange} />

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
                        label="Insurance Type"
                        options={INSURANCE_TYPE}
                        selected={form.insurance_type}
                        onToggle={v => toggleMulti('insurance_type', v)}
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
                            required
                        />
                    )}
                </FormSection>

                {/* SERVICES */}
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
