import { NextResponse } from 'next/server';
import { addSensorRecord } from '@/lib/serverStore';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const payload = await request.json();
    if (!payload?.tlaloque_id || payload?.meters === undefined || !payload?.catched_at) {
      return NextResponse.json({ error: 'Missing required fields: tlaloque_id, meters, catched_at' }, { status: 400 });
    }

    const metadata = {
      ip: request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || 'unknown',
      city: request.headers.get('x-vercel-ip-city') || 'unknown',
      country: request.headers.get('x-vercel-ip-country') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    };

    const record = addSensorRecord('nivel', payload, metadata);
    return NextResponse.json({ ok: true, record }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Invalid JSON payload' }, { status: 400 });
  }
}
