/**
 * Centralized S3 client wrapper.
 *
 * Two existing S3 use cases as of writing:
 *   - S3_BUCKET — provider contracts / documents (presigned-upload pattern in
 *     app/api/documents/route.ts; left untouched)
 *   - S3_ATTACHMENTS_BUCKET — participant attachments (this module, server-side
 *     upload via app/api/clients/[id]/attachments)
 *
 * Future S3 needs (report exports, consent doc storage) should funnel through
 * this module rather than instantiating their own S3Client.
 */

import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let _client: S3Client | null = null;

function getClient(): S3Client {
    if (_client) return _client;
    const region = process.env.APP_AWS_REGION || 'us-east-1';
    const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY;
    if (!accessKeyId || !secretAccessKey) {
        throw new Error('APP_AWS_ACCESS_KEY_ID and APP_AWS_SECRET_ACCESS_KEY must be set');
    }
    _client = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
    });
    return _client;
}

/** Resolve the participant-attachments bucket name. Throws if not configured. */
export function getAttachmentsBucket(): string {
    const bucket = process.env.S3_ATTACHMENTS_BUCKET;
    if (!bucket) {
        throw new Error('S3_ATTACHMENTS_BUCKET must be set');
    }
    return bucket;
}

/**
 * Upload a buffer to the attachments bucket with SSE-AES256.
 *
 * `bucket` defaults to the attachments bucket; pass a different one to write
 * to a non-default location.
 */
export async function uploadToS3(
    key: string,
    body: Buffer | Uint8Array,
    mimeType: string,
    bucket: string = getAttachmentsBucket()
): Promise<void> {
    const client = getClient();
    await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
    }));
}

/**
 * Generate a short-lived presigned GET URL. Default 5-minute expiry —
 * matches the participant-attachment download flow.
 */
export async function getPresignedDownloadUrl(
    key: string,
    expiresInSeconds: number = 300,
    bucket: string = getAttachmentsBucket()
): Promise<string> {
    const client = getClient();
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Delete an S3 object. Not called from the v1 upload/archive flow — soft-delete
 * leaves the object in place. A Phase 2 cleanup job will call this for objects
 * whose DB row has been is_archived=true for more than 30 days.
 */
export async function deleteFromS3(
    key: string,
    bucket: string = getAttachmentsBucket()
): Promise<void> {
    const client = getClient();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
