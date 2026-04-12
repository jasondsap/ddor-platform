import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAdmin } from '@/lib/auth';
import { query } from '@/lib/db';

// GET /api/report-tracking — get due dates and overdue reports
export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth();
        const { role, facilityId, userId } = session.ddor;
        const { searchParams } = new URL(req.url);

        const filter = searchParams.get('filter'); // 'overdue', 'upcoming', 'all'
        const facilityFilter = searchParams.get('facility_id');
        const providerFilter = searchParams.get('provider_id');
        const limit = parseInt(searchParams.get('limit') || '50');

        let sql = `
            SELECT
                c.id AS client_id,
                c.first_name || ' ' || c.last_name AS client_name,
                c.treatment_start_date,
                c.diagnosis,
                f.name AS facility_name,
                f.id AS facility_id,
                p.name AS provider_name,
                p.id AS provider_id,
                rt.*,
                -- Due dates
                (c.treatment_start_date + INTERVAL '14 days')::DATE AS fourteen_day_due,
                (c.treatment_start_date + INTERVAL '42 days')::DATE AS forty_two_day_due,
                (c.treatment_start_date + INTERVAL '90 days')::DATE AS ninety_day_due,
                (c.treatment_start_date + INTERVAL '180 days')::DATE AS one_eighty_day_due,
                (c.treatment_start_date + INTERVAL '270 days')::DATE AS two_seventy_day_due,
                (c.treatment_start_date + INTERVAL '360 days')::DATE AS three_sixty_day_due,
                -- Days remaining
                (c.treatment_start_date + INTERVAL '14 days')::DATE - CURRENT_DATE AS fourteen_day_remaining,
                (c.treatment_start_date + INTERVAL '42 days')::DATE - CURRENT_DATE AS forty_two_day_remaining,
                (c.treatment_start_date + INTERVAL '90 days')::DATE - CURRENT_DATE AS ninety_day_remaining,
                (c.treatment_start_date + INTERVAL '180 days')::DATE - CURRENT_DATE AS one_eighty_day_remaining,
                (c.treatment_start_date + INTERVAL '270 days')::DATE - CURRENT_DATE AS two_seventy_day_remaining,
                (c.treatment_start_date + INTERVAL '360 days')::DATE - CURRENT_DATE AS three_sixty_day_remaining
            FROM report_tracking rt
            JOIN clients c ON c.id = rt.client_id
            LEFT JOIN facilities f ON c.facility_id = f.id
            LEFT JOIN providers p ON f.provider_id = p.id
            WHERE c.is_archived = false
            AND c.treatment_start_date IS NOT NULL
        `;
        const params: any[] = [];
        let paramIdx = 1;

        // Role-based scoping
        if (!isAdmin(session)) {
            if (role === 'navigator') {
                sql += ` AND f.county_id IN (
                    SELECT county_id FROM user_counties WHERE user_id = $${paramIdx}::uuid
                )`;
                params.push(userId);
                paramIdx++;
            } else {
                sql += ` AND c.facility_id = $${paramIdx}`;
                params.push(facilityId);
                paramIdx++;
            }
        }

        // Optional facility/provider filters (for admins)
        if (facilityFilter) {
            sql += ` AND c.facility_id = $${paramIdx}`;
            params.push(facilityFilter);
            paramIdx++;
        }
        if (providerFilter) {
            sql += ` AND f.provider_id = $${paramIdx}`;
            params.push(providerFilter);
            paramIdx++;
        }

        // Filter by overdue (any milestone past due and not completed)
        if (filter === 'overdue') {
            sql += ` AND (
                (rt.fourteen_day_status NOT IN ('completed', 'not_applicable', 'not_due')
                    AND (c.treatment_start_date + INTERVAL '14 days')::DATE < CURRENT_DATE)
                OR (rt.forty_two_day_status NOT IN ('completed', 'not_applicable', 'not_due')
                    AND (c.treatment_start_date + INTERVAL '42 days')::DATE < CURRENT_DATE)
                OR (rt.ninety_day_status NOT IN ('completed', 'not_applicable', 'not_due')
                    AND (c.treatment_start_date + INTERVAL '90 days')::DATE < CURRENT_DATE)
                OR (rt.one_eighty_day_status NOT IN ('completed', 'not_applicable', 'not_due')
                    AND (c.treatment_start_date + INTERVAL '180 days')::DATE < CURRENT_DATE)
                OR (rt.two_seventy_day_status NOT IN ('completed', 'not_applicable', 'not_due')
                    AND (c.treatment_start_date + INTERVAL '270 days')::DATE < CURRENT_DATE)
                OR (rt.three_sixty_day_status NOT IN ('completed', 'not_applicable', 'not_due')
                    AND (c.treatment_start_date + INTERVAL '360 days')::DATE < CURRENT_DATE)
            )`;
        }

        // Filter by upcoming (next 14 days)
        if (filter === 'upcoming') {
            sql += ` AND (
                (rt.fourteen_day_status NOT IN ('completed', 'not_applicable')
                    AND (c.treatment_start_date + INTERVAL '14 days')::DATE BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days')
                OR (rt.forty_two_day_status NOT IN ('completed', 'not_applicable')
                    AND (c.treatment_start_date + INTERVAL '42 days')::DATE BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days')
                OR (rt.ninety_day_status NOT IN ('completed', 'not_applicable')
                    AND (c.treatment_start_date + INTERVAL '90 days')::DATE BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days')
                OR (rt.one_eighty_day_status NOT IN ('completed', 'not_applicable')
                    AND (c.treatment_start_date + INTERVAL '180 days')::DATE BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days')
                OR (rt.two_seventy_day_status NOT IN ('completed', 'not_applicable')
                    AND (c.treatment_start_date + INTERVAL '270 days')::DATE BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days')
                OR (rt.three_sixty_day_status NOT IN ('completed', 'not_applicable')
                    AND (c.treatment_start_date + INTERVAL '360 days')::DATE BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days')
            )`;
        }

        sql += ` ORDER BY c.treatment_start_date ASC LIMIT $${paramIdx}`;
        params.push(limit);

        const tracking = await query(sql, params);
        return NextResponse.json({ tracking });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error fetching report tracking:', error);
        return NextResponse.json({ error: 'Failed to fetch report tracking' }, { status: 500 });
    }
}
