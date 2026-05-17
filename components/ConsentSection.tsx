'use client';

/**
 * Communication Consent components.
 *
 * Exports:
 *   - <ConsentSection>      Right-pane content for the new "Communication" tab
 *   - <ConsentInfoItem>     Small chip for the info bar at the top of the page
 *
 * Both share consent status configuration and styling cues. Designed to drop
 * into the existing /clients/[id] client detail page alongside Tailwind
 * classes already in use (ddor-blue, ddor-navy, bg-white rounded-xl shadow-sm).
 */

import { useEffect, useState } from 'react';
import {
  Mail,
  MessageSquare,
  Send,
  RefreshCw,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
} from 'lucide-react';
import type { ClientCachedConsentStatus, ConsentChannel } from '@/lib/consent/types';

// ============================================================================
// Shared status configuration
// ============================================================================

interface StatusConfig {
  label: string;
  dotClass: string;
  textClass: string;
  pillBg: string;
  pillText: string;
  Icon: typeof CheckCircle2;
}

const STATUS_CONFIG: Record<ClientCachedConsentStatus, StatusConfig> = {
  not_requested: {
    label: 'Not requested',
    dotClass: 'bg-gray-300',
    textClass: 'text-gray-500',
    pillBg: 'bg-gray-100',
    pillText: 'text-gray-600',
    Icon: AlertCircle,
  },
  pending: {
    label: 'Pending',
    dotClass: 'bg-amber-400',
    textClass: 'text-amber-700',
    pillBg: 'bg-amber-50',
    pillText: 'text-amber-700',
    Icon: Clock,
  },
  granted: {
    label: 'Granted',
    dotClass: 'bg-green-500',
    textClass: 'text-green-700',
    pillBg: 'bg-green-50',
    pillText: 'text-green-700',
    Icon: CheckCircle2,
  },
  declined: {
    label: 'Declined',
    dotClass: 'bg-red-400',
    textClass: 'text-red-700',
    pillBg: 'bg-red-50',
    pillText: 'text-red-700',
    Icon: XCircle,
  },
  revoked: {
    label: 'Revoked',
    dotClass: 'bg-red-400',
    textClass: 'text-red-700',
    pillBg: 'bg-red-50',
    pillText: 'text-red-700',
    Icon: Ban,
  },
  expired: {
    label: 'Expired',
    dotClass: 'bg-gray-300',
    textClass: 'text-gray-500',
    pillBg: 'bg-gray-100',
    pillText: 'text-gray-500',
    Icon: AlertCircle,
  },
};

// ============================================================================
// <ConsentInfoItem> — for the top info bar
// ============================================================================
//
// Drops into the existing info bar grid alongside <InfoItem> for DOB,
// Diagnosis, etc. When clicked, calls onClick (parent should switch to the
// Communication tab so the user can manage state).

export interface ConsentInfoItemProps {
  channel: ConsentChannel;
  status: ClientCachedConsentStatus;
  onClick?: () => void;
}

export function ConsentInfoItem({ channel, status, onClick }: ConsentInfoItemProps) {
  const c = STATUS_CONFIG[status];
  const Icon = channel === 'email' ? Mail : MessageSquare;
  const label = channel === 'email' ? 'Email Consent' : 'Text Consent';

  const inner = (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 flex-shrink-0 text-gray-400" />
      <div className="min-w-0 text-left">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-sm font-medium flex items-center gap-1.5 ${c.textClass}`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${c.dotClass}`} />
          {c.label}
        </p>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="-mx-2 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors text-left"
        aria-label={`${label}: ${c.label}. Click to manage.`}
      >
        {inner}
      </button>
    );
  }
  return inner;
}

// ============================================================================
// <ConsentSection> — Communication tab content
// ============================================================================

export interface ConsentSectionProps {
  clientId: string;
  hasEmail: boolean;
  hasPhone: boolean;
  email: string | null;
  phoneNumber: string | null;
  emailConsentStatus: ClientCachedConsentStatus;
  smsConsentStatus: ClientCachedConsentStatus;
  emailGrantedAt: string | null;
  smsGrantedAt: string | null;
  emailRevokedAt: string | null;
  smsRevokedAt: string | null;
  /** Called after a successful send/revoke so the parent can refresh client state */
  onChanged?: () => void;
}

interface ConsentHistoryRow {
  id: string;
  channel: ConsentChannel;
  status: string;
  recipient_address: string;
  sent_at: string | null;
  responded_at: string | null;
  send_status: string | null;
  sent_by_first_name: string | null;
  sent_by_last_name: string | null;
  created_at: string;
}

type SendPhase =
  | { kind: 'idle' }
  | { kind: 'sending'; channel: ConsentChannel }
  | { kind: 'flash'; channel: ConsentChannel; tone: 'success' | 'error'; message: string };

export function ConsentSection(props: ConsentSectionProps) {
  const [history, setHistory] = useState<ConsentHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [phase, setPhase] = useState<SendPhase>({ kind: 'idle' });

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/clients/${props.clientId}/consent`);
      const data = await res.json();
      setHistory(data.records || []);
    } catch (err) {
      console.error('Failed to load consent history', err);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.clientId]);

  async function send(channel: ConsentChannel) {
    setPhase({ kind: 'sending', channel });
    try {
      const res = await fetch(`/api/clients/${props.clientId}/consent/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        setPhase({
          kind: 'flash',
          channel,
          tone: 'error',
          message: data?.message ?? data?.error ?? 'Send failed.',
        });
        return;
      }
      setPhase({ kind: 'flash', channel, tone: 'success', message: data.message });
      props.onChanged?.();
      loadHistory();
    } catch {
      setPhase({
        kind: 'flash',
        channel,
        tone: 'error',
        message: 'Network error. Please try again.',
      });
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="font-semibold text-ddor-navy mb-1 flex items-center gap-2">
        <MessageSquare className="w-5 h-5" /> Communication Consent
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        HIPAA/HITECH consent to send messages, questionnaires, and documents
        to this participant via email and text message.
      </p>

      {/* Channel cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <ChannelCard
          channel="email"
          status={props.emailConsentStatus}
          recipient={props.email}
          recipientLabel="Email address"
          available={props.hasEmail}
          unavailableHint="No email address on file. Add one to enable consent."
          grantedAt={props.emailGrantedAt}
          revokedAt={props.emailRevokedAt}
          isBusy={phase.kind === 'sending' && phase.channel === 'email'}
          flash={
            phase.kind === 'flash' && phase.channel === 'email'
              ? { tone: phase.tone, message: phase.message }
              : null
          }
          onSend={() => send('email')}
        />
        <ChannelCard
          channel="sms"
          status={props.smsConsentStatus}
          recipient={props.phoneNumber}
          recipientLabel="Phone number"
          available={props.hasPhone}
          unavailableHint="No phone number on file. Add one to enable consent."
          grantedAt={props.smsGrantedAt}
          revokedAt={props.smsRevokedAt}
          isBusy={phase.kind === 'sending' && phase.channel === 'sms'}
          flash={
            phase.kind === 'flash' && phase.channel === 'sms'
              ? { tone: phase.tone, message: phase.message }
              : null
          }
          onSend={() => send('sms')}
        />
      </div>

      {/* History */}
      <div className="border-t border-gray-100 pt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-ddor-navy">History</h3>
          <button
            type="button"
            onClick={loadHistory}
            className="text-xs text-ddor-blue hover:underline flex items-center gap-1"
            disabled={historyLoading}
          >
            <RefreshCw className={`w-3 h-3 ${historyLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <HistoryTable rows={history} loading={historyLoading} />
      </div>
    </div>
  );
}

// ============================================================================
// ChannelCard (internal)
// ============================================================================

interface ChannelCardProps {
  channel: ConsentChannel;
  status: ClientCachedConsentStatus;
  recipient: string | null;
  recipientLabel: string;
  available: boolean;
  unavailableHint: string;
  grantedAt: string | null;
  revokedAt: string | null;
  isBusy: boolean;
  flash: { tone: 'success' | 'error'; message: string } | null;
  onSend: () => void;
}

function ChannelCard({
  channel,
  status,
  recipient,
  recipientLabel,
  available,
  unavailableHint,
  grantedAt,
  revokedAt,
  isBusy,
  flash,
  onSend,
}: ChannelCardProps) {
  const c = STATUS_CONFIG[status];
  const ChannelIcon = channel === 'email' ? Mail : MessageSquare;
  const channelLabel = channel === 'email' ? 'Email' : 'Text Message (SMS)';

  const buttonLabel =
    status === 'granted'
      ? `Re-send consent ${channel === 'email' ? 'email' : 'text'}`
      : `Send consent ${channel === 'email' ? 'email' : 'text'}`;

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/40">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <ChannelIcon className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-ddor-navy">{channelLabel}</span>
        </div>
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${c.pillBg} ${c.pillText}`}
        >
          <c.Icon className="w-3 h-3" />
          {c.label}
        </span>
      </div>

      <div className="text-xs text-gray-500 mb-1">{recipientLabel}</div>
      <div className="text-sm text-gray-900 mb-3 break-all">
        {recipient || <span className="text-gray-400 italic">none on file</span>}
      </div>

      {grantedAt && status === 'granted' && (
        <p className="text-xs text-gray-500 mb-3">
          Granted on {new Date(grantedAt).toLocaleDateString()}
        </p>
      )}
      {revokedAt && status === 'revoked' && (
        <p className="text-xs text-gray-500 mb-3">
          Revoked on {new Date(revokedAt).toLocaleDateString()}
        </p>
      )}

      {!available && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1.5 mb-3">
          {unavailableHint}
        </p>
      )}

      {flash && (
        <p
          className={`text-xs rounded px-2 py-1.5 mb-3 ${
            flash.tone === 'success'
              ? 'text-green-700 bg-green-50 border border-green-100'
              : 'text-red-700 bg-red-50 border border-red-100'
          }`}
        >
          {flash.message}
        </p>
      )}

      <button
        type="button"
        onClick={onSend}
        disabled={!available || isBusy}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-ddor-blue text-white text-sm font-medium rounded-lg hover:bg-[#156090] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isBusy ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Sending…
          </>
        ) : (
          <>
            {status === 'granted' ? (
              <RefreshCw className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {buttonLabel}
          </>
        )}
      </button>
    </div>
  );
}

// ============================================================================
// HistoryTable (internal)
// ============================================================================

function HistoryTable({
  rows,
  loading,
}: {
  rows: ConsentHistoryRow[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-sm">Loading history…</span>
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        No consent activity yet.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-gray-400 border-b border-gray-100">
            <th className="px-2 py-2 font-medium">Channel</th>
            <th className="px-2 py-2 font-medium">Status</th>
            <th className="px-2 py-2 font-medium">Sent</th>
            <th className="px-2 py-2 font-medium">Responded</th>
            <th className="px-2 py-2 font-medium">By</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const cachedStatus =
              (r.status as ClientCachedConsentStatus) in STATUS_CONFIG
                ? (r.status as ClientCachedConsentStatus)
                : 'not_requested';
            const c = STATUS_CONFIG[cachedStatus];
            const ChannelIcon = r.channel === 'email' ? Mail : MessageSquare;
            const by =
              r.sent_by_first_name || r.sent_by_last_name
                ? `${r.sent_by_first_name ?? ''} ${r.sent_by_last_name ?? ''}`.trim()
                : '—';
            return (
              <tr key={r.id} className="border-b border-gray-50 last:border-0">
                <td className="px-2 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                    <ChannelIcon className="w-3.5 h-3.5 text-gray-400" />
                    {r.channel === 'email' ? 'Email' : 'SMS'}
                  </span>
                </td>
                <td className="px-2 py-2.5">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${c.pillBg} ${c.pillText}`}
                  >
                    <c.Icon className="w-3 h-3" />
                    {r.status === 'superseded' ? 'Superseded' : c.label}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-gray-600">
                  {r.sent_at ? new Date(r.sent_at).toLocaleString() : '—'}
                </td>
                <td className="px-2 py-2.5 text-gray-600">
                  {r.responded_at ? new Date(r.responded_at).toLocaleString() : '—'}
                </td>
                <td className="px-2 py-2.5 text-gray-600">{by}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
