-- Phase 1 (consent architecture)
-- Creates the immutable legal artifact table for signed consent documents.
-- Per docs/consent-architecture.md §3.1.

CREATE TABLE IF NOT EXISTS consent_documents (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                UUID NOT NULL REFERENCES clients(id),

  -- What was signed
  document_type            VARCHAR(40) NOT NULL
    CHECK (document_type IN ('informed_consent','roi','communication')),
  document_version         VARCHAR(20) NOT NULL,
  submission_id            UUID REFERENCES questionnaire_submissions(id),

  -- Signature capture
  signed_name              TEXT NOT NULL,
  signed_dob               DATE,
  signed_address           TEXT,
  signed_today_date        DATE,
  signed_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  signed_ip                INET,
  signed_user_agent        TEXT,

  -- Legal artifact
  pdf_s3_key               TEXT NOT NULL,
  pdf_sha256               TEXT,

  -- Provenance
  administered_by          VARCHAR(20) NOT NULL
    CHECK (administered_by IN ('staff','self_service')),
  administered_by_user_id  UUID REFERENCES users(id),
  invitation_id            UUID REFERENCES assessment_invitations(id),

  -- Lifecycle
  expires_at               TIMESTAMPTZ,
  revoked_at               TIMESTAMPTZ,
  revoked_reason           TEXT,
  revoked_by_user_id       UUID REFERENCES users(id),

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT consent_provenance_chk CHECK (
    (administered_by = 'staff'         AND administered_by_user_id IS NOT NULL) OR
    (administered_by = 'self_service'  AND invitation_id           IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_consent_documents_client
  ON consent_documents(client_id, document_type);

CREATE INDEX IF NOT EXISTS idx_consent_documents_active
  ON consent_documents(client_id, document_type)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_consent_documents_invitation
  ON consent_documents(invitation_id)
  WHERE invitation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_consent_documents_expiring
  ON consent_documents(expires_at)
  WHERE revoked_at IS NULL AND expires_at IS NOT NULL;
