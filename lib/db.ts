import { neon } from '@neondatabase/serverless';

// Lazy initialization for AWS Amplify SSR compatibility
let _sql: ReturnType<typeof neon> | null = null;

function getConnection(): ReturnType<typeof neon> {
    if (!_sql) {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is not set');
        }
        _sql = neon(process.env.DATABASE_URL);
    }
    return _sql;
}

// Proxy defers connection until first actual query
export const sql: ReturnType<typeof neon> = new Proxy(function () {} as any, {
    apply(_target, _thisArg, args) {
        return (getConnection() as any)(...args);
    },
}) as any;

// ==================== QUERY HELPERS ====================

export async function query<T>(queryString: string, params?: unknown[]): Promise<T[]> {
    try {
        const result = await sql(queryString, params);
        return result as T[];
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

export async function queryOne<T>(queryString: string, params?: unknown[]): Promise<T | null> {
    const results = await query<T>(queryString, params);
    return results[0] || null;
}

export async function insert<T>(table: string, data: Record<string, unknown>): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.join(', ');

    const queryString = `
        INSERT INTO ${table} (${columns})
        VALUES (${placeholders})
        RETURNING *
    `;

    const result = await query<T>(queryString, values);
    return result[0];
}

export async function update<T>(
    table: string,
    data: Record<string, unknown>,
    where: Record<string, unknown>
): Promise<T[]> {
    const dataKeys = Object.keys(data);
    const whereKeys = Object.keys(where);

    const setClause = dataKeys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const whereClause = whereKeys.map((key, i) => `${key} = $${dataKeys.length + i + 1}`).join(' AND ');

    const values = [...Object.values(data), ...Object.values(where)];

    const queryString = `
        UPDATE ${table}
        SET ${setClause}, updated_at = NOW()
        WHERE ${whereClause}
        RETURNING *
    `;

    return query<T>(queryString, values);
}

export async function softDelete(
    table: string,
    id: string,
    field: 'is_archived' | 'is_inactive' = 'is_archived'
): Promise<boolean> {
    const queryString = `
        UPDATE ${table}
        SET ${field} = true, updated_at = NOW()
        WHERE id = $1
    `;
    await query(queryString, [id]);
    return true;
}

export async function hardDelete(table: string, id: string): Promise<boolean> {
    const queryString = `DELETE FROM ${table} WHERE id = $1`;
    await query(queryString, [id]);
    return true;
}

// ==================== AUDIT LOGGING ====================

export async function logAuditEvent(
    userId: string | null,
    action: string,
    tableName: string,
    recordId?: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    ipAddress?: string
): Promise<void> {
    try {
        await query(
            `INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                userId,
                action,
                tableName,
                recordId || null,
                oldValues ? JSON.stringify(oldValues) : null,
                newValues ? JSON.stringify(newValues) : null,
                ipAddress || null,
            ]
        );
    } catch (error) {
        console.error('Audit log error:', error);
    }
}

// ==================== USER HELPERS ====================

export async function getOrCreateUser(cognitoSub: string, email: string, name?: string) {
    const existing = await sql`
        SELECT * FROM users WHERE cognito_sub = ${cognitoSub}
    `;

    if (existing.length > 0) {
        await sql`UPDATE users SET updated_at = NOW() WHERE cognito_sub = ${cognitoSub}`;
        return existing[0];
    }

    // Try by email (existing user getting Cognito linked)
    const byEmail = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (byEmail.length > 0) {
        await sql`UPDATE users SET cognito_sub = ${cognitoSub}, updated_at = NOW() WHERE id = ${byEmail[0].id}`;
        return byEmail[0];
    }

    const [firstName, ...lastParts] = (name || '').split(' ');
    const lastName = lastParts.join(' ');

    const newUser = await sql`
        INSERT INTO users (cognito_sub, email, first_name, last_name)
        VALUES (${cognitoSub}, ${email}, ${firstName || null}, ${lastName || null})
        RETURNING *
    `;

    return newUser[0];
}

export async function getUserFacilities(cognitoSub: string) {
    return sql`
        SELECT
            f.id,
            f.name,
            f.primary_service,
            p.id AS provider_id,
            p.name AS provider_name,
            p.abbreviation AS provider_abbreviation,
            u.role
        FROM users u
        LEFT JOIN facilities f ON u.facility_id = f.id
        LEFT JOIN providers p ON f.provider_id = p.id
        WHERE u.cognito_sub = ${cognitoSub}
        AND u.is_active = true
    `;
}

// ==================== CLIENT HELPERS ====================

export async function getClientsByFacility(facilityId: string, includeArchived = false) {
    const archiveFilter = includeArchived ? '' : 'AND c.is_archived = false';

    return query(
        `SELECT
            c.*,
            f.name AS facility_name,
            p.name AS provider_name,
            rt.fourteen_day_status,
            rt.forty_two_day_status,
            rt.ninety_day_status,
            rt.final_report_status
        FROM clients c
        LEFT JOIN facilities f ON c.facility_id = f.id
        LEFT JOIN providers p ON f.provider_id = p.id
        LEFT JOIN report_tracking rt ON rt.client_id = c.id
        WHERE c.facility_id = $1
        ${archiveFilter}
        ORDER BY c.last_name, c.first_name`,
        [facilityId]
    );
}

export async function getClientById(id: string) {
    return queryOne(
        `SELECT
            c.*,
            f.name AS facility_name,
            p.name AS provider_name,
            p.id AS provider_id,
            r.first_name AS referral_first_name,
            r.case_navigator_id
        FROM clients c
        LEFT JOIN facilities f ON c.facility_id = f.id
        LEFT JOIN providers p ON f.provider_id = p.id
        LEFT JOIN referrals r ON r.client_id = c.id
        WHERE c.id = $1`,
        [id]
    );
}

// ==================== VALIDATION ====================

export function validateUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
}

export function sanitizeInput(input: string): string {
    return input.trim().slice(0, 10000);
}
