import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserId } from '@/lib/auth';
import { query } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ============================================================================
// System Prompt
// ============================================================================

const DORI_SYSTEM_PROMPT = `You are Dori, an intelligent assistant for the DDOR (Data Driven Outcomes Reporting) platform used by Fletcher Group, Inc. to manage Kentucky's Behavioral Health Conditional Dismissal Program (BHCDP/SB90).

You have access to program data and can answer questions about:
- **Clients/Participants**: names, status, diagnosis, facility, treatment dates, insurance
- **Reports**: 14-Day, 42-Day, 90-Day, 180-Day, 270-Day, 360-Day progress reports; overdue and upcoming
- **Referrals**: incoming referral pipeline, eligibility, case navigators
- **Invoices**: billing status, payment amounts, approval pipeline
- **Assessments**: BARC-10, PHQ-9/GAD-7, GAIN-SS scores
- **Notes**: client documentation and case notes
- **Providers & Facilities**: organization details, service capabilities

When answering:
1. Be concise and direct — get to the point
2. Reference specific data (dates, scores, counts) when available
3. If you don't have data to answer, say so clearly
4. Use a professional but warm tone
5. Format numbers and dates readably
6. When listing clients, include their DDOR ID if available

You cannot:
- Make up data that wasn't provided
- Modify any records (read-only)
- Share data outside the user's authorized scope

Keep responses concise (under 200 words) unless detail is requested.`;

// ============================================================================
// POST - Handle chat messages
// ============================================================================

export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        const ddor = (session as any)?.ddor;
        const userId = getUserId(session);
        const facilityId = ddor?.facilityId || null;
        const isAdmin = ddor?.role === 'super_admin' || ddor?.role === 'business_user';

        const { messages } = await req.json();
        const lastMessage = messages[messages.length - 1]?.content || '';

        if (!process.env.ANTHROPIC_API_KEY) {
            return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
        }

        // Step 1: Analyze question to determine what data to fetch
        const plan = await analyzeQuestion(lastMessage);

        // Step 2: Execute queries with facility scoping
        const results = await executeQueries(plan, facilityId, isAdmin);

        // Step 3: Build context and generate response
        const context = buildContextPrompt(results);
        const scopeNote = isAdmin
            ? 'This user is an admin with access to ALL facilities and providers.'
            : `This user can only see data for their assigned facility (ID: ${facilityId}).`;

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 600,
            system: DORI_SYSTEM_PROMPT + `\n\n${scopeNote}`,
            messages: [
                { role: 'user', content: `Here is the relevant data from the database:\n\n${context}` },
                { role: 'assistant', content: 'I have the data. I\'ll answer based on what was found.' },
                ...messages.map((m: any) => ({ role: m.role, content: m.content })),
            ],
        });

        const assistantMessage = response.content[0].type === 'text' ? response.content[0].text : 'I couldn\'t generate a response.';

        return NextResponse.json({ message: assistantMessage });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Dori error:', error);
        return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
    }
}

// ============================================================================
// Analyze Question
// ============================================================================

async function analyzeQuestion(question: string): Promise<any> {
    const prompt = `Analyze this question and determine what database queries are needed for a behavioral health program management system.

Question: "${question}"

Return ONLY a JSON object:
{
    "clientName": "name if mentioned, or null",
    "needsClientList": true/false,
    "needsClientStats": true/false,
    "needsReportTracking": true/false,
    "needsOverdueReports": true/false,
    "needsReferrals": true/false,
    "needsInvoices": true/false,
    "needsNotes": true/false,
    "needsAssessments": true/false,
    "needsProviders": true/false,
    "facilityName": "facility name if mentioned, or null",
    "diagnosisFilter": "sud/mh/co_occurring or null",
    "statusFilter": "active/archived/homeless or null"
}

Return ONLY the JSON, no other text.`;

    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
    });

    try {
        const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
        const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleaned);
    } catch {
        return { needsClientStats: true };
    }
}

// ============================================================================
// Execute Queries (facility-scoped)
// ============================================================================

async function executeQueries(plan: any, facilityId: string | null, isAdmin: boolean): Promise<any[]> {
    const results: any[] = [];
    const scopeWhere = isAdmin ? '1=1' : `c.facility_id = '${facilityId}'`;
    const scopeWhereF = isAdmin ? '1=1' : `f.id = '${facilityId}'`;

    const safeQuery = async (label: string, fn: () => Promise<void>) => {
        try { await fn(); } catch (e: any) { console.error(`Dori query error [${label}]:`, e.message); }
    };

    // Find specific client
    if (plan.clientName) {
        await safeQuery('client_search', async () => {
        const name = plan.clientName.toLowerCase();
        const clients = await query(`
            SELECT c.id, c.first_name, c.last_name, c.ddor_id, c.diagnosis,
                c.treatment_start_date, c.agreement_signed_date, c.is_archived,
                c.insurance_status, c.date_of_birth,
                f.name AS facility_name, p.name AS provider_name
            FROM clients c
            LEFT JOIN facilities f ON c.facility_id = f.id
            LEFT JOIN providers p ON f.provider_id = p.id
            WHERE ${scopeWhere}
            AND (LOWER(c.first_name) LIKE $1 OR LOWER(c.last_name) LIKE $1
                 OR LOWER(c.first_name || ' ' || c.last_name) LIKE $1)
            LIMIT 5
        `, [`%${name}%`]);

        if (clients.length > 0) {
            results.push({ type: 'client', data: clients });
            const clientId = (clients[0] as any).id;
            const tracking = await query(`
                SELECT rt.*,
                    (c.treatment_start_date + INTERVAL '14 days')::DATE - CURRENT_DATE AS fourteen_day_remaining,
                    (c.treatment_start_date + INTERVAL '42 days')::DATE - CURRENT_DATE AS forty_two_day_remaining,
                    (c.treatment_start_date + INTERVAL '90 days')::DATE - CURRENT_DATE AS ninety_day_remaining
                FROM report_tracking rt
                JOIN clients c ON rt.client_id = c.id
                WHERE rt.client_id = $1 LIMIT 1
            `, [clientId]);
            if (tracking.length > 0) results.push({ type: 'client_tracking', data: tracking[0] });
            const notes = await query(`
                SELECT n.title, n.content, n.note_type, n.created_at,
                    u.first_name || ' ' || u.last_name AS author_name
                FROM client_notes n
                LEFT JOIN users u ON n.author_id = u.id
                WHERE n.client_id = $1 AND n.is_archived = false
                ORDER BY n.created_at DESC LIMIT 5
            `, [clientId]);
            if (notes.length > 0) results.push({ type: 'client_notes', data: notes });
        } else {
            results.push({ type: 'not_found', data: { name: plan.clientName } });
        }
        });
    }

    // Client stats
    if (plan.needsClientStats || plan.needsClientList) {
        await safeQuery('client_stats', async () => {
        const stats = await query(`
            SELECT
                COUNT(*) FILTER (WHERE c.is_archived = false) AS active,
                COUNT(*) FILTER (WHERE c.is_archived = true) AS archived,
                COUNT(*) FILTER (WHERE c.diagnosis = 'sud') AS sud_count,
                COUNT(*) FILTER (WHERE c.diagnosis = 'mh') AS mh_count,
                COUNT(*) FILTER (WHERE c.diagnosis = 'co_occurring') AS co_occurring_count,
                COUNT(*) AS total
            FROM clients c
            LEFT JOIN facilities f ON c.facility_id = f.id
            WHERE ${scopeWhere}
        `);
        results.push({ type: 'client_stats', data: stats[0] });
        if (plan.needsClientList) {
            const clients = await query(`
                SELECT c.first_name, c.last_name, c.ddor_id, c.diagnosis,
                    c.is_archived, f.name AS facility_name
                FROM clients c
                LEFT JOIN facilities f ON c.facility_id = f.id
                WHERE ${scopeWhere}
                ${plan.statusFilter === 'archived' ? 'AND c.is_archived = true' : 'AND c.is_archived = false'}
                ORDER BY c.last_name LIMIT 20
            `);
            results.push({ type: 'client_list', data: clients });
        }
        });
    }

    // Overdue reports
    if (plan.needsOverdueReports || plan.needsReportTracking) {
        await safeQuery('overdue_reports', async () => {
        const overdue = await query(`
            SELECT c.first_name, c.last_name, c.ddor_id, f.name AS facility_name,
                rt.fourteen_day_status,
                (c.treatment_start_date + INTERVAL '14 days')::DATE - CURRENT_DATE AS fourteen_day_remaining,
                rt.forty_two_day_status,
                (c.treatment_start_date + INTERVAL '42 days')::DATE - CURRENT_DATE AS forty_two_day_remaining,
                rt.ninety_day_status,
                (c.treatment_start_date + INTERVAL '90 days')::DATE - CURRENT_DATE AS ninety_day_remaining
            FROM report_tracking rt
            JOIN clients c ON rt.client_id = c.id
            LEFT JOIN facilities f ON c.facility_id = f.id
            WHERE ${scopeWhere} AND c.is_archived = false
            AND (rt.fourteen_day_status = 'overdue' OR rt.forty_two_day_status = 'overdue'
                OR rt.ninety_day_status = 'overdue')
            ORDER BY c.last_name
            LIMIT 15
        `);
        results.push({ type: 'overdue_reports', data: overdue });
        });
    }

    // Referrals
    if (plan.needsReferrals) {
        await safeQuery('referrals', async () => {
        const referrals = await query(`
            SELECT r.first_name, r.last_name, r.referral_number, r.date_received,
                r.eligibility, r.referral_type_status,
                co.name AS county_name
            FROM referrals r
            LEFT JOIN counties co ON r.originating_county_id = co.id
            WHERE r.is_archived = false
            ORDER BY r.date_received DESC LIMIT 10
        `);
        results.push({ type: 'referrals', data: referrals });
        });
    }

    // Invoices
    if (plan.needsInvoices) {
        await safeQuery('invoices', async () => {
        const invoices = await query(`
            SELECT i.invoice_number, i.payment_due, i.reimbursement_status,
                i.date_submitted, f.name AS facility_name
            FROM invoices i
            LEFT JOIN facilities f ON i.facility_id = f.id
            WHERE i.is_archived = false
            ${!isAdmin && facilityId ? `AND i.facility_id = '${facilityId}'` : ''}
            ORDER BY i.date_submitted DESC LIMIT 10
        `);
        const totals = await query(`
            SELECT
                COALESCE(SUM(payment_due), 0) AS total_billed,
                COALESCE(SUM(CASE WHEN reimbursement_status::text = 'Paid' THEN payment_due ELSE 0 END), 0) AS total_paid,
                COUNT(*) AS count
            FROM invoices WHERE is_archived = false
            ${!isAdmin && facilityId ? `AND facility_id = '${facilityId}'` : ''}
        `);
        results.push({ type: 'invoices', data: { recent: invoices, totals: totals[0] } });
        });
    }

    // Assessments
    if (plan.needsAssessments) {
        await safeQuery('assessments', async () => {
        const assessments = await query(`
            SELECT qs.questionnaire_type, qs.total_score, qs.submitted_at,
                c.first_name, c.last_name
            FROM questionnaire_submissions qs
            JOIN clients c ON qs.client_id = c.id
            LEFT JOIN facilities f ON c.facility_id = f.id
            WHERE ${scopeWhere}
            ORDER BY qs.submitted_at DESC LIMIT 10
        `);
        results.push({ type: 'assessments', data: assessments });
        });
    }

    // Notes search
    if (plan.needsNotes) {
        await safeQuery('notes', async () => {
        const notes = await query(`
            SELECT n.title, n.content, n.note_type, n.tags, n.created_at,
                u.first_name || ' ' || u.last_name AS author_name,
                c.first_name || ' ' || c.last_name AS client_name
            FROM client_notes n
            LEFT JOIN users u ON n.author_id = u.id
            LEFT JOIN clients c ON n.client_id = c.id
            WHERE n.is_archived = false
            ORDER BY n.created_at DESC LIMIT 10
        `);
        results.push({ type: 'notes', data: notes });
        });
    }

    // Providers
    if (plan.needsProviders) {
        await safeQuery('providers', async () => {
        const providers = await query(`
            SELECT p.name, p.abbreviation,
                COUNT(DISTINCT f.id) AS facility_count,
                COUNT(DISTINCT c.id) FILTER (WHERE c.is_archived = false) AS client_count
            FROM providers p
            LEFT JOIN facilities f ON f.provider_id = p.id AND f.is_inactive = false
            LEFT JOIN clients c ON c.facility_id = f.id
            GROUP BY p.id, p.name, p.abbreviation
            ORDER BY client_count DESC LIMIT 15
        `);
        results.push({ type: 'providers', data: providers });
        });
    }

    return results;
}

// ============================================================================
// Build Context Prompt
// ============================================================================

function buildContextPrompt(results: any[]): string {
    if (results.length === 0) return 'No relevant data found.';

    const sections: string[] = [];

    for (const r of results) {
        switch (r.type) {
            case 'client':
                sections.push(`**Clients Found:**\n${r.data.map((c: any) =>
                    `- ${c.first_name} ${c.last_name} (ID: ${c.ddor_id || 'N/A'}) — ${c.is_archived ? 'Archived' : 'Active'}, Diagnosis: ${c.diagnosis || 'unspecified'}, Facility: ${c.facility_name || 'N/A'}, Provider: ${c.provider_name || 'N/A'}, Tx Start: ${c.treatment_start_date || 'Not set'}, Insurance: ${c.insurance_status || 'N/A'}, OUD: ${c.has_oud ? 'Yes' : 'No'}`
                ).join('\n')}`);
                break;

            case 'client_tracking':
                const t = r.data;
                sections.push(`**Report Timeline:**
- 14-Day: ${t.fourteen_day_status} (${t.fourteen_day_remaining ?? 'N/A'}d remaining)
- 42-Day: ${t.forty_two_day_status} (${t.forty_two_day_remaining ?? 'N/A'}d remaining)
- 90-Day: ${t.ninety_day_status} (${t.ninety_day_remaining ?? 'N/A'}d remaining)
- Final: ${t.final_report_status || 'N/A'}`);
                break;

            case 'client_notes':
                sections.push(`**Client Notes:**\n${r.data.map((n: any) =>
                    `- [${n.note_type}] ${n.title || 'Untitled'} (${new Date(n.created_at).toLocaleDateString()} by ${n.author_name}): ${n.content?.substring(0, 100)}...`
                ).join('\n')}`);
                break;

            case 'not_found':
                sections.push(`**Not Found:** No client matching "${r.data.name}" in your accessible data.`);
                break;

            case 'client_stats':
                const s = r.data;
                sections.push(`**Client Statistics:** Active: ${s.active}, Archived: ${s.archived}, Total: ${s.total}, SUD: ${s.sud_count}, MH: ${s.mh_count}, Co-Occurring: ${s.co_occurring_count}`);
                break;

            case 'client_list':
                sections.push(`**Client List:**\n${r.data.map((c: any) =>
                    `- ${c.first_name} ${c.last_name} (${c.ddor_id || 'N/A'}) — ${c.diagnosis || '?'} at ${c.facility_name || 'N/A'}`
                ).join('\n')}`);
                break;

            case 'overdue_reports':
                if (r.data.length === 0) { sections.push('**Overdue Reports:** None! All reports are current.'); break; }
                sections.push(`**Overdue Reports (${r.data.length}):**\n${r.data.map((o: any) => {
                    const overdue = [];
                    if (o.fourteen_day_status === 'overdue') overdue.push(`14d (${Math.abs(parseInt(o.fourteen_day_remaining) || 0)}d late)`);
                    if (o.forty_two_day_status === 'overdue') overdue.push(`42d (${Math.abs(parseInt(o.forty_two_day_remaining) || 0)}d late)`);
                    if (o.ninety_day_status === 'overdue') overdue.push(`90d (${Math.abs(parseInt(o.ninety_day_remaining) || 0)}d late)`);
                    return `- ${o.first_name} ${o.last_name} (${o.ddor_id || 'N/A'}) at ${o.facility_name}: ${overdue.join(', ')}`;
                }).join('\n')}`);
                break;

            case 'referrals':
                sections.push(`**Recent Referrals (${r.data.length}):**\n${r.data.map((ref: any) =>
                    `- ${ref.first_name} ${ref.last_name} (#${ref.referral_number || 'N/A'}) — ${ref.eligibility || 'Pending'}, ${ref.county_name || 'N/A'} County, Received: ${ref.date_received ? new Date(ref.date_received).toLocaleDateString() : 'N/A'}`
                ).join('\n')}`);
                break;

            case 'invoices':
                const inv = r.data;
                sections.push(`**Invoice Summary:** Total Billed: $${parseFloat(inv.totals?.total_billed || 0).toLocaleString()}, Paid: $${parseFloat(inv.totals?.total_paid || 0).toLocaleString()}, Count: ${inv.totals?.count || 0}
Recent: ${inv.recent.map((i: any) => `$${i.payment_due} (${i.reimbursement_status}) — ${i.facility_name}`).join(', ')}`);
                break;

            case 'assessments':
                sections.push(`**Recent Assessments:**\n${r.data.map((a: any) =>
                    `- ${a.first_name} ${a.last_name}: ${a.questionnaire_type} score ${a.total_score} (${new Date(a.submitted_at).toLocaleDateString()})`
                ).join('\n')}`);
                break;

            case 'notes':
                sections.push(`**Recent Notes:**\n${r.data.map((n: any) =>
                    `- [${n.note_type}] "${n.title || 'Untitled'}" for ${n.client_name || 'General'} by ${n.author_name} (${new Date(n.created_at).toLocaleDateString()}): ${n.content?.substring(0, 80)}...`
                ).join('\n')}`);
                break;

            case 'providers':
                sections.push(`**Providers:**\n${r.data.map((p: any) =>
                    `- ${p.name} (${p.abbreviation || 'N/A'}): ${p.facility_count} facilities, ${p.client_count} active clients`
                ).join('\n')}`);
                break;
        }
    }

    return sections.join('\n\n');
}
