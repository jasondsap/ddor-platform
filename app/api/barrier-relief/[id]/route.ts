import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAdmin, getUserId } from '@/lib/auth';
import { query, queryOne, logAuditEvent } from '@/lib/db';

// GET /api/barrier-relief/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        await requireAuth();
        const request = await queryOne<any>(
            `SELECT br.*,
                co.name AS county_name,
                p.name AS provider_name,
                f.name AS facility_name,
                u.first_name || ' ' || u.last_name AS navigator_name,
                cr.first_name || ' ' || cr.last_name AS created_by_name
            FROM barrier_relief_requests br
            LEFT JOIN counties co ON br.county_id = co.id
            LEFT JOIN providers p ON br.provider_id = p.id
            LEFT JOIN facilities f ON br.facility_id = f.id
            LEFT JOIN users u ON br.case_navigator_id = u.id
            LEFT JOIN users cr ON br.created_by = cr.id
            WHERE br.id = $1`, [params.id]
        );
        if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json({ request });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// PATCH /api/barrier-relief/[id] — admin status updates
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await requireAuth();
        if (!isAdmin(session)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

        const body = await req.json();
        const allowed = ['status', 'fgi_notes', 'approved_amount', 'date_approved', 'date_disbursed', 'is_archived'];

        const updates: string[] = [];
        const values: any[] = [];
        let idx = 1;

        for (const field of allowed) {
            if (body[field] !== undefined) {
                updates.push(`${field} = $${idx}`);
                values.push(body[field] === '' ? null : body[field]);
                idx++;
            }
        }

        if (updates.length === 0) return NextResponse.json({ error: 'No fields' }, { status: 400 });
        updates.push('updated_at = NOW()');
        values.push(params.id);
        await query(`UPDATE barrier_relief_requests SET ${updates.join(', ')} WHERE id = $${idx}`, values);

        await logAuditEvent(getUserId(session), 'update', 'barrier_relief_requests', params.id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
