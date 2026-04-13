// lib/generateReportPDF.ts
// Generate branded PDF for any DDOR report
// Pattern follows PSS generateGoalPDF.ts

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
    householdIncome?: number;
    dependents?: number;
    // Discharge
    wasDischarged?: boolean;
    dischargeDate?: string;
    dischargeReason?: string;
    referredProvider?: string;
    referredLoc?: string;
    // KYAE
    kyaeReferralStatus?: string;
    kyaeEducationStatus?: string;
    kyaeEmploymentStatus?: string;
    // Notes
    barrierNotes?: string;
    recommendationNotes?: string;
    notes?: string;
    // Attributes (multi-value)
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

    // DDOR brand colors
    const navy = { r: 26, g: 43, b: 74 };
    const blue = { r: 26, g: 115, b: 168 };
    const teal = { r: 45, g: 212, b: 191 };
    const gray = { r: 107, g: 114, b: 128 };

    const checkPage = (need: number = 20) => { if (y > pageHeight - need) { doc.addPage(); y = margin; } };

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
    // =====================================================
    sectionHeader('Participant Information');
    const col1 = margin, col2 = margin + 60, col3 = margin + 120;
    fieldInline('Name', data.clientName, col1, 60);
    fieldInline('DDOR ID', data.ddorId, col2, 60);
    fieldInline('DOB', data.clientDob, col3, 50);
    y += 10;
    fieldInline('Diagnosis', data.diagnosis === 'co_occurring' ? 'Co-Occurring' : data.diagnosis?.toUpperCase(), col1, 60);
    fieldInline('Provider', data.providerName, col2, 60);
    fieldInline('Facility', data.facilityName, col3, 50);
    y += 10;

    // =====================================================
    // CLINICAL
    // =====================================================
    if (data.sudLoc || data.mhLoc || data.programStatus) {
        sectionHeader('Clinical Information');
        field('Current SUD Level of Care', data.sudLoc);
        field('Current MH Level of Care', data.mhLoc);
        field('Program Status', data.programStatus);
        field('Treatment Attendance', data.attendance);
        field('Receiving MAT', data.isReceivingMat ? 'Yes' : data.isReceivingMat === false ? 'No' : undefined);
        if (data.householdIncome) field('Household Income', `$${data.householdIncome.toLocaleString()}`);
        if (data.dependents !== undefined && data.dependents !== null) field('Dependents', data.dependents.toString());
    }

    // =====================================================
    // PARTICIPANT STATUS
    // =====================================================
    const attrs = data.attributes;
    if (attrs.living_situation?.length || attrs.employment_status?.length || attrs.insurance_type?.length) {
        sectionHeader('Participant Status');
        tagList('Living Situation', attrs.living_situation, { r: 16, g: 185, b: 129 });
        tagList('Employment Status', attrs.employment_status, blue);
        tagList('Insurance', attrs.insurance_type, { r: 139, g: 92, b: 246 });
        tagList('Criminal Justice', attrs.criminal_justice, { r: 239, g: 68, b: 68 });
    }

    // =====================================================
    // SERVICES
    // =====================================================
    const serviceKeys = ['treatment', 'case_mgmt', 'medical', 'aftercare', 'educational', 'recovery'];
    const hasServices = serviceKeys.some(k => attrs[`${k}_provided`]?.length || attrs[`${k}_planned`]?.length);
    if (hasServices) {
        sectionHeader('Services');
        for (const key of serviceKeys) {
            const provided = attrs[`${key}_provided`];
            const planned = attrs[`${key}_planned`];
            if (!provided?.length && !planned?.length) continue;
            const label = key.replace('_', ' ').replace(/^\w/, c => c.toUpperCase());
            checkPage(15);
            doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(navy.r, navy.g, navy.b);
            doc.text(label, margin, y); y += 5;
            tagList('Provided to Date', provided, { r: 16, g: 185, b: 129 });
            tagList('Plans to Provide', planned, blue);
        }
    }

    // =====================================================
    // KYAE
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
    if (data.wasDischarged || data.dischargeReason) {
        sectionHeader('Discharge & Referral');
        field('Discharge Reason', data.dischargeReason);
        field('Discharge Date', data.dischargeDate);
        field('Referred Provider', data.referredProvider);
        field('Referred LOC', data.referredLoc);
        tagList('Goals Achieved', attrs.goals_achieved, { r: 16, g: 185, b: 129 });
        tagList('Barriers', attrs.barriers, { r: 239, g: 68, b: 68 });
    }

    // =====================================================
    // NOTES
    // =====================================================
    if (data.barrierNotes || data.recommendationNotes || data.notes) {
        sectionHeader('Notes & Recommendations');
        if (data.barrierNotes) { text('Living Expenses / Barriers:', 9, true, gray); text(data.barrierNotes, 9); y += 3; }
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
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(16, 185, 129);
        doc.text('✓ Electronically Signed', margin, y); y += 5;
        doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal');
        let sigLine = data.submitterName || '';
        if (data.submitterCredential) sigLine += `, ${data.submitterCredential}`;
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
