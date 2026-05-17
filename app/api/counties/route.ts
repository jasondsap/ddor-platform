import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

// GET /api/counties — list active counties (reference data, available to any authed user)
export async function GET(_req: NextRequest) {
    try {
        await requireAuth();
        const counties = await query(
            `SELECT id, name, state_abbr, is_pilot, is_active
             FROM counties
             WHERE is_active = true
             ORDER BY name`
        );
        return NextResponse.json({ counties });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Error fetching counties:', error);
        return NextResponse.json({ error: 'Failed to fetch counties' }, { status: 500 });
    }
}
