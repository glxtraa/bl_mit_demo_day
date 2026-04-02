import { NextResponse } from 'next/server';
import { listSensorRecords, listAuditEvents, listReports } from '@/lib/serverStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    records: listSensorRecords(),
    events: listAuditEvents(),
    reports: listReports()
  });
}
