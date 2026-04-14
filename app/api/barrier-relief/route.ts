import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAdmin, getUserId } from '@/lib/auth';
import { query, insert, logAuditEvent } from '@/lib/db';

// GET /api/barrier-relief
export async function GET(req: NextRequest) {
    try {
        await requireAuth();
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');

        let sql = `
            SELECT br.*,
                co.name AS county_name,
                p.name AS provider_name,
                f.name AS facility_name,
                u.first_name || ' ' || u.last_name AS navigator_name,
                (COALESCE(br.vendor_1_amount, 0) + COALESCE(br.vendor_2_amount, 0) +
                 COALESCE(br.vendor_3_amount, 0) + COALESCE(br.vendor_4_amount, 0)) AS total_requested
            FROM barrier_relief_requests br
            LEFT JOIN counties co ON br.county_id = co.id
            LEFT JOIN providers p ON br.provider_id = p.id
            LEFT JOIN facilities f ON br.facility_id = f.id
            LEFT JOIN users u ON br.case_navigator_id = u.id
            WHERE br.is_archived = false
        `;
        const params: any[] = [];
        let idx = 1;

        if (status && status !== 'all') {
            sql += ` AND br.status = $${idx}`;
            params.push(status);
            idx++;
        }

        sql += ` ORDER BY br.is_emergency DESC, br.created_at DESC`;

        const requests = await query(sql, params);

        // Summary stats
        const stats = await query(`
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'pending') AS pending,
                COUNT(*) FILTER (WHERE status = 'approved') AS approved,
                COUNT(*) FILTER (WHERE status = 'disbursed') AS disbursed,
                COUNT(*) FILTER (WHERE status = 'denied') AS denied,
                COUNT(*) FILTER (WHERE is_emergency = true AND status = 'pending') AS emergency_pending,
                COALESCE(SUM(COALESCE(vendor_1_amount, 0) + COALESCE(vendor_2_amount, 0) + COALESCE(vendor_3_amount, 0) + COALESCE(vendor_4_amount, 0)), 0) AS total_requested,
                COALESCE(SUM(approved_amount) FILTER (WHERE status IN ('approved', 'disbursed')), 0) AS total_approved
            FROM barrier_relief_requests WHERE is_archived = false
        `);

        return NextResponse.json({ requests, stats: stats[0] || {} });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// POST /api/barrier-relief
export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        const body = await req.json();

        if (!body.first_name?.trim() || !body.last_name?.trim()) {
            return NextResponse.json({ error: 'Participant name is required' }, { status: 400 });
        }

        const request = await insert('barrier_relief_requests', {
            first_name: body.first_name.trim(),
            last_name: body.last_name.trim(),
            address: body.address || null,
            phone: body.phone || null,
            email: body.email || null,
            primary_language: body.primary_language || 'English',
            county_id: body.county_id || null,
            is_emergency: body.is_emergency || false,
            is_housing_assistance: body.is_housing_assistance || false,
            is_emergency_housing: body.is_emergency_housing || false,
            is_basic_needs: body.is_basic_needs || false,
            is_transportation: body.is_transportation || false,
            description: body.description || null,
            reason_for_services: body.reason_for_services || null,
            alternative_resources: body.alternative_resources || null,
            provider_id: body.provider_id || null,
            facility_id: body.facility_id || null,
            staff_name: body.staff_name || null,
            staff_phone: body.staff_phone || null,
            staff_email: body.staff_email || null,
            case_navigator_id: body.case_navigator_id || null,
            vendor_1: body.vendor_1 || null,
            vendor_1_contact: body.vendor_1_contact || null,
            vendor_1_amount: body.vendor_1_amount || null,
            vendor_2: body.vendor_2 || null,
            vendor_2_contact: body.vendor_2_contact || null,
            vendor_2_amount: body.vendor_2_amount || null,
            vendor_3: body.vendor_3 || null,
            vendor_3_contact: body.vendor_3_contact || null,
            vendor_3_amount: body.vendor_3_amount || null,
            vendor_4: body.vendor_4 || null,
            vendor_4_contact: body.vendor_4_contact || null,
            vendor_4_amount: body.vendor_4_amount || null,
            product_links: body.product_links || null,
            signature: body.signature || null,
            signature_date: body.signature_date || null,
            is_verbal_signature: body.is_verbal_signature || false,
            funding_exclusion: body.funding_exclusion || null,
            created_by: getUserId(session),
        });

        await logAuditEvent(getUserId(session), 'create', 'barrier_relief_requests', (request as any).id);
        return NextResponse.json({ success: true, request });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
