-- Phase 1 (consent architecture)
-- Seeds questionnaire_definitions + questionnaire_questions +
-- questionnaire_answer_options for CDP-IC-v1.3 and CDP-ROI-v1.0.
-- Per docs/consent-architecture.md §4.
--
-- Screen text is VERBATIM from the reference PDFs:
--   docs/Consent to Treat.pdf
--   docs/Consent to Release of Information.pdf
-- Typos and grammar in the source are intentionally preserved — the text has
-- legal weight. Do not "fix" anything here without coordinating with Erin.
--
-- This migration also adds a `version` column to questionnaire_definitions so
-- the consent flow can pin a specific document version per consent_documents
-- row, and so the spec's acceptance queries work.

BEGIN;

-- ============================================================================
-- 0. Schema enhancement
-- ============================================================================

ALTER TABLE questionnaire_definitions
  ADD COLUMN IF NOT EXISTS version VARCHAR(20);

-- ============================================================================
-- 1. Idempotency: drop any prior CDP-IC/CDP-ROI seed state
-- ============================================================================
--
-- The pre-existing `informed_consent` definition had 11 paraphrased placeholder
-- questions with 20 answer_options. They are not referenced by any
-- questionnaire_responses (verified at seed time), so deletion is safe.

DELETE FROM questionnaire_answer_options
WHERE question_id IN (
  SELECT id FROM questionnaire_questions
  WHERE questionnaire_type IN ('informed_consent', 'roi')
);

DELETE FROM questionnaire_questions
WHERE questionnaire_type IN ('informed_consent', 'roi');

DELETE FROM questionnaire_definitions WHERE questionnaire_type = 'roi';

-- ============================================================================
-- 2. CDP-IC-v1.3 — Informed Consent (Cell phone text or email) v1.3
-- ============================================================================

UPDATE questionnaire_definitions
SET version = 'CDP-IC-v1.3',
    name = 'Informed Consent (Cell phone text or email) v1.3',
    description = 'Participant consent to be screened and participate in the CDP. Screen text verbatim from docs/Consent to Treat.pdf.',
    is_active = true
WHERE questionnaire_type = 'informed_consent';

-- 19 screens. answer_type values:
--   'attestation' — one-button continue (the implicit stop path is the
--                   participant abandoning the flow; no explicit "no" option)
--   'text'        — free-text input
--   'date'        — date input
--   'signature'   — typed-name signature input
INSERT INTO questionnaire_questions
  (questionnaire_type, question_key, question_text, display_order, answer_type, is_required, is_active)
VALUES
('informed_consent', 'ic_q01_intro',
 'You are going to be asked a series of questions in order to obtain your consent to be considered for acceptance into  the Conditioal Dismissal Pogram (CDP) administered by the Common Wealth of Kentucky.',
 1, 'attestation', true, true),

('informed_consent', 'ic_q02_device',
 'Do you understand and agree to use your internet enabled device to acknowledge that you have received an informed consent documents to review.',
 2, 'attestation', true, true),

('informed_consent', 'ic_q03_bh_screen',
 'I give my permission and consent to my provider to perform a behavioral health screen. I understand that this brief screening process is to help identify any possible mental health concerns that I may have.',
 3, 'attestation', true, true),

('informed_consent', 'ic_q04_screening_process',
 'I understand that the screening process may involve completing online questionniares or a medical interview petaining to my current physical heath, mental health and substance use history.',
 4, 'attestation', true, true),

('informed_consent', 'ic_q05_hipaa',
 'I understand and agree that the information I provide will be kept confdential and is protected communication under  HIPAA confdentiality policies.',
 5, 'attestation', true, true),

('informed_consent', 'ic_q06_open_honest',
 'I agree to be open and honest in my responses during the screening process.',
 6, 'attestation', true, true),

('informed_consent', 'ic_q07_purpose',
 'You understand and agree that the information gathered during my screening will be used for the purpose of evaluating my medical and mental healthcare needs, developing an appropriate level of care recommendation, and for coordination and reporting purposes in the Conditional Dismissal Program (CDP)',
 7, 'attestation', true, true),

('informed_consent', 'ic_q08_right_to_refuse',
 'You have the right to refuse to complete your screening  assessments at any time during the screening process.',
 8, 'attestation', true, true),

('informed_consent', 'ic_q09_termination_if_refuse',
 'Do you understand that your application to the Conditional Dismissal Program (CDP) may be terminated if yu do not agree to complete CDP screening.',
 9, 'attestation', true, true),

('informed_consent', 'ic_q10_informed_nature',
 'Do you agree that you have been informed and you understand the nature and purpose of the screening process and Conditional Dismissal Program (CDP).',
 10, 'attestation', true, true),

('informed_consent', 'ic_q11_age_18',
 'I am at least 18 years of age (I have the legal authority to provide consent to the Conditional Dismissal Program (CDP)  screening.',
 11, 'attestation', true, true),

('informed_consent', 'ic_q12_withdraw',
 'I understand that that I may withdraw my consent at any time by sending a written request to the screening provider or their facility.',
 12, 'attestation', true, true),

('informed_consent', 'ic_q13_today_date',
 'What is  TODAY''s date?',
 13, 'date', true, true),

('informed_consent', 'ic_q14_first_name',
 'What is your  first name?',
 14, 'text', true, true),

('informed_consent', 'ic_q15_last_name',
 'What is your  last name?',
 15, 'text', true, true),

('informed_consent', 'ic_q16_dob',
 'What is your  date of birth (D.O.B.)?',
 16, 'date', true, true),

('informed_consent', 'ic_q17_esign_consent',
 'I understand that I may electronically sign this Informed Consent in person or electronically. By electronically signing the Informed Consent I agree that I have no questions at this time.',
 17, 'signature', true, true),

('informed_consent', 'ic_q18_no_sign_termination',
 'Do you understand that if YOU DO NOT electronically sign this online consent then you will be terminated from the Coonditional Dismissal Program (CDP).',
 18, 'attestation', false, true),

('informed_consent', 'ic_q19_ended',
 'The Informed Consent Process has ended.  You may be contacted by your provider or Case Navigator to discuss next steps.',
 19, 'attestation', true, true);

-- IC attestation answer_options — one option per attestation screen
-- (label is the verbatim affirmation from the PDF; value is always 'agreed').
INSERT INTO questionnaire_answer_options (question_id, option_value, display_label, display_order)
SELECT id, 'agreed', 'OK (Continue with the Informed Consent Process)', 1
FROM questionnaire_questions WHERE questionnaire_type='informed_consent' AND question_key='ic_q01_intro';

INSERT INTO questionnaire_answer_options (question_id, option_value, display_label, display_order)
SELECT id, 'agreed', 'I understand and I agree to use this electronic device. (Continue the Informed Consent process.)', 1
FROM questionnaire_questions WHERE questionnaire_type='informed_consent' AND question_key='ic_q02_device';

INSERT INTO questionnaire_answer_options (question_id, option_value, display_label, display_order)
SELECT id, 'agreed', 'I agree and give my consent for my provider to perform a behavioral health screening. (Continue the Informed Consent process.)', 1
FROM questionnaire_questions WHERE questionnaire_type='informed_consent' AND question_key='ic_q03_bh_screen';

INSERT INTO questionnaire_answer_options (question_id, option_value, display_label, display_order)
SELECT id, 'agreed', 'I give my consent and agree to particpate in the screening. (Continue the Informed Consent process.)', 1
FROM questionnaire_questions WHERE questionnaire_type='informed_consent' AND question_key='ic_q04_screening_process';

INSERT INTO questionnaire_answer_options (question_id, option_value, display_label, display_order)
SELECT id, 'agreed', 'I give my consent. (Continue the Informed Consent process.)', 1
FROM questionnaire_questions WHERE questionnaire_type='informed_consent' AND question_key='ic_q05_hipaa';

INSERT INTO questionnaire_answer_options (question_id, option_value, display_label, display_order)
SELECT id, 'agreed', 'I give my consent. (Continue the Informed Consent process.)', 1
FROM questionnaire_questions WHERE questionnaire_type='informed_consent' AND question_key='ic_q06_open_honest';

INSERT INTO questionnaire_answer_options (question_id, option_value, display_label, display_order)
SELECT id, 'agreed', 'I understand and agree. (Continue the Informed Consent Process.)', 1
FROM questionnaire_questions WHERE questionnaire_type='informed_consent' AND question_key='ic_q07_purpose';

INSERT INTO questionnaire_answer_options (question_id, option_value, display_label, display_order)
SELECT id, 'agreed', 'I understand that I have the right to refuse to complete my screening  assessments at any time during the screening process. (Continue the Informed Consent process.)', 1
FROM questionnaire_questions WHERE questionnaire_type='informed_consent' AND question_key='ic_q08_right_to_refuse';

INSERT INTO questionnaire_answer_options (question_id, option_value, display_label, display_order)
SELECT id, 'agreed', 'I understand that my application to the Conditional Dismissal Program (CDP) may be terminated if I do not complete CDP screening. (Continue informed consent.)', 1
FROM questionnaire_questions WHERE questionnaire_type='informed_consent' AND question_key='ic_q09_termination_if_refuse';

INSERT INTO questionnaire_answer_options (question_id, option_value, display_label, display_order)
SELECT id, 'agreed', 'I agree that I have been informed and I understand the nature and purpose of the screening process and Conditional Dismissal Program (CDP). (Continue the Informed Consent process.)', 1
FROM questionnaire_questions WHERE questionnaire_type='informed_consent' AND question_key='ic_q10_informed_nature';

INSERT INTO questionnaire_answer_options (question_id, option_value, display_label, display_order)
SELECT id, 'agreed', 'I am at least 18 years of age. (at least 18 years of age and that I can consent or refuse.)', 1
FROM questionnaire_questions WHERE questionnaire_type='informed_consent' AND question_key='ic_q11_age_18';

INSERT INTO questionnaire_answer_options (question_id, option_value, display_label, display_order)
SELECT id, 'agreed', 'I understand and agree.', 1
FROM questionnaire_questions WHERE questionnaire_type='informed_consent' AND question_key='ic_q12_withdraw';

INSERT INTO questionnaire_answer_options (question_id, option_value, display_label, display_order)
SELECT id, 'agreed', 'Select this option to sign the Consent electronically.', 1
FROM questionnaire_questions WHERE questionnaire_type='informed_consent' AND question_key='ic_q17_esign_consent';

INSERT INTO questionnaire_answer_options (question_id, option_value, display_label, display_order)
SELECT id, 'agreed', 'Select the [Back] button if you want to sign this online Consent  and participate in the Coonditional Dismissal Program (CDP).', 1
FROM questionnaire_questions WHERE questionnaire_type='informed_consent' AND question_key='ic_q18_no_sign_termination';

INSERT INTO questionnaire_answer_options (question_id, option_value, display_label, display_order)
SELECT id, 'agreed', 'Okay', 1
FROM questionnaire_questions WHERE questionnaire_type='informed_consent' AND question_key='ic_q19_ended';

-- ============================================================================
-- 3. CDP-ROI-v1.0 — Release of Information (ROI) for CDP v1.0
-- ============================================================================

INSERT INTO questionnaire_definitions (questionnaire_type, name, description, is_active, version)
VALUES ('roi',
        'Release of Information (ROI) for CDP v1.0',
        'Authorization for disclosure of health information to CDP partners (AOC, Commonwealth Attorney, Public Defender, FGI, KY CHFS, KY OAE, treatment providers). Screen text verbatim from docs/Consent to Release of Information.pdf.',
        true,
        'CDP-ROI-v1.0');

-- 13 screens
INSERT INTO questionnaire_questions
  (questionnaire_type, question_key, question_text, display_order, answer_type, is_required, is_active)
VALUES
('roi', 'roi_q01_overview',
 'You have been referred by the Kentucky court system to potentially participate in the Behavioral Health Conditional Dismissal Program (BHCDP).  To determine if you qualify for the BHCDP, it will be necessary that you participate in a screening assessment process to identify and provide information about your physical and mental health and your ability to participate in the program.  The screening will identify your use of certain substances, such as alcohol and drugs.  The screening will also assist in providing guidance to appropriate referrals for treatment options that would be benefcial for you.  The results of the screening will be set out in a report that will be shared with the medical provider, the court system, BHCDP personnel and contractors, the Kentucky Ofce of Adult Education and others with a need to know.',
 1, 'attestation', true, true),

('roi', 'roi_q02_right_to_revoke',
 'Your consent to participate in the BHCDP and the screening assessment process is necessary. You have the right to refuse to complete this screening at any time.  However, you may not be accepted into the BHCDP if you refuse to complete the screening.  You have the right to revoke this consent at any time. This revocation will not be effective for disclosures that have already occurred. This consent will terminate in one year from this date.',
 2, 'attestation', true, true),

('roi', 'roi_q03_hipaa_42cfr',
 'The information you provide in this screening assessment and while participating in the BHCDP is protected by the Health Insurance Portability and Accountability Act (HIPAA) and 42 CFR Part 2, and other federal and state laws and regulations that protect the privacy and confdentiality of health information, particularly information relating to substance use treatment. Pursuant to the privacy and security laws, you are required to provide an authorization for the use and disclosure of your protected health information to participate and seek treatment while in the BHCDP.',
 3, 'attestation', true, true),

('roi', 'roi_q04_disclosure_parties',
 'Please be advised that by participating in the BHCDP, the information you provide in the screening and information produced during your treatment, for the payment of your services or health care operations may be used and disclosed to the Fletcher Group, Inc., Kentucky Administrative Ofce of the Courts, including a case navigator; the Kentucky Cabinet for Health and Family Services; the Department for Public Advocacy (the Public Defender); the Commonwealth or County Attorney of the county in which the arrest was made; your legal counsel and others with a need to know.  The information you provide will also be used and disclosed to providers, including physicians, nurses and others who provide substance use and/or mental health services to you.',
 4, 'attestation', true, true),

('roi', 'roi_q05_disclosure_categories',
 'Pursuant to HIPAA and other applicable laws authorization for the use and disclosure of health information is also necessary.   These disclosures may include information relating to sexually transmitted diseases, acquired immunodefciency syndrome (AIDS), or human immunodefciency virus (HIV), mental health and substance use. This screen includes brief assessments, preliminary diagnostic information, insurance information and demographics, and histories of mental health and substance use. These disclosures are for the purpose of continuity of care, coordinating treatment and payment of reimbursements.',
 5, 'attestation', true, true),

('roi', 'roi_q06_authorization',
 'By providing the following information requested below and giving verbal consent to signing and date this consent to participate document, you consent to participate in the BHCDP, and by signing the attached authorization, you agree and authorize the use and disclosure of your health care information to participate in the BHCDP.',
 6, 'attestation', true, true),

('roi', 'roi_q07_full_name',
 'Please enter Your Full name (first, middle, and last)',
 7, 'text', true, true),

('roi', 'roi_q08_address',
 'Please enter Your current address',
 8, 'text', true, true),

('roi', 'roi_q09_dob',
 'Please enter your date of birth',
 9, 'date', true, true),

('roi', 'roi_q10_contact_info',
 'If you have any questions regarding the informed consent or authorization, you may contact Erin Henle, at 502-751-0712.',
 10, 'attestation', true, true),

('roi', 'roi_q11_signature',
 'Signature (You may sign this Release of Information by typing your name below)',
 11, 'signature', true, true),

('roi', 'roi_q12_today_date',
 'Today''s Date',
 12, 'date', true, true),

('roi', 'roi_q13_ended',
 'The Informed Consent Process has ended. You may be contacted by your provider or Case Navigator to discuss next steps.',
 13, 'attestation', true, true);

-- ROI attestation answer_options
INSERT INTO questionnaire_answer_options (question_id, option_value, display_label, display_order)
SELECT id, 'agreed', 'Okay (Continue the informed consent process)', 1
FROM questionnaire_questions WHERE questionnaire_type='roi' AND question_key='roi_q01_overview';

INSERT INTO questionnaire_answer_options (question_id, option_value, display_label, display_order)
SELECT id, 'agreed', 'Okay (Continue the informed consent process)', 1
FROM questionnaire_questions WHERE questionnaire_type='roi' AND question_key='roi_q02_right_to_revoke';

INSERT INTO questionnaire_answer_options (question_id, option_value, display_label, display_order)
SELECT id, 'agreed', 'I understand and agree to participate in the screening (Continue the informed consent process)', 1
FROM questionnaire_questions WHERE questionnaire_type='roi' AND question_key='roi_q03_hipaa_42cfr';

INSERT INTO questionnaire_answer_options (question_id, option_value, display_label, display_order)
SELECT id, 'agreed', 'I agree and give my consent (Continue the informed consent process)', 1
FROM questionnaire_questions WHERE questionnaire_type='roi' AND question_key='roi_q04_disclosure_parties';

INSERT INTO questionnaire_answer_options (question_id, option_value, display_label, display_order)
SELECT id, 'agreed', 'I agree and give my consent (Continue the informed consent process)', 1
FROM questionnaire_questions WHERE questionnaire_type='roi' AND question_key='roi_q05_disclosure_categories';

INSERT INTO questionnaire_answer_options (question_id, option_value, display_label, display_order)
SELECT id, 'agreed', 'I understand (Continue the informed consent process)', 1
FROM questionnaire_questions WHERE questionnaire_type='roi' AND question_key='roi_q06_authorization';

INSERT INTO questionnaire_answer_options (question_id, option_value, display_label, display_order)
SELECT id, 'agreed', 'Okay (Continue the informed consent process)', 1
FROM questionnaire_questions WHERE questionnaire_type='roi' AND question_key='roi_q10_contact_info';

INSERT INTO questionnaire_answer_options (question_id, option_value, display_label, display_order)
SELECT id, 'agreed', 'Okay', 1
FROM questionnaire_questions WHERE questionnaire_type='roi' AND question_key='roi_q13_ended';

COMMIT;
