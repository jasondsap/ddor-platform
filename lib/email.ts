// ============================================================================
// DDOR Email Notification Service (Resend)
// Replaces all 8 active Airtable automations
// *** TESTING MODE — all emails go to jason@made180.com ***
// ============================================================================

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || 'DDOR Platform <ddor@peersupportstudio.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ============================================================================
// Notification Recipients — TESTING MODE
// Switch back to production recipients before go-live
// ============================================================================

export const NOTIFICATION_RECIPIENTS = {
    fourteen_day: {
        to: ['jason@made180.com'],
        cc: [],
        replyTo: [],
        fromName: 'Seven Counties Reporting Team',
    },
    progress_report: {
        to: ['jason@made180.com'],
        cc: [],
        replyTo: [],
        fromName: 'Seven Counties Reporting Team',
    },
    final_report: {
        to: ['jason@made180.com'],
        cc: [],
        replyTo: [],
        fromName: 'DDOR Reporting',
    },
    kyae_referral: {
        to: ['jason@made180.com'],
        cc: [],
        replyTo: [],
        fromName: 'DDOR Reporting',
    },
    status_change: {
        to: ['jason@made180.com'],
        cc: [],
        replyTo: [],
        fromName: 'DDOR Reporting',
    },
    initiation: {
        to: ['jason@made180.com'],
        cc: [],
        replyTo: [],
        fromName: 'DDOR Reporting',
    },
    treatment_adherence: {
        to: ['jason@made180.com'],
        cc: [],
        replyTo: [],
        fromName: 'DDOR Reporting',
    },
};

// ============================================================================
// Core send function
// ============================================================================

interface SendEmailOptions {
    to: string[];
    cc?: string[];
    replyTo?: string[];
    subject: string;
    html: string;
    fromName?: string;
}

async function sendEmail(opts: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
    if (!process.env.RESEND_API_KEY) {
        console.log('[Email] RESEND_API_KEY not set — skipping email:', opts.subject);
        return { success: true };
    }

    try {
        const from = opts.fromName ? `${opts.fromName} <${FROM_EMAIL.split('<')[1]?.replace('>', '') || 'ddor@peersupportstudio.com'}>` : FROM_EMAIL;

        await resend.emails.send({
            from,
            to: opts.to,
            cc: opts.cc?.length ? opts.cc : undefined,
            replyTo: opts.replyTo?.length ? opts.replyTo : undefined,
            subject: opts.subject,
            html: opts.html,
        });

        console.log(`[Email] Sent: "${opts.subject}" to ${opts.to.join(', ')}`);
        return { success: true };
    } catch (error: any) {
        console.error(`[Email] Failed: "${opts.subject}"`, error.message);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// Email wrapper (shared layout)
// ============================================================================

function emailLayout(title: string, body: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <tr><td style="background:#1A2B4A;padding:24px 32px;">
        <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">DDOR — ${title}</h1>
    </td></tr>
    <tr><td style="padding:32px;">
        ${body}
    </td></tr>
    <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
            Data Driven Outcomes Reporting • Fletcher Group, Inc. • BHCDP/SB90 Program
        </p>
    </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function fieldRow(label: string, value: string | null | undefined): string {
    if (!value) return '';
    return `<tr><td style="padding:6px 0;font-size:13px;color:#6b7280;width:160px;vertical-align:top;">${label}</td><td style="padding:6px 0;font-size:14px;color:#111827;font-weight:500;">${value}</td></tr>`;
}

function fieldTable(rows: string): string {
    return `<table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;">${rows}</table>`;
}

function actionButton(label: string, url: string): string {
    return `<a href="${url}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#1A73A8;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">${label}</a>`;
}

// ============================================================================
// Notification Functions — one per automation
// ============================================================================

export interface ReportNotificationData {
    clientName: string;
    clientId: string;
    ddorId?: string;
    facilityName?: string;
    providerName?: string;
    reportType: string;
    reportTypeLabel: string;
    submitterName?: string;
    submitterEmail?: string;
    dateSubmitted: string;
    additionalFields?: Record<string, string>;
}

// 1. 14-Day Report
export async function notify14DayReport(data: ReportNotificationData) {
    const config = NOTIFICATION_RECIPIENTS.fourteen_day;
    const body = emailLayout('14-Day Stabilization Report Submitted', `
        <p style="font-size:15px;color:#111827;margin:0 0 16px;">A <strong>14-Day Stabilization Report</strong> has been submitted.</p>
        ${fieldTable(
            fieldRow('Participant', data.clientName) +
            fieldRow('DDOR ID', data.ddorId) +
            fieldRow('Facility', data.facilityName) +
            fieldRow('Provider', data.providerName) +
            fieldRow('Date Submitted', data.dateSubmitted) +
            fieldRow('Submitted By', data.submitterName)
        )}
        ${actionButton('View Client', `${APP_URL}/clients/${data.clientId}`)}
    `);

    return sendEmail({ ...config, subject: `14-Day Report — ${data.clientName}${data.facilityName ? ` (${data.facilityName})` : ''}`, html: body });
}

// 2. Progress Report (42/90/180/270/360-Day)
export async function notifyProgressReport(data: ReportNotificationData) {
    const config = NOTIFICATION_RECIPIENTS.progress_report;
    const body = emailLayout(`${data.reportTypeLabel} Submitted`, `
        <p style="font-size:15px;color:#111827;margin:0 0 16px;">A <strong>${data.reportTypeLabel}</strong> has been submitted.</p>
        ${fieldTable(
            fieldRow('Participant', data.clientName) +
            fieldRow('DDOR ID', data.ddorId) +
            fieldRow('Report Type', data.reportTypeLabel) +
            fieldRow('Facility', data.facilityName) +
            fieldRow('Provider', data.providerName) +
            fieldRow('Date Submitted', data.dateSubmitted) +
            fieldRow('Submitted By', data.submitterName)
        )}
        ${actionButton('View Client', `${APP_URL}/clients/${data.clientId}`)}
    `);

    return sendEmail({ ...config, subject: `${data.reportTypeLabel} — ${data.clientName}`, html: body });
}

// 3. Final Report
export async function notifyFinalReport(data: ReportNotificationData) {
    const config = NOTIFICATION_RECIPIENTS.final_report;
    const body = emailLayout('Final Report Submitted', `
        <p style="font-size:15px;color:#111827;margin:0 0 16px;">A <strong>Final Report</strong> has been submitted for <strong>${data.clientName}</strong>.</p>
        ${fieldTable(
            fieldRow('Participant', data.clientName) +
            fieldRow('DDOR ID', data.ddorId) +
            fieldRow('Facility', data.facilityName) +
            fieldRow('Provider', data.providerName) +
            fieldRow('Date Submitted', data.dateSubmitted) +
            fieldRow('Submitted By', data.submitterName) +
            fieldRow('Discharge Reason', data.additionalFields?.discharge_reason)
        )}
        ${actionButton('View Client', `${APP_URL}/clients/${data.clientId}`)}
    `);

    return sendEmail({ ...config, subject: `Final Report — ${data.clientName} (${data.facilityName || 'N/A'})`, html: body });
}

// 4. KYAE Referral
export async function notifyKyaeReferral(data: ReportNotificationData & { participantAddress?: string }) {
    const config = NOTIFICATION_RECIPIENTS.kyae_referral;
    const body = emailLayout('KYAE Referral Submitted', `
        <p style="font-size:15px;color:#111827;margin:0 0 16px;">A <strong>KYAE Education Referral</strong> has been submitted.</p>
        ${fieldTable(
            fieldRow('Participant', data.clientName) +
            fieldRow('Facility', data.facilityName) +
            fieldRow('Provider', data.providerName) +
            fieldRow('Date Submitted', data.dateSubmitted) +
            fieldRow('Submitted By', data.submitterName) +
            fieldRow('Participant Address', data.participantAddress)
        )}
        ${actionButton('View Client', `${APP_URL}/clients/${data.clientId}`)}
    `);

    return sendEmail({ ...config, subject: `KYAE Referral — ${data.clientName}`, html: body });
}

// 5. Status Change
export async function notifyStatusChange(data: ReportNotificationData & { statusReason?: string; dischargeReason?: string }) {
    const config = NOTIFICATION_RECIPIENTS.status_change;
    const reasonText = data.statusReason === 'discharge'
        ? `Discharged — ${data.dischargeReason || 'Not specified'}`
        : `Non-Adherent`;

    const body = emailLayout('Status Change Update', `
        <p style="font-size:15px;color:#111827;margin:0 0 16px;">A <strong>Status Change</strong> has been submitted for <strong>${data.clientName}</strong>.</p>
        <div style="padding:12px 16px;background:#FEF3C7;border-left:4px solid #F59E0B;border-radius:4px;margin:16px 0;">
            <p style="margin:0;font-size:14px;color:#92400E;font-weight:600;">${reasonText}</p>
        </div>
        ${fieldTable(
            fieldRow('Participant', data.clientName) +
            fieldRow('DDOR ID', data.ddorId) +
            fieldRow('Facility', data.facilityName) +
            fieldRow('Provider', data.providerName) +
            fieldRow('Date Submitted', data.dateSubmitted) +
            fieldRow('Submitted By', data.submitterName)
        )}
        ${actionButton('View Client', `${APP_URL}/clients/${data.clientId}`)}
    `);

    return sendEmail({ ...config, subject: `Status Change — ${data.clientName} — ${reasonText}`, html: body });
}

// 6. Initiation Notification
export async function notifyInitiation(data: ReportNotificationData & { participantAction?: string; treatmentDate?: string; levelOfCare?: string }) {
    const config = NOTIFICATION_RECIPIENTS.initiation;
    const actionLabel = data.participantAction === 'initiated_treatment'
        ? 'Initiated Treatment' : 'Scheduled Appointment';

    const body = emailLayout('Initiation Notification', `
        <p style="font-size:15px;color:#111827;margin:0 0 16px;">An <strong>Initiation Notification</strong> has been submitted.</p>
        <div style="padding:12px 16px;background:#D1FAE5;border-left:4px solid #10B981;border-radius:4px;margin:16px 0;">
            <p style="margin:0;font-size:14px;color:#065F46;font-weight:600;">Participant ${actionLabel}</p>
        </div>
        ${fieldTable(
            fieldRow('Participant', data.clientName) +
            fieldRow('Facility', data.facilityName) +
            fieldRow('Provider', data.providerName) +
            fieldRow('Treatment Date', data.treatmentDate) +
            fieldRow('Level of Care', data.levelOfCare) +
            fieldRow('Submitted By', data.submitterName)
        )}
        ${actionButton('View Client', `${APP_URL}/clients/${data.clientId}`)}
    `);

    return sendEmail({ ...config, subject: `Initiation — ${data.clientName} — ${actionLabel}`, html: body });
}

// 7. Demographic Report
export async function notifyDemographic(data: ReportNotificationData) {
    const config = NOTIFICATION_RECIPIENTS.initiation;
    const body = emailLayout('Demographic Report Submitted', `
        <p style="font-size:15px;color:#111827;margin:0 0 16px;">A <strong>Demographic Report</strong> has been submitted for <strong>${data.clientName}</strong>.</p>
        ${fieldTable(
            fieldRow('Participant', data.clientName) +
            fieldRow('Facility', data.facilityName) +
            fieldRow('Date Submitted', data.dateSubmitted)
        )}
        ${actionButton('View Client', `${APP_URL}/clients/${data.clientId}`)}
    `);

    return sendEmail({ ...config, subject: `Demographic Report — ${data.clientName}`, html: body });
}

// ============================================================================
// Dispatcher — call from API routes after successful form submission
// ============================================================================

export async function dispatchReportNotification(reportType: string, data: ReportNotificationData & Record<string, any>) {
    try {
        switch (reportType) {
            case 'fourteen_day':
                return await notify14DayReport(data);
            case 'forty_two_day':
            case 'ninety_day':
            case 'one_eighty_day':
            case 'two_seventy_day':
            case 'three_sixty_day':
                return await notifyProgressReport(data);
            case 'final_report':
                return await notifyFinalReport(data);
            case 'kyae_referral':
                return await notifyKyaeReferral(data);
            case 'status_change':
                return await notifyStatusChange(data);
            case 'initiation_notification':
                return await notifyInitiation(data);
            case 'demographic':
                return await notifyDemographic(data);
            default:
                console.log(`[Email] No notification configured for report type: ${reportType}`);
                return { success: true };
        }
    } catch (error: any) {
        console.error(`[Email] Dispatch failed for ${reportType}:`, error.message);
        return { success: false, error: error.message };
    }
}
