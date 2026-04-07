import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ROOT = process.cwd();
const ALLOWED_BASE = path.resolve(ROOT, 'Background/Schools/BL_IU_Technical');

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.csv') return 'text/csv; charset=utf-8';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  return 'application/octet-stream';
}

function dispositionFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.pdf') {
    return 'inline';
  }
  return 'attachment';
}

export async function GET(request) {
  const relPath = request.nextUrl.searchParams.get('path');
  if (!relPath) {
    return NextResponse.json({ error: 'Missing query parameter: path' }, { status: 400 });
  }

  const absolutePath = path.resolve(ROOT, relPath);
  if (!absolutePath.startsWith(ALLOWED_BASE)) {
    return NextResponse.json({ error: 'Path is outside allowed dossier directory' }, { status: 403 });
  }

  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(absolutePath);
  const fileName = path.basename(absolutePath);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'content-type': contentTypeFor(absolutePath),
      'content-disposition': `${dispositionFor(absolutePath)}; filename="${fileName}"`,
      'cache-control': 'no-store'
    }
  });
}
