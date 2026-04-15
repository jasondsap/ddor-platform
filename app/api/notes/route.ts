import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserId } from '@/lib/auth';
import { query, insert } from '@/lib/db';

// GET /api/notes — list notes (filterable by client_id, author, etc.)
export async function GET(req: NextRequest) {
    try {
        await requireAuth();
        const { searchParams } = new URL(req.url);
        const clientId = searchParams.get('client_id');
        const authorId = searchParams.get('author_id');
        const search = searchParams.get('search');
        const limit = parseInt(searchParams.get('limit') || '50');

        let sql = `
            SELECT n.*,
                u.first_name || ' ' || u.last_name AS author_name,
                u.role AS author_role,
                c.first_name || ' ' || c.last_name AS client_name,
                c.ddor_id AS client_ddor_id,
                ref.first_name || ' ' || ref.last_name AS referral_name,
                r.report_type AS report_type
            FROM client_notes n
            LEFT JOIN users u ON n.author_id = u.id
            LEFT JOIN clients c ON n.client_id = c.id
            LEFT JOIN referrals ref ON n.referral_id = ref.id
            LEFT JOIN reports r ON n.report_id = r.id
            WHERE n.is_archived = false
        `;
        const params: any[] = [];
        let idx = 1;

        if (clientId) { sql += ` AND n.client_id = $${idx}::uuid`; params.push(clientId); idx++; }
        if (authorId) { sql += ` AND n.author_id = $${idx}::uuid`; params.push(authorId); idx++; }
        if (search) { sql += ` AND (n.title ILIKE $${idx} OR n.content ILIKE $${idx})`; params.push(`%${search}%`); idx++; }

        sql += ` ORDER BY n.is_pinned DESC, n.created_at DESC LIMIT $${idx}`;
        params.push(limit);

        const notes = await query(sql, params);
        return NextResponse.json({ notes });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// POST /api/notes — create a note
export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        const body = await req.json();

        if (!body.content?.trim()) return NextResponse.json({ error: 'Content is required' }, { status: 400 });

        const note = await insert('client_notes', {
            title: body.title?.trim() || null,
            content: body.content.trim(),
            note_type: body.note_type || 'general',
            tags: body.tags?.length > 0 ? `{${body.tags.join(',')}}` : '{}',
            client_id: body.client_id || null,
            referral_id: body.referral_id || null,
            report_id: body.report_id || null,
            author_id: getUserId(session),
            note_date: body.note_date || new Date().toISOString().split('T')[0],
            is_pinned: body.is_pinned || false,
        });

        return NextResponse.json({ success: true, note });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
