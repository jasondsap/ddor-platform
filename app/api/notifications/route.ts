import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserId } from '@/lib/auth';
import { query } from '@/lib/db';
import { canUserAccessClient } from '@/lib/access';

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

        // 2. Recent @mentions of this user — UNION over messages + notes.
        //    Both sources use the same body-embedded `@[Name](type:id)` syntax,
        //    persisted as JSONB on the source row. Dashboard surfaces both
        //    via source_type so the click-handler can deep-link correctly.
        //
        //    Note: this preserves the existing JSONB-LIKE pattern for now.
        //    A proper notifications table is a Phase 2 upgrade
        //    (see MENTIONS_FINDINGS.md, Strategy A).
        const mentions = await query(`
            (
                SELECT 'message'::text AS source_type,
                    m.id AS source_id,
                    m.body,
                    m.created_at,
                    m.channel_id AS context_id,
                    NULL::uuid AS client_id,
                    NULL::text AS client_name,
                    u.first_name || ' ' || u.last_name AS sender_name,
                    ch.name AS channel_name,
                    ch.channel_type AS channel_type
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                JOIN channels ch ON m.channel_id = ch.id
                WHERE m.is_deleted = false
                  AND m.sender_id != $1::uuid
                  AND m.mentions::text LIKE '%' || $1 || '%'
            )
            UNION ALL
            (
                SELECT 'note'::text AS source_type,
                    n.id AS source_id,
                    n.content AS body,
                    n.created_at,
                    n.client_id AS context_id,
                    n.client_id,
                    c.first_name || ' ' || c.last_name AS client_name,
                    u.first_name || ' ' || u.last_name AS sender_name,
                    NULL::text AS channel_name,
                    NULL::text AS channel_type
                FROM client_notes n
                JOIN users u ON n.author_id = u.id
                LEFT JOIN clients c ON n.client_id = c.id
                WHERE n.is_archived = false
                  AND n.author_id != $1::uuid
                  AND n.mentions::text LIKE '%' || $1 || '%'
            )
            ORDER BY created_at DESC
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

        // Annotate each note mention with whether the recipient currently has
        // access to its client (defense-in-depth — see MENTIONS_FINDINGS.md).
        // Message mentions are channel-scoped and don't carry client context.
        const mentionsWithAccess = await Promise.all(
            (mentions as any[]).map(async (m) => {
                if (m.source_type === 'note' && m.client_id) {
                    return { ...m, can_access_client: await canUserAccessClient(userId, m.client_id) };
                }
                return { ...m, can_access_client: true };
            })
        );

        return NextResponse.json({
            totalUnread: parseInt((unreadResult[0] as any)?.total_unread) || 0,
            mentions: mentionsWithAccess,
            recentDMs,
            recentChannel,
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Notifications error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
