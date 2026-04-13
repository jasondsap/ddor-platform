import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAdmin, getUserId } from '@/lib/auth';
import { query, logAuditEvent } from '@/lib/db';

// PATCH /api/providers/[id] — update provider (admin only)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await requireAuth();
        if (!isAdmin(session)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

        const body = await req.json();
        const allowed = ['name', 'abbreviation', 'phone', 'email', 'address_line1', 'address_line2',
            'city', 'state', 'zip', 'website', 'notes', 'is_inactive',
            'has_participants', 'contract_signed', 'contract_date', 'baa_signed', 'baa_date',
            'w9_received', 'ach_received', 'contract_notes'];

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
        const result = await query(
            `UPDATE providers SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );

        await logAuditEvent(getUserId(session), 'update', 'providers', params.id);
        return NextResponse.json({ success: true, provider: result[0] });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        console.error('Error updating provider:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
