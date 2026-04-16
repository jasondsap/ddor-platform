import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAdmin } from '@/lib/auth';
import { query } from '@/lib/db';

// GET /api/analytics/quarterly-report?quarter=1&year=2026&format=json|xlsx
export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth();
        if (!isAdmin(session)) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const quarter = parseInt(searchParams.get('quarter') || '1');
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
        const format = searchParams.get('format') || 'json';

        if (quarter < 1 || quarter > 4) {
            return NextResponse.json({ error: 'Quarter must be 1-4' }, { status: 400 });
        }

        // Calculate quarter date range
        const startMonth = (quarter - 1) * 3 + 1;
        const endMonth = startMonth + 2;
        const startDate = `${year}-${String(startMonth).padStart(2, '0')}-01`;
        const endDate = new Date(year, endMonth, 0).toISOString().split('T')[0]; // Last day of end month

        const data = await fetchQuarterlyData(startDate, endDate, quarter, year);

        if (format === 'xlsx') {
            return generateExcel(data, quarter, year);
        }

        return NextResponse.json({
            quarter: `Q${quarter} ${year}`,
            period: { start: startDate, end: endDate },
            ...data,
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Quarterly report error:', error);
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
    }
}

// ============================================================================
// DATA FETCHING — All 12 report sections
// ============================================================================

async function fetchQuarterlyData(startDate: string, endDate: string, quarter: number, year: number) {
    const [
        treatment,
        discharge,
        lengthOfStay,
        dischargeMAT,
        mhByProvider,
        sudByProvider,
        matByProvider,
        trainingByProvider,
        educationByProvider,
        completionsByProvider,
        finalReportsByProvider,
    ] = await Promise.all([
        // 1. TREATMENT — per-provider summary (covers Totals + Treatment sheets)
        query<any>(`
            WITH quarter_reports AS (
                SELECT r.*, p.name AS provider_name
                FROM reports r
                JOIN facilities f ON r.facility_id = f.id
                JOIN providers p ON f.provider_id = p.id
                WHERE r.date_submitted >= $1 AND r.date_submitted <= $2
            ),
            quarter_clients AS (
                SELECT DISTINCT qr.client_id, qr.provider_name
                FROM quarter_reports qr
            ),
            assessments AS (
                SELECT provider_name, COUNT(*) AS count
                FROM quarter_reports WHERE report_type = 'fourteen_day'
                GROUP BY provider_name
            ),
            receiving_services AS (
                SELECT provider_name, COUNT(DISTINCT client_id) AS count
                FROM quarter_reports
                GROUP BY provider_name
            ),
            compliant AS (
                SELECT qc.provider_name, COUNT(*) AS count
                FROM quarter_clients qc
                WHERE NOT EXISTS (
                    SELECT 1 FROM quarter_reports qr
                    WHERE qr.client_id = qc.client_id
                    AND qr.was_discharged = true
                    AND qr.discharge_reason != 'Successful Program Completion'
                )
                GROUP BY qc.provider_name
            ),
            bh_treatment AS (
                SELECT provider_name, COUNT(DISTINCT client_id) AS count
                FROM quarter_reports
                WHERE current_mh_loc IS NOT NULL
                AND current_mh_loc != 'Does not apply'
                AND current_mh_loc != ''
                GROUP BY provider_name
            ),
            sud_treatment AS (
                SELECT provider_name, COUNT(DISTINCT client_id) AS count
                FROM quarter_reports
                WHERE current_sud_loc IS NOT NULL
                AND current_sud_loc != 'Does not apply'
                AND current_sud_loc != ''
                GROUP BY provider_name
            ),
            mat_receiving AS (
                SELECT provider_name, COUNT(DISTINCT client_id) AS count
                FROM quarter_reports
                WHERE is_receiving_mat = true
                GROUP BY provider_name
            ),
            job_training AS (
                SELECT provider_name, COUNT(DISTINCT client_id) AS count
                FROM quarter_reports
                WHERE kyae_employment_status IN ('Completed employment training')
                GROUP BY provider_name
            ),
            education_comp AS (
                SELECT provider_name, COUNT(DISTINCT client_id) AS count
                FROM quarter_reports
                WHERE kyae_education_status IN ('Completed Education')
                GROUP BY provider_name
            ),
            completions AS (
                SELECT provider_name, COUNT(DISTINCT client_id) AS count
                FROM quarter_reports
                WHERE report_type = 'final'
                AND discharge_reason = 'Successful Program Completion'
                GROUP BY provider_name
            )
            SELECT
                rs.provider_name,
                COALESCE(a.count, 0)::int AS clinical_assessments,
                COALESCE(rs.count, 0)::int AS receiving_services,
                COALESCE(co.count, 0)::int AS compliant,
                COALESCE(bh.count, 0)::int AS bh_treatment,
                COALESCE(sud.count, 0)::int AS sud_treatment,
                COALESCE(m.count, 0)::int AS mat_receiving,
                COALESCE(jt.count, 0)::int AS job_training,
                COALESCE(ed.count, 0)::int AS education_completed,
                COALESCE(comp.count, 0)::int AS successful_completions
            FROM receiving_services rs
            LEFT JOIN assessments a ON a.provider_name = rs.provider_name
            LEFT JOIN compliant co ON co.provider_name = rs.provider_name
            LEFT JOIN bh_treatment bh ON bh.provider_name = rs.provider_name
            LEFT JOIN sud_treatment sud ON sud.provider_name = rs.provider_name
            LEFT JOIN mat_receiving m ON m.provider_name = rs.provider_name
            LEFT JOIN job_training jt ON jt.provider_name = rs.provider_name
            LEFT JOIN education_comp ed ON ed.provider_name = rs.provider_name
            LEFT JOIN completions comp ON comp.provider_name = rs.provider_name
            ORDER BY rs.provider_name
        `, [startDate, endDate]),

        // 2. DISCHARGE — by provider + reason
        query<any>(`
            SELECT
                p.name AS provider_name,
                r.discharge_reason,
                COUNT(*) AS count
            FROM reports r
            JOIN facilities f ON r.facility_id = f.id
            JOIN providers p ON f.provider_id = p.id
            WHERE r.date_submitted >= $1 AND r.date_submitted <= $2
            AND r.was_discharged = true
            AND r.discharge_reason IS NOT NULL
            AND r.discharge_reason != ''
            GROUP BY p.name, r.discharge_reason
            ORDER BY p.name, r.discharge_reason
        `, [startDate, endDate]),

        // 3. LENGTH OF STAY — individual discharged patients
        query<any>(`
            SELECT
                p.name AS provider_name,
                c.ddor_id AS patient_id,
                c.first_name,
                c.last_name,
                CASE
                    WHEN c.treatment_start_date IS NOT NULL AND r.discharge_date IS NOT NULL
                    THEN (r.discharge_date::date - c.treatment_start_date::date)
                    ELSE NULL
                END AS days_in_program
            FROM reports r
            JOIN clients c ON r.client_id = c.id
            JOIN facilities f ON r.facility_id = f.id
            JOIN providers p ON f.provider_id = p.id
            WHERE r.date_submitted >= $1 AND r.date_submitted <= $2
            AND r.report_type = 'final'
            AND r.was_discharged = true
            ORDER BY p.name, c.last_name
        `, [startDate, endDate]),

        // 4. DISCHARGE-MAT — discharged patients who received MAT
        query<any>(`
            SELECT
                c.ddor_id AS patient_id,
                p.name AS provider_name,
                r.discharge_reason
            FROM reports r
            JOIN clients c ON r.client_id = c.id
            JOIN facilities f ON r.facility_id = f.id
            JOIN providers p ON f.provider_id = p.id
            WHERE r.date_submitted >= $1 AND r.date_submitted <= $2
            AND r.report_type = 'final'
            AND r.was_discharged = true
            AND r.is_receiving_mat = true
            ORDER BY c.ddor_id
        `, [startDate, endDate]),

        // 5. MH — clients per provider with mental health services
        query<any>(`
            SELECT p.name AS provider_name, COUNT(DISTINCT r.client_id) AS count
            FROM reports r
            JOIN facilities f ON r.facility_id = f.id
            JOIN providers p ON f.provider_id = p.id
            WHERE r.date_submitted >= $1 AND r.date_submitted <= $2
            AND r.current_mh_loc IS NOT NULL
            AND r.current_mh_loc != 'Does not apply'
            AND r.current_mh_loc != ''
            GROUP BY p.name
            ORDER BY p.name
        `, [startDate, endDate]),

        // 6. SUD — clients per provider with SUD services
        query<any>(`
            SELECT p.name AS provider_name, COUNT(DISTINCT r.client_id) AS count
            FROM reports r
            JOIN facilities f ON r.facility_id = f.id
            JOIN providers p ON f.provider_id = p.id
            WHERE r.date_submitted >= $1 AND r.date_submitted <= $2
            AND r.current_sud_loc IS NOT NULL
            AND r.current_sud_loc != 'Does not apply'
            AND r.current_sud_loc != ''
            GROUP BY p.name
            ORDER BY p.name
        `, [startDate, endDate]),

        // 7. MAT — clients per provider receiving MAT
        query<any>(`
            SELECT p.name AS provider_name, COUNT(DISTINCT r.client_id) AS count
            FROM reports r
            JOIN facilities f ON r.facility_id = f.id
            JOIN providers p ON f.provider_id = p.id
            WHERE r.date_submitted >= $1 AND r.date_submitted <= $2
            AND r.is_receiving_mat = true
            GROUP BY p.name
            ORDER BY p.name
        `, [startDate, endDate]),

        // 8. TRAINING — clients who completed KYAE job training
        query<any>(`
            SELECT p.name AS provider_name, COUNT(DISTINCT r.client_id) AS count
            FROM reports r
            JOIN facilities f ON r.facility_id = f.id
            JOIN providers p ON f.provider_id = p.id
            WHERE r.date_submitted >= $1 AND r.date_submitted <= $2
            AND r.kyae_employment_status = 'Completed employment training'
            GROUP BY p.name
            ORDER BY p.name
        `, [startDate, endDate]),

        // 9. EDUCATION — clients who completed KYAE education
        query<any>(`
            SELECT p.name AS provider_name, COUNT(DISTINCT r.client_id) AS count
            FROM reports r
            JOIN facilities f ON r.facility_id = f.id
            JOIN providers p ON f.provider_id = p.id
            WHERE r.date_submitted >= $1 AND r.date_submitted <= $2
            AND r.kyae_education_status = 'Completed Education'
            GROUP BY p.name
            ORDER BY p.name
        `, [startDate, endDate]),

        // 10. COMPLETIONS — successful program completions
        query<any>(`
            SELECT p.name AS provider_name, COUNT(DISTINCT r.client_id) AS count
            FROM reports r
            JOIN facilities f ON r.facility_id = f.id
            JOIN providers p ON f.provider_id = p.id
            WHERE r.date_submitted >= $1 AND r.date_submitted <= $2
            AND r.report_type = 'final'
            AND r.discharge_reason = 'Successful Program Completion'
            GROUP BY p.name
            ORDER BY p.name
        `, [startDate, endDate]),

        // 11. FINAL REPORTS — count of final questionnaires per provider
        query<any>(`
            SELECT p.name AS provider_name, COUNT(*) AS count
            FROM reports r
            JOIN facilities f ON r.facility_id = f.id
            JOIN providers p ON f.provider_id = p.id
            WHERE r.date_submitted >= $1 AND r.date_submitted <= $2
            AND r.report_type = 'final'
            GROUP BY p.name
            ORDER BY p.name
        `, [startDate, endDate]),
    ]);

    // Calculate totals
    const totals = {
        clinical_assessments: treatment.reduce((s: number, r: any) => s + r.clinical_assessments, 0),
        receiving_services: treatment.reduce((s: number, r: any) => s + r.receiving_services, 0),
        compliant: treatment.reduce((s: number, r: any) => s + r.compliant, 0),
        bh_treatment: treatment.reduce((s: number, r: any) => s + r.bh_treatment, 0),
        sud_treatment: treatment.reduce((s: number, r: any) => s + r.sud_treatment, 0),
        mat_receiving: treatment.reduce((s: number, r: any) => s + r.mat_receiving, 0),
        job_training: treatment.reduce((s: number, r: any) => s + r.job_training, 0),
        education_completed: treatment.reduce((s: number, r: any) => s + r.education_completed, 0),
        successful_completions: treatment.reduce((s: number, r: any) => s + r.successful_completions, 0),
    };

    return {
        totals,
        treatment,
        discharge,
        lengthOfStay,
        dischargeMAT,
        mhByProvider,
        sudByProvider,
        matByProvider,
        trainingByProvider,
        educationByProvider,
        completionsByProvider,
        finalReportsByProvider,
    };
}

// ============================================================================
// EXCEL GENERATION
// ============================================================================

async function generateExcel(data: any, quarter: number, year: number) {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DDOR Platform';
    workbook.created = new Date();

    const HEADER_FILL: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
    const HEADER_FONT: any = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Arial' };
    const DATA_FONT: any = { size: 11, name: 'Arial' };
    const TOTAL_FILL: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } };
    const TOTAL_FONT: any = { bold: true, size: 11, name: 'Arial' };

    function styleHeaders(ws: any, row: number, colCount: number) {
        for (let c = 1; c <= colCount; c++) {
            const cell = ws.getRow(row).getCell(c);
            cell.fill = HEADER_FILL;
            cell.font = HEADER_FONT;
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = {
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
            };
        }
        ws.getRow(row).height = 36;
    }

    function styleTotalRow(ws: any, row: number, colCount: number) {
        for (let c = 1; c <= colCount; c++) {
            const cell = ws.getRow(row).getCell(c);
            cell.fill = TOTAL_FILL;
            cell.font = TOTAL_FONT;
            cell.border = { top: { style: 'thin', color: { argb: 'FF000000' } } };
        }
    }

    function addDataRows(ws: any, rows: any[][], startRow: number) {
        rows.forEach((rowData, i) => {
            const row = ws.getRow(startRow + i);
            rowData.forEach((val, c) => {
                const cell = row.getCell(c + 1);
                cell.value = val;
                cell.font = DATA_FONT;
                if (typeof val === 'number') cell.alignment = { horizontal: 'center' };
            });
            // Zebra striping
            if (i % 2 === 0) {
                for (let c = 1; c <= rowData.length; c++) {
                    row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                }
            }
        });
    }

    // ---- Sheet 1: Totals ----
    const wsTotals = workbook.addWorksheet('Totals');
    wsTotals.columns = [
        { header: 'Metric', width: 70 },
        { header: 'Count', width: 12 },
    ];
    styleHeaders(wsTotals, 1, 2);
    const totalsRows = [
        ['Number of Clinical Assessments Performed for BHCDP (number of 14-Day Reports completed)', data.totals.clinical_assessments],
        ['Participants Currently Receiving Services from your Agency', data.totals.receiving_services],
        ['Participants Compliant with Terms and Conditions of Treatment', data.totals.compliant],
        ['Participants Receiving Treatment for Behavioral Health Condition', data.totals.bh_treatment],
        ['Participants Receiving Treatment for Substance Use Disorder', data.totals.sud_treatment],
    ];
    addDataRows(wsTotals, totalsRows, 2);

    // ---- Sheet 2: Treatment ----
    const wsTreatment = workbook.addWorksheet('Treatment');
    wsTreatment.columns = [
        { header: 'Treatment Provider', width: 35 },
        { header: 'Clinical Assessments', width: 18 },
        { header: 'Receiving Services', width: 18 },
        { header: 'Compliant', width: 18 },
        { header: 'BH Treatment', width: 18 },
        { header: 'SUD Treatment', width: 18 },
        { header: 'Receiving MAT', width: 15 },
        { header: 'Job Training', width: 15 },
        { header: 'Education', width: 15 },
        { header: 'Completions', width: 15 },
    ];
    styleHeaders(wsTreatment, 1, 10);
    const treatmentRows = data.treatment.map((r: any) => [
        r.provider_name, r.clinical_assessments, r.receiving_services, r.compliant,
        r.bh_treatment, r.sud_treatment, r.mat_receiving, r.job_training,
        r.education_completed, r.successful_completions,
    ]);
    addDataRows(wsTreatment, treatmentRows, 2);
    // Totals row
    const tRow = treatmentRows.length + 2;
    wsTreatment.getRow(tRow).values = [
        'Totals',
        data.totals.clinical_assessments, data.totals.receiving_services, data.totals.compliant,
        data.totals.bh_treatment, data.totals.sud_treatment, data.totals.mat_receiving,
        data.totals.job_training, data.totals.education_completed, data.totals.successful_completions,
    ];
    styleTotalRow(wsTreatment, tRow, 10);

    // ---- Sheet 3: Discharge ----
    const wsDischarge = workbook.addWorksheet('Discharge');
    wsDischarge.columns = [
        { header: 'Treatment Provider', width: 35 },
        { header: 'Discharge Reason', width: 55 },
        { header: 'Count', width: 12 },
    ];
    styleHeaders(wsDischarge, 1, 3);
    const dischargeRows = data.discharge.map((r: any) => [r.provider_name, r.discharge_reason, parseInt(r.count)]);
    addDataRows(wsDischarge, dischargeRows, 2);

    // ---- Sheet 4: Length of Stay ----
    const wsLOS = workbook.addWorksheet('Length of Stay');
    wsLOS.columns = [
        { header: 'Treatment Provider', width: 35 },
        { header: 'Patient ID', width: 12 },
        { header: 'First Name', width: 18 },
        { header: 'Last Name', width: 18 },
        { header: 'Number of Days', width: 16 },
    ];
    styleHeaders(wsLOS, 1, 5);
    const losRows = data.lengthOfStay.map((r: any) => [
        r.provider_name, r.patient_id, r.first_name, r.last_name, r.days_in_program,
    ]);
    addDataRows(wsLOS, losRows, 2);

    // ---- Sheet 5: Discharge-MAT ----
    const wsMAT = workbook.addWorksheet('Discharge-MAT');
    wsMAT.columns = [
        { header: 'Patient ID', width: 12 },
        { header: 'Treatment Provider', width: 35 },
        { header: 'Discharge Reason', width: 55 },
    ];
    styleHeaders(wsMAT, 1, 3);
    const matDischargeRows = data.dischargeMAT.map((r: any) => [r.patient_id, r.provider_name, r.discharge_reason]);
    addDataRows(wsMAT, matDischargeRows, 2);

    // Helper for simple provider+count sheets
    function addSimpleSheet(name: string, description: string, rows: any[]) {
        const ws = workbook.addWorksheet(name);
        ws.columns = [
            { header: 'Treatment Provider', width: 35 },
            { header: 'Number of Clients', width: 18 },
        ];
        styleHeaders(ws, 1, 2);
        // Add description in column D
        ws.getCell('D1').value = description;
        ws.getCell('D1').font = { italic: true, size: 10, name: 'Arial', color: { argb: 'FF666666' } };
        ws.getColumn(4).width = 60;

        const dataRows = rows.map((r: any) => [r.provider_name, parseInt(r.count)]);
        addDataRows(ws, dataRows, 2);

        // Total row
        const total = rows.reduce((s: number, r: any) => s + parseInt(r.count), 0);
        const totalRowNum = dataRows.length + 2;
        ws.getRow(totalRowNum).values = ['Total', total];
        styleTotalRow(ws, totalRowNum, 2);
    }

    // Sheets 6-12: Simple provider+count format
    addSimpleSheet('MH', `Clients receiving Mental Health services in Q${quarter} ${year}`, data.mhByProvider);
    addSimpleSheet('SUD', `Clients receiving SUD services in Q${quarter} ${year}`, data.sudByProvider);
    addSimpleSheet('MAT', `Clients receiving MAT services in Q${quarter} ${year}`, data.matByProvider);
    addSimpleSheet('Training', `Clients who completed KYAE Job training in Q${quarter} ${year}`, data.trainingByProvider);
    addSimpleSheet('Education', `Clients who completed KYAE education in Q${quarter} ${year}`, data.educationByProvider);
    addSimpleSheet('Completions', `Clients who successfully completed the SB90 program in Q${quarter} ${year}`, data.completionsByProvider);
    addSimpleSheet('Final Reports', `Final questionnaires completed in Q${quarter} ${year}`, data.finalReportsByProvider);

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer as any, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="DBH_Q${quarter}_${year}_Quarterly_Report.xlsx"`,
        },
    });
}
