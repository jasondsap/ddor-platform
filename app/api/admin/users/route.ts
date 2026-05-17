import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAdmin, getUserId } from '@/lib/auth';
import { query, insert, logAuditEvent, sql } from '@/lib/db';

const MAX_NAVIGATOR_COUNTIES = 3;

// GET /api/admin/users — list all users (navigators include their assigned counties)
export async function GET(_req: NextRequest) {
    try {
        const session = await requireAuth();
        if (!isAdmin(session)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

        const users = await query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.facility_id,
                    u.cognito_sub, u.created_at, u.updated_at,
                    f.name AS facility_name,
                    p.name AS provider_name,
                    COALESCE(
                        (SELECT json_agg(json_build_object('id', co.id, 'name', co.name) ORDER BY co.name)
                         FROM user_counties uc
                         JOIN counties co ON co.id = uc.county_id
                         WHERE uc.user_id = u.id),
                        '[]'::json
                    ) AS counties
             FROM users u
             LEFT JOIN facilities f ON u.facility_id = f.id
             LEFT JOIN providers p ON f.provider_id = p.id
             ORDER BY u.role, u.last_name, u.first_name`
        );

        return NextResponse.json({ users });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// POST /api/admin/users — create a new user.
// For role='navigator', body may include county_ids (max 3) to populate user_counties.
// county_ids for non-navigator roles is rejected.
export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        if (!isAdmin(session)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

        const body = await req.json();
        if (!body.email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        if (!body.first_name?.trim()) return NextResponse.json({ error: 'First name is required' }, { status: 400 });
        if (!body.last_name?.trim()) return NextResponse.json({ error: 'Last name is required' }, { status: 400 });

        const role = body.role || 'healthcare_user';
        const countyIds: string[] = Array.isArray(body.county_ids) ? body.county_ids.filter(Boolean) : [];

        if (countyIds.length > 0 && role !== 'navigator') {
            return NextResponse.json({ error: 'county_ids may only be set for navigator role' }, { status: 400 });
        }
        if (countyIds.length > MAX_NAVIGATOR_COUNTIES) {
            return NextResponse.json({ error: `A navigator may have at most ${MAX_NAVIGATOR_COUNTIES} counties` }, { status: 400 });
        }

        const existing = await query(`SELECT id FROM users WHERE email = $1`, [body.email.trim().toLowerCase()]);
        if (existing.length > 0) return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });

        const user = await insert('users', {
            email: body.email.trim().toLowerCase(),
            first_name: body.first_name.trim(),
            last_name: body.last_name.trim(),
            role,
            facility_id: body.facility_id || null,
        });
        const userId = (user as any).id;

        if (countyIds.length > 0) {
            const inserts = countyIds.map(cid =>
                sql`INSERT INTO user_counties (user_id, county_id) VALUES (${userId}::uuid, ${cid}::uuid)`
            );
            await (sql as any).transaction(inserts);
        }

        await logAuditEvent(getUserId(session), 'create', 'users', userId, undefined, { role, county_ids: countyIds });
        return NextResponse.json({ success: true, user });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
