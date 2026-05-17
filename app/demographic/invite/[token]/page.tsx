/**
 * /demographic/invite/[token]
 *
 * Public landing page for the participant to review + update their demographic
 * info. No auth — token is the credential. Server component does lookup +
 * pre-fill; client component (DemographicInviteForm) handles the form + POST.
 *
 * Pattern mirrors /consent/[token].
 */

import { sql } from '@/lib/db';
import { DemographicInviteForm, type DemographicInitial } from './DemographicInviteForm';

interface PageProps {
    params: { token: string };
}

interface InvitationRow {
    id: string;
    client_id: string;
    status: 'pending' | 'completed' | 'expired' | 'superseded';
    expires_at: Date;
}

interface ClientRow {
    id: string;
    first_name: string | null;
    last_name: string | null;
    nickname: string | null;
    date_of_birth: string | null;
    gender: string | null;
    race_ethnicity: string | null;
    race_other: string | null;
    veteran: string | null;
    street_address: string | null;
    apt_suite: string | null;
    city: string | null;
    county: string | null;
    zip: string | null;
    phone: string | null;
    has_alternate_phone: boolean | null;
    phone_alternate: string | null;
    email: string | null;
    preferred_contact: string | null;
    emergency_name: string | null;
    emergency_phone: string | null;
    emergency_relation: string | null;
    living_situation: string | null;
    employment_status: string | null;
    education_level: string | null;
    enrollment_status: string | null;
    insurance_type: string | null;
    insurance_id: string | null;
}

export const dynamic = 'force-dynamic';

export default async function DemographicInvitePage({ params }: PageProps) {
    const token = params.token;

    const rows = (await sql`
        SELECT id, client_id, status, expires_at
        FROM demographic_invitations
        WHERE token = ${token}
        LIMIT 1
    `) as InvitationRow[];
    const invite = rows[0];

    if (!invite) {
        return <Frame><Notice tone="error" title="Link not recognized">
            This update link is invalid or has been removed. If you believe this is a
            mistake, please contact your provider.
        </Notice></Frame>;
    }

    const isExpired =
        invite.status === 'expired' || new Date(invite.expires_at) < new Date();

    if (invite.status === 'completed') {
        return <Frame><Notice tone="success" title="Thank you — your update was received">
            We've recorded your latest information. There's nothing more to do.
            Please contact your provider if you need to make further changes.
        </Notice></Frame>;
    }
    if (invite.status === 'superseded') {
        return <Frame><Notice tone="info" title="A newer link was sent">
            This link has been replaced by a more recent one. Please check your most
            recent email or text message for the active link.
        </Notice></Frame>;
    }
    if (isExpired) {
        return <Frame><Notice tone="info" title="This link has expired">
            For your security, update links expire after 30 days. Please contact your
            provider to receive a new one.
        </Notice></Frame>;
    }

    // status === 'pending' — pre-fill from current client data and render the form
    const clientRows = (await sql`
        SELECT id, first_name, last_name, nickname, date_of_birth, gender,
               race_ethnicity, race_other, veteran,
               street_address, apt_suite, city, county, zip,
               phone, has_alternate_phone, phone_alternate, email, preferred_contact,
               emergency_name, emergency_phone, emergency_relation,
               living_situation, employment_status, education_level, enrollment_status,
               insurance_type, insurance_id
        FROM clients
        WHERE id = ${invite.client_id}
        LIMIT 1
    `) as ClientRow[];
    const client = clientRows[0];

    const initial: DemographicInitial = {
        first_name: client?.first_name ?? '',
        last_name: client?.last_name ?? '',
        nickname: client?.nickname ?? '',
        date_of_birth: client?.date_of_birth ? String(client.date_of_birth).split('T')[0] : '',
        gender: client?.gender ?? '',
        race_ethnicity: client?.race_ethnicity ?? '',
        race_other: client?.race_other ?? '',
        veteran: client?.veteran ?? '',
        street_address: client?.street_address ?? '',
        apt_suite: client?.apt_suite ?? '',
        city: client?.city ?? '',
        county: client?.county ?? '',
        zip: client?.zip ?? '',
        phone_primary: client?.phone ?? '',
        has_alternate_phone: client?.has_alternate_phone ? 'Yes' : 'No',
        phone_alternate: client?.phone_alternate ?? '',
        email: client?.email ?? '',
        preferred_contact: client?.preferred_contact ?? '',
        emergency_name: client?.emergency_name ?? '',
        emergency_phone: client?.emergency_phone ?? '',
        emergency_relation: client?.emergency_relation ?? '',
        living_situation: client?.living_situation ?? '',
        employment_status: client?.employment_status ?? '',
        education_level: client?.education_level ?? '',
        enrollment_status: client?.enrollment_status ?? '',
        insurance_type: client?.insurance_type ?? '',
        insurance_id: client?.insurance_id ?? '',
    };

    return (
        <Frame wide>
            <DemographicInviteForm token={token} initial={initial} />
        </Frame>
    );
}

// ---------------------------------------------------------------------------
// Layout helpers — same look as the consent landing page
// ---------------------------------------------------------------------------

function Frame({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
    return (
        <main style={frameStyle}>
            <div style={{ ...cardStyle, maxWidth: wide ? '760px' : '560px' }}>
                <header style={headerStyle}>
                    <div style={brandStyle}>DDOR — Behavioral Health CDP</div>
                </header>
                <div style={contentStyle}>{children}</div>
                <footer style={footerStyle}>
                    Behavioral Health Conditional Dismissal Program · Fletcher Group, Inc.
                </footer>
            </div>
        </main>
    );
}

function Notice({ tone, title, children }: {
    tone: 'success' | 'info' | 'error';
    title: string;
    children: React.ReactNode;
}) {
    const color =
        tone === 'success' ? '#0e7c66' :
        tone === 'error' ? '#b91c1c' : '#0f3a5c';
    return (
        <div>
            <h1 style={{ color, fontSize: '22px', margin: '0 0 12px 0' }}>{title}</h1>
            <p style={{ color: '#374151', lineHeight: '24px', fontSize: '15px' }}>{children}</p>
        </div>
    );
}

const frameStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#e6f1f6',
    padding: '32px 16px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const cardStyle: React.CSSProperties = {
    width: '100%',
    background: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
    background: '#0f3a5c',
    color: '#ffffff',
    padding: '16px 24px',
};

const brandStyle: React.CSSProperties = {
    fontWeight: 700,
    fontSize: '14px',
    letterSpacing: '0.3px',
};

const contentStyle: React.CSSProperties = {
    padding: '28px 24px',
};

const footerStyle: React.CSSProperties = {
    borderTop: '1px solid #e5e7eb',
    padding: '14px 24px',
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'center',
};
