import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAdmin, getUserId } from '@/lib/auth';
import { query, insert, logAuditEvent } from '@/lib/db';

// GET /api/admin/users — list all users
export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth();
        if (!isAdmin(session)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

        const users = await query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.facility_id,
                    u.cognito_sub, u.created_at, u.updated_at,
                    f.name AS facility_name,
                    p.name AS provider_name
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

// POST /api/admin/users — create a new user
export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        if (!isAdmin(session)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

        const body = await req.json();
        if (!body.email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        if (!body.first_name?.trim()) return NextResponse.json({ error: 'First name is required' }, { status: 400 });
        if (!body.last_name?.trim()) return NextResponse.json({ error: 'Last name is required' }, { status: 400 });

        // Check for duplicate email
        const existing = await query(`SELECT id FROM users WHERE email = $1`, [body.email.trim().toLowerCase()]);
        if (existing.length > 0) return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });

        const user = await insert('users', {
            email: body.email.trim().toLowerCase(),
            first_name: body.first_name.trim(),
            last_name: body.last_name.trim(),
            role: body.role || 'healthcare_user',
            facility_id: body.facility_id || null,
        });

        await logAuditEvent(getUserId(session), 'create', 'users', (user as any).id);
        return NextResponse.json({ success: true, user });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
