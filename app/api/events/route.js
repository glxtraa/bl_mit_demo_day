import { NextResponse } from 'next/server';
import { addAuditEvent, listAuditEvents } from '@/lib/serverStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ events: listAuditEvents() });
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const event = addAuditEvent(payload || {});
    return NextResponse.json({ ok: true, event }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Invalid event payload' }, { status: 400 });
  }
}
