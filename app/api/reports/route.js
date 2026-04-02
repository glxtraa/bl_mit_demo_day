import { NextResponse } from 'next/server';
import { saveReport } from '@/lib/serverStore';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const payload = await request.json();
    const report = saveReport(payload);
    return NextResponse.json({ ok: true, report }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Invalid report payload' }, { status: 400 });
  }
}
