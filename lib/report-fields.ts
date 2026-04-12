// Report form field definitions — extracted from SB90 MockUp Airtable
// Used by 14-Day, Progress (42/90/180/270/360), and Final Report forms

export const REPORT_TYPES = {
    fourteen_day: { label: '14-Day Stabilization Report', dbValue: 'fourteen_day' },
    forty_two_day: { label: '42-Day Progress Report', dbValue: 'forty_two_day' },
    ninety_day: { label: '90-Day Progress Report', dbValue: 'ninety_day' },
    one_eighty_day: { label: '180-Day Progress Report', dbValue: 'one_eighty_day' },
    two_seventy_day: { label: '270-Day Progress Report', dbValue: 'two_seventy_day' },
    three_sixty_day: { label: '360-Day Progress Report', dbValue: 'three_sixty_day' },
    final_report: { label: 'Final Report', dbValue: 'final_report' },
};

export const LIVING_SITUATION = [
    'Housed: Own/Rental Apartment, Room, Trailer, or House',
    'Housed - Transitional Housing/Recovery Housing',
    'Housed - 90 day+ Residential Treatment',
    'Housed - Dormitory/College Residence',
    'Unstable Housing: Couch Surfing',
    'Homeless - Residing in Public place not meant for habitation',
    'Homeless - Residing in Shelter, hotel/motel',
    'Currently in inpatient/residential treatment (<90 days)',
    'Applied for Recovery Kentucky Program - Accepted',
    'Referred to a congregate shelter',
    'Not known',
];

export const EMPLOYMENT_STATUS = [
    'Employed - full-time (35 hours+)',
    'Employed - part-time',
    'Unemployed, but looking for work',
    'Unemployed, not looking for work',
    'SSI/Disability - employed part-time',
    'SSI/Disability - not employed',
    'Not in Labor Force',
    'Retired',
    'Post-Secondary Education Enrollment: Full-time',
    'Post-Secondary Education Enrollment: Part-time',
    'Post-Secondary Education Enrollment: Not enrolled',
    'Not known',
    'Other',
];

export const MONTHS_UNEMPLOYED = [
    'No employment', 'One month or less', '2 - 5 months',
    '6 - 9 months', '9 - 11 months', '12 months',
];

export const CRIMINAL_JUSTICE = [
    'Arrested', 'Charged with a felony', 'Charged with a misdemeanor',
    'Convicted of a felony', 'Convicted of a misdemeanor', 'Detained (not arrested)',
    'Incarcerated', 'Involved in a diversionary Program', 'Other',
];

export const EDUCATION_LEVEL = [
    'Less than 12th Grade', 'High School or GED', 'Some College',
    'Two Year Degree', "Bachelor's Degree", 'Graduate Degree',
    'Vocational/Technical Diploma', 'No Schooling',
];

export const INSURANCE_TYPE = [
    'Medicaid', 'Medicare', 'None', 'Not known',
    'Private Insurance - Other family member (parent/spouse)',
    'Private Insurance - Participant is the policyholder',
    'VA/Tricare/Champus',
];

export const SUD_LOC = [
    '0.5 Early Intervention', '1.0 Outpatient Services',
    '1.7 Medically Managed Outpatient', '2.1 Intensive Outpatient Services',
    '2.5 Partial Hospitalization Services',
    '3.1 Clinically-Managed Low Intensity Residential Services',
    '3.3 Clinically-Managed Population-Specific High Intensity Residential Services',
    '3.5 Clinically-Managed High Intensity Residential Services',
    '4.0', 'Does not apply',
];

export const MH_LOC = [
    'I. Recovery Maintenance and Health Maintenance',
    'II. Low-Intensity Community-Based Services',
    'III. High-Intensity Community-Based Services',
    'IV. Medically-Monitored Non-Residential Services',
    'V. Medically-Monitored Residential Services',
    'VI. Medically-Managed Residential Services',
    'Does not apply',
];

export const CASE_MGMT_SERVICES = [
    'Assessed, no services needed', 'Childcare', 'Clothing', 'Food',
    'Health Insurance', 'Not assessed for these services', 'Other',
    'Rent/Housing', 'Telephone', 'Transportation',
    'Utilities (Gas/Water/Electric)',
];

export const PROGRAM_STATUS = [
    'Current Patient/Client',
    'Administrative Discharge (facility-driven due to nonadherence, etc.)',
    'Incarcerated due to offense committed while in treatment',
    'Left AMA (participant-driven chose not to complete tx)',
    'Successful Program Completion',
    'Transferred to another facility for health reasons',
    'Other',
];

export const ATTENDANCE = [
    'Patient is attending all sessions',
    'More than 75% of the time',
    '51-75% of the time',
    'Attends treatment/recovery sessions less than 50% of the time',
    'Patient has not attended any sessions',
];

export const MAT_SERVICES = [
    'Buprenorphine', 'Methadone', 'Naltrexone – long acting',
    'Naltrexone – short acting', 'Acamprosate', 'Other',
];

export const REFERRED_LOC = [
    '1.0 Outpatient Services', '1.7 Medically Managed Outpatient',
    '2.1 Intensive Outpatient Services',
    '3.1 Clinically-Managed Low Intensity Residential Services',
    '3.5 Clinically-Managed High Intensity Residential Services',
    '3.7 Medically Monitored Intensive Inpatient Services',
    '4.0 Medically-Managed Intensive Inpatient Services',
    'Does not apply',
];

export const KYAE_REFERRAL_STATUS = ['Referral Made', 'Referral Not Made'];

export const KYAE_EDUCATION_STATUS = [
    'Not started education', 'Currently enrolled in education',
    'Completed Education', 'Participant declined to participate', 'Not applicable',
];

export const KYAE_EMPLOYMENT_STATUS = [
    'Not started employment', 'Currently enrolled in employment training',
    'Completed employment training', 'Participant declined to participate', 'Not applicable',
];

export const DISCHARGE_REASONS = [
    'Successful Program Completion',
    'Administrative (facility-driven due to nonadherence, etc.)',
    'Left AMA (participant-driven chose not to complete tx)',
    'Incarcerated due to offense committed while in treatment',
    'Transferred to another facility for health reasons',
    'Other',
];

export const GOALS_ACHIEVED = [
    'Abstinence from substance use', 'Reduced substance use',
    'Address mental health issues', 'Connection with support networks',
    'Develop healthy stress management techniques', 'None', 'Other',
];

export const BARRIERS_TO_TREATMENT = [
    'Transportation', 'Childcare', 'Facility hours of operation',
    'Economic instability', 'Medical issues', 'Family Obligations', 'Other',
];

export const CREDENTIAL = [
    'Licensed Clinical Social Worker (LCSW)',
    'Licensed Professional Clinical Counselors (LPCC)',
    'Licensed Psychologist',
    'Certified Social Worker or Social Worker',
    'Qualified Mental Health Professional (QMHP)',
    'Peer Support Specialist',
    'Community Health Worker',
    'Nurse',
    'Administrative Support Staff',
    'Targeted Case Manager',
    'Other',
];

// Six service category grids — each has "provided to date" and "plans to provide"
export const SERVICE_CATEGORIES = {
    treatment: {
        label: 'Treatment Services',
        options: [
            'Outpatient Therapy', 'Individual Counseling', 'Group Counseling',
            'Intensive Outpatient Treatment', 'Co-Occurring Treatment Services',
            'Medically Managed Outpatient Treatment (MOUD)',
            'Community Reinforcement Cognitive Behavioral',
            'Contingency Management', 'Pharmacological Interventions',
            'Treatment Planning', 'TherapyFamily/Marriage Counseling',
            'Ambulatory withdrawal management',
            'Inpatient Residential Treatment (Other than withdrawal management)',
            'Free-standing residential', 'Partial Hospitalization Treatment',
            'Withdrawal Management', 'Cultural Interventions/Activities',
            'HIV/AIDS Counseling', 'N/A',
        ],
    },
    case_management: {
        label: 'Case Management Services',
        options: [
            'Individual Services Coordination', 'Housing Support',
            'Transportation', 'Employment Services', 'Child Care',
            'Health Insurance Enrollment', 'HIV/AIDS Counseling',
            'Family Services (eg. marriage education, parenting, child development services)',
            'Transitional Drug-Free Housing Services', 'Other', 'N/A',
        ],
    },
    medical: {
        label: 'Medical Services',
        options: [
            'Medical Care', 'Alcohol/Drug Testing', 'Dental Care',
            'Physical Health Medical Services',
            'Prevention Health Services (eg. Vaccines, Wellness, etc.)',
            'HIV/AIDS Medical Support & Testing',
            'Viral Hepatitis Medical Support & Testing',
            'Other Sexually transmitted infection (STI) Support & Testing',
            'OB/GYN Services', 'Other', 'N/A',
        ],
    },
    aftercare: {
        label: 'Aftercare Services',
        options: [
            'Continuing Care', 'Relapse prevention', 'Recovery Coaching',
            'Self-help & Mutual-Aid Groups', 'Spiritual Support', 'Other', 'N/A',
        ],
    },
    educational: {
        label: 'Educational Services',
        options: [
            'Substance Use Education', 'Mental Health', 'Co-occurring',
            'HIV/AIDS Education', 'Viral Hepatitis Education',
            'Naloxone Training', 'Fentanyl Test Strip Training', 'N/A',
        ],
    },
    recovery_support: {
        label: 'Recovery Support Services',
        options: [
            'Recovery Planning', 'Peer Coaching or Mentoring',
            'Case Management Services Specifically Supporting Recovery',
            'Alcohol- and Drug-free Social Activities',
            'Information & Referral', 'Recovery Housing',
            'Vocational Services', 'Other', 'N/A',
        ],
    },
};
