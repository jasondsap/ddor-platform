import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserId } from '@/lib/auth';
import { query, queryOne, insert, logAuditEvent } from '@/lib/db';

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

        // Activity log
        const activity = await query(
            `SELECT al.*, u.first_name || ' ' || u.last_name AS user_name
             FROM referral_activity_log al
             LEFT JOIN users u ON al.user_id = u.id
             WHERE al.referral_id = $1
             ORDER BY al.created_at DESC`,
            [params.id]
        );

        return NextResponse.json({ referral, attributes: grouped, activity });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Error fetching referral:', error);
        return NextResponse.json({ error: 'Failed to fetch referral' }, { status: 500 });
    }
}

// PATCH /api/referrals/[id] — update referral fields
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await requireAuth();
        const userId = getUserId(session);
        const body = await req.json();

        const allowed = [
            'assessor_status', 'eligibility', 'referral_type_status', 'closed_reason',
            'initial_housing', 'has_insurance', 'location_at_referral',
            'provider_recommendation_id', 'loc_recommendation',
            'smi_symptoms', 'tbi_abi', 'major_medical_issues',
            'is_urgent', 'urgent_message', 'screen_date',
            'case_navigator_name', 'case_navigator_email',
            'case_navigator_id', 'state_assessor_id',
            'client_id', 'is_archived',
        ];

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

        if (updates.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        updates.push('updated_at = NOW()');
        values.push(params.id);

        await query(`UPDATE referrals SET ${updates.join(', ')} WHERE id = $${idx}`, values);

        // Log status changes as activity
        if (body._log_activity) {
            await insert('referral_activity_log', {
                referral_id: params.id,
                user_id: userId,
                activity_type: body._log_activity.type || 'edit',
                content: body._log_activity.content,
                previous_value: body._log_activity.previous || null,
                new_value: body._log_activity.new_value || null,
            });
        }

        await logAuditEvent(userId, 'update', 'referrals', params.id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Error updating referral:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// POST /api/referrals/[id] — add activity log note
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await requireAuth();
        const userId = getUserId(session);
        const body = await req.json();

        if (!body.content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 });

        const note = await insert('referral_activity_log', {
            referral_id: params.id,
            user_id: userId,
            activity_type: body.activity_type || 'note',
            content: body.content.trim(),
            previous_value: body.previous_value || null,
            new_value: body.new_value || null,
        });

        return NextResponse.json({ success: true, note });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
