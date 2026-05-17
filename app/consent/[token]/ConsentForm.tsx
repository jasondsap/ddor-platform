'use client';

/**
 * Client-side form for the consent landing page. Renders the consent text
 * and AGREE/DECLINE buttons. POSTs to /api/consent/[token]/respond and
 * updates state in place.
 */

import { useState } from 'react';
import type { ConsentChannel } from '@/lib/consent/types';

export interface ConsentFormProps {
  token: string;
  consentText: string;
  channel: ConsentChannel;
  /** If the user came from a YES or NO link, prefer that as the default focus */
  intendedAction: 'grant' | 'decline' | null;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'submitting'; action: 'grant' | 'decline' }
  | { kind: 'done'; status: 'granted' | 'declined' }
  | { kind: 'error'; message: string };

export function ConsentForm({ token, consentText, channel, intendedAction }: ConsentFormProps) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });

  async function submit(action: 'grant' | 'decline') {
    setPhase({ kind: 'submitting', action });
    try {
      const res = await fetch(`/api/consent/${encodeURIComponent(token)}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const reason = typeof data?.reason === 'string' ? data.reason : 'unknown';
        const map: Record<string, string> = {
          not_found: 'This consent link is invalid or has been removed.',
          already_responded: 'A response has already been recorded for this link.',
          expired: 'This consent link has expired.',
          superseded: 'A newer consent request has replaced this one.',
        };
        setPhase({ kind: 'error', message: map[reason] ?? 'Unable to record your response. Please try again.' });
        return;
      }
      setPhase({ kind: 'done', status: data.status });
    } catch {
      setPhase({ kind: 'error', message: 'Network error. Please check your connection and try again.' });
    }
  }

  if (phase.kind === 'done') {
    const channelWord = channel === 'sms' ? 'text messages' : 'emails';
    if (phase.status === 'granted') {
      return (
        <div>
          <h1 style={titleSuccess}>Thank you</h1>
          <p style={paragraph}>
            You've agreed to receive {channelWord} from your provider. You can
            opt out at any time by replying STOP to a text message or by
            contacting your provider.
          </p>
        </div>
      );
    }
    return (
      <div>
        <h1 style={titleInfo}>You've opted out</h1>
        <p style={paragraph}>
          Your provider will not send you {channelWord}. If you change your
          mind, contact your provider to update your preferences.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={titleInfo}>Permission request</h1>
      <p style={paragraph}>{consentText}</p>

      {phase.kind === 'error' ? (
        <div style={errorBoxStyle}>{phase.message}</div>
      ) : null}

      <div style={buttonRowStyle}>
        <button
          type="button"
          onClick={() => submit('grant')}
          disabled={phase.kind === 'submitting'}
          style={{
            ...primaryButtonStyle,
            ...(intendedAction === 'grant' ? { boxShadow: '0 0 0 3px rgba(42,163,163,0.25)' } : {}),
          }}
          aria-label="Agree to receive messages"
        >
          {phase.kind === 'submitting' && phase.action === 'grant' ? 'Submitting…' : 'AGREE'}
        </button>
        <button
          type="button"
          onClick={() => submit('decline')}
          disabled={phase.kind === 'submitting'}
          style={{
            ...secondaryButtonStyle,
            ...(intendedAction === 'decline' ? { boxShadow: '0 0 0 3px rgba(15,58,92,0.25)' } : {}),
          }}
          aria-label="Decline to receive messages"
        >
          {phase.kind === 'submitting' && phase.action === 'decline' ? 'Submitting…' : 'DECLINE'}
        </button>
      </div>

      <p style={smallPrintStyle}>
        Sent by your provider through the DDOR platform. If you did not expect
        this message, you can safely ignore it or click DECLINE.
      </p>
    </div>
  );
}

// ---- styles -----------------------------------------------------------------

const titleSuccess: React.CSSProperties = {
  color: '#0e7c66',
  fontSize: '22px',
  margin: '0 0 12px 0',
};

const titleInfo: React.CSSProperties = {
  color: '#0f3a5c',
  fontSize: '22px',
  margin: '0 0 12px 0',
};

const paragraph: React.CSSProperties = {
  color: '#1f2937',
  lineHeight: '24px',
  fontSize: '15px',
  margin: '0 0 20px 0',
};

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  margin: '24px 0 16px 0',
  flexWrap: 'wrap',
};

const primaryButtonStyle: React.CSSProperties = {
  flex: '1 1 140px',
  padding: '14px 20px',
  background: '#2aa3a3',
  color: '#ffffff',
  border: 'none',
  borderRadius: '4px',
  fontSize: '14px',
  fontWeight: 700,
  letterSpacing: '0.5px',
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  flex: '1 1 140px',
  padding: '14px 20px',
  background: '#0f3a5c',
  color: '#ffffff',
  border: 'none',
  borderRadius: '4px',
  fontSize: '14px',
  fontWeight: 700,
  letterSpacing: '0.5px',
  cursor: 'pointer',
};

const smallPrintStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '8px 0 0 0',
};

const errorBoxStyle: React.CSSProperties = {
  background: '#fef2f2',
  color: '#b91c1c',
  border: '1px solid #fecaca',
  borderRadius: '4px',
  padding: '12px 14px',
  fontSize: '14px',
  margin: '0 0 12px 0',
};
