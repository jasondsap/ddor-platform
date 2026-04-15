import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserId } from '@/lib/auth';
import { query, insert } from '@/lib/db';

// GET /api/channels/[id]/messages
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await requireAuth();
        const userId = getUserId(session);
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const before = searchParams.get('before'); // cursor pagination

        let sql = `
            SELECT m.*,
                u.first_name || ' ' || u.last_name AS sender_name,
                u.role AS sender_role,
                u.first_name AS sender_first
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.channel_id = $1::uuid AND m.is_deleted = false
        `;
        const params_q: any[] = [params.id];
        let idx = 2;

        if (before) {
            sql += ` AND m.created_at < $${idx}`;
            params_q.push(before);
            idx++;
        }

        sql += ` ORDER BY m.created_at DESC LIMIT $${idx}`;
        params_q.push(limit);

        const messages = await query(sql, params_q);

        // Mark as read
        await query(`
            INSERT INTO message_read_status (user_id, channel_id, last_read_at)
            VALUES ($1::uuid, $2::uuid, NOW())
            ON CONFLICT (user_id, channel_id) DO UPDATE SET last_read_at = NOW()
        `, [userId, params.id]);

        // Get channel info
        const channel = await query(`SELECT * FROM channels WHERE id = $1`, [params.id]);

        return NextResponse.json({
            channel: channel[0],
            messages: (messages as any[]).reverse(), // Oldest first for display
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// POST /api/channels/[id]/messages — send a message
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await requireAuth();
        const body = await req.json();

        if (!body.body?.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

        const message = await insert('messages', {
            channel_id: params.id,
            sender_id: getUserId(session),
            body: body.body.trim(),
            mentions: body.mentions ? JSON.stringify(body.mentions) : '[]',
        });

        // Update channel last_message_at
        await query(`UPDATE channels SET last_message_at = NOW() WHERE id = $1`, [params.id]);

        return NextResponse.json({ success: true, message });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
