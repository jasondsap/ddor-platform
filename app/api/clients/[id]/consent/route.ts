/**
 * GET /api/clients/[id]/consent
 *
 * Lists consent_records for a client, most recent first. Used by the
 * Communication tab in the client detail page to render the history table.
 *
 * Auth/Authz: requireClientAccess — same rules as the send endpoint.
 *
 * Response: { records: ConsentHistoryRow[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql, validateUUID } from '@/lib/db';
import { requireClientAccess } from '@/lib/auth';

export const runtime = 'nodejs';

interface ConsentHistoryRow {
  id: string;
  channel: string;
  status: string;
  recipient_address: string;
  sent_at: string | null;
  responded_at: string | null;
  send_status: string | null;
  sent_by_first_name: string | null;
  sent_by_last_name: string | null;
  created_at: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const clientId = params.id;
  if (!clientId || !validateUUID(clientId)) {
    return NextResponse.json({ error: 'Invalid client id' }, { status: 400 });
  }

  try {
    await requireClientAccess(clientId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    const status =
      message === 'Client not found' ? 404 :
      message === 'Facility access denied' ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }

  try {
    const rows = (await sql`
      SELECT
        cr.id,
        cr.channel,
        cr.status,
        cr.recipient_address,
        cr.sent_at,
        cr.responded_at,
        cr.send_status,
        cr.created_at,
        u.first_name AS sent_by_first_name,
        u.last_name  AS sent_by_last_name
      FROM consent_records cr
      LEFT JOIN users u ON cr.sent_by = u.id
      WHERE cr.client_id = ${clientId}
      ORDER BY cr.created_at DESC
      LIMIT 100
    `) as ConsentHistoryRow[];

    return NextResponse.json({ records: rows });
  } catch (err) {
    console.error('[consent/list] error', {
      clientId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: 'Failed to load consent history' },
      { status: 500 }
    );
  }
}
