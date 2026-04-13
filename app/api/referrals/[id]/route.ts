import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

// GET /api/referrals/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        await requireAuth();

        const referral = await queryOne<any>(
            `SELECT r.*,
                    co.name AS county_name,
                    sa.first_name || ' ' || sa.last_name AS assessor_name,
                    cn.first_name || ' ' || cn.last_name AS navigator_name,
                    f.name AS recommended_facility_name,
                    p.name AS recommended_provider_name,
                    c.id AS linked_client_id,
                    c.first_name || ' ' || c.last_name AS linked_client_name,
                    u.first_name || ' ' || u.last_name AS created_by_name
             FROM referrals r
             LEFT JOIN counties co ON r.originating_county_id = co.id
             LEFT JOIN users sa ON r.state_assessor_id = sa.id
             LEFT JOIN users cn ON r.case_navigator_id = cn.id
             LEFT JOIN facilities f ON r.provider_recommendation_id = f.id
             LEFT JOIN providers p ON f.provider_id = p.id
             LEFT JOIN clients c ON r.client_id = c.id
             LEFT JOIN users u ON r.created_by = u.id
             WHERE r.id = $1`,
            [params.id]
        );

        if (!referral) return NextResponse.json({ error: 'Referral not found' }, { status: 404 });

        const attributes = await query<any>(
            `SELECT attribute_type, value FROM referral_attributes WHERE referral_id = $1 ORDER BY attribute_type, value`,
            [params.id]
        );

        const grouped: Record<string, string[]> = {};
        for (const a of attributes) {
            if (!grouped[a.attribute_type]) grouped[a.attribute_type] = [];
            grouped[a.attribute_type].push(a.value);
        }

        return NextResponse.json({ referral, attributes: grouped });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Error fetching referral:', error);
        return NextResponse.json({ error: 'Failed to fetch referral' }, { status: 500 });
    }
}
