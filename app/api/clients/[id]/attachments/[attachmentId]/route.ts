/**
 * GET    /api/clients/[id]/attachments/[attachmentId]
 *        Returns a short-lived presigned URL (5 min) for the S3 object.
 *        Verifies the row belongs to the URL's client id.
 *
 * DELETE /api/clients/[id]/attachments/[attachmentId]
 *        Soft delete: flips is_archived=true and stamps archived_at/by.
 *        S3 object stays in place. A Phase 2 cleanup job will reap objects
 *        whose row has been archived for more than 30 days.
 *        TODO(s3-cleanup): wire that job once the broader Phase 2 work lands.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireClientAccess } from '@/lib/auth';
import { query, queryOne, validateUUID, logAuditEvent } from '@/lib/db';
import { getPresignedDownloadUrl } from '@/lib/s3';

export const runtime = 'nodejs';

interface AttachmentRow {
    id: string;
    client_id: string;
    s3_key: string;
    file_name: string;
    mime_type: string;
    is_archived: boolean;
}

async function loadAndVerify(
    clientId: string,
    attachmentId: string
): Promise<AttachmentRow | null> {
    const row = await queryOne<AttachmentRow>(
        `SELECT id, client_id, s3_key, file_name, mime_type, is_archived
         FROM client_attachments
         WHERE id = $1::uuid`,
        [attachmentId]
    );
    if (!row) return null;
    // Defense in depth: reject if the row's client_id doesn't match the URL.
    // requireClientAccess already covers the access angle; this catches a
    // typo'd URL that would otherwise leak an attachment cross-client.
    if (row.client_id !== clientId) return null;
    return row;
}

export async function GET(
    _req: NextRequest,
    { params }: { params: { id: string; attachmentId: string } }
) {
    const { id: clientId, attachmentId } = params;
    if (!validateUUID(clientId) || !validateUUID(attachmentId)) {
        return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    try {
        await requireClientAccess(clientId);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unauthorized';
        const status =
            message === 'Client not found' ? 404 :
            message === 'Facility access denied' ? 403 : 401;
        return NextResponse.json({ error: message }, { status });
    }

    try {
        const row = await loadAndVerify(clientId, attachmentId);
        if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const url = await getPresignedDownloadUrl(row.s3_key, 300);
        return NextResponse.json({
            url,
            file_name: row.file_name,
            mime_type: row.mime_type,
            expires_in: 300,
        });
    } catch (err) {
        console.error('[attachments] presign error', err);
        return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: { id: string; attachmentId: string } }
) {
    const { id: clientId, attachmentId } = params;
    if (!validateUUID(clientId) || !validateUUID(attachmentId)) {
        return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    let session;
    try {
        session = await requireClientAccess(clientId);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unauthorized';
        const status =
            message === 'Client not found' ? 404 :
            message === 'Facility access denied' ? 403 : 401;
        return NextResponse.json({ error: message }, { status });
    }

    try {
        const row = await loadAndVerify(clientId, attachmentId);
        if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        if (row.is_archived) {
            return NextResponse.json({ success: true, alreadyArchived: true });
        }

        await query(
            `UPDATE client_attachments
             SET is_archived = true,
                 archived_at = NOW(),
                 archived_by = $1::uuid
             WHERE id = $2::uuid`,
            [session.ddor.userId, attachmentId]
        );

        await logAuditEvent(
            session.ddor.userId,
            'archive',
            'client_attachments',
            attachmentId,
            { is_archived: false },
            { is_archived: true, client_id: clientId }
        );

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[attachments] archive error', err);
        return NextResponse.json({ error: 'Failed to archive attachment' }, { status: 500 });
    }
}
