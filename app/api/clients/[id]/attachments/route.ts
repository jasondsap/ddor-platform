/**
 * GET  /api/clients/[id]/attachments[?include_archived=true]
 *      List attachments for a client. Filters is_archived=false by default.
 *
 * POST /api/clients/[id]/attachments
 *      Multipart upload. Fields: file, category, description?
 *      Validates size, MIME, category, and (when category='other') description.
 *      Uploads to S3, then inserts the DB row. Best-effort S3 cleanup if the
 *      DB insert fails after the upload succeeds.
 *
 * Both gated by requireClientAccess.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requireClientAccess } from '@/lib/auth';
import { query, queryOne, validateUUID, logAuditEvent } from '@/lib/db';
import { uploadToS3, deleteFromS3 } from '@/lib/s3';

export const runtime = 'nodejs';

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_MIME = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/heif',
]);
const ALLOWED_CATEGORIES = new Set([
    'legal_agreement',
    'consent_release_of_information',
    'consent_to_treat',
    'consent_email_text',
    'referral_to_case_navigator',
    'other',
]);

/**
 * Make a filename safe for an S3 key and for storage. Strips path traversal,
 * normalizes whitespace to underscores, drops disallowed chars, collapses
 * repeats, truncates. Never returns empty — if the input strips down to
 * nothing, returns 'attachment'.
 */
function sanitizeFilename(input: string): string {
    if (!input) return 'attachment';
    let s = input
        .replace(/[\\/]/g, '')        // drop any path separators
        .replace(/\.\.+/g, '.')        // collapse repeated dots
        .replace(/\s+/g, '_')          // whitespace → underscore
        .replace(/[^a-zA-Z0-9._-]/g, '') // drop anything else
        .replace(/_+/g, '_')           // collapse runs of underscores
        .replace(/^[._-]+/, '')        // strip leading dots / dashes / underscores
        .slice(0, 200);
    return s.length > 0 ? s : 'attachment';
}

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const clientId = params.id;
    if (!clientId || !validateUUID(clientId)) {
        return NextResponse.json({ error: 'Invalid client id' }, { status: 400 });
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

    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get('include_archived') === 'true';

    try {
        const sql = includeArchived
            ? `SELECT a.*, u.first_name || ' ' || u.last_name AS uploaded_by_name
               FROM client_attachments a
               LEFT JOIN users u ON a.uploaded_by = u.id
               WHERE a.client_id = $1
               ORDER BY a.uploaded_at DESC`
            : `SELECT a.*, u.first_name || ' ' || u.last_name AS uploaded_by_name
               FROM client_attachments a
               LEFT JOIN users u ON a.uploaded_by = u.id
               WHERE a.client_id = $1 AND a.is_archived = false
               ORDER BY a.uploaded_at DESC`;
        const attachments = await query(sql, [clientId]);
        return NextResponse.json({ attachments });
    } catch (err) {
        console.error('[attachments] list error', err);
        return NextResponse.json({ error: 'Failed to list attachments' }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const clientId = params.id;
    if (!clientId || !validateUUID(clientId)) {
        return NextResponse.json({ error: 'Invalid client id' }, { status: 400 });
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

    // --- Parse multipart body ---------------------------------------------
    let formData: FormData;
    try {
        formData = await req.formData();
    } catch {
        return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 });
    }

    const fileEntry = formData.get('file');
    const category = String(formData.get('category') ?? '');
    const description = formData.get('description');
    const descriptionStr = typeof description === 'string' ? description.trim() : '';

    if (!(fileEntry instanceof File)) {
        return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }
    if (!ALLOWED_CATEGORIES.has(category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }
    if (category === 'other' && descriptionStr.length === 0) {
        return NextResponse.json({ error: 'description is required when category is "other"' }, { status: 400 });
    }
    if (fileEntry.size > MAX_BYTES) {
        return NextResponse.json({ error: `File exceeds 25MB limit (${fileEntry.size} bytes)` }, { status: 413 });
    }
    if (fileEntry.size === 0) {
        return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(fileEntry.type)) {
        return NextResponse.json({
            error: `Unsupported file type: ${fileEntry.type || 'unknown'}. Allowed: PDF, JPEG, PNG, HEIC.`,
        }, { status: 415 });
    }

    const safeName = sanitizeFilename(fileEntry.name);
    const attachmentId = randomUUID();
    const s3Key = `clients/${clientId}/${attachmentId}/${safeName}`;

    // --- Upload to S3 first -----------------------------------------------
    let bytes: Buffer;
    try {
        const ab = await fileEntry.arrayBuffer();
        bytes = Buffer.from(ab);
        await uploadToS3(s3Key, bytes, fileEntry.type);
    } catch (err) {
        console.error('[attachments] S3 upload failed', err);
        return NextResponse.json(
            { error: 'Failed to store file. Please try again.' },
            { status: 500 }
        );
    }

    // --- Insert DB row. On failure, best-effort delete the S3 object. -----
    try {
        const inserted = await queryOne<any>(
            `INSERT INTO client_attachments (
                id, client_id, category, description, file_name, file_size_bytes,
                mime_type, s3_key, uploaded_by
             ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9::uuid)
             RETURNING *`,
            [
                attachmentId,
                clientId,
                category,
                category === 'other' ? descriptionStr : (descriptionStr || null),
                safeName,
                fileEntry.size,
                fileEntry.type,
                s3Key,
                session.ddor.userId,
            ]
        );

        await logAuditEvent(
            session.ddor.userId,
            'create',
            'client_attachments',
            attachmentId,
            undefined,
            { client_id: clientId, category, file_name: safeName, size: fileEntry.size }
        );

        return NextResponse.json({ success: true, attachment: inserted }, { status: 201 });
    } catch (err) {
        console.error('[attachments] DB insert failed after S3 upload — cleaning up', err);
        try {
            await deleteFromS3(s3Key);
        } catch (cleanupErr) {
            console.error('[attachments] S3 cleanup also failed; orphan object remains', { s3Key, cleanupErr });
        }
        return NextResponse.json(
            { error: 'Failed to record attachment.' },
            { status: 500 }
        );
    }
}
