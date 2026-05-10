// app/api/reports/route.ts
//
// Updated for FGI May 2026 spec.
//
// Changes from previous version:
//   1. household_income and dependents moved out of numeric columns into
//      report_attributes (EAV). New spec stores these as range strings like
//      "$0 - 15,000" and "10+", which don't fit the existing numeric columns.
//   2. Multi-fields are now normalized: API accepts EITHER a single string
//      (single-select forms) OR a string[] (multi-select forms) for the same
//      attribute_type, since e.g. employment_status is single-select on 14-Day
//      and Progress but multi-select on Final.
//   3. New scalar attributes captured in EAV: enrollment_status, treated_sud,
//      treated_mh, treatment_start_date, sud_loc_recommended, mh_loc_recommended,
//      treatment_facility, and the *_other text fields.
//   4. On 14-Day report submit, treatment_start_date is synced back to the
//      client record (the form lets providers edit; client.treatment_start_date
//      is the canonical source for downstream due-date calculations).
//   5. body.referred_provider (Final spec name) is mapped to the existing
//      referred_provider_name column.

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireClientAccess, isAdmin, getUserId } from '@/lib/auth';
import { query, insert, logAuditEvent } from '@/lib/db';
import { dispatchReportNotification } from '@/lib/email';
import { REPORT_TYPE_LABELS } from '@/types';

// GET /api/reports — unchanged
export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth();
        const { role, facilityId, userId } = session.ddor;
        const { searchParams } = new URL(req.url);

        const clientId = searchParams.get('client_id');
        const reportType = searchParams.get('type');
        const facilityFilter = searchParams.get('facility_id');

        let sql = `
            SELECT
                r.*,
                c.first_name || ' ' || c.last_name AS client_name,
                c.ddor_id AS client_ddor_id,
                f.name AS facility_name,
                p.name AS provider_name
            FROM reports r
            JOIN clients c ON r.client_id = c.id
            LEFT JOIN facilities f ON r.facility_id = f.id
            LEFT JOIN providers p ON r.provider_id = p.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramIdx = 1;

        if (clientId) {
            sql += ` AND r.client_id = $${paramIdx}`;
            params.push(clientId);
            paramIdx++;
        }

        if (reportType) {
            sql += ` AND r.report_type = $${paramIdx}`;
            params.push(reportType);
            paramIdx++;
        }

        // Role-based scoping
        if (!isAdmin(session)) {
            if (role === 'navigator') {
                sql += ` AND f.county_id IN (
                    SELECT county_id FROM user_counties WHERE user_id = $${paramIdx}::uuid
                )`;
                params.push(userId);
                paramIdx++;
            } else {
                sql += ` AND r.facility_id = $${paramIdx}`;
                params.push(facilityFilter || facilityId);
                paramIdx++;
            }
        } else if (facilityFilter) {
            sql += ` AND r.facility_id = $${paramIdx}`;
            params.push(facilityFilter);
            paramIdx++;
        }

        sql += ` ORDER BY r.date_submitted DESC NULLS LAST, r.created_at DESC`;

        const reports = await query(sql, params);
        return NextResponse.json({ reports });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error fetching reports:', error);
        return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }
}

// POST /api/reports — create a new report
export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        const body = await req.json();

        const { client_id, report_type } = body;

        if (!client_id || !report_type) {
            return NextResponse.json({ error: 'client_id and report_type are required' }, { status: 400 });
        }

        await requireClientAccess(client_id);

        const client = await query<any>(
            `SELECT c.facility_id, f.provider_id FROM clients c
             LEFT JOIN facilities f ON c.facility_id = f.id
             WHERE c.id = $1`,
            [client_id]
        );

        if (client.length === 0) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        // ============================================================
        // Insert the report row (columnar fields)
        // NOTE: household_income / dependents_count are NOT written here
        // anymore — new spec uses range strings ($0-15,000 / "10+") that
        // don't fit numeric columns. They're stored as EAV below.
        // ============================================================
        const report = await insert('reports', {
            report_type,
            client_id,
            facility_id: client[0].facility_id,
            provider_id: client[0].provider_id,
            submitted_by: getUserId(session),
            date_submitted: new Date().toISOString(),
            current_sud_loc: body.sud_loc || null,
            current_mh_loc: body.mh_loc || null,
            program_status: body.program_status || null,
            attendance_frequency: body.attendance || null,
            is_receiving_mat: body.mat_receiving === 'Yes',
            // For Final reports, was_discharged is implicit (always true)
            was_discharged: body.discharged === 'Yes' || report_type === 'final_report',
            discharge_date: body.discharge_date || null,
            discharge_reason: body.discharge_reason || null,
            // For Final, presence of any referred-provider value implies referral happened
            was_referred_to_provider:
                body.referred_to_provider === 'Yes'
                || !!body.referred_provider
                || !!body.referred_provider_name,
            // Final spec uses body.referred_provider, legacy used body.referred_provider_name
            referred_provider_name: body.referred_provider_name || body.referred_provider || null,
            referred_loc: body.referred_loc || null,
            kyae_referral_status: body.kyae_referral_status || null,
            kyae_education_status: body.kyae_education_status || null,
            kyae_employment_status: body.kyae_employment_status || null,
            submitter_name: body.submitter_name || null,
            submitter_email: body.submitter_email || null,
            submitter_credential: body.credential || null,
            signature_date: body.signature_date || null,
            is_signed: body.sign_now || false,
            barrier_notes: body.living_expenses_note || null,
            recommendation_notes: body.recommendations || null,
        });

        const reportId = (report as any).id;

        // ============================================================
        // SCALAR attributes — single value each, stored in report_attributes
        // ============================================================
        const scalarAttrs: Array<[string, any]> = [
            // Existing
            ['months_unemployed', body.months_unemployed],
            ['education_level', body.education_level],
            // New for May 2026 spec
            ['enrollment_status', body.enrollment_status],
            ['treated_sud', body.treated_sud],
            ['treated_mh', body.treated_mh],
            ['treatment_start_date', body.treatment_start_date],
            ['household_income', body.household_income],   // string range now
            ['dependents', body.dependents],               // string ("10+", etc.)
            ['sud_loc_recommended', body.sud_loc_recommended],
            ['mh_loc_recommended', body.mh_loc_recommended],
            ['treatment_facility', body.treatment_facility],
            // Other-text fields (only present when parent select === 'Other')
            ['discharge_reason_other', body.discharge_reason_other],
            ['goals_achieved_other', body.goals_achieved_other],
            ['barriers_other', body.barriers_other],
            ['credential_other', body.credential_other],
            // Status Change specific (FGI May 2026 spec)
            ['status_reason', body.status_reason],
            ['non_compliant_other', body.non_compliant_other],
            ['additional_info', body.additional_info],
            ['agency', body.agency],
        ];

        for (const [key, val] of scalarAttrs) {
            if (val !== undefined && val !== null && val !== '') {
                await insert('report_attributes', {
                    report_id: reportId,
                    attribute_type: key,
                    value: String(val),
                });
            }
        }

        // ============================================================
        // MULTI-VALUE attributes — one row per option in report_attributes.
        // Normalized: accept either string[] or single string. Some fields
        // (employment_status, goals_achieved, living_situation) are
        // single-select on some forms and multi-select on others.
        // ============================================================
        const multiFields: Array<[string, any]> = [
            ['living_situation', body.living_situation],
            ['employment_status', body.employment_status],
            ['insurance_type', body.insurance_type],
            ['criminal_justice', body.criminal_justice],
            ['mat_services', body.mat_services],
            ['goals_achieved', body.goals_achieved],
            ['barriers', body.barriers],
            // Status Change specific (FGI May 2026 spec)
            ['non_compliant_reasons', body.non_compliant_reasons],
            // Service grids — provided to date (planned dropped from new forms,
            // legacy keys retained for any historical data being re-saved)
            ['treatment_provided', body.treatment_provided],
            ['treatment_planned', body.treatment_planned],
            ['case_mgmt_provided', body.case_mgmt_provided],
            ['case_mgmt_planned', body.case_mgmt_planned],
            ['medical_provided', body.medical_provided],
            ['medical_planned', body.medical_planned],
            ['aftercare_provided', body.aftercare_provided],
            ['aftercare_planned', body.aftercare_planned],
            ['educational_provided', body.educational_provided],
            ['educational_planned', body.educational_planned],
            ['recovery_provided', body.recovery_provided],
            ['recovery_planned', body.recovery_planned],
        ];

        for (const [attrType, raw] of multiFields) {
            // Normalize to array. Critical: prevents string-iteration bug
            // where each character would otherwise be inserted as a row.
            const values = Array.isArray(raw) ? raw : (raw ? [raw] : []);
            for (const val of values) {
                if (val !== undefined && val !== null && val !== '') {
                    await insert('report_attributes', {
                        report_id: reportId,
                        attribute_type: attrType,
                        value: String(val),
                    });
                }
            }
        }

        // ============================================================
        // 14-Day side effect: sync edited treatment_start_date back to client
        // ============================================================
        if (report_type === 'fourteen_day' && body.treatment_start_date) {
            try {
                await query(
                    `UPDATE clients
                     SET treatment_start_date = $1::date, updated_at = NOW()
                     WHERE id = $2`,
                    [body.treatment_start_date, client_id]
                );
            } catch (err) {
                console.warn('Failed to sync client.treatment_start_date:', err);
            }
        }

        // ============================================================
        // Update report_tracking row for this milestone
        // ============================================================
        const statusField = getTrackingField(report_type);
        if (statusField) {
            await query(
                `UPDATE report_tracking
                 SET ${statusField}_status = 'completed',
                     ${statusField}_report_id = $1,
                     updated_at = NOW()
                 WHERE client_id = $2`,
                [reportId, client_id]
            );
        }

        await logAuditEvent(
            getUserId(session),
            'create',
            'reports',
            reportId,
            undefined,
            { report_type, client_id }
        );

        // Email notification (non-blocking)
        try {
            const clientInfo = await query<any>(
                `SELECT c.first_name, c.last_name, c.ddor_id,
                        f.name AS facility_name, p.name AS provider_name
                 FROM clients c
                 LEFT JOIN facilities f ON c.facility_id = f.id
                 LEFT JOIN providers p ON f.provider_id = p.id
                 WHERE c.id = $1`, [client_id]
            );
            if (clientInfo.length > 0) {
                const ci = clientInfo[0];
                dispatchReportNotification(report_type, {
                    clientName: `${ci.first_name} ${ci.last_name}`,
                    clientId: client_id,
                    ddorId: ci.ddor_id,
                    facilityName: ci.facility_name,
                    providerName: ci.provider_name,
                    reportType: report_type,
                    reportTypeLabel: REPORT_TYPE_LABELS[report_type as keyof typeof REPORT_TYPE_LABELS] || report_type,
                    submitterName: body.submitter_name || body.staff_name || session.user?.name,
                    submitterEmail: body.submitter_email || body.staff_email || session.user?.email,
                    dateSubmitted: new Date().toLocaleDateString(),
                    statusReason: body.status_reason,
                    dischargeReason: body.discharge_reason,
                    participantAddress: body.participant_address,
                });
            }
        } catch (emailErr) {
            console.error('[Email] Non-blocking notification error:', emailErr);
        }

        return NextResponse.json({ success: true, report });
    } catch (error: any) {
        if (error.message === 'Unauthorized' || error.message === 'Facility access denied') {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        console.error('Error creating report:', error);
        return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
    }
}

// Map report type to tracking table column prefix
function getTrackingField(reportType: string): string | null {
    const map: Record<string, string> = {
        fourteen_day: 'fourteen_day',
        forty_two_day: 'forty_two_day',
        ninety_day: 'ninety_day',
        one_eighty_day: 'one_eighty_day',
        two_seventy_day: 'two_seventy_day',
        three_sixty_day: 'three_sixty_day',
        final_report: 'final_report',
    };
    return map[reportType] || null;
}
