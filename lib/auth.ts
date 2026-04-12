import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { sql } from '@/lib/db';

export { authOptions };

// DDOR session with facility context
export interface DDORSession {
    user: {
        id: string; // cognito_sub
        name?: string | null;
        email?: string | null;
    };
    ddor: {
        userId: string;      // internal UUID
        role: string;        // user_role enum
        facilityId: string | null;
        facilityName: string | null;
        providerId: string | null;
        providerName: string | null;
        providerAbbreviation: string | null;
    };
    currentFacilityId?: string;
    expires: string;
}

export async function getSession(): Promise<DDORSession | null> {
    return (await getServerSession(authOptions)) as DDORSession | null;
}

export async function requireAuth(): Promise<DDORSession> {
    const session = await getSession();
    if (!session?.user?.id || !session?.ddor?.userId) {
        throw new Error('Unauthorized');
    }
    return session;
}

/**
 * Require that the user can access a specific facility's data.
 * - super_admin / business_user: access all facilities
 * - navigator: access facilities in their assigned counties
 * - healthcare_user / poc / administrative_provider: access their own facility
 */
export async function requireFacilityAccess(facilityId: string): Promise<DDORSession> {
    const session = await requireAuth();
    const { role, facilityId: userFacilityId, userId } = session.ddor;

    // Admins can access everything
    if (role === 'super_admin' || role === 'business_user') {
        return session;
    }

    // Navigators can access facilities in their counties
    if (role === 'navigator') {
        const result = await sql`
            SELECT 1 FROM facilities f
            JOIN facility_servicing_counties fsc ON f.id = fsc.facility_id
            JOIN user_counties uc ON fsc.county_id = uc.county_id
            WHERE f.id = ${facilityId} AND uc.user_id = ${userId}::uuid
            LIMIT 1
        `;
        if (result.length > 0) return session;
    }

    // Provider staff can only access their own facility
    if (userFacilityId === facilityId) {
        return session;
    }

    // Check additional facility assignments
    const additional = await sql`
        SELECT 1 FROM user_facilities
        WHERE user_id = ${userId}::uuid AND facility_id = ${facilityId}::uuid
        LIMIT 1
    `;
    if (additional.length > 0) return session;

    throw new Error('Facility access denied');
}

/**
 * Require that the user can access a specific client's data.
 */
export async function requireClientAccess(clientId: string): Promise<DDORSession> {
    const session = await requireAuth();
    const { role, userId } = session.ddor;

    // Admins see all
    if (role === 'super_admin' || role === 'business_user') {
        return session;
    }

    // Get client's facility, then check facility access
    const client = await sql`SELECT facility_id FROM clients WHERE id = ${clientId}::uuid`;
    if (client.length === 0) throw new Error('Client not found');

    return requireFacilityAccess(client[0].facility_id);
}

/**
 * Check if user has admin role (FGI staff)
 */
export function isAdmin(session: DDORSession): boolean {
    return session.ddor.role === 'super_admin' || session.ddor.role === 'business_user';
}

/**
 * Check if user is a case navigator (AOC)
 */
export function isNavigator(session: DDORSession): boolean {
    return session.ddor.role === 'navigator';
}

/**
 * Get internal user UUID from session
 */
export function getUserId(session: DDORSession): string {
    return session.ddor.userId;
}

// Type augmentation for NextAuth
declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
        };
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        sub: string;
        accessToken?: string;
    }
}
