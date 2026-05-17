/**
 * Shared types for consent operations.
 */

export type ConsentChannel = 'email' | 'sms';

export type ConsentStatus =
  | 'pending'
  | 'granted'
  | 'declined'
  | 'revoked'
  | 'expired'
  | 'superseded';

export type ClientCachedConsentStatus =
  | 'not_requested'
  | 'pending'
  | 'granted'
  | 'declined'
  | 'revoked'
  | 'expired';

export interface ConsentRecord {
  id: string;
  client_id: string;
  channel: ConsentChannel;
  status: ConsentStatus;
  token: string;
  expires_at: Date;
  recipient_address: string;
  consent_text: string;
  consent_version: string;
  sent_at: Date | null;
  send_provider_message_id: string | null;
  send_status: string | null;
  send_error: string | null;
  responded_at: Date | null;
  response_ip: string | null;
  response_user_agent: string | null;
  sent_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SendConsentInput {
  clientId: string;
  channel: ConsentChannel;
  /** Cognito user id of the staff member triggering the send */
  sentByUserId: string;
}

export interface SendConsentResult {
  consentRecordId: string;
  channel: ConsentChannel;
  /** false if the recipient address was missing, invalid, or comm provider failed */
  success: boolean;
  /** Human-readable message safe to display in admin UI */
  message: string;
  /** When success === true, the provider's message id (Twilio SID or Resend id) */
  providerMessageId?: string;
}

export interface ConsentResponseInput {
  token: string;
  action: 'grant' | 'decline';
  ip: string | null;
  userAgent: string | null;
}

export type ConsentResponseResult =
  | { ok: true; channel: ConsentChannel; status: 'granted' | 'declined' }
  | { ok: false; reason: 'not_found' | 'already_responded' | 'expired' | 'superseded' };
