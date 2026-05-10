// lib/report-fields.ts
//
// Updated for FGI report spec changes (May 2026).
// - LIVING_SITUATION: split single NARR option into two (Application in progress / Currently residing)
// - MH_LOC: switched to Roman numeral format
// - SERVICE_CATEGORIES: trimmed from 6 → 3 (case_management, treatment, recovery_support); planned tracking dropped
// - NEW: ENROLLMENT_STATUS, INCOME_RANGES, DEPENDENTS_OPTIONS, YES_NO, YES_NO_UNKNOWN
//
// Final-report-specific constants (DISCHARGE_REASONS, GOALS_ACHIEVED, BARRIERS_TO_TREATMENT)
// are PRESERVED as-is for now — to be revised in the Final Report update round.
//
// KYAE_* and PROGRAM_STATUS / REFERRED_LOC are PRESERVED for backward compat with
// any existing report views that read them. New 14-Day and Progress forms no longer use them.

export const REPORT_TYPES = {
    fourteen_day: { label: '14-Day Stabilization Report', days: 14 },
    forty_two_day: { label: '42-Day Progress Report', days: 42 },
    ninety_day: { label: '90-Day Progress Report', days: 90 },
    one_eighty_day: { label: '180-Day Progress Report', days: 180 },
    two_seventy_day: { label: '270-Day Progress Report', days: 270 },
    three_sixty_day: { label: '360-Day Progress Report', days: 360 },
    final_report: { label: 'Final Provider Report', days: 0 },
} as const;

export type ReportType = keyof typeof REPORT_TYPES;

// Helpers for type discrimination
export const PROGRESS_REPORT_TYPES: ReportType[] = [
    'forty_two_day', 'ninety_day', 'one_eighty_day', 'two_seventy_day', 'three_sixty_day',
];

export const isProgressReport = (t: string): boolean =>
    PROGRESS_REPORT_TYPES.includes(t as ReportType);

// ============================================================================
// PARTICIPANT STATUS
// ============================================================================

// Updated May 2026: NARR split into two distinct options
export const LIVING_SITUATION = [
    'Housed - Own, rent or live in an apartment, room, trailer, or house',
    'Housed - Dormitory/College residence',
    'Housed - Transitional/Recovery housing',
    'Housed - 90 day+ residential treatment',
    'Homeless - Residing in public place not meant for habitation',
    'Homeless - Residing in shelter, hotel/motel',
    'Homeless - Currently in inpatient/residential treatment or other institution for less than 90 days that was homeless upon admission',
    'Unstable Housing - Couch surfing or frequently moving, and expected to continue',
    'NARR recovery housing - Application in progress',
    'NARR Certified Recovery Housing - Currently residing',
    'Unknown',
] as const;

export const EMPLOYMENT_STATUS = [
    'Employed - Full time',
    'Employed - Part time',
    'Not in labor force',
    'Retired',
    'SSI/Disability - Employed part time',
    'SSI/Disability - Not employed',
    'Unemployed - Looking for work',
    'Unemployed - Not looking for work',
    'Unknown',
] as const;

// NEW (May 2026): Post-secondary education enrollment status
export const ENROLLMENT_STATUS = [
    'Post-Secondary Education - Not enrolled',
    'Post-Secondary Education - Part-time enrollment',
    'Post-Secondary Education - Full-time enrollment',
    'Unknown',
] as const;

export const MONTHS_UNEMPLOYED = [
    'No unemployment',
    'One month or less',
    '2 - 5 months',
    '6 - 9 months',
    '9 - 11 months',
    '12 months',
] as const;

export const CRIMINAL_JUSTICE = [
    'Arrested',
    'Charged with a felony',
    'Charged with a misdemeanor',
    'Convicted of a felony',
    'Convicted of a misdemeanor',
    'Detained (not arrested)',
    'Incarcerated',
    'Involved in a diversionary program',
    'Not applicable',
] as const;

export const EDUCATION_LEVEL = [
    'No schooling',
    'Less than 12th grade',
    'High school or GED',
    'Vocational/Technical diploma',
    'Some college',
    'Two-Year degree',
    "Bachelor's degree",
    'Graduate degree',
] as const;

export const INSURANCE_TYPE = [
    'Medicaid',
    'Medicare',
    'Private Insurance - Family member is policyholder',
    'Private Insurance - Participant is policyholder',
    'Uninsured',
    'VA/Tricare/Champus',
    'Unknown',
] as const;

// NEW (May 2026): Annual household income ranges (replaces free-text dollar input)
export const INCOME_RANGES = [
    '$0 - 15,000',
    '$16,000 - 30,000',
    '$31,000 - 45,000',
    '$46,000 - 65,000',
    '$66,000 - 100,000',
    '$101,000 or above',
] as const;

// NEW (May 2026): Dependents claimed (replaces free-text input)
// Note: spec lists 1-10+ only. If "0/None" is needed in practice, add here.
export const DEPENDENTS_OPTIONS = [
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10+',
] as const;

// ============================================================================
// CLINICAL
// ============================================================================

export const SUD_LOC = [
    'Recovery Residence',
    '1.0 Long-Term Remission Monitoring',
    '1.5 Outpatient Therapy',
    '1.7 Medically Managed Outpatient',
    '2.1 Intensive Outpatient (IOP)',
    '2.5 High-Intensity (HIOP)',
    '2.7 Medically Managed Intensive Outpatient',
    '3.1 Clinically Managed Low-Intensity Residential',
    '3.5 Clinically Managed High-Intensity Residential',
    '3.7 Medically Managed Residential',
    '4.0 Medically Managed Inpatient',
    'Not applicable',
] as const;

// Final report uses an extended SUD LOC list that adds "Recovery Supports"
// between "Recovery Residence" and the 1.0 level. Per FGI May 2026 spec
// (used for both "recommended at discharge" and "actual at discharge" fields).
export const SUD_LOC_FINAL = [
    'Recovery Residence',
    'Recovery Supports',
    '1.0 Long-Term Remission Monitoring',
    '1.5 Outpatient Therapy',
    '1.7 Medically Managed Outpatient',
    '2.1 Intensive Outpatient (IOP)',
    '2.5 High-Intensity (HIOP)',
    '2.7 Medically Managed Intensive Outpatient',
    '3.1 Clinically Managed Low-Intensity Residential',
    '3.5 Clinically Managed High-Intensity Residential',
    '3.7 Medically Managed Residential',
    '4.0 Medically Managed Inpatient',
    'Not applicable',
] as const;

// Updated May 2026: switched to Roman numeral format
export const MH_LOC = [
    'I. Recovery Maintenance and Health Maintenance',
    'II. Low-Intensity Community-Based Services',
    'III. High-Intensity Community-Based Services',
    'IV. Medically-Monitored Non-Residential Services',
    'V. Medically-Monitored Residential Services',
    'VI. Medically-Managed Residential Services',
    'Not applicable',
] as const;

export const ATTENDANCE = [
    'Patient has not attended any sessions',
    'Less than 50% of the time',
    '50-75% of the time',
    'More than 75% of the time',
    'Patient is attending all sessions',
] as const;

export const MAT_SERVICES = [
    'Acamprosate',
    'Buprenorphine',
    'Bupropion',
    'Disulfram',
    'Methadone',
    'Naltrexone - long acting',
    'Naltrexone - short acting',
    'Nicotine replacement',
    'Varenicline',
    'Other',
] as const;

// ============================================================================
// SERVICES (TRIMMED MAY 2026: 6 → 3 categories, planned tracking dropped)
// Legacy categories medical / aftercare / educational retained as constants
// for backward-compat with historical reports. Not rendered in new forms.
// ============================================================================

export const CASE_MGMT_SERVICES = [
    'Basic Needs',
    'Childcare',
    'Health insurance enrollment',
    'Housing',
    'Recovery Housing',
    'Transportation',
    'The participant does not need any of these services',
    'Screening for these services not performed at this time',
] as const;

export const TREATMENT_SERVICES = [
    'Community Reinforcement Cognitive Behavioral',
    'Contingency Management',
    'Group Counseling',
    'Individual Counseling',
    'Inpatient Residential Treatment (Other than withdrawal management)',
    'Intensive Outpatient Treatment',
    'Medically Managed Outpatient Treatment (MOUD)',
    'Outpatient Therapy',
    'Partial Hospitalization Treatment',
    'Targeted Case Management',
    'Treatment Planning',
    'Withdrawal Management - Hospital Inpatient',
    'Withdrawal Management - Ambulatory withdrawal management',
    'Withdrawal Management - Free-standing residential',
] as const;

export const RECOVERY_SUPPORT_SERVICES = [
    'Drug-and-alcohol-free social activities',
    'Case management services specifically supporting recovery',
    'Information & referral',
    'Peer coaching or mentoring',
    'Recovery housing',
    'Recovery planning',
    'Vocational services',
    'Not applicable',
] as const;

// SERVICE_CATEGORIES is the new structure used by 14-Day and Progress forms.
// Each category renders as a multi-checkbox group ("provided to date" only — no more planned).
export const SERVICE_CATEGORIES = {
    case_management: { label: 'Case Management Services Provided to Date', options: CASE_MGMT_SERVICES },
    treatment: { label: 'Treatment Services Provided to Date', options: TREATMENT_SERVICES },
    recovery_support: { label: 'Recovery Support Services Provided to Date', options: RECOVERY_SUPPORT_SERVICES },
} as const;

// ============================================================================
// FINAL REPORT (preserved as-is for now — will be revised in Final round)
// ============================================================================

// Updated May 2026 per FGI Final Report spec (literal text from spec)
export const DISCHARGE_REASONS = [
    'Successful program completion',
    'Left AMA (participant-driven chose not to complete tx)',
    'Administrative (facility-driven due to nonadherence, etc.)',
    'Incarcerated due to offense committed while in treatment',
    'Incarcerated due to offense committed while in treatment due to old warrant or prior charges',
    'Transferred to another facility for health reasons',
    'Death',
    'Referred, but never began treatment/did not attend any sessions',
    'Withdrawn by the court',
    'Other',
] as const;

export const GOALS_ACHIEVED = [
    'Abstain from substance use',
    'Address mental health issues',
    'Connect with support networks',
    'Develop healthy stress management techniques',
    'Reduce substance use',
    'None',
    'Other',
] as const;

export const BARRIERS_TO_TREATMENT = [
    'Childcare',
    'Economic instability',
    'Facility hours of operation',
    'Family obligations',
    'Medical issues',
    'Transportation',
    'Other',
] as const;

// ============================================================================
// SHARED
// ============================================================================

export const YES_NO = ['Yes', 'No'] as const;
export const YES_NO_UNKNOWN = ['Yes', 'No', 'Unknown'] as const;

// Updated May 2026: trimmed credential list per spec
export const CREDENTIAL = [
    'Licensed Clinical Social Worker (LCSW)',
    'Licensed Professional Clinical Counselors (LPCC)',
    'Qualified Mental Health Professional (QMHP)',
    'Licensed Psychologist',
    'Other',
] as const;

// ============================================================================
// LEGACY (preserved for historical report compatibility — not in new forms)
// ============================================================================

export const KYAE_REFERRAL_STATUS = [
    'Referred', 'Pending', 'Declined', 'Enrolled', 'Completed', 'N/A',
] as const;

export const KYAE_EDUCATION_STATUS = [
    'Not enrolled', 'Enrolled - Part time', 'Enrolled - Full time', 'Completed', 'N/A',
] as const;

export const KYAE_EMPLOYMENT_STATUS = [
    'Not enrolled', 'Enrolled - Part time', 'Enrolled - Full time', 'Completed', 'N/A',
] as const;

export const REFERRED_LOC = SUD_LOC;
export const PROGRAM_STATUS = ['Active', 'On Hold', 'Discharged'] as const;
