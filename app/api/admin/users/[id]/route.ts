import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAdmin, getUserId } from '@/lib/auth';
import { query, queryOne, logAuditEvent, sql } from '@/lib/db';

const MAX_NAVIGATOR_COUNTIES = 3;

// PATCH /api/admin/users/[id] — update user role/facility and (for navigators) county assignments.
//
// Role transition behavior: when a user's role changes away from 'navigator', all
// rows in user_counties for that user are deleted (per product decision — county
// history is not preserved for non-navigators).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await requireAuth();
        if (!isAdmin(session)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

        const body = await req.json();
        const allowed = ['first_name', 'last_name', 'email', 'role', 'facility_id', 'is_active'];

        const countyIdsProvided = Array.isArray(body.county_ids);
        const countyIds: string[] = countyIdsProvided ? body.county_ids.filter(Boolean) : [];

        if (countyIds.length > MAX_NAVIGATOR_COUNTIES) {
            return NextResponse.json({ error: `A navigator may have at most ${MAX_NAVIGATOR_COUNTIES} counties` }, { status: 400 });
        }

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

        // Determine the effective role after this update so we know how to handle counties.
        let effectiveRole: string | null = body.role ?? null;
        if (effectiveRole === null) {
            const existing = await queryOne<{ role: string }>(`SELECT role FROM users WHERE id = $1`, [params.id]);
            effectiveRole = existing?.role ?? null;
        }

        if (countyIdsProvided && countyIds.length > 0 && effectiveRole !== 'navigator') {
            return NextResponse.json({ error: 'county_ids may only be set for navigator role' }, { status: 400 });
        }

        if (updates.length > 0) {
            updates.push('updated_at = NOW()');
            values.push(params.id);
            await query(
                `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`,
                values
            );
        }

        // County sync:
        //   - Role changing to (or staying as) non-navigator → delete all county rows
        //   - Navigator with county_ids in body → replace existing set
        //   - Navigator without county_ids in body → leave existing rows alone
        if (effectiveRole !== 'navigator') {
            await sql`DELETE FROM user_counties WHERE user_id = ${params.id}::uuid`;
        } else if (countyIdsProvided) {
            const txQueries: any[] = [
                sql`DELETE FROM user_counties WHERE user_id = ${params.id}::uuid`,
            ];
            for (const cid of countyIds) {
                txQueries.push(
                    sql`INSERT INTO user_counties (user_id, county_id) VALUES (${params.id}::uuid, ${cid}::uuid)`
                );
            }
            await (sql as any).transaction(txQueries);
        }

        const updated = await queryOne(`SELECT * FROM users WHERE id = $1`, [params.id]);

        await logAuditEvent(getUserId(session), 'update', 'users', params.id, undefined, {
            role: effectiveRole,
            county_ids: countyIdsProvided ? countyIds : undefined,
        });
        return NextResponse.json({ success: true, user: updated });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// DELETE /api/admin/users/[id] — remove user (cascade-deletes user_counties via FK on user_counties.user_id)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await requireAuth();
        if (!isAdmin(session)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

        if (getUserId(session) === params.id) {
            return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
        }

        // Clean up county assignments explicitly in case the FK isn't ON DELETE CASCADE.
        await sql`DELETE FROM user_counties WHERE user_id = ${params.id}::uuid`;
        await query(`DELETE FROM users WHERE id = $1`, [params.id]);
        await logAuditEvent(getUserId(session), 'delete', 'users', params.id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
