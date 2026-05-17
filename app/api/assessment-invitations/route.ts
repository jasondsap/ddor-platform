import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireClientAccess } from '@/lib/auth';
import { query } from '@/lib/db';

// GET /api/assessment-invitations?client_id=… — list invitations for a client.
//
// The send path lives at POST /api/clients/[id]/assessment/send (mirrors the
// demographic + consent send endpoints). The old POST handler here that
// created rows without actually sending was removed.
export async function GET(req: NextRequest) {
    try {
        await requireAuth();
        const { searchParams } = new URL(req.url);
        const clientId = searchParams.get('client_id');

        if (!clientId) {
            return NextResponse.json({ error: 'client_id required' }, { status: 400 });
        }

        await requireClientAccess(clientId);

        const invitations = await query(
            `SELECT * FROM assessment_invitations
             WHERE client_id = $1
             ORDER BY created_at DESC`,
            [clientId]
        );

        return NextResponse.json({ invitations });
    } catch (error: any) {
        if (error.message === 'Unauthorized' || error.message === 'Facility access denied') {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        console.error('Error fetching invitations:', error);
        return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }
}
