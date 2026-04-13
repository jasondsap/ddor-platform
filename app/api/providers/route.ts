import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAdmin, getUserId } from '@/lib/auth';
import { query, insert, logAuditEvent } from '@/lib/db';

// GET /api/providers — list all providers with counts
export async function GET(req: NextRequest) {
    try {
        await requireAuth();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        // Single provider detail with full drill-down
        if (id) {
            const provider = await query(
                `SELECT * FROM providers WHERE id = $1`, [id]
            );
            if (!provider.length) {
                return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
            }

            // Facilities
            const facilities = await query(
                `SELECT f.*, c.name AS county_name,
                    (SELECT COUNT(*) FROM clients cl WHERE cl.facility_id = f.id AND cl.is_archived = false) AS active_clients
                 FROM facilities f
                 LEFT JOIN counties c ON f.county_id = c.id
                 WHERE f.provider_id = $1
                 ORDER BY f.is_inactive, f.name`, [id]
            );

            // All clients across all facilities
            const clients = await query(
                `SELECT c.id, c.first_name, c.last_name, c.ddor_id, c.diagnosis,
                    c.treatment_start_date, c.is_archived,
                    f.name AS facility_name,
                    rt.fourteen_day_status, rt.forty_two_day_status, rt.ninety_day_status,
                    rt.one_eighty_day_status, rt.final_report_status
                 FROM clients c
                 JOIN facilities f ON c.facility_id = f.id
                 LEFT JOIN report_tracking rt ON rt.client_id = c.id
                 WHERE f.provider_id = $1
                 ORDER BY c.last_name, c.first_name`, [id]
            );

            // Reports summary
            const reportCounts = await query(
                `SELECT r.report_type, COUNT(*) AS count
                 FROM reports r
                 JOIN clients c ON r.client_id = c.id
                 JOIN facilities f ON c.facility_id = f.id
                 WHERE f.provider_id = $1
                 GROUP BY r.report_type`, [id]
            );

            // Recent reports
            const recentReports = await query(
                `SELECT r.id, r.report_type, r.date_submitted, r.created_at,
                    c.first_name, c.last_name, c.ddor_id,
                    f.name AS facility_name
                 FROM reports r
                 JOIN clients c ON r.client_id = c.id
                 JOIN facilities f ON c.facility_id = f.id
                 WHERE f.provider_id = $1
                 ORDER BY r.created_at DESC
                 LIMIT 20`, [id]
            );

            return NextResponse.json({
                provider: provider[0],
                facilities,
                clients,
                reportCounts,
                recentReports,
            });
        }

        // List all providers with aggregate counts
        const providers = await query(
            `SELECT p.*,
                (SELECT COUNT(*) FROM facilities f WHERE f.provider_id = p.id AND f.is_inactive = false) AS facility_count,
                (SELECT COUNT(*) FROM facilities f WHERE f.provider_id = p.id AND f.is_inactive = true) AS inactive_facility_count,
                (SELECT COUNT(*) FROM clients c JOIN facilities f ON c.facility_id = f.id WHERE f.provider_id = p.id AND c.is_archived = false) AS active_client_count,
                (SELECT COUNT(*) FROM reports r JOIN clients c ON r.client_id = c.id JOIN facilities f ON c.facility_id = f.id WHERE f.provider_id = p.id) AS total_reports
             FROM providers p
             ORDER BY p.name`
        );

        return NextResponse.json({ providers });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// POST /api/providers — create a new provider (admin only)
export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        if (!isAdmin(session)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

        const body = await req.json();
        if (!body.name?.trim()) return NextResponse.json({ error: 'Provider name is required' }, { status: 400 });

        const provider = await insert('providers', {
            name: body.name.trim(),
            abbreviation: body.abbreviation?.trim() || null,
            phone: body.phone || null,
            email: body.email || null,
            address_line1: body.address_line1 || null,
            address_line2: body.address_line2 || null,
            city: body.city || null,
            state: body.state || 'KY',
            zip: body.zip || null,
            website: body.website || null,
            notes: body.notes || null,
        });

        await logAuditEvent(getUserId(session), 'create', 'providers', (provider as any).id);
        return NextResponse.json({ success: true, provider });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Error creating provider:', error);
        return NextResponse.json({ error: 'Failed to create provider' }, { status: 500 });
    }
}
