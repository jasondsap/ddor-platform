// lib/generateReportPDF.ts
// Generate branded PDF for any DDOR report.
//
// Updated for FGI May 2026 spec:
//   - householdIncome / dependents are now `string` (caller pre-formats).
//   - Renders new fields when present in EAV: enrollment_status, treated_sud,
//     treated_mh, treatment_start_date (14-Day), sud_loc_recommended,
//     mh_loc_recommended (Final), treatment_facility, mat_services, and
//     the *_other text fields under their parent values.
//   - Clinical-section labels switch to "at Discharge" wording for Final.
//   - Service grids hide the "Plans to Provide" column when there's no
//     planned data (legacy reports still show both columns).
//   - "Living Expenses / Barriers" label renamed to "Barriers Note".
//
// Pattern follows PSS generateGoalPDF.ts.

import jsPDF from 'jspdf';

interface ReportPDFData {
    reportType: string;
    reportTypeLabel: string;
    clientName: string;
    ddorId?: string;
    clientDob?: string;
    diagnosis?: string;
    facilityName?: string;
    providerName?: string;
    dateSubmitted?: string;
    submitterName?: string;
    submitterCredential?: string;
    signatureDate?: string;
    isSigned?: boolean;
    // Clinical
    sudLoc?: string;
    mhLoc?: string;
    programStatus?: string;
    attendance?: string;
    isReceivingMat?: boolean;
    householdIncome?: string | null;   // pre-formatted by caller (legacy "$45,000" or new "$0 - 15,000")
    dependents?: string;               // string ("3", "10+", etc.)
    // Discharge
    wasDischarged?: boolean;
    dischargeDate?: string;
    dischargeReason?: string;
    referredProvider?: string;
    referredLoc?: string;
    // KYAE (legacy)
    kyaeReferralStatus?: string;
    kyaeEducationStatus?: string;
    kyaeEmploymentStatus?: string;
    // Notes
    barrierNotes?: string;
    recommendationNotes?: string;
    notes?: string;
    // Attributes (EAV — multi-value or new scalar attrs)
    attributes: Record<string, string[]>;
}

export function generateReportPDF(data: ReportPDFData) {
    const doc = new jsPDF();
    let y = 20;
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 18;
    const maxWidth = pageWidth - margin * 2;
    const lh = 5.5;

    const attrs = data.attributes || {};
    const isFinal = data.reportType === 'final_report';
    const is14Day = data.reportType === 'fourteen_day';

    // First scalar value from an EAV key
    const firstAttr = (key: string): string | undefined => attrs[key]?.[0];

    // DDOR brand colors
    const navy = { r: 26, g: 43, b: 74 };
    const blue = { r: 26, g: 115, b: 168 };
    const teal = { r: 45, g: 212, b: 191 };
    const gray = { r: 107, g: 114, b: 128 };
    const green = { r: 16, g: 185, b: 129 };
    const purple = { r: 139, g: 92, b: 246 };
    const red = { r: 239, g: 68, b: 68 };

    const checkPage = (need: number = 20) => {
        if (y > pageHeight - need) { doc.addPage(); y = margin; }
    };

    const text = (t: string, size: number = 9, bold = false, color = { r: 0, g: 0, b: 0 }) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(color.r, color.g, color.b);
        const lines = doc.splitTextToSize(t, maxWidth);
        for (const line of lines) { checkPage(); doc.text(line, margin, y); y += lh; }
    };

    const field = (label: string, value: string | undefined | null) => {
        if (!value) return;
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(gray.r, gray.g, gray.b);
        doc.text(label, margin, y); y += 4;
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
        const lines = doc.splitTextToSize(value, maxWidth);
        for (const line of lines) { checkPage(); doc.text(line, margin, y); y += lh; }
        y += 2;
    };

    const fieldInline = (label: string, value: string | undefined | null, x: number, width: number) => {
        if (!value) return;
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(gray.r, gray.g, gray.b);
        doc.text(label, x, y);
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
        doc.text(value.substring(0, Math.floor(width / 2)), x, y + 4);
    };

    const sectionHeader = (title: string) => {
        checkPage(25);
        y += 3;
        doc.setFillColor(navy.r, navy.g, navy.b);
        doc.roundedRect(margin - 2, y - 3, maxWidth + 4, 8, 1.5, 1.5, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
        doc.text(title, margin + 2, y + 2);
        y += 12; doc.setTextColor(0, 0, 0);
    };

    const tagList = (label: string, tags: string[] | undefined, color = blue) => {
        if (!tags || tags.length === 0) return;
        checkPage(15);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(gray.r, gray.g, gray.b);
        doc.text(label, margin, y); y += 4;
        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        let xPos = margin;
        for (const tag of tags) {
            const tw = doc.getTextWidth(tag) + 8;
            if (xPos + tw > margin + maxWidth) { xPos = margin; y += 6; checkPage(); }
            doc.setFillColor(color.r, color.g, color.b);
            doc.roundedRect(xPos, y - 3, tw, 5.5, 1, 1, 'F');
            doc.setTextColor(255, 255, 255);
            doc.text(tag, xPos + 4, y + 0.5);
            xPos += tw + 2;
        }
        doc.setTextColor(0, 0, 0);
        y += 8;
    };

    // Format ISO date string to locale string. Returns undefined if input is empty.
    const fmtDate = (iso?: string): string | undefined => {
        if (!iso) return undefined;
        try {
            const d = new Date(iso);
            return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
        } catch {
            return iso;
        }
    };

    // =====================================================
    // HEADER
    // =====================================================
    doc.setFillColor(navy.r, navy.g, navy.b);
    doc.rect(0, 0, pageWidth, 36, 'F');
    doc.setFillColor(teal.r, teal.g, teal.b);
    doc.rect(pageWidth - 50, 0, 50, 36, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('DDOR', margin, 14);
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text(data.reportTypeLabel, margin, 22);
    doc.setFontSize(9);
    doc.text(data.clientName, margin, 30);

    if (data.dateSubmitted) {
        const dateText = `Submitted: ${data.dateSubmitted}`;
        doc.text(dateText, pageWidth - margin - doc.getTextWidth(dateText), 30);
    }

    doc.setTextColor(0, 0, 0);
    y = 46;

    // =====================================================
    // PARTICIPANT INFO
    // Final spec adds treatment_facility (provider's own facility name); prefer
    // that over the joined facility name when present.
    // =====================================================
    sectionHeader('Participant Information');
    const col1 = margin, col2 = margin + 60, col3 = margin + 120;
    fieldInline('Name', data.clientName, col1, 60);
    fieldInline('DDOR ID', data.ddorId, col2, 60);
    fieldInline('DOB', data.clientDob, col3, 50);
    y += 10;
    fieldInline('Diagnosis', data.diagnosis === 'co_occurring' ? 'Co-Occurring' : data.diagnosis?.toUpperCase(), col1, 60);
    fieldInline('Provider', data.providerName, col2, 60);
    fieldInline('Facility', firstAttr('treatment_facility') || data.facilityName, col3, 50);
    y += 10;

    // =====================================================
    // CLINICAL
    // =====================================================
    const hasClinical = data.sudLoc || data.mhLoc || data.programStatus
        || firstAttr('sud_loc_recommended') || firstAttr('mh_loc_recommended')
        || firstAttr('treatment_start_date') || firstAttr('treated_sud') || firstAttr('treated_mh')
        || data.householdIncome || data.dependents;
    if (hasClinical) {
        sectionHeader('Clinical Information');
        field(isFinal ? 'SUD Level of Care at Discharge' : 'Current SUD Level of Care', data.sudLoc);
        field(isFinal ? 'MH Level of Care at Discharge' : 'Current MH Level of Care', data.mhLoc);
        if (isFinal) {
            field('Recommended SUD LOC upon Discharge', firstAttr('sud_loc_recommended'));
            field('Recommended MH LOC upon Discharge', firstAttr('mh_loc_recommended'));
        }
        field('Program Status', data.programStatus);
        field('Treatment Attendance', data.attendance);
        field(
            'Receiving MAT',
            data.isReceivingMat === true ? 'Yes' :
            data.isReceivingMat === false ? 'No' : undefined,
        );
        if (is14Day) {
            field('Treatment Start Date', fmtDate(firstAttr('treatment_start_date')));
            field('Treated for SUD in past year', firstAttr('treated_sud'));
            field('Treated for MH in past year', firstAttr('treated_mh'));
        }
        if (data.householdIncome) field('Annual Household Income', data.householdIncome);
        if (data.dependents) field('Dependents', data.dependents);
    }

    // =====================================================
    // PARTICIPANT STATUS
    // =====================================================
    if (
        attrs.living_situation?.length || attrs.employment_status?.length || attrs.insurance_type?.length
        || attrs.criminal_justice?.length || firstAttr('months_unemployed')
        || firstAttr('education_level') || firstAttr('enrollment_status')
    ) {
        sectionHeader('Participant Status');
        tagList('Living Situation', attrs.living_situation, green);
        tagList('Employment Status', attrs.employment_status, blue);
        field('Education Enrollment Status', firstAttr('enrollment_status'));
        tagList('Insurance', attrs.insurance_type, purple);
        field('Months Unemployed (past 12)', firstAttr('months_unemployed'));
        field('Education Level', firstAttr('education_level'));
        tagList('Criminal Justice', attrs.criminal_justice, red);
    }

    // =====================================================
    // SERVICES
    // Hides "Plans to Provide" column when there's no planned data.
    // Legacy reports may still have planned data and will render both columns.
    // =====================================================
    const serviceKeys = ['treatment', 'case_mgmt', 'medical', 'aftercare', 'educational', 'recovery'];
    const labelMap: Record<string, string> = {
        treatment: 'Treatment Services',
        case_mgmt: 'Case Management',
        medical: 'Medical Services',
        aftercare: 'Aftercare',
        educational: 'Educational/Vocational',
        recovery: 'Recovery Support',
    };
    const hasServices = serviceKeys.some(k => attrs[`${k}_provided`]?.length || attrs[`${k}_planned`]?.length);
    if (hasServices) {
        sectionHeader('Services');
        for (const key of serviceKeys) {
            const provided = attrs[`${key}_provided`];
            const planned = attrs[`${key}_planned`];
            if (!provided?.length && !planned?.length) continue;
            checkPage(15);
            doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(navy.r, navy.g, navy.b);
            doc.text(labelMap[key] || key, margin, y); y += 5;
            tagList('Provided to Date', provided, green);
            if (planned?.length) tagList('Plans to Provide', planned, blue);
        }
    }

    // =====================================================
    // MAT SERVICES (multi-select tag list — was missing previously)
    // =====================================================
    if (attrs.mat_services?.length) {
        sectionHeader('MAT Services');
        tagList('Medications/Services', attrs.mat_services, purple);
    }

    // =====================================================
    // KYAE (legacy only)
    // =====================================================
    if (data.kyaeReferralStatus || data.kyaeEducationStatus || data.kyaeEmploymentStatus) {
        sectionHeader('KYAE Education & Employment');
        field('KYAE Referral Status', data.kyaeReferralStatus);
        field('Education Status', data.kyaeEducationStatus);
        field('Employment Status', data.kyaeEmploymentStatus);
    }

    // =====================================================
    // DISCHARGE
    // =====================================================
    if (data.wasDischarged || data.dischargeReason || isFinal) {
        sectionHeader('Discharge & Referral');
        field('Discharge Reason', data.dischargeReason);
        if (firstAttr('discharge_reason_other')) {
            field('Discharge Reason — Other', firstAttr('discharge_reason_other'));
        }
        field('Discharge Date', data.dischargeDate);
        field('Referred Provider', data.referredProvider);
        field('Referred LOC', data.referredLoc);
    }

    // =====================================================
    // GOALS & BARRIERS
    // =====================================================
    if (
        attrs.goals_achieved?.length || attrs.barriers?.length
        || firstAttr('goals_achieved_other') || firstAttr('barriers_other')
    ) {
        sectionHeader('Goals & Barriers');
        tagList('Goals Achieved', attrs.goals_achieved, green);
        if (firstAttr('goals_achieved_other')) {
            field('Goals Achieved — Other', firstAttr('goals_achieved_other'));
        }
        tagList('Barriers', attrs.barriers, red);
        if (firstAttr('barriers_other')) {
            field('Barriers — Other', firstAttr('barriers_other'));
        }
    }

    // =====================================================
    // NOTES
    // =====================================================
    if (data.barrierNotes || data.recommendationNotes || data.notes) {
        sectionHeader('Notes & Recommendations');
        if (data.barrierNotes) { text('Barriers Note:', 9, true, gray); text(data.barrierNotes, 9); y += 3; }
        if (data.recommendationNotes) { text('Recommendations:', 9, true, gray); text(data.recommendationNotes, 9); y += 3; }
        if (data.notes) { text('Additional Notes:', 9, true, gray); text(data.notes, 9); }
    }

    // =====================================================
    // SIGNATURE
    // =====================================================
    if (data.isSigned) {
        checkPage(30);
        y += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, margin + maxWidth, y);
        y += 8;
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(green.r, green.g, green.b);
        doc.text('✓ Electronically Signed', margin, y); y += 5;
        doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal');
        let sigLine = data.submitterName || '';
        if (data.submitterCredential) sigLine += `, ${data.submitterCredential}`;
        if (firstAttr('credential_other')) sigLine += ` (${firstAttr('credential_other')})`;
        if (data.signatureDate) sigLine += ` — ${data.signatureDate}`;
        doc.text(sigLine, margin, y);
    }

    // =====================================================
    // FOOTER (all pages)
    // =====================================================
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setFontSize(7); doc.setTextColor(160, 160, 160);
        doc.text('DDOR — Data Driven Outcomes Reporting • Fletcher Group, Inc. • BHCDP/SB90 Program', margin, pageHeight - 8);
        doc.text(`Page ${i} of ${total}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    }

    // Save
    const nameSlug = data.clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const typeSlug = data.reportType.replace(/[^a-z0-9]/gi, '_');
    doc.save(`ddor_${typeSlug}_${nameSlug}.pdf`);
}
