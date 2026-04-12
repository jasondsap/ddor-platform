import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAdmin, getUserId } from '@/lib/auth';
import { query, queryOne, insert, logAuditEvent } from '@/lib/db';

// GET /api/facilities/[id] — full facility detail
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        await requireAuth();

        const facility = await queryOne<any>(
            `SELECT f.*, c.name AS county_name, c.state_abbr,
                    p.name AS provider_name, p.abbreviation AS provider_abbreviation
             FROM facilities f
             LEFT JOIN counties c ON f.county_id = c.id
             LEFT JOIN providers p ON f.provider_id = p.id
             WHERE f.id = $1`, [params.id]
        );

        if (!facility) return NextResponse.json({ error: 'Facility not found' }, { status: 404 });

        // Get attributes (facility_type, sud_services, mh_services, specialties, servicing_counties)
        const attributes = await query(
            `SELECT attribute_type, value FROM facility_attributes WHERE facility_id = $1 ORDER BY attribute_type, value`,
            [params.id]
        );

        // Group by type
        const grouped: Record<string, string[]> = {};
        for (const attr of attributes as any[]) {
            if (!grouped[attr.attribute_type]) grouped[attr.attribute_type] = [];
            grouped[attr.attribute_type].push(attr.value);
        }

        // Get clients at this facility
        const clients = await query(
            `SELECT c.id, c.first_name, c.last_name, c.ddor_id, c.diagnosis,
                    c.treatment_start_date, c.is_archived,
                    rt.fourteen_day_status, rt.ninety_day_status, rt.final_report_status
             FROM clients c
             LEFT JOIN report_tracking rt ON rt.client_id = c.id
             WHERE c.facility_id = $1
             ORDER BY c.is_archived, c.last_name`, [params.id]
        );

        return NextResponse.json({
            facility,
            attributes: grouped,
            clients,
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// PATCH /api/facilities/[id] — update facility details
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await requireAuth();
        if (!isAdmin(session)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

        const body = await req.json();

        // Update scalar fields
        const allowedFields = ['name', 'phone', 'street_address', 'city', 'zip', 'region',
            'facility_gender', 'is_inactive', 'primary_service', 'concerns', 'address'];
        const updates: string[] = [];
        const values: any[] = [];
        let idx = 1;

        // Enum fields that can't accept empty strings — convert to null
        const enumFields = ['primary_service', 'facility_gender', 'region'];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates.push(`${field} = $${idx}`);
                const val = enumFields.includes(field) && body[field] === '' ? null : body[field];
                values.push(val);
                idx++;
            }
        }

        if (updates.length > 0) {
            updates.push(`updated_at = NOW()`);
            values.push(params.id);
            await query(
                `UPDATE facilities SET ${updates.join(', ')} WHERE id = $${idx}`,
                values
            );
        }

        // Update multi-value attributes (replace all for each type)
        const multiFields = ['facility_type', 'sud_services', 'mh_services', 'specialties', 'servicing_county'];
        for (const attrType of multiFields) {
            if (body[attrType] !== undefined) {
                // Delete existing
                await query(`DELETE FROM facility_attributes WHERE facility_id = $1 AND attribute_type = $2`, [params.id, attrType]);
                // Insert new
                for (const val of body[attrType]) {
                    await insert('facility_attributes', { facility_id: params.id, attribute_type: attrType, value: val });
                }
            }
        }

        await logAuditEvent(getUserId(session), 'update', 'facilities', params.id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        console.error('Error:', error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}
