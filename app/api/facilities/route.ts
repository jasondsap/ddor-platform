import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAdmin } from '@/lib/auth';
import { query } from '@/lib/db';

// GET /api/facilities
export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth();
        const { searchParams } = new URL(req.url);
        const providerId = searchParams.get('provider_id');
        const includeInactive = searchParams.get('include_inactive') === 'true';

        let sql = `
            SELECT
                f.*,
                p.name AS provider_name,
                p.abbreviation AS provider_abbreviation,
                c.name AS county_name,
                (SELECT COUNT(*) FROM clients cl WHERE cl.facility_id = f.id AND cl.is_archived = false) AS active_client_count
            FROM facilities f
            LEFT JOIN providers p ON f.provider_id = p.id
            LEFT JOIN counties c ON f.county_id = c.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramIdx = 1;

        if (!includeInactive) {
            sql += ` AND f.is_inactive = false`;
        }

        if (providerId) {
            sql += ` AND f.provider_id = $${paramIdx}`;
            params.push(providerId);
            paramIdx++;
        }

        // Admin filter by provider
        if (isAdmin(session) && providerId) {
            // already filtered above
        }

        sql += ` ORDER BY p.name, f.name`;

        const facilities = await query(sql, params);
        return NextResponse.json({ facilities });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error fetching facilities:', error);
        return NextResponse.json({ error: 'Failed to fetch facilities' }, { status: 500 });
    }
}
