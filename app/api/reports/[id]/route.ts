import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

// GET /api/reports/[id] — full report detail with attributes
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        await requireAuth();

        const report = await queryOne<any>(
            `SELECT r.*,
                    c.first_name AS client_first_name, c.last_name AS client_last_name,
                    c.ddor_id, c.date_of_birth AS client_dob, c.diagnosis,
                    f.name AS facility_name,
                    p.name AS provider_name, p.abbreviation AS provider_abbreviation,
                    u.first_name AS submitter_first, u.last_name AS submitter_last
             FROM reports r
             JOIN clients c ON r.client_id = c.id
             LEFT JOIN facilities f ON r.facility_id = f.id
             LEFT JOIN providers p ON r.provider_id = p.id
             LEFT JOIN users u ON r.submitted_by = u.id
             WHERE r.id = $1`,
            [params.id]
        );

        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        // Get all attributes grouped by type
        const attrs = await query<any>(
            `SELECT attribute_type, value FROM report_attributes WHERE report_id = $1 ORDER BY attribute_type, value`,
            [params.id]
        );

        const attributes: Record<string, string[]> = {};
        for (const attr of attrs) {
            if (!attributes[attr.attribute_type]) attributes[attr.attribute_type] = [];
            attributes[attr.attribute_type].push(attr.value);
        }

        return NextResponse.json({ report, attributes });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Error fetching report:', error);
        return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
    }
}
