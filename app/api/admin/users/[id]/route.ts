import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAdmin, getUserId } from '@/lib/auth';
import { query, logAuditEvent } from '@/lib/db';

// PATCH /api/admin/users/[id] — update user role/facility
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await requireAuth();
        if (!isAdmin(session)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

        const body = await req.json();
        const allowed = ['first_name', 'last_name', 'email', 'role', 'facility_id', 'is_active'];

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
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );

        await logAuditEvent(getUserId(session), 'update', 'users', params.id);
        return NextResponse.json({ success: true, user: result[0] });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// DELETE /api/admin/users/[id] — remove user
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await requireAuth();
        if (!isAdmin(session)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

        // Don't allow deleting yourself
        if (getUserId(session) === params.id) {
            return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
        }

        await query(`DELETE FROM users WHERE id = $1`, [params.id]);
        await logAuditEvent(getUserId(session), 'delete', 'users', params.id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
