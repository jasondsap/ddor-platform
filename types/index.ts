// ============================================================================
// DDOR Platform — Core Types
// ============================================================================

// === Core Entities ===

export interface Provider {
    id: string;
    name: string;
    abbreviation: string | null;
    notes: string | null;
    is_active: boolean;
    created_at: string;
}

export interface Facility {
    id: string;
    provider_id: string;
    name: string;
    primary_service: string | null;
    facility_gender: string | null;
    region: string | null;
    phone: string | null;
    street_address: string | null;
    city: string | null;
    zip: string | null;
    county_id: string | null;
    is_inactive: boolean;
    // Joined fields
    provider_name?: string;
    provider_abbreviation?: string;
    county_name?: string;
}

export interface County {
    id: string;
    name: string;
    state_abbr: string;
    is_pilot: boolean;
}

export interface User {
    id: string;
    cognito_sub: string | null;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    job_title: string | null;
    role: UserRole;
    facility_id: string | null;
    provider_id: string | null;
    is_active: boolean;
    // Joined fields
    facility_name?: string;
    provider_name?: string;
}

export type UserRole =
    | 'super_admin'
    | 'business_user'
    | 'navigator'
    | 'administrative_provider'
    | 'healthcare_user'
    | 'poc'
    | 'inactive';

// === Referrals ===

export interface Referral {
    id: string;
    referral_number: number;
    first_name: string;
    last_name: string;
    date_of_birth: string | null;
    gender: string | null;
    phone: string | null;
    originating_county_id: string | null;
    assessor_status: string | null;
    eligibility: string | null;
    referral_type_status: string | null;
    closed_reason: string | null;
    location_at_referral: string | null;
    jail_at_referral: boolean;
    date_received: string | null;
    referral_date: string | null;
    screen_date: string | null;
    court_date: string | null;
    state_assessor_id: string | null;
    case_navigator_id: string | null;
    provider_recommendation_id: string | null;
    loc_recommendation: string | null;
    initial_housing: string | null;
    is_urgent: boolean;
    began_program: boolean | null;
    prior_participant: string | null;
    client_id: string | null;
    notes: string | null;
    created_at: string;
    // Joined fields
    county_name?: string;
    assessor_name?: string;
    navigator_name?: string;
    recommended_facility_name?: string;
}

// === Clients / Participants ===

export interface Client {
    id: string;
    client_number: number;
    ddor_id: string | null;
    first_name: string;
    last_name: string;
    date_of_birth: string | null;
    facility_id: string | null;
    diagnosis: string | null;
    has_oud: boolean;
    agreement_signed_date: string | null;
    treatment_start_date: string | null;
    agreement_end_date: string | null;
    is_archived: boolean;
    archive_reason: string | null;
    is_mia: boolean;
    notes: string | null;
    created_at: string;
    // Joined fields
    facility_name?: string;
    provider_name?: string;
    provider_id?: string;
}

// === Reports ===

export type ReportType =
    | 'fourteen_day'
    | 'forty_two_day'
    | 'ninety_day'
    | 'one_eighty_day'
    | 'two_seventy_day'
    | 'three_sixty_day'
    | 'final'
    | 'status_change'
    | 'initiation_notification';

export interface Report {
    id: string;
    report_number: number;
    report_type: ReportType;
    client_id: string;
    facility_id: string | null;
    provider_id: string | null;
    date_submitted: string | null;
    date_completed: string | null;
    quarter_completed: string | null;
    current_sud_loc: string | null;
    current_mh_loc: string | null;
    program_status: string | null;
    attendance_frequency: string | null;
    household_income: number | null;
    dependents_count: number | null;
    is_receiving_mat: boolean | null;
    was_discharged: boolean;
    discharge_date: string | null;
    discharge_reason: string | null;
    submitter_name: string | null;
    submitter_credential: string | null;
    is_signed: boolean;
    created_at: string;
    // Joined fields
    client_name?: string;
    facility_name?: string;
}

// === Report Tracking ===

export type ReportCompletionStatus =
    | 'not_due'
    | 'pending'
    | 'overdue'
    | 'completed'
    | 'on_hold'
    | 'not_applicable'
    | 'needs_tx_start_date';

export interface ReportTracking {
    id: string;
    client_id: string;
    fourteen_day_status: ReportCompletionStatus;
    kyae_referral_status: ReportCompletionStatus;
    forty_two_day_status: ReportCompletionStatus;
    barc10_status: ReportCompletionStatus;
    phq9_gad7_status: ReportCompletionStatus;
    ninety_day_status: ReportCompletionStatus;
    one_eighty_day_status: ReportCompletionStatus;
    two_seventy_day_status: ReportCompletionStatus;
    three_sixty_day_status: ReportCompletionStatus;
    final_report_status: ReportCompletionStatus;
}

export interface ReportDueDate {
    client_id: string;
    client_name: string;
    treatment_start_date: string;
    facility_name: string;
    provider_name: string;
    fourteen_day_due: string;
    fourteen_day_days_remaining: number;
    forty_two_day_due: string;
    forty_two_day_days_remaining: number;
    ninety_day_due: string;
    ninety_day_days_remaining: number;
    // ... continues for all milestones
    fourteen_day_status: ReportCompletionStatus;
    forty_two_day_status: ReportCompletionStatus;
    ninety_day_status: ReportCompletionStatus;
    final_report_status: ReportCompletionStatus;
}

// === Questionnaires ===

export type QuestionnaireType =
    | 'clinical_assessor'
    | 'demographic'
    | 'informed_consent'
    | 'gain_ss'
    | 'barc_10'
    | 'phq9_gad7'
    | 'wai_sr'
    | 'kyae_referral';

export interface QuestionnaireSubmission {
    id: string;
    questionnaire_type: QuestionnaireType;
    referral_id: string | null;
    client_id: string | null;
    submitted_by: string | null;
    submitted_at: string;
    total_score: number | null;
    is_complete: boolean;
}

// === Invoicing ===

export interface Invoice {
    id: string;
    invoice_number: number;
    patient_name: string;
    patient_dob: string | null;
    facility_id: string | null;
    total_charge: number | null;
    payment_due: number | null;
    fgi_review_1: string;
    fgi_review_2: string;
    dbh_review: string;
    reimbursement_status: string;
    medicaid_escalation: string | null;
    is_invalid: boolean;
    is_duplicate: boolean;
    is_archived: boolean;
    created_at: string;
    // Joined fields
    facility_name?: string;
    provider_name?: string;
}

// === Dashboard ===

export interface DashboardStats {
    totalActiveClients: number;
    overdueReports: number;
    pendingInvoices: number;
    newReferrals: number;
    upcomingReports: ReportDueDate[];
}

// === Report Display Helpers ===

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
    fourteen_day: '14-Day Stabilization Report',
    forty_two_day: '42-Day Progress Report',
    ninety_day: '90-Day Progress Report',
    one_eighty_day: '180-Day Progress Report',
    two_seventy_day: '270-Day Progress Report',
    three_sixty_day: '360-Day Progress Report',
    final: 'Final Report',
    status_change: 'Status Change',
    initiation_notification: 'Initiation Notification',
};

export const REPORT_MILESTONES = [
    { type: 'fourteen_day' as ReportType, days: 14, label: '14-Day' },
    { type: 'forty_two_day' as ReportType, days: 42, label: '42-Day' },
    { type: 'ninety_day' as ReportType, days: 90, label: '90-Day' },
    { type: 'one_eighty_day' as ReportType, days: 180, label: '180-Day' },
    { type: 'two_seventy_day' as ReportType, days: 270, label: '270-Day' },
    { type: 'three_sixty_day' as ReportType, days: 360, label: '360-Day' },
] as const;

export const STATUS_COLORS: Record<ReportCompletionStatus, string> = {
    not_due: '#9CA3AF',
    pending: '#F59E0B',
    overdue: '#EF4444',
    completed: '#10B981',
    on_hold: '#6366F1',
    not_applicable: '#D1D5DB',
    needs_tx_start_date: '#F97316',
};
