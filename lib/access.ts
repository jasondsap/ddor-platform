// Access decisions for DDOR. Every access check in the codebase goes through
// this file — no inline access SQL elsewhere.
//
// Per Jason's call (see MENTIONS_FINDINGS.md): these wrap the existing role/
// facility/county rules from lib/auth.ts (super_admin + business_user see all;
// navigators see clients whose facility is in their user_counties or in a
// facility_servicing_counties row matching their counties; everyone else sees
// only their own facility and any user_facilities assignments). When Erin
// defines a new model, update only this file.
//
// These functions take an explicit userId rather than reading the session, so
// they can be called from server-side queries that need to enumerate access
// for users other than the caller (e.g., the @mention dropdown asking
// "which users can see this client?").

import { sql, query } from '@/lib/db';

export interface UserSummary {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
}

/**
 * Return the set of user IDs that can access the given client under the
 * current access rules.
 *
 * Used by the @mention dropdown on the client-note form so suggestions are
 * filtered at suggest-time. Also called again at dashboard-click-time as a
 * defense-in-depth backup (Camp B).
 */
export async function getUsersWithAccessToClient(clientId: string): Promise<string[]> {
    const rows = (await sql`
        WITH client_facility AS (
            SELECT facility_id FROM clients WHERE id = ${clientId}::uuid
        ),
        facility_info AS (
            SELECT id, county_id FROM facilities
            WHERE id = (SELECT facility_id FROM client_facility)
        )
        SELECT u.id
        FROM users u
        WHERE u.is_active = true
          AND (
            u.role IN ('super_admin', 'business_user')
            OR u.facility_id = (SELECT facility_id FROM client_facility)
            OR EXISTS (
                SELECT 1 FROM user_facilities uf
                WHERE uf.user_id = u.id
                  AND uf.facility_id = (SELECT facility_id FROM client_facility)
            )
            OR (
                u.role = 'navigator'
                AND EXISTS (
                    SELECT 1 FROM user_counties uc
                    WHERE uc.user_id = u.id
                      AND (
                          uc.county_id = (SELECT county_id FROM facility_info)
                          OR uc.county_id IN (
                              SELECT fsc.county_id FROM facility_servicing_counties fsc
                              WHERE fsc.facility_id = (SELECT facility_id FROM client_facility)
                          )
                      )
                )
            )
          )
    `) as { id: string }[];
    return rows.map(r => r.id);
}

/**
 * Like getUsersWithAccessToClient but returns full user summaries so the
 * mention dropdown can render names + roles directly.
 */
export async function getUserSummariesWithAccessToClient(clientId: string): Promise<UserSummary[]> {
    const rows = (await sql`
        WITH client_facility AS (
            SELECT facility_id FROM clients WHERE id = ${clientId}::uuid
        ),
        facility_info AS (
            SELECT id, county_id FROM facilities
            WHERE id = (SELECT facility_id FROM client_facility)
        )
        SELECT u.id, u.first_name, u.last_name, u.role
        FROM users u
        WHERE u.is_active = true
          AND (
            u.role IN ('super_admin', 'business_user')
            OR u.facility_id = (SELECT facility_id FROM client_facility)
            OR EXISTS (
                SELECT 1 FROM user_facilities uf
                WHERE uf.user_id = u.id
                  AND uf.facility_id = (SELECT facility_id FROM client_facility)
            )
            OR (
                u.role = 'navigator'
                AND EXISTS (
                    SELECT 1 FROM user_counties uc
                    WHERE uc.user_id = u.id
                      AND (
                          uc.county_id = (SELECT county_id FROM facility_info)
                          OR uc.county_id IN (
                              SELECT fsc.county_id FROM facility_servicing_counties fsc
                              WHERE fsc.facility_id = (SELECT facility_id FROM client_facility)
                          )
                      )
                )
            )
          )
        ORDER BY u.last_name, u.first_name
    `) as UserSummary[];
    return rows;
}

/**
 * Defense-in-depth check used at notification-click time on the dashboard.
 * Returns true if the given user is currently in the access set for the client.
 */
export async function canUserAccessClient(userId: string, clientId: string): Promise<boolean> {
    const rows = (await sql`
        WITH client_facility AS (
            SELECT facility_id FROM clients WHERE id = ${clientId}::uuid
        ),
        facility_info AS (
            SELECT id, county_id FROM facilities
            WHERE id = (SELECT facility_id FROM client_facility)
        )
        SELECT 1 AS allowed
        FROM users u
        WHERE u.id = ${userId}::uuid
          AND u.is_active = true
          AND (
            u.role IN ('super_admin', 'business_user')
            OR u.facility_id = (SELECT facility_id FROM client_facility)
            OR EXISTS (
                SELECT 1 FROM user_facilities uf
                WHERE uf.user_id = u.id
                  AND uf.facility_id = (SELECT facility_id FROM client_facility)
            )
            OR (
                u.role = 'navigator'
                AND EXISTS (
                    SELECT 1 FROM user_counties uc
                    WHERE uc.user_id = u.id
                      AND (
                          uc.county_id = (SELECT county_id FROM facility_info)
                          OR uc.county_id IN (
                              SELECT fsc.county_id FROM facility_servicing_counties fsc
                              WHERE fsc.facility_id = (SELECT facility_id FROM client_facility)
                          )
                      )
                )
            )
          )
        LIMIT 1
    `) as { allowed: number }[];
    return rows.length > 0;
}

/**
 * Return all client IDs visible to the given user under current rules.
 * Mirrors the role-scoping logic from /api/clients route handler.
 */
export async function getAccessibleClientIds(userId: string): Promise<string[]> {
    const user = (await query<{ role: string; facility_id: string | null }>(
        `SELECT role, facility_id FROM users WHERE id = $1 AND is_active = true`,
        [userId]
    ))[0];
    if (!user) return [];

    if (user.role === 'super_admin' || user.role === 'business_user') {
        const rows = (await sql`SELECT id FROM clients WHERE is_archived = false`) as { id: string }[];
        return rows.map(r => r.id);
    }

    if (user.role === 'navigator') {
        const rows = (await sql`
            SELECT c.id FROM clients c
            JOIN facilities f ON c.facility_id = f.id
            WHERE c.is_archived = false
              AND f.county_id IN (SELECT county_id FROM user_counties WHERE user_id = ${userId}::uuid)
        `) as { id: string }[];
        return rows.map(r => r.id);
    }

    // Provider staff: own facility + any user_facilities assignments
    const rows = (await sql`
        SELECT c.id FROM clients c
        WHERE c.is_archived = false
          AND (
            c.facility_id = ${user.facility_id}::uuid
            OR c.facility_id IN (
                SELECT facility_id FROM user_facilities WHERE user_id = ${userId}::uuid
            )
          )
    `) as { id: string }[];
    return rows.map(r => r.id);
}
