import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

// GET /api/analytics — program-wide stats for dashboard
export async function GET(req: NextRequest) {
    try {
        await requireAuth();

        // Run all queries in parallel
        const [
            programStats,
            diagnosisBreakdown,
            reportsByType,
            reportsByMonth,
            providerStats,
            countyStats,
            reportCompletionRates,
            recentActivity,
        ] = await Promise.all([
            // 1. Program-wide KPIs
            query(`
                SELECT
                    (SELECT COUNT(*) FROM clients WHERE is_archived = false) AS active_clients,
                    (SELECT COUNT(*) FROM clients WHERE is_archived = true) AS archived_clients,
                    (SELECT COUNT(*) FROM clients) AS total_clients,
                    (SELECT COUNT(*) FROM referrals) AS total_referrals,
                    (SELECT COUNT(*) FROM reports) AS total_reports,
                    (SELECT COUNT(*) FROM invoices WHERE is_archived = false) AS total_invoices,
                    (SELECT COUNT(*) FROM facilities WHERE is_inactive = false) AS active_facilities,
                    (SELECT COUNT(*) FROM providers) AS total_providers,
                    (SELECT COUNT(*) FROM report_tracking WHERE fourteen_day_status = 'overdue'
                        OR forty_two_day_status = 'overdue' OR ninety_day_status = 'overdue'
                        OR one_eighty_day_status = 'overdue') AS clients_with_overdue,
                    (SELECT COALESCE(SUM(payment_due), 0) FROM invoices WHERE reimbursement_status::text = 'Paid') AS total_paid,
                    (SELECT COALESCE(SUM(payment_due), 0) FROM invoices WHERE reimbursement_status::text != 'Paid' AND is_archived = false) AS total_pending
            `),

            // 2. Diagnosis breakdown
            query(`
                SELECT
                    COALESCE(diagnosis::text, 'unspecified') AS diagnosis,
                    COUNT(*) AS count
                FROM clients WHERE is_archived = false
                GROUP BY diagnosis::text ORDER BY count DESC
            `),

            // 3. Reports by type
            query(`
                SELECT report_type::text AS report_type, COUNT(*) AS count
                FROM reports
                GROUP BY report_type::text ORDER BY count DESC
            `),

            // 4. Reports by month (last 12 months)
            query(`
                SELECT
                    TO_CHAR(date_submitted, 'YYYY-MM') AS month,
                    COUNT(*) AS count
                FROM reports
                WHERE date_submitted >= NOW() - INTERVAL '12 months'
                GROUP BY month ORDER BY month
            `),

            // 5. Top providers by client count
            query(`
                SELECT
                    p.name AS provider_name,
                    p.abbreviation,
                    COUNT(DISTINCT c.id) AS client_count,
                    COUNT(DISTINCT f.id) AS facility_count,
                    COUNT(DISTINCT r.id) AS report_count
                FROM providers p
                LEFT JOIN facilities f ON f.provider_id = p.id AND f.is_inactive = false
                LEFT JOIN clients c ON c.facility_id = f.id AND c.is_archived = false
                LEFT JOIN reports r ON r.client_id = c.id
                GROUP BY p.id, p.name, p.abbreviation
                HAVING COUNT(DISTINCT c.id) > 0
                ORDER BY client_count DESC
                LIMIT 15
            `),

            // 6. County participation
            query(`
                SELECT
                    co.name AS county_name,
                    COUNT(DISTINCT c.id) AS client_count,
                    COUNT(DISTINCT f.id) AS facility_count
                FROM counties co
                LEFT JOIN facilities f ON f.county_id = co.id AND f.is_inactive = false
                LEFT JOIN clients c ON c.facility_id = f.id AND c.is_archived = false
                GROUP BY co.id, co.name
                HAVING COUNT(DISTINCT c.id) > 0
                ORDER BY client_count DESC
                LIMIT 20
            `),

            // 7. Report completion rates
            query(`
                SELECT
                    'fourteen_day' AS milestone,
                    COUNT(*) FILTER (WHERE fourteen_day_status = 'completed') AS completed,
                    COUNT(*) FILTER (WHERE fourteen_day_status = 'overdue') AS overdue,
                    COUNT(*) FILTER (WHERE fourteen_day_status = 'pending') AS pending,
                    COUNT(*) AS total
                FROM report_tracking
                UNION ALL
                SELECT 'forty_two_day',
                    COUNT(*) FILTER (WHERE forty_two_day_status = 'completed'),
                    COUNT(*) FILTER (WHERE forty_two_day_status = 'overdue'),
                    COUNT(*) FILTER (WHERE forty_two_day_status = 'pending'),
                    COUNT(*)
                FROM report_tracking
                UNION ALL
                SELECT 'ninety_day',
                    COUNT(*) FILTER (WHERE ninety_day_status = 'completed'),
                    COUNT(*) FILTER (WHERE ninety_day_status = 'overdue'),
                    COUNT(*) FILTER (WHERE ninety_day_status = 'pending'),
                    COUNT(*)
                FROM report_tracking
                UNION ALL
                SELECT 'final_report',
                    COUNT(*) FILTER (WHERE final_report_status = 'completed'),
                    COUNT(*) FILTER (WHERE final_report_status = 'overdue'),
                    COUNT(*) FILTER (WHERE final_report_status = 'pending'),
                    COUNT(*)
                FROM report_tracking
            `),

            // 8. Recent activity (last 10 events)
            query(`
                (SELECT 'report' AS type, r.report_type::text AS subtype,
                    c.first_name || ' ' || c.last_name AS name,
                    r.created_at, f.name AS facility
                FROM reports r
                JOIN clients c ON r.client_id = c.id
                LEFT JOIN facilities f ON r.facility_id = f.id
                ORDER BY r.created_at DESC LIMIT 5)
                UNION ALL
                (SELECT 'referral', 'new_referral',
                    ref.first_name || ' ' || ref.last_name,
                    ref.created_at, NULL
                FROM referrals ref
                ORDER BY ref.created_at DESC LIMIT 5)
                ORDER BY created_at DESC LIMIT 10
            `),
        ]);

        return NextResponse.json({
            programStats: programStats[0] || {},
            diagnosisBreakdown,
            reportsByType,
            reportsByMonth,
            providerStats,
            countyStats,
            reportCompletionRates,
            recentActivity,
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Analytics error:', error);
        return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
    }
}
