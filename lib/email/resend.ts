/**
 * Resend wrapper for transactional email send.
 *
 * HIPAA NOTES:
 * - Requires a signed BAA with Resend (request via their support; they'll send
 *   one for paid accounts). Do NOT send anything containing PHI without it.
 * - The consent email contains no PHI (just a generic agreement statement and
 *   a token URL with no patient identifiers), so this path is the lowest-risk
 *   place to start.
 * - Sender domain (RESEND_FROM_EMAIL) must be verified in Resend with proper
 *   SPF/DKIM/DMARC records or messages will land in spam.
 */

import { Resend } from 'resend';

let _client: Resend | null = null;

function getClient(): Resend {
  if (_client) return _client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY must be set');
  _client = new Resend(apiKey);
  return _client;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  /** React Email rendered HTML */
  html: string;
  /** Plain text fallback (recommended for deliverability) */
  text: string;
  /**
   * The unsubscribe URL exposed via the List-Unsubscribe header.
   * Many email clients render a one-click unsubscribe button from this.
   * For consent revocation, point this at the decline URL.
   */
  listUnsubscribeUrl?: string;
}

export interface SendEmailResult {
  id: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) throw new Error('RESEND_FROM_EMAIL must be set');

  const headers: Record<string, string> = {};
  if (params.listUnsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${params.listUnsubscribeUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  const client = getClient();
  const result = await client.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    headers,
  });

  if (result.error) {
    throw new Error(`Resend send failed: ${result.error.message}`);
  }
  if (!result.data?.id) {
    throw new Error('Resend returned no message id');
  }
  return { id: result.data.id };
}

/**
 * Render a plain-text fallback for the consent email. Important for
 * deliverability — pure-HTML emails are penalized by spam filters.
 */
export function renderConsentEmailText(params: {
  consentText: string;
  yesUrl: string;
  noUrl: string;
  senderDisplayName: string;
}): string {
  return [
    `${params.senderDisplayName}`,
    '',
    'Permission request',
    '',
    params.consentText,
    '',
    `AGREE: ${params.yesUrl}`,
    `DECLINE: ${params.noUrl}`,
    '',
    'If you did not expect this message, you can ignore it.',
  ].join('\n');
}
