-- Phase 1 (consent architecture)
-- Adds a CHECK constraint to assessment_invitations.questionnaire_type so the
-- consent flows can ride the same invitation table. The column is text and
-- currently unconstrained. Existing in-use values: 'barc_10', 'phq9_gad7'.
-- Per docs/consent-architecture.md §3.2.
--
-- Note: spec refers to "assessment_type" but the live column is named
-- questionnaire_type. Constraint guards that column.

ALTER TABLE assessment_invitations
  DROP CONSTRAINT IF EXISTS assessment_invitations_questionnaire_type_chk;

ALTER TABLE assessment_invitations
  ADD CONSTRAINT assessment_invitations_questionnaire_type_chk
  CHECK (questionnaire_type IN (
    'barc_10',
    'phq9_gad7',
    'informed_consent',
    'roi'
  ));
