import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserId } from '@/lib/auth';
import { query } from '@/lib/db';

// GET /api/notifications — unread counts + recent mentions
export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = getUserId(session);
        const userName = `${session.user?.name || ''}`;

        // 1. Total unread messages across all channels
        const unreadResult = await query(`
            SELECT COALESCE(SUM(
                (SELECT COUNT(*) FROM messages m
                    WHERE m.channel_id = ch.id AND m.is_deleted = false
                    AND m.sender_id != $1::uuid
                    AND m.created_at > COALESCE(
                        (SELECT last_read_at FROM message_read_status WHERE user_id = $1::uuid AND channel_id = ch.id),
                        '1970-01-01'
                    ))
            ), 0) AS total_unread
            FROM channels ch
            WHERE ch.is_archived = false
            AND (ch.channel_type != 'dm' OR ch.dm_user_1 = $1::uuid OR ch.dm_user_2 = $1::uuid)
        `, [userId]);

        // 2. Recent messages that @mention this user (search mentions JSONB)
        const mentions = await query(`
            SELECT m.id, m.body, m.created_at, m.channel_id,
                u.first_name || ' ' || u.last_name AS sender_name,
                ch.name AS channel_name, ch.channel_type
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            JOIN channels ch ON m.channel_id = ch.id
            WHERE m.is_deleted = false
            AND m.sender_id != $1::uuid
            AND m.mentions::text LIKE '%' || $1 || '%'
            ORDER BY m.created_at DESC
            LIMIT 10
        `, [userId]);

        // 3. Recent unread DMs
        const recentDMs = await query(`
            SELECT m.id, m.body, m.created_at, m.channel_id,
                u.first_name || ' ' || u.last_name AS sender_name,
                u.first_name AS sender_first
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            JOIN channels ch ON m.channel_id = ch.id
            WHERE ch.channel_type = 'dm'
            AND (ch.dm_user_1 = $1::uuid OR ch.dm_user_2 = $1::uuid)
            AND m.sender_id != $1::uuid
            AND m.is_deleted = false
            AND m.created_at > COALESCE(
                (SELECT last_read_at FROM message_read_status WHERE user_id = $1::uuid AND channel_id = ch.id),
                '1970-01-01'
            )
            ORDER BY m.created_at DESC
            LIMIT 5
        `, [userId]);

        // 4. Recent channel messages (unread)
        const recentChannel = await query(`
            SELECT m.id, m.body, m.created_at, m.channel_id,
                u.first_name || ' ' || u.last_name AS sender_name,
                ch.name AS channel_name
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            JOIN channels ch ON m.channel_id = ch.id
            WHERE ch.channel_type != 'dm'
            AND ch.is_archived = false
            AND m.sender_id != $1::uuid
            AND m.is_deleted = false
            AND m.created_at > COALESCE(
                (SELECT last_read_at FROM message_read_status WHERE user_id = $1::uuid AND channel_id = ch.id),
                '1970-01-01'
            )
            ORDER BY m.created_at DESC
            LIMIT 5
        `, [userId]);

        return NextResponse.json({
            totalUnread: parseInt((unreadResult[0] as any)?.total_unread) || 0,
            mentions,
            recentDMs,
            recentChannel,
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Notifications error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
