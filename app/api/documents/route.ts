import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAdmin } from '@/lib/auth';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET = process.env.S3_BUCKET || 'ddor-documents';
const REGION = process.env.APP_AWS_REGION || 'us-east-1';

function getS3Client() {
    return new S3Client({
        region: REGION,
        credentials: {
            accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY!,
        },
    });
}

// POST /api/documents — get presigned upload URL
export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        if (!isAdmin(session)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

        const body = await req.json();
        const { providerId, docType, filename, contentType } = body;

        if (!providerId || !docType || !filename) {
            return NextResponse.json({ error: 'providerId, docType, and filename are required' }, { status: 400 });
        }

        const allowedTypes = ['w9', 'baa', 'contract', 'ach'];
        if (!allowedTypes.includes(docType)) {
            return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
        }

        const key = `contracts/${providerId}/${docType}/${Date.now()}_${filename}`;
        const s3 = getS3Client();

        const command = new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            ContentType: contentType || 'application/pdf',
        });

        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min

        return NextResponse.json({ uploadUrl, key });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Error generating upload URL:', error);
        return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
    }
}

// GET /api/documents?key=xxx — get presigned download URL
export async function GET(req: NextRequest) {
    try {
        await requireAuth();
        const { searchParams } = new URL(req.url);
        const key = searchParams.get('key');

        if (!key) return NextResponse.json({ error: 'key is required' }, { status: 400 });

        const s3 = getS3Client();
        const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
        const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour

        return NextResponse.json({ downloadUrl });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Error generating download URL:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
