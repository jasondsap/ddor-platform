'use client';

/**
 * Public demographic-update form. Rendered inside the /demographic/invite/[token]
 * page. POSTs to /api/demographic-invitations/[token]/respond.
 *
 * Mirrors the field set from app/demographic/new/page.tsx (staff path) but:
 *   - No participant picker — token resolves the client server-side
 *   - No Header / no auth
 *   - Pre-filled from current client data passed in `initial`
 *   - Wording is participant-facing
 */

import { useState } from 'react';

const GENDER = ['Male', 'Female'];
const RACE_ETHNICITY = ['White', 'Black/African American', 'Hispanic/Latino', 'Asian', 'Native American/Alaskan', 'Pacific Islander or Hawaiian', 'Multiple Races', 'Other'];
const CONTACT_METHOD = ['Cell Phone', 'Home Phone', 'Text', 'Email'];
const VETERAN_OPTIONS = ['Yes', 'No'];
const LIVING_SITUATION = [
    'Housed - Own/Rental Apartment, Room, Trailer, or House',
    'Housed - Dormitory/College Residence',
    'Housed - Transitional Housing/Recovery Housing',
    'Housed - 90 day+ Residential Treatment',
    'Currently residing in KRHN Certified Recovery Housing',
    'Homeless - Residing in Public place not meant for habitation',
    'Homeless - Residing in Shelter, hotel/motel',
    'Homeless - Currently in inpatient/residential treatment (<90 days)',
    'Unstable Housing: Couch Surfing',
    'Unstable Housing: Moved 2+ times in last 60 days',
    'Living with family or Partner',
    'Other',
];
const EMPLOYMENT = [
    'Employed - full-time (35 hours+)', 'Employed - part-time',
    'Unemployed, but looking for work', 'Unemployed, not looking for work',
    'SSI/Disability - not employed', 'SSI/Disability - employed part-time',
    'Retired', 'Not in Labor Force', 'Unknown',
];
const EDUCATION = ['No Schooling', 'Less than 12th Grade', 'High School or GED', 'Vocational/Technical Diploma', 'Some College', 'Two-Year Degree', "Bachelor's Degree", 'Graduate Degree'];
const ENROLLMENT = ['Not enrolled', 'Enrolled, Full-time', 'Enrolled, Part-time'];
const INSURANCE = ['Medicaid', 'Medicare', 'Medicare/Medicaid', 'Private Insurance (you are policy holder)', 'Private Insurance (family member is policy holder)', 'VA/Tricare/Champus', 'Unsure'];

export interface DemographicInitial {
    first_name: string;
    last_name: string;
    nickname: string;
    date_of_birth: string;
    gender: string;
    race_ethnicity: string;
    race_other: string;
    veteran: string;
    street_address: string;
    apt_suite: string;
    city: string;
    county: string;
    zip: string;
    phone_primary: string;
    has_alternate_phone: string;
    phone_alternate: string;
    email: string;
    preferred_contact: string;
    emergency_name: string;
    emergency_phone: string;
    emergency_relation: string;
    living_situation: string;
    employment_status: string;
    education_level: string;
    enrollment_status: string;
    insurance_type: string;
    insurance_id: string;
}

interface FormProps {
    token: string;
    initial: DemographicInitial;
}

export function DemographicInviteForm({ token, initial }: FormProps) {
    const [form, setForm] = useState<DemographicInitial>(initial);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const u = <K extends keyof DemographicInitial>(k: K, v: DemographicInitial[K]) => {
        setForm(prev => ({ ...prev, [k]: v }));
        setError('');
    };

    const handleSubmit = async () => {
        if (!form.first_name.trim() || !form.last_name.trim()) {
            setError('Please provide your first and last name.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const res = await fetch(`/api/demographic-invitations/${token}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (!res.ok) {
                let msg = 'Submission failed. Please try again.';
                try {
                    const data = await res.json();
                    if (data?.reason === 'expired') msg = 'This link has expired. Please contact your provider for a new one.';
                    else if (data?.reason === 'already_completed') msg = 'This update has already been submitted. Thank you.';
                    else if (data?.reason === 'superseded') msg = 'A newer link has replaced this one. Please use the most recent message.';
                } catch { /* keep default */ }
                setError(msg);
                setSaving(false);
                return;
            }
            setSuccess(true);
        } catch {
            setError('Network error. Please check your connection and try again.');
            setSaving(false);
        }
    };

    if (success) {
        return (
            <div>
                <h1 style={{ color: '#0e7c66', fontSize: '22px', margin: '0 0 12px 0' }}>
                    Thank you — your information has been updated
                </h1>
                <p style={{ color: '#374151', lineHeight: '24px', fontSize: '15px' }}>
                    We've recorded the changes you submitted. There's nothing more to do.
                </p>
            </div>
        );
    }

    return (
        <div>
            <h1 style={titleStyle}>Please review your information</h1>
            <p style={leadStyle}>
                Please verify the information below and update anything that's changed.
                When you're done, click "Submit Update" at the bottom.
            </p>

            {error && <div style={errorStyle}>{error}</div>}

            <Section title="Personal Information">
                <Grid cols={3}>
                    <Input label="First Name *" value={form.first_name} onChange={v => u('first_name', v)} />
                    <Input label="Last Name *" value={form.last_name} onChange={v => u('last_name', v)} />
                    <Input label="Nickname / Alias" value={form.nickname} onChange={v => u('nickname', v)} />
                    <Input label="Date of Birth" type="date" value={form.date_of_birth} onChange={v => u('date_of_birth', v)} />
                    <Select label="Gender" value={form.gender} onChange={v => u('gender', v)} options={GENDER} />
                    <Select label="Race / Ethnicity" value={form.race_ethnicity} onChange={v => u('race_ethnicity', v)} options={RACE_ETHNICITY} />
                    {form.race_ethnicity === 'Other' && (
                        <Input label="Race (Other)" value={form.race_other} onChange={v => u('race_other', v)} />
                    )}
                    <Select label="Veteran" value={form.veteran} onChange={v => u('veteran', v)} options={VETERAN_OPTIONS} />
                </Grid>
            </Section>

            <Section title="Address & Contact">
                <Grid cols={3}>
                    <span style={{ gridColumn: 'span 2' }}>
                        <Input label="Street Address" value={form.street_address} onChange={v => u('street_address', v)} />
                    </span>
                    <Input label="Apt / Suite" value={form.apt_suite} onChange={v => u('apt_suite', v)} />
                    <Input label="City" value={form.city} onChange={v => u('city', v)} />
                    <Input label="County" value={form.county} onChange={v => u('county', v)} />
                    <Input label="Zip" value={form.zip} onChange={v => u('zip', v)} />
                    <Input label="Primary Phone" type="tel" value={form.phone_primary} onChange={v => u('phone_primary', v)} />
                    <Select label="Has Alternate Phone" value={form.has_alternate_phone} onChange={v => u('has_alternate_phone', v)} options={['Yes', 'No']} />
                    {form.has_alternate_phone === 'Yes' && (
                        <Input label="Alternate Phone" type="tel" value={form.phone_alternate} onChange={v => u('phone_alternate', v)} />
                    )}
                    <Input label="Email" type="email" value={form.email} onChange={v => u('email', v)} />
                    <Select label="Preferred Contact Method" value={form.preferred_contact} onChange={v => u('preferred_contact', v)} options={CONTACT_METHOD} />
                </Grid>
            </Section>

            <Section title="Emergency Contact">
                <Grid cols={3}>
                    <Input label="Name" value={form.emergency_name} onChange={v => u('emergency_name', v)} />
                    <Input label="Phone" type="tel" value={form.emergency_phone} onChange={v => u('emergency_phone', v)} />
                    <Input label="Relationship" value={form.emergency_relation} onChange={v => u('emergency_relation', v)} />
                </Grid>
            </Section>

            <Section title="Current Status">
                <Grid cols={2}>
                    <Select label="Living Situation" value={form.living_situation} onChange={v => u('living_situation', v)} options={LIVING_SITUATION} />
                    <Select label="Employment" value={form.employment_status} onChange={v => u('employment_status', v)} options={EMPLOYMENT} />
                    <Select label="Highest Education" value={form.education_level} onChange={v => u('education_level', v)} options={EDUCATION} />
                    <Select label="School Enrollment" value={form.enrollment_status} onChange={v => u('enrollment_status', v)} options={ENROLLMENT} />
                    <Select label="Insurance" value={form.insurance_type} onChange={v => u('insurance_type', v)} options={INSURANCE} />
                    <Input label="Insurance Policy ID" value={form.insurance_id} onChange={v => u('insurance_id', v)} />
                </Grid>
            </Section>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button type="button" onClick={handleSubmit} disabled={saving} style={primaryButtonStyle}>
                    {saving ? 'Submitting…' : 'Submit Update'}
                </button>
            </div>
        </div>
    );
}

// ---- tiny UI primitives, inline-styled to match the /consent page look ----

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section style={{ marginBottom: 28 }}>
            <h2 style={sectionTitleStyle}>{title}</h2>
            {children}
        </section>
    );
}

function Grid({ cols, children }: { cols: 2 | 3; children: React.ReactNode }) {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: 12,
        }}>
            {children}
        </div>
    );
}

function Input({ label, value, onChange, type = 'text' }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
}) {
    return (
        <label style={fieldLabelStyle}>
            <span style={fieldLabelTextStyle}>{label}</span>
            <input type={type} value={value} onChange={e => onChange(e.target.value)} style={inputStyle} />
        </label>
    );
}

function Select({ label, value, onChange, options }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: string[];
}) {
    return (
        <label style={fieldLabelStyle}>
            <span style={fieldLabelTextStyle}>{label}</span>
            <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
                <option value="">— Select —</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        </label>
    );
}

const titleStyle: React.CSSProperties = {
    color: '#0f3a5c', fontSize: 22, margin: '0 0 8px 0', fontWeight: 700,
};
const leadStyle: React.CSSProperties = {
    color: '#374151', lineHeight: '22px', fontSize: 14, margin: '0 0 20px 0',
};
const sectionTitleStyle: React.CSSProperties = {
    color: '#0f3a5c', fontSize: 15, fontWeight: 600, margin: '0 0 10px 0',
};
const fieldLabelStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: 4,
};
const fieldLabelTextStyle: React.CSSProperties = {
    color: '#374151', fontSize: 12, fontWeight: 500,
};
const inputStyle: React.CSSProperties = {
    border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px',
    fontSize: 14, color: '#1f2937', backgroundColor: '#ffffff',
};
const errorStyle: React.CSSProperties = {
    background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b',
    padding: '10px 14px', borderRadius: 6, fontSize: 14, marginBottom: 16,
};
const primaryButtonStyle: React.CSSProperties = {
    backgroundColor: '#1a73a8', color: '#ffffff', fontWeight: 600,
    fontSize: 14, padding: '12px 28px', borderRadius: 6, border: 'none',
    cursor: 'pointer',
};
