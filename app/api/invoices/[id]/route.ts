import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAdmin, getUserId } from '@/lib/auth';
import { query, queryOne, logAuditEvent } from '@/lib/db';

// GET /api/invoices/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        await requireAuth();
        const invoice = await queryOne<any>(
            `SELECT i.*, f.name AS facility_name, p.name AS provider_name,
                    u.first_name || ' ' || u.last_name AS submitter_name
             FROM invoices i
             LEFT JOIN facilities f ON i.facility_id = f.id
             LEFT JOIN providers p ON f.provider_id = p.id
             LEFT JOIN users u ON i.submitter_id = u.id
             WHERE i.id = $1`, [params.id]
        );
        if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const attributes = await query<any>(
            `SELECT attribute_type, value FROM invoice_attributes WHERE invoice_id = $1 ORDER BY attribute_type, value`,
            [params.id]
        );
        const grouped: Record<string, string[]> = {};
        for (const a of attributes) {
            if (!grouped[a.attribute_type]) grouped[a.attribute_type] = [];
            grouped[a.attribute_type].push(a.value);
        }

        return NextResponse.json({ invoice, attributes: grouped });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// PATCH /api/invoices/[id] — approval workflow updates
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await requireAuth();
        if (!isAdmin(session)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

        const body = await req.json();
        const allowed = ['fgi_review_1', 'fgi_review_2', 'dbh_review', 'reimbursement_status',
            'fgi_notes', 'date_sent_to_ap', 'credits_issued', 'is_invalid', 'is_duplicate', 'is_archived'];

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

        if (updates.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

        updates.push('updated_at = NOW()');
        values.push(params.id);
        await query(`UPDATE invoices SET ${updates.join(', ')} WHERE id = $${idx}`, values);

        await logAuditEvent(getUserId(session), 'update', 'invoices', params.id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
