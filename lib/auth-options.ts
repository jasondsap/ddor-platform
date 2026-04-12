import type { NextAuthOptions } from 'next-auth';
import CognitoProvider from 'next-auth/providers/cognito';
import { getOrCreateUser, getUserFacilities } from '@/lib/db';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export const authOptions: NextAuthOptions = {
    providers: [
        CognitoProvider({
            clientId: process.env.COGNITO_CLIENT_ID!,
            clientSecret: process.env.COGNITO_CLIENT_SECRET!,
            issuer: process.env.COGNITO_ISSUER!,
            checks: ['pkce', 'state'],
        }),
    ],

    secret: process.env.NEXTAUTH_SECRET,

    session: {
        strategy: 'jwt',
        maxAge: 8 * 60 * 60, // 8 hours
    },

    callbacks: {
        async signIn({ user, account }) {
            try {
                if (account?.provider === 'cognito') {
                    const cognitoSub = account.providerAccountId;
                    const email = user.email ?? null;
                    const name = user.name ?? undefined;
                    if (email) {
                        await getOrCreateUser(cognitoSub, email, name);
                    }
                }
                return true;
            } catch (err) {
                console.error('signIn callback error:', err);
                return true;
            }
        },

        async jwt({ token, account }) {
            if (account?.provider === 'cognito') {
                token.sub = account.providerAccountId;
                (token as any).accessToken = account.access_token;
            }
            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.sub as string;

                try {
                    // First try the full join (facilities + providers)
                    let userInfo: any[] = [];
                    try {
                        userInfo = await sql`
                            SELECT
                                u.id AS user_id,
                                u.role,
                                u.facility_id,
                                f.name AS facility_name,
                                f.provider_id,
                                p.name AS provider_name,
                                p.abbreviation AS provider_abbreviation
                            FROM users u
                            LEFT JOIN facilities f ON u.facility_id = f.id
                            LEFT JOIN providers p ON f.provider_id = p.id
                            WHERE u.cognito_sub = ${token.sub as string}
                        `;
                    } catch {
                        // Fallback: just get user row (tables may not have data yet)
                        userInfo = await sql`
                            SELECT id AS user_id, role, facility_id
                            FROM users
                            WHERE cognito_sub = ${token.sub as string}
                        `;
                    }

                    if (userInfo.length > 0) {
                        const u = userInfo[0];
                        (session as any).ddor = {
                            userId: u.user_id,
                            role: u.role || 'healthcare_user',
                            facilityId: u.facility_id || null,
                            facilityName: u.facility_name || null,
                            providerId: u.provider_id || null,
                            providerName: u.provider_name || null,
                            providerAbbreviation: u.provider_abbreviation || null,
                        };
                    } else {
                        // User not in DB yet — set minimal session so app doesn't crash
                        (session as any).ddor = {
                            userId: null,
                            role: 'healthcare_user',
                            facilityId: null,
                            facilityName: null,
                            providerId: null,
                            providerName: null,
                            providerAbbreviation: null,
                        };
                    }
                } catch (err) {
                    console.error('session callback error:', err);
                    // Ensure ddor always exists so pages don't crash
                    (session as any).ddor = {
                        userId: null,
                        role: 'healthcare_user',
                        facilityId: null,
                        facilityName: null,
                        providerId: null,
                        providerName: null,
                        providerAbbreviation: null,
                    };
                }
            }
            return session;
        },
    },

    pages: {
        signIn: '/auth/signin',
        error: '/auth/error',
    },

    debug: process.env.NODE_ENV === 'development',
};
