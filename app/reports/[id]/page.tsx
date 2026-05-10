// app/reports/[id]/page.tsx
//
// Updated for FGI May 2026 spec.
//
// Handles BOTH legacy reports (pre-spec-update) and new reports written
// against the new schema. Specifically:
//   - household_income / dependents read from the EAV attribute (new) OR
//     the numeric column (legacy). Display formatting differs accordingly.
//   - employment_status / goals_achieved / living_situation work whether
//     stored as a single value or as multiple attribute rows.
//   - The 3 deprecated service categories (medical / aftercare / educational)
//     and "planned" sub-columns only render if data exists for them.
//   - New fields (enrollment_status, treated_sud, treated_mh,
//     treatment_start_date, treatment_facility, sud_loc_recommended,
//     mh_loc_recommended, *_other text fields) display when present.
//   - KYAE section already gated on data existence — unchanged.
//
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import {
    ArrowLeft, Loader2, FileText, User, Stethoscope, Building,
    Calendar, CheckCircle2, Clock, Shield, Briefcase, Heart,
    Activity, Printer, AlertTriangle, Target,
} from 'lucide-react';
import { REPORT_TYPE_LABELS } from '@/types';
import { generateReportPDF } from '@/lib/generateReportPDF';
import type { ReportType } from '@/types';

export default function ReportViewPage() {
    const router = useRouter();
    const params = useParams();
    const reportId = params.id as string;
    const { data: session, status: authStatus } = useSession();
    const ddor = (session as any)?.ddor;

    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState<any>(null);
    const [attributes, setAttributes] = useState<Record<string, string[]>>({});

    useEffect(() => {
        if (authStatus === 'unauthenticated') router.push('/auth/signin');
    }, [authStatus, router]);

    useEffect(() => {
        if (!ddor || !reportId) return;
        fetch(`/api/reports/${reportId}`)
            .then(r => r.json())
            .then(d => { setReport(d.report); setAttributes(d.attributes || {}); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [ddor, reportId]);

    if (authStatus === 'loading' || loading) {
        return <div className="min-h-screen bg-gray-50"><Header /><div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div></div>;
    }

    if (!report) {
        return <div className="min-h-screen bg-gray-50"><Header /><div className="text-center py-12"><p className="text-gray-500">Report not found.</p></div></div>;
    }

    // ============================================================
    // Helpers
    // ============================================================
    const firstAttr = (key: string): string | null => attributes[key]?.[0] || null;
    const allAttr = (key: string): string[] => attributes[key] || [];
    const hasAttr = (key: string): boolean => (attributes[key]?.length ?? 0) > 0;

    // For values that might be in a column (legacy) or in EAV (new spec).
    const colOrAttr = (column: string, attrKey: string): string | null => {
        const colVal = report[column];
        if (colVal !== null && colVal !== undefined && colVal !== '') return String(colVal);
        return firstAttr(attrKey);
    };

    // Income display: numeric (legacy) → "$45,000"; range string (new) → as-is
    const formatIncome = (val: any): string | null => {
        if (val === null || val === undefined || val === '') return null;
        // Range strings or anything containing letters/dashes
        if (typeof val === 'string' && /[a-zA-Z\-]/.test(val)) return val;
        const n = typeof val === 'number' ? val : Number(val);
        return Number.isFinite(n) ? `$${n.toLocaleString()}` : String(val);
    };

    const incomeRaw = report.household_income ?? firstAttr('household_income');
    const dependentsRaw = report.dependents_count ?? firstAttr('dependents');

    const typeLabel = REPORT_TYPE_LABELS[report.report_type as ReportType] || report.report_type;
    const clientName = `${report.client_first_name} ${report.client_last_name}`;
    const isProgress = ['forty_two_day', 'ninety_day', 'one_eighty_day', 'two_seventy_day', 'three_sixty_day'].includes(report.report_type);
    const isFinal = report.report_type === 'final_report';
    const is14Day = report.report_type === 'fourteen_day';
    const isReport = is14Day || isProgress || isFinal;

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-ddor-navy">{typeLabel}</h1>
                        <p className="text-sm text-gray-500">{clientName} • {firstAttr('treatment_facility') || report.facility_name || '—'}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => generateReportPDF({
                            reportType: report.report_type, reportTypeLabel: typeLabel,
                            clientName, ddorId: report.ddor_id,
                            clientDob: report.client_dob ? new Date(report.client_dob).toLocaleDateString() : undefined,
                            diagnosis: report.diagnosis,
                            facilityName: firstAttr('treatment_facility') || report.facility_name,
                            providerName: report.provider_name,
                            dateSubmitted: report.date_submitted ? new Date(report.date_submitted).toLocaleDateString() : undefined,
                            submitterName: report.submitter_name, submitterCredential: report.submitter_credential,
                            signatureDate: report.signature_date ? new Date(report.signature_date).toLocaleDateString() : undefined,
                            isSigned: report.is_signed, sudLoc: report.current_sud_loc, mhLoc: report.current_mh_loc,
                            programStatus: report.program_status, attendance: report.attendance_frequency,
                            isReceivingMat: report.is_receiving_mat,
                            householdIncome: formatIncome(incomeRaw),
                            dependents: dependentsRaw?.toString(),
                            wasDischarged: report.was_discharged,
                            dischargeDate: report.discharge_date ? new Date(report.discharge_date).toLocaleDateString() : undefined,
                            dischargeReason: report.discharge_reason,
                            referredProvider: report.referred_provider_name,
                            referredLoc: report.referred_loc,
                            kyaeReferralStatus: report.kyae_referral_status,
                            kyaeEducationStatus: report.kyae_education_status,
                            kyaeEmploymentStatus: report.kyae_employment_status,
                            barrierNotes: report.barrier_notes, recommendationNotes: report.recommendation_notes,
                            notes: report.notes, attributes,
                        })} className="flex items-center gap-2 px-4 py-2 bg-ddor-blue text-white rounded-lg text-sm font-medium hover:bg-[#156090]">
                            <FileText className="w-4 h-4" /> Download PDF
                        </button>
                        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                            <Printer className="w-4 h-4" /> Print
                        </button>
                    </div>
                </div>

                {/* Report meta bar */}
                <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-center text-sm">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Submitted:</span>
                        <span className="font-medium">{report.date_submitted ? new Date(report.date_submitted).toLocaleDateString() : '—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">By:</span>
                        <span className="font-medium">{report.submitter_name || `${report.submitter_first || ''} ${report.submitter_last || ''}`.trim() || '—'}</span>
                    </div>
                    {report.submitter_credential && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                            {report.submitter_credential}
                            {firstAttr('credential_other') ? ` (${firstAttr('credential_other')})` : ''}
                        </span>
                    )}
                    {report.is_signed && (
                        <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Signed{report.signature_date ? ` ${new Date(report.signature_date).toLocaleDateString()}` : ''}</span>
                    )}
                </div>

                <div className="space-y-6 print:space-y-4">
                    {/* Participant */}
                    <Section title="Participant" icon={User}>
                        <FieldGrid>
                            <Field label="Name" value={clientName} />
                            <Field label="DDOR ID" value={report.ddor_id} />
                            <Field label="DOB" value={report.client_dob ? new Date(report.client_dob).toLocaleDateString() : null} />
                            <Field label="Diagnosis" value={report.diagnosis === 'co_occurring' ? 'Co-Occurring' : report.diagnosis?.toUpperCase()} />
                            <Field label="Provider" value={report.provider_name} />
                            <Field label="Facility" value={firstAttr('treatment_facility') || report.facility_name} />
                        </FieldGrid>
                    </Section>

                    {/* Clinical — for 14-Day, Progress, Final */}
                    {isReport && (
                        <Section title="Clinical Information" icon={Stethoscope}>
                            <FieldGrid>
                                <Field
                                    label={isFinal ? 'SUD Level of Care at Discharge' : 'Current SUD Level of Care'}
                                    value={report.current_sud_loc}
                                />
                                <Field
                                    label={isFinal ? 'MH Level of Care at Discharge' : 'Current MH Level of Care'}
                                    value={report.current_mh_loc}
                                />
                                {/* Recommended LOCs — Final only */}
                                {isFinal && (
                                    <>
                                        <Field label="Recommended SUD LOC upon Discharge" value={firstAttr('sud_loc_recommended')} />
                                        <Field label="Recommended MH LOC upon Discharge" value={firstAttr('mh_loc_recommended')} />
                                    </>
                                )}
                                <Field label="Program Status" value={report.program_status} />
                                <Field
                                    label={isFinal ? 'Treatment Attendance' : 'Treatment Attendance'}
                                    value={report.attendance_frequency}
                                />
                                <Field label="Receiving MAT" value={report.is_receiving_mat ? 'Yes' : 'No'} />
                                {/* 14-Day specific clinical questions */}
                                {is14Day && (
                                    <>
                                        <Field label="Treatment Start Date" value={firstAttr('treatment_start_date') ? new Date(firstAttr('treatment_start_date')!).toLocaleDateString() : null} />
                                        <Field label="Treated for SUD in past year" value={firstAttr('treated_sud')} />
                                        <Field label="Treated for MH in past year" value={firstAttr('treated_mh')} />
                                    </>
                                )}
                                {/* Income / dependents — handles both legacy column and new EAV */}
                                {incomeRaw !== null && incomeRaw !== undefined && (
                                    <Field label="Annual Household Income" value={formatIncome(incomeRaw)} />
                                )}
                                {dependentsRaw !== null && dependentsRaw !== undefined && (
                                    <Field label="Dependents" value={String(dependentsRaw)} />
                                )}
                            </FieldGrid>
                        </Section>
                    )}

                    {/* Participant Status (multi-select EAV attributes) */}
                    {(hasAttr('living_situation') || hasAttr('employment_status') || hasAttr('insurance_type')
                        || hasAttr('criminal_justice') || hasAttr('months_unemployed') || hasAttr('education_level')
                        || hasAttr('enrollment_status')) && (
                        <Section title="Participant Status" icon={Building}>
                            <TagGroup label="Living Situation" tags={allAttr('living_situation')} />
                            <TagGroup label="Employment Status" tags={allAttr('employment_status')} />
                            <Field label="Education Enrollment Status" value={firstAttr('enrollment_status')} />
                            <TagGroup label="Insurance" tags={allAttr('insurance_type')} />
                            <Field label="Months Unemployed (past 12)" value={firstAttr('months_unemployed')} />
                            <Field label="Education Level" value={firstAttr('education_level')} />
                            <TagGroup label="Criminal Justice Involvement" tags={allAttr('criminal_justice')} />
                        </Section>
                    )}

                    {/* KYAE — only renders for legacy reports that captured it */}
                    {(report.kyae_referral_status || report.kyae_education_status || report.kyae_employment_status) && (
                        <Section title="KYAE Education & Employment" icon={Briefcase}>
                            <FieldGrid>
                                <Field label="KYAE Referral Status" value={report.kyae_referral_status} />
                                <Field label="Education Status" value={report.kyae_education_status} />
                                <Field label="Employment Status" value={report.kyae_employment_status} />
                            </FieldGrid>
                        </Section>
                    )}

                    {/* Service Categories */}
                    {hasServiceData(attributes) && (
                        <Section title="Services" icon={Heart}>
                            <ServiceGrid label="Treatment Services" provided={attributes.treatment_provided} planned={attributes.treatment_planned} />
                            <ServiceGrid label="Case Management" provided={attributes.case_mgmt_provided} planned={attributes.case_mgmt_planned} />
                            <ServiceGrid label="Recovery Support" provided={attributes.recovery_provided} planned={attributes.recovery_planned} />
                            {/* Legacy categories — only shown if historical data exists */}
                            <ServiceGrid label="Medical Services" provided={attributes.medical_provided} planned={attributes.medical_planned} />
                            <ServiceGrid label="Aftercare" provided={attributes.aftercare_provided} planned={attributes.aftercare_planned} />
                            <ServiceGrid label="Educational/Vocational" provided={attributes.educational_provided} planned={attributes.educational_planned} />
                        </Section>
                    )}

                    {/* MAT Services */}
                    {hasAttr('mat_services') && (
                        <Section title="MAT Services" icon={Shield}>
                            <TagGroup label="Medications/Services" tags={allAttr('mat_services')} />
                        </Section>
                    )}

                    {/* Discharge — Final Report (or any report flagged as discharged) */}
                    {(report.was_discharged || isFinal) && (
                        <Section title="Discharge & Referral" icon={Shield}>
                            <FieldGrid>
                                <Field label="Discharged" value={report.was_discharged ? 'Yes' : 'No'} />
                                <Field label="Discharge Date" value={report.discharge_date ? new Date(report.discharge_date).toLocaleDateString() : null} />
                                <Field label="Discharge Reason" value={report.discharge_reason} />
                                <Field label="Referred to Provider" value={report.was_referred_to_provider ? 'Yes' : 'No'} />
                                <Field label="Referred Provider" value={report.referred_provider_name} />
                                <Field label="Referred LOC" value={report.referred_loc} />
                            </FieldGrid>
                            {firstAttr('discharge_reason_other') && (
                                <NoteBlock label="Discharge Reason — Other" value={firstAttr('discharge_reason_other')!} />
                            )}
                        </Section>
                    )}

                    {/* Goals & Barriers */}
                    {(hasAttr('goals_achieved') || hasAttr('barriers') || firstAttr('goals_achieved_other') || firstAttr('barriers_other')) && (
                        <Section title="Goals & Barriers" icon={Target}>
                            <TagGroup label="Goals Achieved" tags={allAttr('goals_achieved')} />
                            {firstAttr('goals_achieved_other') && (
                                <NoteBlock label="Goals Achieved — Other" value={firstAttr('goals_achieved_other')!} />
                            )}
                            <TagGroup label="Barriers to Treatment" tags={allAttr('barriers')} />
                            {firstAttr('barriers_other') && (
                                <NoteBlock label="Barriers — Other" value={firstAttr('barriers_other')!} />
                            )}
                        </Section>
                    )}

                    {/* Status Change specific */}
                    {report.report_type === 'status_change' && (
                        <Section title="Status Change" icon={AlertTriangle}>
                            {/* status_reason is single-select but stored in EAV — TagGroup with one tag is fine */}
                            <TagGroup label="Status Reason" tags={allAttr('status_reason')} />
                            {/* discharge_reason is column-mapped, not EAV. Read from report.* */}
                            <Field label="Discharge Reason" value={report.discharge_reason} />
                            {hasAttr('discharge_reason_other') && (
                                <Field label="Discharge Reason — Other" value={firstAttr('discharge_reason_other')} />
                            )}
                            <TagGroup label="Non-Compliant Reasons" tags={allAttr('non_compliant_reasons')} />
                            {/* New name is non_compliant_other; legacy reports stored as other_reasons */}
                            {(hasAttr('non_compliant_other') || hasAttr('other_reasons')) && (
                                <Field
                                    label="Non-Compliant — Other"
                                    value={firstAttr('non_compliant_other') || firstAttr('other_reasons')}
                                />
                            )}
                            {hasAttr('additional_info') && (
                                <NoteBlock label="Additional Information" value={firstAttr('additional_info')!} />
                            )}
                            {hasAttr('agency') && (
                                <Field label="Agency" value={firstAttr('agency')} />
                            )}
                        </Section>
                    )}

                    {/* Initiation specific */}
                    {report.report_type === 'initiation_notification' && (
                        <Section title="Initiation Details" icon={Activity}>
                            <FieldGrid>
                                <Field label="Action" value={firstAttr('participant_action') === 'initiated_treatment' ? 'Initiated Treatment' : 'Scheduled Appointment'} />
                                <Field label="Treatment Date" value={firstAttr('treatment_initiation_date')} />
                                <Field label="Scheduled Date" value={firstAttr('scheduled_date')} />
                                <Field label="Level of Care" value={firstAttr('level_of_care')} />
                                <Field label="Facility/County" value={firstAttr('facility_county')} />
                            </FieldGrid>
                        </Section>
                    )}

                    {/* Notes */}
                    {(report.notes || report.barrier_notes || report.recommendation_notes) && (
                        <Section title="Notes & Recommendations" icon={FileText}>
                            {report.barrier_notes && <NoteBlock label="Barriers Note" value={report.barrier_notes} />}
                            {report.recommendation_notes && <NoteBlock label="Recommendations" value={report.recommendation_notes} />}
                            {report.notes && <NoteBlock label="Additional Notes" value={report.notes} />}
                        </Section>
                    )}

                    {/* Signature */}
                    {report.is_signed && (
                        <div className="bg-white rounded-xl shadow-sm p-6 border-t-4 border-green-500">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                                <div>
                                    <p className="font-semibold text-ddor-navy">Electronically Signed</p>
                                    <p className="text-sm text-gray-500">
                                        {report.submitter_name || '—'}
                                        {report.submitter_credential ? `, ${report.submitter_credential}` : ''}
                                        {firstAttr('credential_other') ? ` (${firstAttr('credential_other')})` : ''}
                                        {report.signature_date ? ` — ${new Date(report.signature_date).toLocaleDateString()}` : ''}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pb-8 print:hidden">
                        <button onClick={() => router.push(`/clients/${report.client_id}`)}
                            className="flex-1 py-3 bg-ddor-blue text-white rounded-xl font-semibold hover:bg-[#156090] flex items-center justify-center gap-2">
                            <User className="w-4 h-4" /> View Client
                        </button>
                        <button onClick={() => window.print()}
                            className="flex-1 py-3 bg-white border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2">
                            <Printer className="w-4 h-4" /> Print Report
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}

// ======= HELPER COMPONENTS =======

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

function FieldGrid({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>;
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
    if (value === null || value === undefined || value === '') return null;
    return (
        <div>
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            <p className="text-sm font-medium text-gray-900">{String(value)}</p>
        </div>
    );
}

function TagGroup({ label, tags }: { label: string; tags?: string[] }) {
    if (!tags || tags.length === 0) return null;
    return (
        <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1.5">{label}</p>
            <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{tag}</span>
                ))}
            </div>
        </div>
    );
}

function NoteBlock({ label, value }: { label: string; value: string }) {
    return (
        <div className="mb-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{value}</p>
        </div>
    );
}

// ServiceGrid — hides the "Plans to Provide" column when there's no planned data
// (new reports never have planned data; legacy reports might).
function ServiceGrid({ label, provided, planned }: { label: string; provided?: string[]; planned?: string[] }) {
    const hasProvided = provided && provided.length > 0;
    const hasPlanned = planned && planned.length > 0;
    if (!hasProvided && !hasPlanned) return null;

    return (
        <div className="mb-4 pb-4 border-b border-gray-100 last:border-0">
            <p className="text-sm font-medium text-ddor-navy mb-2">{label}</p>
            {hasPlanned ? (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-gray-400 mb-1">Provided to Date</p>
                        {hasProvided ? (
                            <div className="flex flex-wrap gap-1">
                                {provided!.map(s => <span key={s} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">{s}</span>)}
                            </div>
                        ) : <span className="text-xs text-gray-300">None</span>}
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 mb-1">Plans to Provide</p>
                        <div className="flex flex-wrap gap-1">
                            {planned!.map(s => <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{s}</span>)}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap gap-1">
                    {provided!.map(s => <span key={s} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">{s}</span>)}
                </div>
            )}
        </div>
    );
}

function hasServiceData(attrs: Record<string, string[]>): boolean {
    const serviceKeys = [
        'treatment_provided', 'treatment_planned',
        'case_mgmt_provided', 'case_mgmt_planned',
        'medical_provided', 'medical_planned',
        'aftercare_provided', 'aftercare_planned',
        'educational_provided', 'educational_planned',
        'recovery_provided', 'recovery_planned',
    ];
    return serviceKeys.some(k => (attrs[k]?.length ?? 0) > 0);
}
