import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserId } from '@/lib/auth';
import { query, insert, queryOne } from '@/lib/db';

// GET /api/channels — list channels with unread counts
export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = getUserId(session);

        const channels = await query(`
            SELECT ch.*,
                (SELECT COUNT(*) FROM messages m WHERE m.channel_id = ch.id AND m.is_deleted = false) AS message_count,
                (SELECT COUNT(*) FROM messages m
                    WHERE m.channel_id = ch.id AND m.is_deleted = false
                    AND m.created_at > COALESCE(
                        (SELECT last_read_at FROM message_read_status WHERE user_id = $1::uuid AND channel_id = ch.id),
                        '1970-01-01'
                    )
                    AND m.sender_id != $1::uuid
                ) AS unread_count,
                c.first_name || ' ' || c.last_name AS client_name,
                p.name AS provider_name,
                f.name AS facility_name,
                cr.first_name || ' ' || cr.last_name AS created_by_name,
                -- DM partner info
                CASE WHEN ch.channel_type = 'dm' AND ch.dm_user_1 = $1::uuid
                    THEN (SELECT first_name || ' ' || last_name FROM users WHERE id = ch.dm_user_2)
                    WHEN ch.channel_type = 'dm' AND ch.dm_user_2 = $1::uuid
                    THEN (SELECT first_name || ' ' || last_name FROM users WHERE id = ch.dm_user_1)
                    ELSE NULL END AS dm_partner_name,
                CASE WHEN ch.channel_type = 'dm' AND ch.dm_user_1 = $1::uuid THEN ch.dm_user_2
                    WHEN ch.channel_type = 'dm' AND ch.dm_user_2 = $1::uuid THEN ch.dm_user_1
                    ELSE NULL END AS dm_partner_id
            FROM channels ch
            LEFT JOIN clients c ON ch.client_id = c.id
            LEFT JOIN providers p ON ch.provider_id = p.id
            LEFT JOIN facilities f ON ch.facility_id = f.id
            LEFT JOIN users cr ON ch.created_by = cr.id
            WHERE ch.is_archived = false
            AND (ch.channel_type != 'dm' OR ch.dm_user_1 = $1::uuid OR ch.dm_user_2 = $1::uuid)
            ORDER BY ch.last_message_at DESC NULLS LAST, ch.created_at DESC
        `, [userId]);

        const totalUnread = (channels as any[]).reduce((s, ch) => s + (parseInt(ch.unread_count) || 0), 0);

        // Also return users list for DM creation and @mentions
        const users = await query(`
            SELECT id, first_name, last_name, email, role, facility_id
            FROM users ORDER BY first_name, last_name
        `);

        return NextResponse.json({ channels, totalUnread, users });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// POST /api/channels — create a channel or DM
export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = getUserId(session);
        const body = await req.json();

        // DM: find existing or create new
        if (body.channel_type === 'dm' && body.dm_target_id) {
            const targetId = body.dm_target_id;

            // Check for existing DM channel between these two users
            const existing = await query(`
                SELECT * FROM channels
                WHERE channel_type = 'dm' AND is_archived = false
                AND ((dm_user_1 = $1::uuid AND dm_user_2 = $2::uuid)
                  OR (dm_user_1 = $2::uuid AND dm_user_2 = $1::uuid))
                LIMIT 1
            `, [userId, targetId]);

            if ((existing as any[]).length > 0) {
                return NextResponse.json({ success: true, channel: existing[0] });
            }

            // Get target user name for channel name
            const target = await queryOne<any>(`SELECT first_name, last_name FROM users WHERE id = $1`, [targetId]);
            const me = await queryOne<any>(`SELECT first_name, last_name FROM users WHERE id = $1`, [userId]);

            const channel = await insert('channels', {
                name: `${me?.first_name || ''} & ${target?.first_name || ''} ${target?.last_name || ''}`,
                channel_type: 'dm',
                dm_user_1: userId,
                dm_user_2: targetId,
                created_by: userId,
            });

            return NextResponse.json({ success: true, channel });
        }

        // Regular channel
        if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        const channel = await insert('channels', {
            name: body.name.trim(),
            channel_type: body.channel_type || 'general',
            client_id: body.client_id || null,
            provider_id: body.provider_id || null,
            facility_id: body.facility_id || null,
            created_by: userId,
        });

        return NextResponse.json({ success: true, channel });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
