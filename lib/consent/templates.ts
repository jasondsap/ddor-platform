/**
 * Consent text templates.
 *
 * Phase 1: code-as-config (versioned constants).
 * Phase 2: planned migration to a Neon-backed templates table so Erin can
 * edit wording without a deploy. When that happens, the loader signature
 * stays the same — just the implementation changes.
 *
 * IMPORTANT: when text is sent to a recipient, the rendered string and its
 * version are SNAPSHOTTED into consent_records.consent_text and
 * consent_records.consent_version. Never reference live template text from
 * audit views — always read what was actually sent.
 *
 * If you change wording, BUMP THE VERSION. Old records keep referencing the
 * version they were sent under.
 */

export const COMMUNICATION_CONSENT_VERSION = 'v1.0' as const;

/**
 * Canonical HIPAA/HITECH communication consent language.
 * Matches the original DDOR phrasing for continuity with already-consented
 * participants.
 */
export const COMMUNICATION_CONSENT_TEXT =
  'I understand that in accordance with HIPAA and the HITECH Acts some ' +
  'personal information (name, phone number, email address) may be used ' +
  'and included in email and text exchanges. In accordance with my ' +
  "provider's office policies I agree to receive messages, questionnaires " +
  "and documents from my provider's electronic practice management software.";

/**
 * Friendly identification used in email subject and SMS prefix so recipients
 * recognize the sender. Update if the deployed brand name changes — but note
 * this is NOT versioned with the consent text since it's not part of the
 * legal record (it's framing, not content).
 */
export const SENDER_DISPLAY_NAME = 'DDOR — Behavioral Health CDP';

export interface RenderedConsentText {
  text: string;
  version: string;
}

/**
 * Returns the current consent text + version. Centralized so all sites
 * (email render, SMS render, audit display) get identical content.
 */
export function getCommunicationConsentText(): RenderedConsentText {
  return {
    text: COMMUNICATION_CONSENT_TEXT,
    version: COMMUNICATION_CONSENT_VERSION,
  };
}
