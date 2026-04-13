import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAdmin } from '@/lib/auth';
import { query, insert } from '@/lib/db';

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

// POST /api/facilities — create a new facility (admin only)
export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        if (!isAdmin(session)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

        const body = await req.json();
        if (!body.name?.trim()) return NextResponse.json({ error: 'Facility name is required' }, { status: 400 });
        if (!body.provider_id) return NextResponse.json({ error: 'Provider is required' }, { status: 400 });

        const facility = await insert('facilities', {
            name: body.name.trim(),
            provider_id: body.provider_id,
            county_id: body.county_id || null,
            phone: body.phone || null,
            street_address: body.street_address || null,
            city: body.city || null,
            zip: body.zip || null,
            region: body.region || null,
            primary_service: body.primary_service || null,
            facility_gender: body.facility_gender || null,
            is_inactive: false,
        });

        const facilityId = (facility as any).id;

        // Insert service tag attributes
        const tagFields = ['facility_type', 'sud_services', 'mh_services', 'specialties'];
        for (const attrType of tagFields) {
            if (body[attrType] && Array.isArray(body[attrType])) {
                for (const val of body[attrType]) {
                    await insert('facility_attributes', { facility_id: facilityId, attribute_type: attrType, value: val });
                }
            }
        }

        return NextResponse.json({ success: true, facility });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Error creating facility:', error);
        return NextResponse.json({ error: 'Failed to create facility' }, { status: 500 });
    }
}
