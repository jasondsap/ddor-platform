--
-- PostgreSQL database dump
--

\restrict Ebuf7HUp4D8GnD2dDlUdfI36ICfUNqe6XWdXdBSn3arMTgPMdHfGZS5X8ysUXe0

-- Dumped from database version 17.8 (9c8634e)
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: archive_reason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.archive_reason AS ENUM (
    'no_contact',
    'unable_to_contact',
    'declined',
    'attorney_advised',
    'withdrawn_by_prosecutor',
    'dropped_out',
    'completed',
    'ineligible',
    'plead_in_court',
    'other'
);


--
-- Name: assessor_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.assessor_status AS ENUM (
    'scheduled',
    'attempted_to_contact',
    'pending',
    'screened',
    'other'
);


--
-- Name: attendance_frequency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.attendance_frequency AS ENUM (
    'no_sessions',
    'less_than_50_pct',
    '51_to_75_pct',
    'more_than_75_pct',
    'all_sessions'
);


--
-- Name: barrier_relief_language; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.barrier_relief_language AS ENUM (
    'english',
    'spanish',
    'sign_language',
    'french',
    'arabic',
    'other'
);


--
-- Name: calendar_event_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.calendar_event_status AS ENUM (
    'scheduled',
    'attended_in_person',
    'attended_virtual',
    'no_show',
    'rescheduled',
    'other'
);


--
-- Name: calendar_purpose; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.calendar_purpose AS ENUM (
    'advisory_council',
    'annual_checkin',
    'billing_checkin',
    'email_checkin',
    'monthly_checkin',
    'new_provider_site_visit',
    'onboard_parent_agency',
    'onboard_facility',
    'onboard_county',
    'onboard_case_navigator',
    'quarterly_site_visit',
    'recovery_ky_tour',
    'recruitment_call',
    'other'
);


--
-- Name: change_request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.change_request_status AS ENUM (
    'todo',
    'in_progress',
    'awaiting_approval',
    'sent_to_dev',
    'done',
    'denied'
);


--
-- Name: contact_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.contact_method AS ENUM (
    'cell_phone',
    'home_phone',
    'text',
    'email'
);


--
-- Name: credential_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.credential_type AS ENUM (
    'administrative_support',
    'csw',
    'community_health_worker',
    'lcsw',
    'lpcc',
    'licensed_psychologist',
    'nurse',
    'peer_support_specialist',
    'qmhp',
    'targeted_case_manager',
    'ma',
    'ms',
    'rn',
    'phd',
    'psyd',
    'md',
    'pa',
    'other'
);


--
-- Name: diagnosis_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.diagnosis_type AS ENUM (
    'sud',
    'mh',
    'co_occurring'
);


--
-- Name: education_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.education_level AS ENUM (
    'no_schooling',
    'less_than_12th_grade',
    'high_school_or_ged',
    'vocational_technical_diploma',
    'some_college',
    'two_year_degree',
    'bachelors_degree',
    'graduate_degree'
);


--
-- Name: facility_gender; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.facility_gender AS ENUM (
    'co_ed',
    'men',
    'women'
);


--
-- Name: gender; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.gender AS ENUM (
    'male',
    'female',
    'other'
);


--
-- Name: housing_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.housing_status AS ENUM (
    'housed',
    'homeless',
    'unstable_temporary',
    'unknown'
);


--
-- Name: insurance_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.insurance_type AS ENUM (
    'private_policy_holder',
    'private_family_member',
    'medicaid',
    'medicare',
    'medicare_medicaid',
    'va_tricare_champus',
    'uninsured',
    'unsure'
);


--
-- Name: invoice_review_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoice_review_status AS ENUM (
    'awaiting_review',
    'approved',
    'rejected',
    'action_required'
);


--
-- Name: kyae_education_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.kyae_education_status AS ENUM (
    'not_started',
    'currently_enrolled',
    'completed',
    'declined',
    'not_applicable'
);


--
-- Name: kyae_employment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.kyae_employment_status AS ENUM (
    'not_started',
    'currently_enrolled',
    'completed',
    'declined',
    'not_applicable'
);


--
-- Name: medicaid_escalation; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.medicaid_escalation AS ENUM (
    'month_1_apply_within_14_days',
    'month_2_flagged_payment_held',
    'month_3_plus_may_be_denied'
);


--
-- Name: meeting_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.meeting_type AS ENUM (
    'phone',
    'virtual',
    'in_person',
    'email'
);


--
-- Name: mh_loc; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.mh_loc AS ENUM (
    'recovery_maintenance',
    'low_intensity_community',
    'high_intensity_community',
    'medically_monitored_nonres',
    'medically_monitored_residential',
    'medically_managed_residential',
    'does_not_apply',
    'other'
);


--
-- Name: organization_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.organization_type AS ENUM (
    'treatment_provider',
    'aoc',
    'kyae',
    'fgi'
);


--
-- Name: primary_service; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.primary_service AS ENUM (
    'sud_primary',
    'sud_only',
    'mh_primary',
    'mh_only',
    'co_occurring',
    'not_applicable'
);


--
-- Name: program_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.program_status AS ENUM (
    'current',
    'administrative_discharge',
    'incarcerated',
    'left_ama',
    'successful_completion',
    'transferred',
    'other'
);


--
-- Name: questionnaire_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.questionnaire_type AS ENUM (
    'clinical_assessor',
    'demographic',
    'informed_consent',
    'gain_ss',
    'barc_10',
    'phq9_gad7',
    'wai_sr',
    'kyae_referral'
);


--
-- Name: race_ethnicity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.race_ethnicity AS ENUM (
    'asian',
    'black_african_american',
    'hispanic_latino',
    'multiple_races',
    'native_american_alaskan',
    'pacific_islander_hawaiian',
    'white',
    'other'
);


--
-- Name: referral_closed_reason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.referral_closed_reason AS ENUM (
    'screened',
    'unable_to_contact',
    'defendant_declined',
    'prosecution_withdrew',
    'cognitive_impairment',
    'does_not_meet_criteria'
);


--
-- Name: referral_eligibility; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.referral_eligibility AS ENUM (
    'pretrial_eligible',
    'prosecutor_override',
    'unsure'
);


--
-- Name: referral_location; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.referral_location AS ENUM (
    'community',
    'courthouse',
    'jail',
    'treatment_facility',
    'other'
);


--
-- Name: referral_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.referral_type AS ENUM (
    'open_within_72_hours',
    'open_72hr_to_2_weeks',
    'open_2_weeks_to_2_months',
    'inactive_2_months_plus',
    'closed'
);


--
-- Name: region; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.region AS ENUM (
    'north',
    'central',
    'east',
    'west',
    'south',
    'statewide'
);


--
-- Name: reimbursement_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.reimbursement_status AS ENUM (
    'awaiting_review',
    'action_required',
    'sent_to_ap',
    'paid',
    'rejected'
);


--
-- Name: report_completion_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.report_completion_status AS ENUM (
    'not_due',
    'pending',
    'overdue',
    'completed',
    'on_hold',
    'not_applicable',
    'needs_tx_start_date'
);


--
-- Name: report_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.report_type AS ENUM (
    'fourteen_day',
    'forty_two_day',
    'ninety_day',
    'one_eighty_day',
    'two_seventy_day',
    'three_sixty_day',
    'final',
    'status_change',
    'initiation_notification'
);


--
-- Name: sud_loc; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sud_loc AS ENUM (
    'early_intervention',
    'outpatient',
    'medically_managed_outpatient',
    'intensive_outpatient',
    'partial_hospitalization',
    'clinically_managed_low_residential',
    'clinically_managed_pop_specific',
    'clinically_managed_high_residential',
    'medically_monitored_inpatient',
    'medically_managed_inpatient',
    'does_not_apply',
    'other'
);


--
-- Name: support_ticket_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.support_ticket_category AS ENUM (
    'login_issues',
    'bug_reported',
    'report_issues',
    'navigation_issues',
    'data_issues',
    'permissions_issues'
);


--
-- Name: task_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.task_priority AS ENUM (
    'low',
    'medium',
    'high'
);


--
-- Name: task_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.task_status AS ENUM (
    'todo',
    'in_progress',
    'on_hold',
    'done',
    'need_help'
);


--
-- Name: training_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.training_type AS ENUM (
    'ddor_training',
    'patient_orientation',
    'new_provider',
    'barrier_relief_funding',
    'reimbursement_training',
    'state_partner_onboarding'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'super_admin',
    'business_user',
    'navigator',
    'administrative_provider',
    'healthcare_user',
    'poc',
    'inactive'
);


--
-- Name: consent_records_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.consent_records_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: access_request_attributes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_request_attributes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    request_id uuid NOT NULL,
    attribute_type text NOT NULL,
    value text NOT NULL
);


--
-- Name: access_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    job_title text,
    email text,
    organization_type text,
    facility_id uuid,
    reason text,
    requested_by_name text,
    requested_by_email text,
    treatment_start_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: assessment_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_invitations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    token text NOT NULL,
    client_id uuid NOT NULL,
    questionnaire_type text NOT NULL,
    delivery_method text DEFAULT 'text'::text NOT NULL,
    sent_to text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_by uuid,
    status text DEFAULT 'sent'::text NOT NULL,
    opened_at timestamp with time zone,
    completed_at timestamp with time zone,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    submission_id uuid,
    total_score numeric,
    client_first_name text NOT NULL,
    client_facility_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: barrier_relief_attributes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.barrier_relief_attributes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    request_id uuid NOT NULL,
    attribute_type text NOT NULL,
    value text NOT NULL
);


--
-- Name: barrier_relief_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.barrier_relief_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    address text,
    primary_language text,
    phone text,
    email text,
    county_id uuid,
    provider_id uuid,
    staff_name text,
    staff_phone text,
    staff_email text,
    facility_address text,
    case_navigator_id uuid,
    is_emergency boolean DEFAULT false NOT NULL,
    request_date date,
    end_date date,
    needs_housing boolean DEFAULT false NOT NULL,
    needs_emergency_housing boolean DEFAULT false NOT NULL,
    needs_basic_needs boolean DEFAULT false NOT NULL,
    needs_transportation boolean DEFAULT false NOT NULL,
    description text,
    alternative_resources text,
    product_links text,
    signature text,
    signature_date date,
    verbal_signature boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: barrier_relief_vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.barrier_relief_vendors (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    request_id uuid NOT NULL,
    vendor_name text,
    vendor_contact_info text,
    estimated_amount numeric(12,2),
    display_order integer DEFAULT 1 NOT NULL,
    supporting_doc_url text
);


--
-- Name: calendar_attendees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_attendees (
    calendar_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'attendee'::text NOT NULL
);


--
-- Name: calendar_attributes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_attributes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    calendar_id uuid NOT NULL,
    attribute_type text NOT NULL,
    value text NOT NULL
);


--
-- Name: change_request_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_request_files (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    request_id uuid NOT NULL,
    file_url text NOT NULL,
    file_name text,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: change_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    problem_statement text,
    proposed_solution text,
    example_use_case text,
    notes text,
    status text NOT NULL,
    priority text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    channel_type text DEFAULT 'general'::text NOT NULL,
    client_id uuid,
    provider_id uuid,
    facility_id uuid,
    created_by uuid,
    is_archived boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    last_message_at timestamp with time zone,
    dm_user_1 uuid,
    dm_user_2 uuid
);


--
-- Name: checkin_attributes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checkin_attributes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    checkin_id uuid NOT NULL,
    attribute_type text NOT NULL,
    value text NOT NULL
);


--
-- Name: client_attributes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_attributes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    client_id uuid NOT NULL,
    attribute_type text NOT NULL,
    value text NOT NULL
);


--
-- Name: client_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text,
    content text NOT NULL,
    note_type text DEFAULT 'general'::text,
    tags text[] DEFAULT '{}'::text[],
    client_id uuid,
    referral_id uuid,
    report_id uuid,
    author_id uuid NOT NULL,
    note_date date DEFAULT CURRENT_DATE,
    is_pinned boolean DEFAULT false,
    is_archived boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    mentions jsonb DEFAULT '[]'::jsonb
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    client_number integer NOT NULL,
    ddor_id text,
    first_name text NOT NULL,
    last_name text NOT NULL,
    date_of_birth date,
    facility_id uuid,
    diagnosis text,
    has_oud boolean DEFAULT false NOT NULL,
    agreement_signed_date timestamp with time zone,
    treatment_start_date date,
    agreement_end_date date,
    is_archived boolean DEFAULT false NOT NULL,
    archive_reason text,
    archive_requested_date date,
    archived_date date,
    is_mia boolean DEFAULT false NOT NULL,
    insurance_status text,
    is_second_time boolean DEFAULT false NOT NULL,
    second_time_date date,
    notes text,
    yourpath_notes text,
    rrss_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email text,
    phone text,
    phone_confirmed boolean DEFAULT false NOT NULL,
    gender text,
    zip text,
    secondary_diagnosis text,
    eligibility_status text,
    agreement_length_days integer,
    consent_email_sent boolean DEFAULT false NOT NULL,
    consent_email_sent_at timestamp with time zone,
    consent_text_sent boolean DEFAULT false NOT NULL,
    consent_text_sent_at timestamp with time zone,
    alternate_contact text,
    email_consent_status character varying(20) DEFAULT 'not_requested'::character varying NOT NULL,
    email_consent_granted_at timestamp with time zone,
    email_consent_revoked_at timestamp with time zone,
    sms_consent_status character varying(20) DEFAULT 'not_requested'::character varying NOT NULL,
    sms_consent_granted_at timestamp with time zone,
    sms_consent_revoked_at timestamp with time zone,
    nickname text,
    race_ethnicity text,
    race_other text,
    veteran text,
    street_address text,
    apt_suite text,
    city text,
    county text,
    has_alternate_phone boolean DEFAULT false NOT NULL,
    phone_alternate text,
    preferred_contact text,
    emergency_name text,
    emergency_phone text,
    emergency_relation text,
    employment_status text,
    education_level text,
    enrollment_status text,
    insurance_type text,
    insurance_id text,
    living_situation text,
    CONSTRAINT clients_email_consent_status_check CHECK (((email_consent_status)::text = ANY ((ARRAY['not_requested'::character varying, 'pending'::character varying, 'granted'::character varying, 'declined'::character varying, 'revoked'::character varying, 'expired'::character varying])::text[]))),
    CONSTRAINT clients_sms_consent_status_check CHECK (((sms_consent_status)::text = ANY ((ARRAY['not_requested'::character varying, 'pending'::character varying, 'granted'::character varying, 'declined'::character varying, 'revoked'::character varying, 'expired'::character varying])::text[])))
);


--
-- Name: clients_client_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clients_client_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clients_client_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clients_client_number_seq OWNED BY public.clients.client_number;


--
-- Name: consent_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consent_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    channel character varying(10) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    token character varying(64) NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
    recipient_address character varying(255) NOT NULL,
    consent_text text NOT NULL,
    consent_version character varying(20) NOT NULL,
    sent_at timestamp with time zone,
    send_provider_message_id character varying(100),
    send_status character varying(20),
    send_error text,
    responded_at timestamp with time zone,
    response_ip inet,
    response_user_agent text,
    sent_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT consent_records_channel_check CHECK (((channel)::text = ANY ((ARRAY['email'::character varying, 'sms'::character varying])::text[]))),
    CONSTRAINT consent_records_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'granted'::character varying, 'declined'::character varying, 'revoked'::character varying, 'expired'::character varying, 'superseded'::character varying])::text[])))
);


--
-- Name: counties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.counties (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    state_abbr text DEFAULT 'KY'::text NOT NULL,
    is_pilot boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: demographic_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.demographic_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    token text NOT NULL,
    channel text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    recipient_address text NOT NULL,
    sent_at timestamp with time zone,
    send_provider_message_id text,
    send_status text,
    send_error text,
    completed_at timestamp with time zone,
    response_ip text,
    response_user_agent text,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
    sent_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT demographic_invitations_channel_check CHECK ((channel = ANY (ARRAY['email'::text, 'sms'::text]))),
    CONSTRAINT demographic_invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'expired'::text, 'superseded'::text])))
);


--
-- Name: email_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    recipient_email text NOT NULL,
    recipient_user_id uuid,
    email_type text NOT NULL,
    subject text NOT NULL,
    body_preview text,
    related_client_id uuid,
    related_report_id uuid,
    related_invoice_id uuid,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    delivery_status text DEFAULT 'sent'::text
);


--
-- Name: facilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facilities (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    provider_id uuid,
    name text NOT NULL,
    primary_service text,
    facility_gender text,
    region text,
    phone text,
    street_address text,
    city text,
    zip text,
    county_id uuid,
    is_inactive boolean DEFAULT false NOT NULL,
    is_telehealth boolean DEFAULT false NOT NULL,
    is_religious boolean DEFAULT false NOT NULL,
    concerns text,
    ddor_training_complete boolean DEFAULT false NOT NULL,
    ddor_poc_assigned boolean DEFAULT false NOT NULL,
    ddor_logins_created boolean DEFAULT false NOT NULL,
    kickoff_call_done boolean DEFAULT false NOT NULL,
    kickoff_call_date date,
    new_provider_training boolean DEFAULT false NOT NULL,
    next_steps_email_sent boolean DEFAULT false NOT NULL,
    initial_site_visit_date date,
    monthly_checkins_scheduled boolean DEFAULT false NOT NULL,
    reimbursement_training boolean DEFAULT false NOT NULL,
    is_fully_onboarded boolean DEFAULT false NOT NULL,
    contract_fy text,
    contract_signed boolean DEFAULT false NOT NULL,
    baa_signed boolean DEFAULT false NOT NULL,
    w9_received boolean DEFAULT false NOT NULL,
    ach_setup boolean DEFAULT false NOT NULL,
    contract_emailed_date date,
    contract_executed_sent boolean DEFAULT false NOT NULL,
    form_type text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    address text,
    onboard_ddor_training boolean DEFAULT false,
    onboard_ddor_poc boolean DEFAULT false,
    onboard_ddor_logins boolean DEFAULT false,
    onboard_kickoff_call boolean DEFAULT false,
    onboard_provider_training boolean DEFAULT false,
    onboard_next_steps_email boolean DEFAULT false,
    onboard_contract boolean DEFAULT false,
    onboard_baa boolean DEFAULT false,
    onboard_w9 boolean DEFAULT false,
    onboard_ach boolean DEFAULT false,
    onboard_sent_executed_contract boolean DEFAULT false,
    onboard_monthly_checkins boolean DEFAULT false,
    onboard_reimbursement_training boolean DEFAULT false,
    onboard_complete boolean DEFAULT false,
    onboard_complete_kathy boolean DEFAULT false,
    onboard_complete_tanya boolean DEFAULT false,
    onboard_complete_jade boolean DEFAULT false
);


--
-- Name: facility_attributes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facility_attributes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    facility_id uuid NOT NULL,
    attribute_type text NOT NULL,
    value text NOT NULL
);


--
-- Name: facility_servicing_counties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facility_servicing_counties (
    facility_id uuid NOT NULL,
    county_id uuid NOT NULL
);


--
-- Name: file_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.file_attachments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    file_url text NOT NULL,
    file_name text,
    file_size bigint,
    mime_type text,
    uploaded_by uuid,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: housing_survey_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.housing_survey_entries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    survey_id uuid NOT NULL,
    house_name text,
    house_gender text,
    display_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: housing_survey_narr_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.housing_survey_narr_levels (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    entry_id uuid NOT NULL,
    narr_level text NOT NULL
);


--
-- Name: housing_survey_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.housing_survey_types (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    survey_id uuid NOT NULL,
    housing_type text NOT NULL
);


--
-- Name: housing_surveys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.housing_surveys (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    provider_id uuid NOT NULL,
    survey_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: invoice_attributes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_attributes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    invoice_id uuid NOT NULL,
    attribute_type text NOT NULL,
    value text NOT NULL
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    invoice_number integer NOT NULL,
    patient_name text NOT NULL,
    patient_dob date,
    account_number text,
    facility_id uuid,
    submitter_id uuid,
    service_date_from date,
    service_date_to date,
    total_charge numeric(12,2),
    payment_due numeric(12,2),
    credits_issued numeric(12,2) DEFAULT 0,
    has_copays_deductibles boolean DEFAULT false NOT NULL,
    invoice_file_url text,
    itemized_receipt_url text,
    medicaid_verification_url text,
    fgi_review_1 public.invoice_review_status NOT NULL,
    fgi_review_2 text NOT NULL,
    dbh_review text NOT NULL,
    dbh_approved_date date,
    reimbursement_status text NOT NULL,
    date_sent_to_ap date,
    medicaid_escalation text,
    medicaid_explanation text,
    previously_submitted_medicaid_docs boolean,
    medicaid_application_issues_notes text,
    remove_from_medicaid_list boolean DEFAULT false NOT NULL,
    is_invalid boolean DEFAULT false NOT NULL,
    is_duplicate boolean DEFAULT false NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    provider_attestation boolean DEFAULT false NOT NULL,
    submitter_signature text,
    fgi_notes text,
    reviewer_notes text,
    follow_up_email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: invoices_invoice_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoices_invoice_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoices_invoice_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoices_invoice_number_seq OWNED BY public.invoices.invoice_number;


--
-- Name: kyae_referral_attributes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kyae_referral_attributes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    kyae_referral_id uuid NOT NULL,
    attribute_type text NOT NULL,
    value text NOT NULL
);


--
-- Name: kyae_referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kyae_referrals (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    referral_number integer NOT NULL,
    client_id uuid,
    provider_id uuid,
    participant_last_name text,
    facility_name_address text,
    case_manager_name text,
    case_manager_email text,
    case_manager_phone text,
    best_contact_time text,
    participant_address text,
    participant_phone text,
    alternate_contact text,
    kyae_screen_notes text,
    needs_transportation boolean DEFAULT false NOT NULL,
    submission_date date,
    loc text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: kyae_referrals_referral_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kyae_referrals_referral_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kyae_referrals_referral_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kyae_referrals_referral_number_seq OWNED BY public.kyae_referrals.referral_number;


--
-- Name: message_read_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_read_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    channel_id uuid NOT NULL,
    last_read_at timestamp with time zone DEFAULT now()
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    channel_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    body text NOT NULL,
    mentions jsonb DEFAULT '[]'::jsonb,
    is_edited boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: provider_calendar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_calendar (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    facility_id uuid,
    event_date date NOT NULL,
    purpose text,
    event_status text NOT NULL,
    meeting_type text,
    num_current_participants integer,
    action_items text,
    has_overdue_reports boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: provider_checkins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_checkins (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    facility_id uuid,
    checkin_date date NOT NULL,
    meeting_type text,
    attended boolean DEFAULT false NOT NULL,
    notes text,
    attendee_first_name text,
    attendee_last_name text,
    attendee_email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: provider_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_contracts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    provider_id uuid NOT NULL,
    file_url text NOT NULL,
    file_name text,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.providers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    abbreviation text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    has_participants boolean DEFAULT false,
    contract_signed boolean DEFAULT false,
    contract_date date,
    baa_signed boolean DEFAULT false,
    baa_date date,
    w9_received boolean DEFAULT false,
    ach_received boolean DEFAULT false,
    contract_notes text
);


--
-- Name: questionnaire_answer_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questionnaire_answer_options (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    question_id uuid NOT NULL,
    option_value text NOT NULL,
    display_label text NOT NULL,
    display_order integer NOT NULL,
    score_value numeric,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: questionnaire_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questionnaire_definitions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    questionnaire_type text NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: questionnaire_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questionnaire_questions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    questionnaire_type text NOT NULL,
    question_key text NOT NULL,
    question_text text NOT NULL,
    display_order integer NOT NULL,
    answer_type text NOT NULL,
    is_required boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: questionnaire_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questionnaire_responses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    submission_id uuid NOT NULL,
    question_id uuid NOT NULL,
    answer_text text,
    answer_numeric numeric
);


--
-- Name: questionnaire_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questionnaire_submissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    questionnaire_type text NOT NULL,
    referral_id uuid,
    client_id uuid,
    submitted_by uuid,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    total_score numeric,
    is_complete boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_submission_link CHECK (((referral_id IS NOT NULL) OR (client_id IS NOT NULL)))
);


--
-- Name: referral_activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referral_id uuid NOT NULL,
    user_id uuid NOT NULL,
    activity_type text DEFAULT 'note'::text,
    content text NOT NULL,
    previous_value text,
    new_value text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: referral_attributes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_attributes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    referral_id uuid NOT NULL,
    attribute_type text NOT NULL,
    value text NOT NULL
);


--
-- Name: referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referrals (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    referral_number integer NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    date_of_birth date,
    gender text,
    phone text,
    alternate_contact text,
    originating_county_id uuid,
    residence_county text,
    location_at_referral text,
    jail_at_referral boolean DEFAULT false NOT NULL,
    jail_contact_instructions text,
    date_received date,
    referral_date date,
    screen_date date,
    court_date date,
    assessor_status text,
    eligibility text,
    referral_type_status text,
    closed_reason text,
    state_assessor_id uuid,
    case_navigator_id uuid,
    provider_recommendation_id uuid,
    loc_recommendation text,
    smi_symptoms boolean DEFAULT false NOT NULL,
    tbi_abi boolean DEFAULT false NOT NULL,
    major_medical_issues boolean DEFAULT false NOT NULL,
    initial_housing text,
    has_insurance text,
    medicaid_application_started text,
    is_urgent boolean DEFAULT false NOT NULL,
    urgent_message text,
    began_program boolean,
    prior_participant text,
    notes text,
    additional_info text,
    client_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sb90_substance_charges text[] DEFAULT '{}'::text[],
    case_navigator_name text,
    case_navigator_email text
);


--
-- Name: referrals_referral_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.referrals_referral_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: referrals_referral_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.referrals_referral_number_seq OWNED BY public.referrals.referral_number;


--
-- Name: report_attributes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_attributes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    report_id uuid NOT NULL,
    attribute_type text NOT NULL,
    value text NOT NULL
);


--
-- Name: report_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_tracking (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    client_id uuid NOT NULL,
    fourteen_day_status text DEFAULT 'pending'::text NOT NULL,
    fourteen_day_report_id uuid,
    kyae_referral_status text DEFAULT 'pending'::text NOT NULL,
    forty_two_day_status text DEFAULT 'pending'::text NOT NULL,
    forty_two_day_report_id uuid,
    barc10_status text DEFAULT 'pending'::text NOT NULL,
    phq9_gad7_status text DEFAULT 'pending'::text NOT NULL,
    ninety_day_status text DEFAULT 'pending'::text NOT NULL,
    ninety_day_report_id uuid,
    one_eighty_day_status text DEFAULT 'pending'::text NOT NULL,
    one_eighty_day_report_id uuid,
    two_seventy_day_status text DEFAULT 'pending'::text NOT NULL,
    two_seventy_day_report_id uuid,
    three_sixty_day_status text DEFAULT 'pending'::text NOT NULL,
    three_sixty_day_report_id uuid,
    final_report_status text DEFAULT 'pending'::text NOT NULL,
    final_report_id uuid,
    final_provider_status text DEFAULT 'pending'::text NOT NULL,
    last_checked_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    report_number integer NOT NULL,
    report_type text NOT NULL,
    client_id uuid NOT NULL,
    facility_id uuid,
    provider_id uuid,
    date_submitted timestamp with time zone,
    date_completed timestamp with time zone,
    quarter_completed text,
    current_sud_loc text,
    current_mh_loc text,
    program_status text,
    attendance_frequency text,
    household_income numeric(12,2),
    dependents_count integer,
    is_receiving_mat boolean,
    was_discharged boolean DEFAULT false NOT NULL,
    discharge_date date,
    discharge_reason text,
    was_referred_to_provider boolean,
    referred_provider_name text,
    referred_loc text,
    program_length_days integer,
    kyae_referral_status text,
    kyae_education_status text,
    kyae_employment_status text,
    submitter_name text,
    submitter_email text,
    submitter_credential text,
    signature_date date,
    is_signed boolean DEFAULT false NOT NULL,
    notes text,
    barrier_notes text,
    recommendation_notes text,
    submitted_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reports_report_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reports_report_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reports_report_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reports_report_number_seq OWNED BY public.reports.report_number;


--
-- Name: staff_development; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_development (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    activity text NOT NULL,
    attendee_id uuid,
    activity_date date,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    issue text NOT NULL,
    description text,
    category text,
    reported_by_name text,
    assigned_to uuid,
    is_resolved boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    notes text,
    assigned_to uuid,
    priority text,
    status text NOT NULL,
    due_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: trainings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trainings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    facility_id uuid,
    training_type text NOT NULL,
    meeting_type text,
    training_date date NOT NULL,
    attendee_first_name text,
    attendee_last_name text,
    attendee_job_title text,
    attendee_email text,
    attendee_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_counties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_counties (
    user_id uuid NOT NULL,
    county_id uuid NOT NULL
);


--
-- Name: user_facilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_facilities (
    user_id uuid NOT NULL,
    facility_id uuid NOT NULL,
    relationship text DEFAULT 'staff'::text NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    cognito_sub text,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    mailing_email text,
    phone text,
    job_title text,
    role text NOT NULL,
    facility_id uuid,
    provider_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    ddor_access boolean DEFAULT false NOT NULL,
    ddor_login_requested date,
    ddor_login_granted date,
    ddor_removed boolean DEFAULT false NOT NULL,
    ddor_removed_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: clients client_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients ALTER COLUMN client_number SET DEFAULT nextval('public.clients_client_number_seq'::regclass);


--
-- Name: invoices invoice_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices ALTER COLUMN invoice_number SET DEFAULT nextval('public.invoices_invoice_number_seq'::regclass);


--
-- Name: kyae_referrals referral_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyae_referrals ALTER COLUMN referral_number SET DEFAULT nextval('public.kyae_referrals_referral_number_seq'::regclass);


--
-- Name: referrals referral_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals ALTER COLUMN referral_number SET DEFAULT nextval('public.referrals_referral_number_seq'::regclass);


--
-- Name: reports report_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports ALTER COLUMN report_number SET DEFAULT nextval('public.reports_report_number_seq'::regclass);


--
-- Name: access_request_attributes access_request_attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_request_attributes
    ADD CONSTRAINT access_request_attributes_pkey PRIMARY KEY (id);


--
-- Name: access_request_attributes access_request_attributes_request_id_attribute_type_value_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_request_attributes
    ADD CONSTRAINT access_request_attributes_request_id_attribute_type_value_key UNIQUE (request_id, attribute_type, value);


--
-- Name: access_requests access_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_requests
    ADD CONSTRAINT access_requests_pkey PRIMARY KEY (id);


--
-- Name: assessment_invitations assessment_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_invitations
    ADD CONSTRAINT assessment_invitations_pkey PRIMARY KEY (id);


--
-- Name: assessment_invitations assessment_invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_invitations
    ADD CONSTRAINT assessment_invitations_token_key UNIQUE (token);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: barrier_relief_attributes barrier_relief_attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barrier_relief_attributes
    ADD CONSTRAINT barrier_relief_attributes_pkey PRIMARY KEY (id);


--
-- Name: barrier_relief_attributes barrier_relief_attributes_request_id_attribute_type_value_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barrier_relief_attributes
    ADD CONSTRAINT barrier_relief_attributes_request_id_attribute_type_value_key UNIQUE (request_id, attribute_type, value);


--
-- Name: barrier_relief_requests barrier_relief_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barrier_relief_requests
    ADD CONSTRAINT barrier_relief_requests_pkey PRIMARY KEY (id);


--
-- Name: barrier_relief_vendors barrier_relief_vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barrier_relief_vendors
    ADD CONSTRAINT barrier_relief_vendors_pkey PRIMARY KEY (id);


--
-- Name: calendar_attendees calendar_attendees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_attendees
    ADD CONSTRAINT calendar_attendees_pkey PRIMARY KEY (calendar_id, user_id, role);


--
-- Name: calendar_attributes calendar_attributes_calendar_id_attribute_type_value_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_attributes
    ADD CONSTRAINT calendar_attributes_calendar_id_attribute_type_value_key UNIQUE (calendar_id, attribute_type, value);


--
-- Name: calendar_attributes calendar_attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_attributes
    ADD CONSTRAINT calendar_attributes_pkey PRIMARY KEY (id);


--
-- Name: change_request_files change_request_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_request_files
    ADD CONSTRAINT change_request_files_pkey PRIMARY KEY (id);


--
-- Name: change_requests change_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_requests
    ADD CONSTRAINT change_requests_pkey PRIMARY KEY (id);


--
-- Name: channels channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_pkey PRIMARY KEY (id);


--
-- Name: checkin_attributes checkin_attributes_checkin_id_attribute_type_value_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkin_attributes
    ADD CONSTRAINT checkin_attributes_checkin_id_attribute_type_value_key UNIQUE (checkin_id, attribute_type, value);


--
-- Name: checkin_attributes checkin_attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkin_attributes
    ADD CONSTRAINT checkin_attributes_pkey PRIMARY KEY (id);


--
-- Name: client_attributes client_attributes_client_id_attribute_type_value_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_attributes
    ADD CONSTRAINT client_attributes_client_id_attribute_type_value_key UNIQUE (client_id, attribute_type, value);


--
-- Name: client_attributes client_attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_attributes
    ADD CONSTRAINT client_attributes_pkey PRIMARY KEY (id);


--
-- Name: client_notes client_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_notes
    ADD CONSTRAINT client_notes_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: consent_records consent_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_records
    ADD CONSTRAINT consent_records_pkey PRIMARY KEY (id);


--
-- Name: consent_records consent_records_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_records
    ADD CONSTRAINT consent_records_token_key UNIQUE (token);


--
-- Name: counties counties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.counties
    ADD CONSTRAINT counties_pkey PRIMARY KEY (id);


--
-- Name: demographic_invitations demographic_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demographic_invitations
    ADD CONSTRAINT demographic_invitations_pkey PRIMARY KEY (id);


--
-- Name: demographic_invitations demographic_invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demographic_invitations
    ADD CONSTRAINT demographic_invitations_token_key UNIQUE (token);


--
-- Name: email_log email_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_log
    ADD CONSTRAINT email_log_pkey PRIMARY KEY (id);


--
-- Name: facilities facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT facilities_pkey PRIMARY KEY (id);


--
-- Name: facility_attributes facility_attributes_facility_id_attribute_type_value_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_attributes
    ADD CONSTRAINT facility_attributes_facility_id_attribute_type_value_key UNIQUE (facility_id, attribute_type, value);


--
-- Name: facility_attributes facility_attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_attributes
    ADD CONSTRAINT facility_attributes_pkey PRIMARY KEY (id);


--
-- Name: facility_servicing_counties facility_servicing_counties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_servicing_counties
    ADD CONSTRAINT facility_servicing_counties_pkey PRIMARY KEY (facility_id, county_id);


--
-- Name: file_attachments file_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_attachments
    ADD CONSTRAINT file_attachments_pkey PRIMARY KEY (id);


--
-- Name: housing_survey_entries housing_survey_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.housing_survey_entries
    ADD CONSTRAINT housing_survey_entries_pkey PRIMARY KEY (id);


--
-- Name: housing_survey_narr_levels housing_survey_narr_levels_entry_id_narr_level_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.housing_survey_narr_levels
    ADD CONSTRAINT housing_survey_narr_levels_entry_id_narr_level_key UNIQUE (entry_id, narr_level);


--
-- Name: housing_survey_narr_levels housing_survey_narr_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.housing_survey_narr_levels
    ADD CONSTRAINT housing_survey_narr_levels_pkey PRIMARY KEY (id);


--
-- Name: housing_survey_types housing_survey_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.housing_survey_types
    ADD CONSTRAINT housing_survey_types_pkey PRIMARY KEY (id);


--
-- Name: housing_survey_types housing_survey_types_survey_id_housing_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.housing_survey_types
    ADD CONSTRAINT housing_survey_types_survey_id_housing_type_key UNIQUE (survey_id, housing_type);


--
-- Name: housing_surveys housing_surveys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.housing_surveys
    ADD CONSTRAINT housing_surveys_pkey PRIMARY KEY (id);


--
-- Name: invoice_attributes invoice_attributes_invoice_id_attribute_type_value_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_attributes
    ADD CONSTRAINT invoice_attributes_invoice_id_attribute_type_value_key UNIQUE (invoice_id, attribute_type, value);


--
-- Name: invoice_attributes invoice_attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_attributes
    ADD CONSTRAINT invoice_attributes_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: kyae_referral_attributes kyae_referral_attributes_kyae_referral_id_attribute_type_va_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyae_referral_attributes
    ADD CONSTRAINT kyae_referral_attributes_kyae_referral_id_attribute_type_va_key UNIQUE (kyae_referral_id, attribute_type, value);


--
-- Name: kyae_referral_attributes kyae_referral_attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyae_referral_attributes
    ADD CONSTRAINT kyae_referral_attributes_pkey PRIMARY KEY (id);


--
-- Name: kyae_referrals kyae_referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyae_referrals
    ADD CONSTRAINT kyae_referrals_pkey PRIMARY KEY (id);


--
-- Name: message_read_status message_read_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_read_status
    ADD CONSTRAINT message_read_status_pkey PRIMARY KEY (id);


--
-- Name: message_read_status message_read_status_user_id_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_read_status
    ADD CONSTRAINT message_read_status_user_id_channel_id_key UNIQUE (user_id, channel_id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: provider_calendar provider_calendar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_calendar
    ADD CONSTRAINT provider_calendar_pkey PRIMARY KEY (id);


--
-- Name: provider_checkins provider_checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_checkins
    ADD CONSTRAINT provider_checkins_pkey PRIMARY KEY (id);


--
-- Name: provider_contracts provider_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_contracts
    ADD CONSTRAINT provider_contracts_pkey PRIMARY KEY (id);


--
-- Name: providers providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.providers
    ADD CONSTRAINT providers_pkey PRIMARY KEY (id);


--
-- Name: questionnaire_answer_options questionnaire_answer_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_answer_options
    ADD CONSTRAINT questionnaire_answer_options_pkey PRIMARY KEY (id);


--
-- Name: questionnaire_definitions questionnaire_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_definitions
    ADD CONSTRAINT questionnaire_definitions_pkey PRIMARY KEY (id);


--
-- Name: questionnaire_definitions questionnaire_definitions_questionnaire_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_definitions
    ADD CONSTRAINT questionnaire_definitions_questionnaire_type_key UNIQUE (questionnaire_type);


--
-- Name: questionnaire_questions questionnaire_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_questions
    ADD CONSTRAINT questionnaire_questions_pkey PRIMARY KEY (id);


--
-- Name: questionnaire_questions questionnaire_questions_questionnaire_type_question_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_questions
    ADD CONSTRAINT questionnaire_questions_questionnaire_type_question_key_key UNIQUE (questionnaire_type, question_key);


--
-- Name: questionnaire_responses questionnaire_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_responses
    ADD CONSTRAINT questionnaire_responses_pkey PRIMARY KEY (id);


--
-- Name: questionnaire_responses questionnaire_responses_submission_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_responses
    ADD CONSTRAINT questionnaire_responses_submission_id_question_id_key UNIQUE (submission_id, question_id);


--
-- Name: questionnaire_submissions questionnaire_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_submissions
    ADD CONSTRAINT questionnaire_submissions_pkey PRIMARY KEY (id);


--
-- Name: referral_activity_log referral_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_activity_log
    ADD CONSTRAINT referral_activity_log_pkey PRIMARY KEY (id);


--
-- Name: referral_attributes referral_attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_attributes
    ADD CONSTRAINT referral_attributes_pkey PRIMARY KEY (id);


--
-- Name: referral_attributes referral_attributes_referral_id_attribute_type_value_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_attributes
    ADD CONSTRAINT referral_attributes_referral_id_attribute_type_value_key UNIQUE (referral_id, attribute_type, value);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: report_attributes report_attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_attributes
    ADD CONSTRAINT report_attributes_pkey PRIMARY KEY (id);


--
-- Name: report_attributes report_attributes_report_id_attribute_type_value_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_attributes
    ADD CONSTRAINT report_attributes_report_id_attribute_type_value_key UNIQUE (report_id, attribute_type, value);


--
-- Name: report_tracking report_tracking_client_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_tracking
    ADD CONSTRAINT report_tracking_client_id_key UNIQUE (client_id);


--
-- Name: report_tracking report_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_tracking
    ADD CONSTRAINT report_tracking_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: staff_development staff_development_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_development
    ADD CONSTRAINT staff_development_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: trainings trainings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainings
    ADD CONSTRAINT trainings_pkey PRIMARY KEY (id);


--
-- Name: user_counties user_counties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_counties
    ADD CONSTRAINT user_counties_pkey PRIMARY KEY (user_id, county_id);


--
-- Name: user_facilities user_facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_facilities
    ADD CONSTRAINT user_facilities_pkey PRIMARY KEY (user_id, facility_id, relationship);


--
-- Name: users users_cognito_sub_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_cognito_sub_key UNIQUE (cognito_sub);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_attachments_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attachments_entity ON public.file_attachments USING btree (entity_type, entity_id);


--
-- Name: idx_audit_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_table ON public.audit_log USING btree (table_name, record_id);


--
-- Name: idx_audit_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_time ON public.audit_log USING btree (created_at);


--
-- Name: idx_audit_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_user ON public.audit_log USING btree (user_id, created_at);


--
-- Name: idx_calendar_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_date ON public.provider_calendar USING btree (event_date);


--
-- Name: idx_calendar_facility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_facility ON public.provider_calendar USING btree (facility_id);


--
-- Name: idx_channels_dm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channels_dm ON public.channels USING btree (dm_user_1, dm_user_2) WHERE (channel_type = 'dm'::text);


--
-- Name: idx_channels_last_msg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channels_last_msg ON public.channels USING btree (last_message_at DESC NULLS LAST);


--
-- Name: idx_channels_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channels_type ON public.channels USING btree (channel_type);


--
-- Name: idx_client_notes_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_notes_author ON public.client_notes USING btree (author_id, created_at DESC);


--
-- Name: idx_client_notes_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_notes_client ON public.client_notes USING btree (client_id, created_at DESC);


--
-- Name: idx_clients_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_archived ON public.clients USING btree (is_archived);


--
-- Name: idx_clients_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_email ON public.clients USING btree (email) WHERE (email IS NOT NULL);


--
-- Name: idx_clients_email_consent_granted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_email_consent_granted ON public.clients USING btree (id) WHERE ((email_consent_status)::text = 'granted'::text);


--
-- Name: idx_clients_facility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_facility ON public.clients USING btree (facility_id);


--
-- Name: idx_clients_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_name ON public.clients USING btree (last_name, first_name);


--
-- Name: idx_clients_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_phone ON public.clients USING btree (phone) WHERE (phone IS NOT NULL);


--
-- Name: idx_clients_sms_consent_granted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_sms_consent_granted ON public.clients USING btree (id) WHERE ((sms_consent_status)::text = 'granted'::text);


--
-- Name: idx_clients_tx_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_tx_start ON public.clients USING btree (treatment_start_date);


--
-- Name: idx_consent_records_client_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consent_records_client_channel ON public.consent_records USING btree (client_id, channel, created_at DESC);


--
-- Name: idx_consent_records_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consent_records_pending ON public.consent_records USING btree (client_id, channel) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_consent_records_provider_msg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consent_records_provider_msg ON public.consent_records USING btree (send_provider_message_id) WHERE (send_provider_message_id IS NOT NULL);


--
-- Name: idx_consent_records_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consent_records_token ON public.consent_records USING btree (token);


--
-- Name: idx_counties_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_counties_name ON public.counties USING btree (name);


--
-- Name: idx_counties_pilot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_counties_pilot ON public.counties USING btree (is_pilot) WHERE (is_pilot = true);


--
-- Name: idx_demographic_invitations_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_demographic_invitations_client ON public.demographic_invitations USING btree (client_id);


--
-- Name: idx_demographic_invitations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_demographic_invitations_status ON public.demographic_invitations USING btree (status);


--
-- Name: idx_email_log_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_log_client ON public.email_log USING btree (related_client_id) WHERE (related_client_id IS NOT NULL);


--
-- Name: idx_email_log_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_log_type ON public.email_log USING btree (email_type, sent_at);


--
-- Name: idx_facilities_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facilities_active ON public.facilities USING btree (is_inactive) WHERE (is_inactive = false);


--
-- Name: idx_facilities_county; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facilities_county ON public.facilities USING btree (county_id);


--
-- Name: idx_facilities_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facilities_provider ON public.facilities USING btree (provider_id);


--
-- Name: idx_facility_attributes_facility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_attributes_facility ON public.facility_attributes USING btree (facility_id);


--
-- Name: idx_facility_attributes_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_attributes_type ON public.facility_attributes USING btree (attribute_type);


--
-- Name: idx_facility_attrs; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_attrs ON public.facility_attributes USING btree (facility_id, attribute_type);


--
-- Name: idx_invitations_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_client ON public.assessment_invitations USING btree (client_id);


--
-- Name: idx_invitations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_status ON public.assessment_invitations USING btree (status) WHERE (status <> 'completed'::text);


--
-- Name: idx_invitations_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_token ON public.assessment_invitations USING btree (token);


--
-- Name: idx_invoice_attrs; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_attrs ON public.invoice_attributes USING btree (invoice_id, attribute_type);


--
-- Name: idx_invoices_facility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_facility ON public.invoices USING btree (facility_id);


--
-- Name: idx_invoices_fgi1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_fgi1 ON public.invoices USING btree (fgi_review_1) WHERE (fgi_review_1 = 'awaiting_review'::public.invoice_review_status);


--
-- Name: idx_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_status ON public.invoices USING btree (reimbursement_status);


--
-- Name: idx_messages_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_channel ON public.messages USING btree (channel_id, created_at DESC);


--
-- Name: idx_messages_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_sender ON public.messages USING btree (sender_id);


--
-- Name: idx_providers_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_providers_name ON public.providers USING btree (name);


--
-- Name: idx_qao_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qao_question ON public.questionnaire_answer_options USING btree (question_id, display_order);


--
-- Name: idx_qq_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qq_type ON public.questionnaire_questions USING btree (questionnaire_type, display_order);


--
-- Name: idx_qr_submission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qr_submission ON public.questionnaire_responses USING btree (submission_id);


--
-- Name: idx_qs_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qs_client ON public.questionnaire_submissions USING btree (client_id) WHERE (client_id IS NOT NULL);


--
-- Name: idx_qs_referral; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qs_referral ON public.questionnaire_submissions USING btree (referral_id) WHERE (referral_id IS NOT NULL);


--
-- Name: idx_qs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qs_type ON public.questionnaire_submissions USING btree (questionnaire_type);


--
-- Name: idx_referral_activity_referral; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_activity_referral ON public.referral_activity_log USING btree (referral_id, created_at DESC);


--
-- Name: idx_referral_attrs; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_attrs ON public.referral_attributes USING btree (referral_id, attribute_type);


--
-- Name: idx_referrals_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_client ON public.referrals USING btree (client_id) WHERE (client_id IS NOT NULL);


--
-- Name: idx_referrals_county; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_county ON public.referrals USING btree (originating_county_id);


--
-- Name: idx_referrals_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_dates ON public.referrals USING btree (date_received, screen_date);


--
-- Name: idx_referrals_navigator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_navigator ON public.referrals USING btree (case_navigator_id);


--
-- Name: idx_referrals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_status ON public.referrals USING btree (referral_type_status);


--
-- Name: idx_report_attrs; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_attrs ON public.report_attributes USING btree (report_id, attribute_type);


--
-- Name: idx_reports_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_client ON public.reports USING btree (client_id);


--
-- Name: idx_reports_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_date ON public.reports USING btree (date_submitted);


--
-- Name: idx_reports_facility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_facility ON public.reports USING btree (facility_id);


--
-- Name: idx_reports_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_type ON public.reports USING btree (report_type);


--
-- Name: idx_trainings_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trainings_date ON public.trainings USING btree (training_date);


--
-- Name: idx_trainings_facility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trainings_facility ON public.trainings USING btree (facility_id);


--
-- Name: idx_users_cognito; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_cognito ON public.users USING btree (cognito_sub) WHERE (cognito_sub IS NOT NULL);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_facility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_facility ON public.users USING btree (facility_id);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: barrier_relief_requests trg_barrier_relief_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_barrier_relief_requests_updated_at BEFORE UPDATE ON public.barrier_relief_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: change_requests trg_change_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_change_requests_updated_at BEFORE UPDATE ON public.change_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: clients trg_clients_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: consent_records trg_consent_records_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_consent_records_updated_at BEFORE UPDATE ON public.consent_records FOR EACH ROW EXECUTE FUNCTION public.consent_records_set_updated_at();


--
-- Name: counties trg_counties_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_counties_updated_at BEFORE UPDATE ON public.counties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: facilities trg_facilities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_facilities_updated_at BEFORE UPDATE ON public.facilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: housing_surveys trg_housing_surveys_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_housing_surveys_updated_at BEFORE UPDATE ON public.housing_surveys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: invoices trg_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: provider_calendar trg_provider_calendar_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_provider_calendar_updated_at BEFORE UPDATE ON public.provider_calendar FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: providers trg_providers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_providers_updated_at BEFORE UPDATE ON public.providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: questionnaire_submissions trg_questionnaire_submissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_questionnaire_submissions_updated_at BEFORE UPDATE ON public.questionnaire_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: referrals trg_referrals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_referrals_updated_at BEFORE UPDATE ON public.referrals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: report_tracking trg_report_tracking_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_report_tracking_updated_at BEFORE UPDATE ON public.report_tracking FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: reports trg_reports_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: tasks trg_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: access_request_attributes access_request_attributes_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_request_attributes
    ADD CONSTRAINT access_request_attributes_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.access_requests(id) ON DELETE CASCADE;


--
-- Name: access_requests access_requests_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_requests
    ADD CONSTRAINT access_requests_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id);


--
-- Name: assessment_invitations assessment_invitations_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_invitations
    ADD CONSTRAINT assessment_invitations_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: assessment_invitations assessment_invitations_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_invitations
    ADD CONSTRAINT assessment_invitations_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.users(id);


--
-- Name: assessment_invitations assessment_invitations_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_invitations
    ADD CONSTRAINT assessment_invitations_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.questionnaire_submissions(id);


--
-- Name: audit_log audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: barrier_relief_attributes barrier_relief_attributes_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barrier_relief_attributes
    ADD CONSTRAINT barrier_relief_attributes_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.barrier_relief_requests(id) ON DELETE CASCADE;


--
-- Name: barrier_relief_requests barrier_relief_requests_case_navigator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barrier_relief_requests
    ADD CONSTRAINT barrier_relief_requests_case_navigator_id_fkey FOREIGN KEY (case_navigator_id) REFERENCES public.users(id);


--
-- Name: barrier_relief_requests barrier_relief_requests_county_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barrier_relief_requests
    ADD CONSTRAINT barrier_relief_requests_county_id_fkey FOREIGN KEY (county_id) REFERENCES public.counties(id);


--
-- Name: barrier_relief_requests barrier_relief_requests_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barrier_relief_requests
    ADD CONSTRAINT barrier_relief_requests_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id);


--
-- Name: barrier_relief_vendors barrier_relief_vendors_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barrier_relief_vendors
    ADD CONSTRAINT barrier_relief_vendors_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.barrier_relief_requests(id) ON DELETE CASCADE;


--
-- Name: calendar_attendees calendar_attendees_calendar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_attendees
    ADD CONSTRAINT calendar_attendees_calendar_id_fkey FOREIGN KEY (calendar_id) REFERENCES public.provider_calendar(id) ON DELETE CASCADE;


--
-- Name: calendar_attendees calendar_attendees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_attendees
    ADD CONSTRAINT calendar_attendees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: calendar_attributes calendar_attributes_calendar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_attributes
    ADD CONSTRAINT calendar_attributes_calendar_id_fkey FOREIGN KEY (calendar_id) REFERENCES public.provider_calendar(id) ON DELETE CASCADE;


--
-- Name: change_request_files change_request_files_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_request_files
    ADD CONSTRAINT change_request_files_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.change_requests(id) ON DELETE CASCADE;


--
-- Name: change_requests change_requests_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_requests
    ADD CONSTRAINT change_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: channels channels_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: channels channels_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: channels channels_dm_user_1_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_dm_user_1_fkey FOREIGN KEY (dm_user_1) REFERENCES public.users(id);


--
-- Name: channels channels_dm_user_2_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_dm_user_2_fkey FOREIGN KEY (dm_user_2) REFERENCES public.users(id);


--
-- Name: channels channels_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id);


--
-- Name: channels channels_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id);


--
-- Name: checkin_attributes checkin_attributes_checkin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkin_attributes
    ADD CONSTRAINT checkin_attributes_checkin_id_fkey FOREIGN KEY (checkin_id) REFERENCES public.provider_checkins(id) ON DELETE CASCADE;


--
-- Name: client_attributes client_attributes_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_attributes
    ADD CONSTRAINT client_attributes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_notes client_notes_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_notes
    ADD CONSTRAINT client_notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: client_notes client_notes_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_notes
    ADD CONSTRAINT client_notes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: client_notes client_notes_referral_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_notes
    ADD CONSTRAINT client_notes_referral_id_fkey FOREIGN KEY (referral_id) REFERENCES public.referrals(id);


--
-- Name: client_notes client_notes_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_notes
    ADD CONSTRAINT client_notes_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id);


--
-- Name: clients clients_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id);


--
-- Name: consent_records consent_records_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_records
    ADD CONSTRAINT consent_records_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: consent_records consent_records_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_records
    ADD CONSTRAINT consent_records_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.users(id);


--
-- Name: demographic_invitations demographic_invitations_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demographic_invitations
    ADD CONSTRAINT demographic_invitations_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: demographic_invitations demographic_invitations_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demographic_invitations
    ADD CONSTRAINT demographic_invitations_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.users(id);


--
-- Name: email_log email_log_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_log
    ADD CONSTRAINT email_log_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.users(id);


--
-- Name: email_log email_log_related_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_log
    ADD CONSTRAINT email_log_related_client_id_fkey FOREIGN KEY (related_client_id) REFERENCES public.clients(id);


--
-- Name: email_log email_log_related_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_log
    ADD CONSTRAINT email_log_related_invoice_id_fkey FOREIGN KEY (related_invoice_id) REFERENCES public.invoices(id);


--
-- Name: email_log email_log_related_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_log
    ADD CONSTRAINT email_log_related_report_id_fkey FOREIGN KEY (related_report_id) REFERENCES public.reports(id);


--
-- Name: facilities facilities_county_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT facilities_county_id_fkey FOREIGN KEY (county_id) REFERENCES public.counties(id);


--
-- Name: facilities facilities_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT facilities_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id);


--
-- Name: facility_attributes facility_attributes_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_attributes
    ADD CONSTRAINT facility_attributes_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE;


--
-- Name: facility_servicing_counties facility_servicing_counties_county_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_servicing_counties
    ADD CONSTRAINT facility_servicing_counties_county_id_fkey FOREIGN KEY (county_id) REFERENCES public.counties(id) ON DELETE CASCADE;


--
-- Name: facility_servicing_counties facility_servicing_counties_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_servicing_counties
    ADD CONSTRAINT facility_servicing_counties_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE;


--
-- Name: file_attachments file_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_attachments
    ADD CONSTRAINT file_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: referrals fk_referrals_client; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT fk_referrals_client FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: housing_survey_entries housing_survey_entries_survey_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.housing_survey_entries
    ADD CONSTRAINT housing_survey_entries_survey_id_fkey FOREIGN KEY (survey_id) REFERENCES public.housing_surveys(id) ON DELETE CASCADE;


--
-- Name: housing_survey_narr_levels housing_survey_narr_levels_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.housing_survey_narr_levels
    ADD CONSTRAINT housing_survey_narr_levels_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.housing_survey_entries(id) ON DELETE CASCADE;


--
-- Name: housing_survey_types housing_survey_types_survey_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.housing_survey_types
    ADD CONSTRAINT housing_survey_types_survey_id_fkey FOREIGN KEY (survey_id) REFERENCES public.housing_surveys(id) ON DELETE CASCADE;


--
-- Name: housing_surveys housing_surveys_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.housing_surveys
    ADD CONSTRAINT housing_surveys_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id);


--
-- Name: invoice_attributes invoice_attributes_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_attributes
    ADD CONSTRAINT invoice_attributes_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id);


--
-- Name: invoices invoices_submitter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_submitter_id_fkey FOREIGN KEY (submitter_id) REFERENCES public.users(id);


--
-- Name: kyae_referral_attributes kyae_referral_attributes_kyae_referral_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyae_referral_attributes
    ADD CONSTRAINT kyae_referral_attributes_kyae_referral_id_fkey FOREIGN KEY (kyae_referral_id) REFERENCES public.kyae_referrals(id) ON DELETE CASCADE;


--
-- Name: kyae_referrals kyae_referrals_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyae_referrals
    ADD CONSTRAINT kyae_referrals_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: kyae_referrals kyae_referrals_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyae_referrals
    ADD CONSTRAINT kyae_referrals_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id);


--
-- Name: message_read_status message_read_status_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_read_status
    ADD CONSTRAINT message_read_status_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id);


--
-- Name: message_read_status message_read_status_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_read_status
    ADD CONSTRAINT message_read_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: messages messages_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id);


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: provider_calendar provider_calendar_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_calendar
    ADD CONSTRAINT provider_calendar_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id);


--
-- Name: provider_checkins provider_checkins_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_checkins
    ADD CONSTRAINT provider_checkins_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id);


--
-- Name: provider_contracts provider_contracts_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_contracts
    ADD CONSTRAINT provider_contracts_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id);


--
-- Name: questionnaire_answer_options questionnaire_answer_options_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_answer_options
    ADD CONSTRAINT questionnaire_answer_options_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questionnaire_questions(id) ON DELETE CASCADE;


--
-- Name: questionnaire_responses questionnaire_responses_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_responses
    ADD CONSTRAINT questionnaire_responses_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questionnaire_questions(id);


--
-- Name: questionnaire_responses questionnaire_responses_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_responses
    ADD CONSTRAINT questionnaire_responses_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.questionnaire_submissions(id) ON DELETE CASCADE;


--
-- Name: questionnaire_submissions questionnaire_submissions_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_submissions
    ADD CONSTRAINT questionnaire_submissions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: questionnaire_submissions questionnaire_submissions_referral_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_submissions
    ADD CONSTRAINT questionnaire_submissions_referral_id_fkey FOREIGN KEY (referral_id) REFERENCES public.referrals(id);


--
-- Name: questionnaire_submissions questionnaire_submissions_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_submissions
    ADD CONSTRAINT questionnaire_submissions_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- Name: referral_activity_log referral_activity_log_referral_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_activity_log
    ADD CONSTRAINT referral_activity_log_referral_id_fkey FOREIGN KEY (referral_id) REFERENCES public.referrals(id);


--
-- Name: referral_activity_log referral_activity_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_activity_log
    ADD CONSTRAINT referral_activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: referral_attributes referral_attributes_referral_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_attributes
    ADD CONSTRAINT referral_attributes_referral_id_fkey FOREIGN KEY (referral_id) REFERENCES public.referrals(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_case_navigator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_case_navigator_id_fkey FOREIGN KEY (case_navigator_id) REFERENCES public.users(id);


--
-- Name: referrals referrals_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: referrals referrals_originating_county_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_originating_county_id_fkey FOREIGN KEY (originating_county_id) REFERENCES public.counties(id);


--
-- Name: referrals referrals_provider_recommendation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_provider_recommendation_id_fkey FOREIGN KEY (provider_recommendation_id) REFERENCES public.facilities(id);


--
-- Name: referrals referrals_state_assessor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_state_assessor_id_fkey FOREIGN KEY (state_assessor_id) REFERENCES public.users(id);


--
-- Name: report_attributes report_attributes_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_attributes
    ADD CONSTRAINT report_attributes_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: report_tracking report_tracking_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_tracking
    ADD CONSTRAINT report_tracking_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: report_tracking report_tracking_final_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_tracking
    ADD CONSTRAINT report_tracking_final_report_id_fkey FOREIGN KEY (final_report_id) REFERENCES public.reports(id);


--
-- Name: report_tracking report_tracking_forty_two_day_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_tracking
    ADD CONSTRAINT report_tracking_forty_two_day_report_id_fkey FOREIGN KEY (forty_two_day_report_id) REFERENCES public.reports(id);


--
-- Name: report_tracking report_tracking_fourteen_day_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_tracking
    ADD CONSTRAINT report_tracking_fourteen_day_report_id_fkey FOREIGN KEY (fourteen_day_report_id) REFERENCES public.reports(id);


--
-- Name: report_tracking report_tracking_ninety_day_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_tracking
    ADD CONSTRAINT report_tracking_ninety_day_report_id_fkey FOREIGN KEY (ninety_day_report_id) REFERENCES public.reports(id);


--
-- Name: report_tracking report_tracking_one_eighty_day_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_tracking
    ADD CONSTRAINT report_tracking_one_eighty_day_report_id_fkey FOREIGN KEY (one_eighty_day_report_id) REFERENCES public.reports(id);


--
-- Name: report_tracking report_tracking_three_sixty_day_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_tracking
    ADD CONSTRAINT report_tracking_three_sixty_day_report_id_fkey FOREIGN KEY (three_sixty_day_report_id) REFERENCES public.reports(id);


--
-- Name: report_tracking report_tracking_two_seventy_day_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_tracking
    ADD CONSTRAINT report_tracking_two_seventy_day_report_id_fkey FOREIGN KEY (two_seventy_day_report_id) REFERENCES public.reports(id);


--
-- Name: reports reports_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: reports reports_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id);


--
-- Name: reports reports_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id);


--
-- Name: reports reports_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- Name: staff_development staff_development_attendee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_development
    ADD CONSTRAINT staff_development_attendee_id_fkey FOREIGN KEY (attendee_id) REFERENCES public.users(id);


--
-- Name: support_tickets support_tickets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: trainings trainings_attendee_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainings
    ADD CONSTRAINT trainings_attendee_user_id_fkey FOREIGN KEY (attendee_user_id) REFERENCES public.users(id);


--
-- Name: trainings trainings_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainings
    ADD CONSTRAINT trainings_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id);


--
-- Name: user_counties user_counties_county_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_counties
    ADD CONSTRAINT user_counties_county_id_fkey FOREIGN KEY (county_id) REFERENCES public.counties(id) ON DELETE CASCADE;


--
-- Name: user_counties user_counties_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_counties
    ADD CONSTRAINT user_counties_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_facilities user_facilities_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_facilities
    ADD CONSTRAINT user_facilities_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE;


--
-- Name: user_facilities user_facilities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_facilities
    ADD CONSTRAINT user_facilities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id);


--
-- Name: users users_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id);


--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: questionnaire_responses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;

--
-- Name: questionnaire_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.questionnaire_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: referrals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

--
-- Name: reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict Ebuf7HUp4D8GnD2dDlUdfI36ICfUNqe6XWdXdBSn3arMTgPMdHfGZS5X8ysUXe0

