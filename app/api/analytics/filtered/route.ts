import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

// GET /api/analytics/filtered?provider_id=X or ?county_id=X
export async function GET(req: NextRequest) {
    try {
        await requireAuth();
        const { searchParams } = new URL(req.url);
        const providerId = searchParams.get('provider_id');
        const countyId = searchParams.get('county_id');

        // Build WHERE clauses for clients, reports, etc.
        let clientWhere = 'c.is_archived = false';
        let clientWhereAll = '1=1'; // includes archived
        const params: any[] = [];
        let idx = 1;

        if (providerId) {
            clientWhere += ` AND f.provider_id = $${idx}`;
            clientWhereAll += ` AND f.provider_id = $${idx}`;
            params.push(providerId);
            idx++;
        }
        if (countyId) {
            clientWhere += ` AND f.county_id = $${idx}`;
            clientWhereAll += ` AND f.county_id = $${idx}`;
            params.push(countyId);
            idx++;
        }

        // 1. KPIs
        const kpis = await query(`
            SELECT
                COUNT(*) FILTER (WHERE ${clientWhere.replace(/c\./g, 'cl.')}) AS active_clients,
                COUNT(*) FILTER (WHERE cl.is_archived = true ${providerId ? `AND f.provider_id = $1` : ''} ${countyId ? `AND f.county_id = $${providerId ? 2 : 1}` : ''}) AS archived_clients,
                COUNT(*) AS total_clients
            FROM clients cl
            JOIN facilities f ON cl.facility_id = f.id
            WHERE ${clientWhereAll.replace(/c\./g, 'cl.')}
        `, params);

        // 2. Reports count
        const reportCount = await query(`
            SELECT COUNT(*) AS total_reports
            FROM reports r
            JOIN clients c ON r.client_id = c.id
            JOIN facilities f ON c.facility_id = f.id
            WHERE ${clientWhereAll}
        `, params);

        // 3. Overdue count
        const overdueCount = await query(`
            SELECT COUNT(*) AS clients_with_overdue
            FROM report_tracking rt
            JOIN clients c ON rt.client_id = c.id
            JOIN facilities f ON c.facility_id = f.id
            WHERE ${clientWhere}
            AND (rt.fourteen_day_status = 'overdue' OR rt.forty_two_day_status = 'overdue'
                OR rt.ninety_day_status = 'overdue' OR rt.one_eighty_day_status = 'overdue')
        `, params);

        // 4. Facilities count
        const facilityCount = await query(`
            SELECT COUNT(*) AS active_facilities
            FROM facilities f
            WHERE f.is_inactive = false
            ${providerId ? `AND f.provider_id = $1` : ''}
            ${countyId ? `AND f.county_id = $${providerId ? 2 : 1}` : ''}
        `, params);

        // 5. Invoice totals
        const invoiceTotals = await query(`
            SELECT
                COALESCE(SUM(CASE WHEN i.reimbursement_status::text = 'Paid' THEN i.payment_due ELSE 0 END), 0) AS total_paid,
                COALESCE(SUM(CASE WHEN i.reimbursement_status::text != 'Paid' AND i.is_archived = false THEN i.payment_due ELSE 0 END), 0) AS total_pending
            FROM invoices i
            JOIN facilities f ON i.facility_id = f.id
            WHERE 1=1
            ${providerId ? `AND f.provider_id = $1` : ''}
            ${countyId ? `AND f.county_id = $${providerId ? 2 : 1}` : ''}
        `, params);

        const programStats = {
            ...(kpis[0] || {}),
            total_reports: (reportCount[0] as any)?.total_reports || 0,
            clients_with_overdue: (overdueCount[0] as any)?.clients_with_overdue || 0,
            active_facilities: (facilityCount[0] as any)?.active_facilities || 0,
            total_paid: (invoiceTotals[0] as any)?.total_paid || 0,
            total_pending: (invoiceTotals[0] as any)?.total_pending || 0,
        };

        // 6. Diagnosis breakdown
        const diagnosisBreakdown = await query(`
            SELECT COALESCE(c.diagnosis::text, 'unspecified') AS diagnosis, COUNT(*) AS count
            FROM clients c JOIN facilities f ON c.facility_id = f.id
            WHERE ${clientWhere}
            GROUP BY c.diagnosis::text ORDER BY count DESC
        `, params);

        // 7. Reports by type
        const reportsByType = await query(`
            SELECT r.report_type::text AS report_type, COUNT(*) AS count
            FROM reports r JOIN clients c ON r.client_id = c.id JOIN facilities f ON c.facility_id = f.id
            WHERE ${clientWhereAll}
            GROUP BY r.report_type::text ORDER BY count DESC
        `, params);

        // 8. Reports by month
        const reportsByMonth = await query(`
            SELECT TO_CHAR(r.date_submitted, 'YYYY-MM') AS month, COUNT(*) AS count
            FROM reports r JOIN clients c ON r.client_id = c.id JOIN facilities f ON c.facility_id = f.id
            WHERE r.date_submitted >= NOW() - INTERVAL '12 months' AND ${clientWhereAll}
            GROUP BY month ORDER BY month
        `, params);

        // 9. Facility breakdown (for provider view)
        const facilityStats = await query(`
            SELECT f.id, f.name AS facility_name,
                COUNT(DISTINCT c.id) FILTER (WHERE c.is_archived = false) AS client_count,
                COUNT(DISTINCT r.id) AS report_count
            FROM facilities f
            LEFT JOIN clients c ON c.facility_id = f.id
            LEFT JOIN reports r ON r.client_id = c.id
            WHERE f.is_inactive = false
            ${providerId ? `AND f.provider_id = $1` : ''}
            ${countyId ? `AND f.county_id = $${providerId ? 2 : 1}` : ''}
            GROUP BY f.id, f.name
            HAVING COUNT(DISTINCT c.id) FILTER (WHERE c.is_archived = false) > 0
            ORDER BY client_count DESC
        `, params);

        // 10. Report completion rates
        const reportCompletionRates = await query(`
            SELECT 'fourteen_day' AS milestone,
                COUNT(*) FILTER (WHERE rt.fourteen_day_status = 'completed') AS completed,
                COUNT(*) FILTER (WHERE rt.fourteen_day_status = 'overdue') AS overdue,
                COUNT(*) FILTER (WHERE rt.fourteen_day_status = 'pending') AS pending,
                COUNT(*) AS total
            FROM report_tracking rt
            JOIN clients c ON rt.client_id = c.id
            JOIN facilities f ON c.facility_id = f.id
            WHERE ${clientWhere}
            UNION ALL
            SELECT 'forty_two_day',
                COUNT(*) FILTER (WHERE rt.forty_two_day_status = 'completed'),
                COUNT(*) FILTER (WHERE rt.forty_two_day_status = 'overdue'),
                COUNT(*) FILTER (WHERE rt.forty_two_day_status = 'pending'),
                COUNT(*)
            FROM report_tracking rt JOIN clients c ON rt.client_id = c.id JOIN facilities f ON c.facility_id = f.id
            WHERE ${clientWhere}
            UNION ALL
            SELECT 'ninety_day',
                COUNT(*) FILTER (WHERE rt.ninety_day_status = 'completed'),
                COUNT(*) FILTER (WHERE rt.ninety_day_status = 'overdue'),
                COUNT(*) FILTER (WHERE rt.ninety_day_status = 'pending'),
                COUNT(*)
            FROM report_tracking rt JOIN clients c ON rt.client_id = c.id JOIN facilities f ON c.facility_id = f.id
            WHERE ${clientWhere}
            UNION ALL
            SELECT 'final_report',
                COUNT(*) FILTER (WHERE rt.final_report_status = 'completed'),
                COUNT(*) FILTER (WHERE rt.final_report_status = 'overdue'),
                COUNT(*) FILTER (WHERE rt.final_report_status = 'pending'),
                COUNT(*)
            FROM report_tracking rt JOIN clients c ON rt.client_id = c.id JOIN facilities f ON c.facility_id = f.id
            WHERE ${clientWhere}
        `, params);

        // 11. Recent activity
        const recentActivity = await query(`
            SELECT 'report' AS type, r.report_type::text AS subtype,
                c.first_name || ' ' || c.last_name AS name,
                r.created_at, f.name AS facility
            FROM reports r
            JOIN clients c ON r.client_id = c.id
            JOIN facilities f ON r.facility_id = f.id
            WHERE ${clientWhereAll}
            ORDER BY r.created_at DESC LIMIT 10
        `, params);

        // 12. Context info (provider name, county name)
        let contextName = 'Program-Wide';
        if (providerId) {
            const prov = await query(`SELECT name FROM providers WHERE id = $1`, [providerId]);
            if (prov.length > 0) contextName = (prov[0] as any).name;
        }
        if (countyId) {
            const cnty = await query(`SELECT name FROM counties WHERE id = $1`, [countyId]);
            if (cnty.length > 0) contextName = `${(cnty[0] as any).name} County`;
        }

        return NextResponse.json({
            contextName,
            programStats,
            diagnosisBreakdown,
            reportsByType,
            reportsByMonth,
            facilityStats,
            reportCompletionRates,
            recentActivity,
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Filtered analytics error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
