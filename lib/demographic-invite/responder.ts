/**
 * Process a demographic update submitted by the participant via the
 * tokenized link.
 *
 * Mirrors lib/consent/responder.ts. Differences:
 *   - Validates against demographic_invitations (not consent_records)
 *   - Creates a `reports` row (report_type='demographic') so the submission
 *     has parity with staff-submitted demographic reports
 *   - Calls applyDemographicReport (lib/demographic-report) to do the same
 *     sync + snapshot work
 *
 * No auth: the token IS the credential. IP + user agent are captured for
 * audit/integrity.
 */

import { sql, query, queryOne, insert, logAuditEvent } from '@/lib/db';
import { applyDemographicReport } from '@/lib/demographic-report';
import {
    DemographicInviteChannel,
    DemographicInviteRespondInput,
    DemographicInviteRespondResult,
    DemographicInviteStatus,
} from '@/lib/demographic-invite/types';

interface InvitationLookup {
    id: string;
    client_id: string;
    channel: DemographicInviteChannel;
    status: DemographicInviteStatus;
    expires_at: Date;
    sent_by: string | null;
}

export async function respondToDemographicInvite(
    input: DemographicInviteRespondInput
): Promise<DemographicInviteRespondResult> {
    const { token, body, ip, userAgent } = input;

    // 1. Lookup invitation by token
    const rows = (await sql`
        SELECT id, client_id, channel, status, expires_at, sent_by
        FROM demographic_invitations
        WHERE token = ${token}
        LIMIT 1
    `) as InvitationLookup[];
    const invite = rows[0];
    if (!invite) return { ok: false, reason: 'not_found' };

    // 2. State checks
    if (invite.status === 'completed') return { ok: false, reason: 'already_completed' };
    if (invite.status === 'superseded') return { ok: false, reason: 'superseded' };
    if (invite.status === 'expired' || new Date(invite.expires_at) < new Date()) {
        if (invite.status !== 'expired') {
            await sql`UPDATE demographic_invitations SET status = 'expired' WHERE id = ${invite.id}`;
        }
        return { ok: false, reason: 'expired' };
    }

    // 3. Build the reports row. Same shape as POST /api/reports for parity.
    const clientFacility = await queryOne<{ facility_id: string; provider_id: string | null }>(
        `SELECT c.facility_id, f.provider_id
         FROM clients c
         LEFT JOIN facilities f ON c.facility_id = f.id
         WHERE c.id = $1`,
        [invite.client_id]
    );

    const report = await insert('reports', {
        report_type: 'demographic',
        client_id: invite.client_id,
        facility_id: clientFacility?.facility_id ?? null,
        provider_id: clientFacility?.provider_id ?? null,
        // Attribute the submission to the staff who sent the invite, so this
        // shows up in their audit trail. NULL would be valid too if the FK
        // allows it, but linking to sent_by is more useful operationally.
        submitted_by: invite.sent_by,
        date_submitted: new Date().toISOString(),
        is_signed: true,
    });
    const reportId = (report as any).id;

    // 4. Apply the demographic logic (sync to clients + snapshot to report_attributes)
    await applyDemographicReport({
        reportId,
        clientId: invite.client_id,
        body,
    });

    // 5. Mark invitation completed with response provenance
    await sql`
        UPDATE demographic_invitations
        SET status = 'completed',
            completed_at = now(),
            response_ip = ${ip},
            response_user_agent = ${userAgent}
        WHERE id = ${invite.id}
    `;

    // 6. Audit. Recipient is not a logged-in user — user_id is null.
    //    The client_id and invitation id are in newValues for queryability.
    await logAuditEvent(
        null,
        'demographic_invite_completed',
        'demographic_invitations',
        invite.id,
        { status: 'pending' },
        {
            status: 'completed',
            client_id: invite.client_id,
            channel: invite.channel,
            report_id: reportId,
        },
        ip ?? undefined
    );

    return { ok: true, clientId: invite.client_id, reportId };
}
