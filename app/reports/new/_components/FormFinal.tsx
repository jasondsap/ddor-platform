// app/reports/new/_components/FormFinal.tsx
//
// Final Provider Report — updated to FGI May 2026 spec.
//
// Spec source: Updated_DDOR_Reports_14-360___Final___Status_Change.xlsx, "Final Report" tab.
// 24 questions. Most divergent of the three forms:
//
// Key differences from 14-Day / Progress:
//   - 4 LOC fields total: SUD recommended (Q2), MH recommended (Q3),
//     SUD at discharge (Q9), MH at discharge (Q10)
//   - SUD LOC uses SUD_LOC_FINAL (adds "Recovery Supports" option)
//   - employment_status is MULTI-select (Checkbox) here, not single
//   - goals_achieved is SINGLE-select with Other → text branch
//   - discharge_reason has Other → text branch
//   - barriers has Other → text branch
//   - credential has Other → text branch
//   - NEW: referred_provider, treatment_end (discharge date), treatment_facility
//   - household_income on Final too (same INCOME_RANGES as 14-day)
//   - NO insurance_type on Final (dropped from spec)
//   - NO KYAE section (KYAE is its own report)
//
// Field-name notes:
//   - employment_status here is string[] (was string on 14-day/Progress and on the
//     legacy Final form). Detail view will need to handle both shapes for historical data.
//   - goals_achieved here is string (was string[] on the legacy Final form). Same caveat.
//   - referred_provider is the FGI-spec "Who is the referred provider?" text field
//     (distinct from referred_provider_name used on non-final referral logic).
//
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Stethoscope, ClipboardList, FileText, Shield, Heart, Briefcase } from 'lucide-react';
import {
    LIVING_SITUATION, EMPLOYMENT_STATUS, ENROLLMENT_STATUS,
    SUD_LOC_FINAL, MH_LOC, INCOME_RANGES, ATTENDANCE, MAT_SERVICES,
    DISCHARGE_REASONS, GOALS_ACHIEVED, BARRIERS_TO_TREATMENT,
    CREDENTIAL, SERVICE_CATEGORIES, YES_NO,
} from '@/lib/report-fields';
import {
    useParticipantSelection, useReportSubmit,
    FormSection, SelectField, TextField, TextAreaField,
    MultiCheckGroup, ServiceGrid,
    FormHeader, ReportTypeSelector, ErrorBanner, SuccessScreen, SubmitFooter, CommonLoading,
    ParticipantPicker,
} from './shared';

const INITIAL_FORM = {
    report_type: 'final_report',

    // Discharge details
    discharge_reason: '',
    discharge_reason_other: '',
    discharge_date: '',
    referred_provider: '',
    attendance: '',                  // past-tense label — "How often did the participant attend..."
    goals_achieved: '',              // SINGLE select on Final
    goals_achieved_other: '',

    // Participant status at discharge
    living_situation: '',
    employment_status: [] as string[],   // MULTI on Final
    enrollment_status: '',
    household_income: '',

    // Clinical — 4 LOC fields
    sud_loc: '',                     // at discharge (Q9)
    sud_loc_recommended: '',         // recommended at discharge (Q2)
    mh_loc: '',                      // at discharge (Q10)
    mh_loc_recommended: '',          // recommended at discharge (Q3)

    // MAT
    mat_receiving: '',
    mat_services: [] as string[],

    // Services provided to date
    case_mgmt_provided: [] as string[],
    treatment_provided: [] as string[],
    recovery_provided: [] as string[],

    // Barriers & recommendations
    barriers: [] as string[],
    barriers_other: '',
    recommendations: '',

    // Submitter & signature
    treatment_facility: '',
    submitter_name: '',
    submitter_email: '',
    credential: '',
    credential_other: '',
    sign_now: true,
    signature_date: new Date().toISOString().split('T')[0],
};

export default function FormFinal() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const clientId = searchParams.get('client_id') || '';

    const { selectedClient, selectClient, clearClient, loading } = useParticipantSelection(clientId);
    const { submit, saving, error, success, setError } = useReportSubmit();

    const [form, setForm] = useState<Record<string, any>>(INITIAL_FORM);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        discharge: true,
        status: false,
        clinical: false,
        mat: false,
        outcomes: false,
        services: false,
        signature: false,
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

            <ReportTypeSelector value="final_report" onChange={handleTypeChange} />

            <div className="space-y-4">

                {/* DISCHARGE DETAILS */}
                <FormSection
                    title="Discharge Details"
                    icon={ClipboardList}
                    id="discharge"
                    expanded={expandedSections.discharge}
                    onToggle={toggleSection}
                >
                    <SelectField
                        label="Why was the participant discharged?"
                        value={form.discharge_reason}
                        onChange={v => updateField('discharge_reason', v)}
                        options={DISCHARGE_REASONS}
                        required
                    />
                    {form.discharge_reason === 'Other' && (
                        <TextAreaField
                            label="Please describe the discharge reason"
                            value={form.discharge_reason_other}
                            onChange={v => updateField('discharge_reason_other', v)}
                            required
                        />
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Discharge Date<span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                            type="date"
                            value={form.discharge_date}
                            onChange={e => updateField('discharge_date', e.target.value)}
                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm max-w-xs"
                        />
                    </div>
                    <TextField
                        label="Who is the referred provider?"
                        value={form.referred_provider}
                        onChange={v => updateField('referred_provider', v)}
                        placeholder="Provider name"
                        required
                    />
                    <SelectField
                        label="How often did the participant attend treatment sessions?"
                        value={form.attendance}
                        onChange={v => updateField('attendance', v)}
                        options={ATTENDANCE}
                        required
                    />
                </FormSection>

                {/* PARTICIPANT STATUS AT DISCHARGE */}
                <FormSection
                    title="Participant Status at Discharge"
                    icon={User}
                    id="status"
                    expanded={expandedSections.status}
                    onToggle={toggleSection}
                >
                    <SelectField
                        label="Living Situation at Discharge"
                        value={form.living_situation}
                        onChange={v => updateField('living_situation', v)}
                        options={LIVING_SITUATION}
                        required
                    />
                    <MultiCheckGroup
                        label="Employment Status at Discharge"
                        options={EMPLOYMENT_STATUS}
                        selected={form.employment_status}
                        onToggle={v => toggleMulti('employment_status', v)}
                        required
                    />
                    <SelectField
                        label="Education Enrollment Status"
                        value={form.enrollment_status}
                        onChange={v => updateField('enrollment_status', v)}
                        options={ENROLLMENT_STATUS}
                        required
                    />
                    <SelectField
                        label="Annual Household Income"
                        value={form.household_income}
                        onChange={v => updateField('household_income', v)}
                        options={INCOME_RANGES}
                        required
                    />
                </FormSection>

                {/* CLINICAL — LEVELS OF CARE */}
                <FormSection
                    title="Levels of Care (at Discharge & Recommended)"
                    icon={Stethoscope}
                    id="clinical"
                    expanded={expandedSections.clinical}
                    onToggle={toggleSection}
                >
                    <SelectField
                        label="Level of Care for SUD at Discharge"
                        value={form.sud_loc}
                        onChange={v => updateField('sud_loc', v)}
                        options={SUD_LOC_FINAL}
                        required
                    />
                    <SelectField
                        label="Recommended Level of Care for SUD upon Discharge"
                        value={form.sud_loc_recommended}
                        onChange={v => updateField('sud_loc_recommended', v)}
                        options={SUD_LOC_FINAL}
                        required
                    />
                    <SelectField
                        label="Level of Care for Mental Health at Discharge"
                        value={form.mh_loc}
                        onChange={v => updateField('mh_loc', v)}
                        options={MH_LOC}
                        required
                    />
                    <SelectField
                        label="Recommended Level of Care for Mental Health upon Discharge"
                        value={form.mh_loc_recommended}
                        onChange={v => updateField('mh_loc_recommended', v)}
                        options={MH_LOC}
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
                        label="Was the participant receiving medication for MOUD/MAUD?"
                        value={form.mat_receiving}
                        onChange={v => updateField('mat_receiving', v)}
                        options={YES_NO}
                        required
                    />
                    {form.mat_receiving === 'Yes' && (
                        <MultiCheckGroup
                            label="Which MAT services was the participant receiving?"
                            options={MAT_SERVICES}
                            selected={form.mat_services}
                            onToggle={v => toggleMulti('mat_services', v)}
                        />
                    )}
                </FormSection>

                {/* GOALS, BARRIERS & RECOMMENDATIONS */}
                <FormSection
                    title="Goals, Barriers & Recommendations"
                    icon={Heart}
                    id="outcomes"
                    expanded={expandedSections.outcomes}
                    onToggle={toggleSection}
                >
                    <SelectField
                        label="What goals was the participant able to achieve?"
                        value={form.goals_achieved}
                        onChange={v => updateField('goals_achieved', v)}
                        options={GOALS_ACHIEVED}
                        required
                    />
                    {form.goals_achieved === 'Other' && (
                        <TextAreaField
                            label="Please describe other goals your participant was able to achieve"
                            value={form.goals_achieved_other}
                            onChange={v => updateField('goals_achieved_other', v)}
                            required
                        />
                    )}
                    <MultiCheckGroup
                        label="Barriers to treatment as part of the BHCDP program"
                        options={BARRIERS_TO_TREATMENT}
                        selected={form.barriers}
                        onToggle={v => toggleMulti('barriers', v)}
                        required
                    />
                    {form.barriers.includes('Other') && (
                        <TextAreaField
                            label="Please describe other barriers"
                            value={form.barriers_other}
                            onChange={v => updateField('barriers_other', v)}
                            required
                        />
                    )}
                    <TextAreaField
                        label="Program recommendations to support the participant's recovery and continuing care"
                        value={form.recommendations}
                        onChange={v => updateField('recommendations', v)}
                        placeholder="Any recommendations for the participant..."
                        rows={4}
                    />
                </FormSection>

                {/* SERVICES PROVIDED TO DATE */}
                <FormSection
                    title="Services Provided to Date"
                    icon={Briefcase}
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

                {/* SUBMITTER & SIGNATURE */}
                <FormSection
                    title="Submitter & Signature"
                    icon={FileText}
                    id="signature"
                    expanded={expandedSections.signature}
                    onToggle={toggleSection}
                >
                    <TextField
                        label="Facility / Organization Name"
                        value={form.treatment_facility}
                        onChange={v => updateField('treatment_facility', v)}
                        placeholder="Your facility or organization"
                        required
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <TextField
                            label="Your Name"
                            value={form.submitter_name}
                            onChange={v => updateField('submitter_name', v)}
                            placeholder="First Last"
                            required
                        />
                        <TextField
                            label="Your Email"
                            value={form.submitter_email}
                            onChange={v => updateField('submitter_email', v)}
                            placeholder="email@provider.com"
                            type="email"
                            required
                        />
                    </div>
                    <SelectField
                        label="Credential"
                        value={form.credential}
                        onChange={v => updateField('credential', v)}
                        options={CREDENTIAL}
                    />
                    {form.credential === 'Other' && (
                        <TextField
                            label="Please specify your credential"
                            value={form.credential_other}
                            onChange={v => updateField('credential_other', v)}
                            placeholder="Credential title"
                        />
                    )}
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <input
                            type="checkbox"
                            checked={form.sign_now}
                            onChange={e => updateField('sign_now', e.target.checked)}
                            className="w-4 h-4 rounded"
                        />
                        <span className="text-sm text-blue-800 font-medium">
                            Sign NOW — selecting this serves as your electronic signature
                        </span>
                    </div>
                    {form.sign_now && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Signature Date</label>
                            <input
                                type="date"
                                value={form.signature_date}
                                onChange={e => updateField('signature_date', e.target.value)}
                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm max-w-xs"
                            />
                        </div>
                    )}
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
