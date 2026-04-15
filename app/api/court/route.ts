import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

// GET /api/court?search=name&id=uuid
export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth();
        const ddor = (session as any)?.ddor;
        const role = ddor?.role;

        // Court access: super_admin, business_user, court_assessor
        const courtRoles = ['super_admin', 'business_user', 'court_assessor', 'navigator'];
        if (!courtRoles.includes(role)) {
            return NextResponse.json({ error: 'Court access required' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search');
        const clientId = searchParams.get('id');

        // Search mode
        if (search && !clientId) {
            const term = search.trim().toLowerCase();
            const clients = await query(`
                SELECT c.id, c.first_name, c.last_name, c.ddor_id, c.diagnosis,
                    c.is_archived, c.treatment_start_date,
                    f.name AS facility_name, p.name AS provider_name,
                    rt.fourteen_day_status, rt.forty_two_day_status, rt.ninety_day_status,
                    rt.one_eighty_day_status, rt.final_report_status
                FROM clients c
                LEFT JOIN facilities f ON c.facility_id = f.id
                LEFT JOIN providers p ON f.provider_id = p.id
                LEFT JOIN report_tracking rt ON rt.client_id = c.id
                WHERE (LOWER(c.first_name) LIKE $1
                    OR LOWER(c.last_name) LIKE $1
                    OR LOWER(c.first_name || ' ' || c.last_name) LIKE $1
                    OR c.ddor_id::text LIKE $1)
                ORDER BY c.last_name, c.first_name
                LIMIT 15
            `, [`%${term}%`]);

            return NextResponse.json({ clients });
        }

        // Detail mode — full compliance snapshot
        if (clientId) {
            const client = await query(`
                SELECT c.*,
                    f.name AS facility_name, f.phone AS facility_phone,
                    f.street_address AS facility_address, f.city AS facility_city,
                    p.name AS provider_name
                FROM clients c
                LEFT JOIN facilities f ON c.facility_id = f.id
                LEFT JOIN providers p ON f.provider_id = p.id
                WHERE c.id = $1
            `, [clientId]);

            if (client.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

            // Report tracking with computed days
            const tracking = await query(`
                SELECT rt.*,
                    (c.treatment_start_date + INTERVAL '14 days')::DATE AS fourteen_day_due,
                    (c.treatment_start_date + INTERVAL '14 days')::DATE - CURRENT_DATE AS fourteen_day_remaining,
                    (c.treatment_start_date + INTERVAL '42 days')::DATE AS forty_two_day_due,
                    (c.treatment_start_date + INTERVAL '42 days')::DATE - CURRENT_DATE AS forty_two_day_remaining,
                    (c.treatment_start_date + INTERVAL '90 days')::DATE AS ninety_day_due,
                    (c.treatment_start_date + INTERVAL '90 days')::DATE - CURRENT_DATE AS ninety_day_remaining,
                    (c.treatment_start_date + INTERVAL '180 days')::DATE AS one_eighty_day_due,
                    (c.treatment_start_date + INTERVAL '180 days')::DATE - CURRENT_DATE AS one_eighty_day_remaining,
                    (c.treatment_start_date + INTERVAL '270 days')::DATE AS two_seventy_day_due,
                    (c.treatment_start_date + INTERVAL '270 days')::DATE - CURRENT_DATE AS two_seventy_day_remaining,
                    (c.treatment_start_date + INTERVAL '360 days')::DATE AS three_sixty_day_due,
                    (c.treatment_start_date + INTERVAL '360 days')::DATE - CURRENT_DATE AS three_sixty_day_remaining
                FROM report_tracking rt
                JOIN clients c ON rt.client_id = c.id
                WHERE rt.client_id = $1
                LIMIT 1
            `, [clientId]);

            // Recent reports
            const reports = await query(`
                SELECT r.report_type, r.date_submitted, r.is_signed, r.quarter_completed
                FROM reports r WHERE r.client_id = $1
                ORDER BY r.date_submitted DESC LIMIT 10
            `, [clientId]);

            // Status changes
            const statusChanges = await query(`
                SELECT r.report_type, r.date_submitted
                FROM reports r WHERE r.client_id = $1 AND r.report_type = 'status_change'
                ORDER BY r.date_submitted DESC LIMIT 5
            `, [clientId]);

            // Assessment scores
            const assessments = await query(`
                SELECT qs.questionnaire_type, qs.total_score, qs.submitted_at
                FROM questionnaire_submissions qs
                WHERE qs.client_id = $1 AND qs.is_complete = true
                ORDER BY qs.submitted_at DESC LIMIT 10
            `, [clientId]);

            // Referral info
            const referral = await query(`
                SELECT r.referral_number, r.date_received, r.screen_date,
                    r.eligibility, r.referral_type_status,
                    r.loc_recommendation, r.initial_housing
                FROM referrals r WHERE r.client_id = $1
                ORDER BY r.date_received DESC LIMIT 1
            `, [clientId]);

            // Compute compliance score
            const cl = client[0] as any;
            const tr = tracking[0] as any;
            let complianceIssues: string[] = [];
            let complianceScore = 'compliant';

            if (tr) {
                const statuses = [tr.fourteen_day_status, tr.forty_two_day_status, tr.ninety_day_status, tr.one_eighty_day_status];
                const overdueCount = statuses.filter((s: string) => s === 'overdue').length;
                if (overdueCount > 0) {
                    complianceScore = overdueCount >= 2 ? 'non_compliant' : 'at_risk';
                    if (tr.fourteen_day_status === 'overdue') complianceIssues.push(`14-Day report ${Math.abs(parseInt(tr.fourteen_day_remaining))}d overdue`);
                    if (tr.forty_two_day_status === 'overdue') complianceIssues.push(`42-Day report ${Math.abs(parseInt(tr.forty_two_day_remaining))}d overdue`);
                    if (tr.ninety_day_status === 'overdue') complianceIssues.push(`90-Day report ${Math.abs(parseInt(tr.ninety_day_remaining))}d overdue`);
                    if (tr.one_eighty_day_status === 'overdue') complianceIssues.push(`180-Day report ${Math.abs(parseInt(tr.one_eighty_day_remaining))}d overdue`);
                }
            }
            if (cl.is_archived) { complianceScore = 'discharged'; complianceIssues.push('Participant has been discharged/archived'); }

            return NextResponse.json({
                client: cl,
                tracking: tr || null,
                reports,
                statusChanges,
                assessments,
                referral: referral[0] || null,
                compliance: { score: complianceScore, issues: complianceIssues },
            });
        }

        return NextResponse.json({ error: 'Provide search or id parameter' }, { status: 400 });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Court API error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
