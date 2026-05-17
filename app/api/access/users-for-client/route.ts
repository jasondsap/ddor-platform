import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getUserSummariesWithAccessToClient } from '@/lib/access';

// GET /api/access/users-for-client?client_id=<uuid>
//
// Returns users who currently have access to the given client, used to populate
// the @mention dropdown on the client-note form (Camp B: filter at suggest-time).
//
// Authed (any user can call), but the response only enumerates other users — no
// sensitive fields. Pre-filtered server-side by lib/access.ts so the dropdown
// matches the actual access set.
export async function GET(req: NextRequest) {
    try {
        await requireAuth();
        const { searchParams } = new URL(req.url);
        const clientId = searchParams.get('client_id');
        if (!clientId) {
            return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
        }
        const users = await getUserSummariesWithAccessToClient(clientId);
        return NextResponse.json({ users });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error fetching users-for-client:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
