import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserId } from '@/lib/auth';
import { query } from '@/lib/db';

// PATCH /api/notes/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await requireAuth();
        const body = await req.json();
        const allowed = ['title', 'content', 'note_type', 'tags', 'client_id', 'referral_id', 'report_id', 'is_pinned', 'is_archived'];

        const updates: string[] = [];
        const values: any[] = [];
        let idx = 1;

        for (const field of allowed) {
            if (body[field] !== undefined) {
                if (field === 'tags') {
                    updates.push(`tags = $${idx}`);
                    values.push(body.tags?.length > 0 ? `{${body.tags.join(',')}}` : '{}');
                } else {
                    updates.push(`${field} = $${idx}`);
                    values.push(body[field] === '' ? null : body[field]);
                }
                idx++;
            }
        }

        if (updates.length === 0) return NextResponse.json({ error: 'No fields' }, { status: 400 });
        updates.push('updated_at = NOW()');
        values.push(params.id);
        await query(`UPDATE client_notes SET ${updates.join(', ')} WHERE id = $${idx}`, values);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// DELETE /api/notes/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        await requireAuth();
        await query(`UPDATE client_notes SET is_archived = true, updated_at = NOW() WHERE id = $1`, [params.id]);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
