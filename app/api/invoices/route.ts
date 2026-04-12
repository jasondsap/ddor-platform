import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAdmin, getUserId } from '@/lib/auth';
import { query, insert, logAuditEvent } from '@/lib/db';

// GET /api/invoices
export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth();
        const { role, facilityId, userId } = session.ddor;
        const { searchParams } = new URL(req.url);

        const status = searchParams.get('status'); // reimbursement_status filter
        const facilityFilter = searchParams.get('facility_id');
        const reviewStage = searchParams.get('review_stage'); // 'fgi_1', 'fgi_2', 'dbh'

        let sql = `
            SELECT
                i.*,
                f.name AS facility_name,
                p.name AS provider_name,
                p.abbreviation AS provider_abbreviation,
                u.first_name || ' ' || u.last_name AS submitter_name_joined
            FROM invoices i
            LEFT JOIN facilities f ON i.facility_id = f.id
            LEFT JOIN providers p ON f.provider_id = p.id
            LEFT JOIN users u ON i.submitter_id = u.id
            WHERE i.is_archived = false
        `;
        const params: any[] = [];
        let paramIdx = 1;

        // Role-based: providers only see their own
        if (!isAdmin(session)) {
            sql += ` AND i.facility_id = $${paramIdx}`;
            params.push(facilityId);
            paramIdx++;
        } else if (facilityFilter) {
            sql += ` AND i.facility_id = $${paramIdx}`;
            params.push(facilityFilter);
            paramIdx++;
        }

        if (status) {
            sql += ` AND i.reimbursement_status = $${paramIdx}`;
            params.push(status);
            paramIdx++;
        }

        // Filter by review stage awaiting review
        if (reviewStage === 'fgi_1') {
            sql += ` AND i.fgi_review_1 = 'awaiting_review'`;
        } else if (reviewStage === 'fgi_2') {
            sql += ` AND i.fgi_review_1 = 'approved' AND i.fgi_review_2 = 'awaiting_review'`;
        } else if (reviewStage === 'dbh') {
            sql += ` AND i.fgi_review_2 = 'approved' AND i.dbh_review = 'awaiting_review'`;
        }

        sql += ` ORDER BY i.created_at DESC`;

        const invoices = await query(sql, params);
        return NextResponse.json({ invoices });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error fetching invoices:', error);
        return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }
}

// POST /api/invoices — submit a new invoice
export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        const body = await req.json();

        if (!body.patient_name) {
            return NextResponse.json({ error: 'patient_name required' }, { status: 400 });
        }

        const invoice = await insert('invoices', {
            patient_name: body.patient_name,
            patient_dob: body.patient_dob || null,
            account_number: body.account_number || null,
            facility_id: body.facility_id || session.ddor.facilityId,
            submitter_id: getUserId(session),
            service_date_from: body.service_date_from || null,
            service_date_to: body.service_date_to || null,
            total_charge: body.total_charge || null,
            payment_due: body.payment_due || null,
            has_copays_deductibles: body.has_copays_deductibles || false,
            provider_attestation: body.provider_attestation || false,
            submitter_signature: body.submitter_signature || null,
            fgi_notes: body.fgi_notes || null,
        });

        // Insert invoice attributes (insurance type, service lines, codes)
        if (body.attributes && Array.isArray(body.attributes)) {
            for (const attr of body.attributes) {
                await insert('invoice_attributes', {
                    invoice_id: (invoice as any).id,
                    attribute_type: attr.type,
                    value: attr.value,
                });
            }
        }

        await logAuditEvent(
            getUserId(session),
            'create',
            'invoices',
            (invoice as any).id
        );

        return NextResponse.json({ success: true, invoice });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error creating invoice:', error);
        return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
    }
}
