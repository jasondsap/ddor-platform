/**
 * /consent/[token]
 *
 * Public landing page for consent grant/decline. No auth — token is the
 * credential. Reads ?action=grant|decline from the URL to pre-select the
 * intended action (the link from the email/SMS includes one), but the user
 * still confirms with a click on this page.
 *
 * This is a server component for the data fetch, with a client component
 * (ConsentForm) handling the actual button click and POST.
 */

import { sql } from '@/lib/db';
import { ConsentForm } from './ConsentForm';
import type { ConsentChannel, ConsentStatus } from '@/lib/consent/types';

interface PageProps {
  params: { token: string };
  searchParams: { action?: string };
}

interface RecordRow {
  id: string;
  channel: ConsentChannel;
  status: ConsentStatus;
  expires_at: Date;
  consent_text: string;
}

export const dynamic = 'force-dynamic';

export default async function ConsentPage({ params, searchParams }: PageProps) {
  const token = params.token;
  const intendedAction =
    searchParams.action === 'decline' ? 'decline' :
    searchParams.action === 'grant' ? 'grant' : null;

  const rows = (await sql`
    SELECT id, channel, status, expires_at, consent_text
    FROM consent_records
    WHERE token = ${token}
    LIMIT 1
  `) as RecordRow[];
  const record = rows[0];

  if (!record) {
    return <Frame><Notice tone="error" title="Link not recognized">
      This consent link is invalid or has been removed. If you believe this
      is a mistake, please contact your provider.
    </Notice></Frame>;
  }

  const isExpired =
    record.status === 'expired' || new Date(record.expires_at) < new Date();

  if (record.status === 'granted') {
    return <Frame><Notice tone="success" title="You're already subscribed">
      You've previously agreed to receive messages, questionnaires, and
      documents from your provider via {channelWord(record.channel)}. No
      further action is needed.
    </Notice></Frame>;
  }

  if (record.status === 'declined') {
    return <Frame><Notice tone="info" title="You've opted out">
      You previously declined to receive messages via {channelWord(record.channel)}.
      Contact your provider if you'd like to change this.
    </Notice></Frame>;
  }

  if (record.status === 'revoked') {
    return <Frame><Notice tone="info" title="You've unsubscribed">
      You've previously unsubscribed from {channelWord(record.channel)} messages.
      Contact your provider if you'd like to re-subscribe.
    </Notice></Frame>;
  }

  if (record.status === 'superseded') {
    return <Frame><Notice tone="info" title="A newer request was sent">
      This request has been replaced by a more recent one. Please check your
      most recent {channelWord(record.channel)} for the active link.
    </Notice></Frame>;
  }

  if (isExpired) {
    return <Frame><Notice tone="info" title="This link has expired">
      For your security, consent links expire after 30 days. Please contact
      your provider to receive a new one.
    </Notice></Frame>;
  }

  // status === 'pending' and not expired — show the action form
  return (
    <Frame>
      <ConsentForm
        token={token}
        consentText={record.consent_text}
        channel={record.channel}
        intendedAction={intendedAction}
      />
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Layout helpers (server-rendered presentation only)
// ---------------------------------------------------------------------------

function channelWord(c: ConsentChannel): string {
  return c === 'sms' ? 'text message' : 'email';
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main style={frameStyle}>
      <div style={cardStyle}>
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

function Notice({
  tone,
  title,
  children,
}: {
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
      <p style={{ color: '#374151', lineHeight: '24px', fontSize: '15px' }}>
        {children}
      </p>
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
  maxWidth: '560px',
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
