import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAdmin, getUserId } from '@/lib/auth';
import { query, insert, logAuditEvent } from '@/lib/db';

// GET /api/clients — list clients scoped by facility/role
export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth();
        const { role, facilityId, userId } = session.ddor;
        const { searchParams } = new URL(req.url);

        const facilityFilter = searchParams.get('facility_id');
        const search = searchParams.get('search');
        const includeArchived = searchParams.get('include_archived') === 'true';
        const status = searchParams.get('status'); // 'active', 'archived', 'all'

        let sql = `
            SELECT
                c.*,
                f.name AS facility_name,
                p.name AS provider_name,
                p.abbreviation AS provider_abbreviation,
                rt.fourteen_day_status,
                rt.kyae_referral_status,
                rt.forty_two_day_status,
                rt.barc10_status,
                rt.phq9_gad7_status,
                rt.ninety_day_status,
                rt.one_eighty_day_status,
                rt.two_seventy_day_status,
                rt.three_sixty_day_status,
                rt.final_report_status
            FROM clients c
            LEFT JOIN facilities f ON c.facility_id = f.id
            LEFT JOIN providers p ON f.provider_id = p.id
            LEFT JOIN report_tracking rt ON rt.client_id = c.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramIdx = 1;

        // Archive filter
        if (status === 'archived') {
            sql += ` AND c.is_archived = true`;
        } else if (status !== 'all' && !includeArchived) {
            sql += ` AND c.is_archived = false`;
        }

        // Role-based scoping
        if (isAdmin(session)) {
            // Admins see all — optionally filter by facility
            if (facilityFilter) {
                sql += ` AND c.facility_id = $${paramIdx}`;
                params.push(facilityFilter);
                paramIdx++;
            }
        } else if (role === 'navigator') {
            // Navigators see clients in their assigned counties
            sql += ` AND f.county_id IN (
                SELECT county_id FROM user_counties WHERE user_id = $${paramIdx}::uuid
            )`;
            params.push(userId);
            paramIdx++;
        } else {
            // Providers see their own facility's clients
            sql += ` AND c.facility_id = $${paramIdx}`;
            params.push(facilityId);
            paramIdx++;
        }

        // Search
        if (search && search.length >= 2) {
            sql += ` AND (
                c.first_name ILIKE $${paramIdx} OR
                c.last_name ILIKE $${paramIdx} OR
                c.ddor_id ILIKE $${paramIdx}
            )`;
            params.push(`%${search}%`);
            paramIdx++;
        }

        sql += ` ORDER BY c.last_name, c.first_name`;

        const clients = await query(sql, params);
        return NextResponse.json({ clients });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error fetching clients:', error);
        return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }
}

// POST /api/clients — create a new client
export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        const body = await req.json();

        const { first_name, last_name } = body;

        if (!first_name || !last_name) {
            return NextResponse.json({ error: 'first_name and last_name are required' }, { status: 400 });
        }

        const client = await insert('clients', {
            first_name,
            last_name,
            email: body.email || null,
            phone: body.phone || null,
            date_of_birth: body.date_of_birth || null,
            gender: body.gender || null,
            zip: body.zip || null,
            alternate_contact: body.alternate_contact || null,
            facility_id: body.facility_id || session.ddor.facilityId,
            diagnosis: body.diagnosis || null,
            secondary_diagnosis: body.secondary_diagnosis || null,
            has_oud: body.has_oud || false,
            eligibility_status: body.eligibility_status || null,
            ddor_id: body.ddor_id || null,
            treatment_start_date: body.treatment_start_date || null,
            agreement_signed_date: body.agreement_signed_date || null,
            agreement_length_days: body.agreement_length_days || null,
            notes: body.notes || null,
        });

        // Create report tracking row
        await insert('report_tracking', {
            client_id: (client as any).id,
        });

        await logAuditEvent(
            getUserId(session),
            'create',
            'clients',
            (client as any).id,
            undefined,
            { first_name, last_name, facility_id }
        );

        return NextResponse.json({ success: true, client });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error creating client:', error);
        return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
    }
}
