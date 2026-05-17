/**
 * POST /api/consent/[token]/respond
 *
 * Public endpoint - NO AUTH. Token is the credential.
 *
 * Body: { action: 'grant' | 'decline' }
 *
 * Returns: { ok, channel?, status? } or { ok: false, reason }
 *
 * IP and User-Agent are captured from the request for the audit record.
 */

import { NextRequest, NextResponse } from 'next/server';
import { respondToConsent } from '@/lib/consent/responder';

export const runtime = 'nodejs';

function getClientIp(req: NextRequest): string | null {
  // Trust order: x-forwarded-for (first hop), x-real-ip, fallback to NextRequest.ip
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  // @ts-expect-error - .ip exists at runtime on Vercel/Amplify
  return req.ip ?? null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  if (!token || token.length < 20) {
    return NextResponse.json({ ok: false, reason: 'not_found' }, { status: 404 });
  }

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = body.action;
  if (action !== 'grant' && action !== 'decline') {
    return NextResponse.json(
      { error: "action must be 'grant' or 'decline'" },
      { status: 400 }
    );
  }

  const ip = getClientIp(req);
  const userAgent = req.headers.get('user-agent');

  try {
    const result = await respondToConsent({
      token,
      action,
      ip,
      userAgent,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (err) {
    console.error('[consent/respond] unexpected error', {
      tokenPrefix: token.slice(0, 8),
      action,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: 'Internal error processing consent response' },
      { status: 500 }
    );
  }
}
