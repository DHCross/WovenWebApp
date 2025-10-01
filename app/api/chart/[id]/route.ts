import { Buffer } from 'node:buffer';
import { NextRequest, NextResponse } from 'next/server';

const chartCache = require('../../../../lib/server/chart-cache') as {
  getChartAsset: (id: string) => { buffer: Buffer; contentType?: string; metadata?: Record<string, any>; expiresAt: number } | null;
  pruneExpired: (now?: number) => void;
};

const { getChartAsset, pruneExpired } = chartCache;

function buildNotFoundResponse(id: string) {
  return NextResponse.json({
    success: false,
    error: 'Chart asset not found or expired',
    id,
  }, { status: 404 });
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const idParam = context?.params?.id;
  if (!idParam) {
    return buildNotFoundResponse('');
  }

  try {
    pruneExpired();
  } catch (error) {
    console.warn('chart-cache prune failed before fetch:', error);
  }

  const decodedId = decodeURIComponent(idParam);
  const asset = getChartAsset(decodedId);
  if (!asset || !asset.buffer) {
    return buildNotFoundResponse(decodedId);
  }

  const headers = new Headers();
  headers.set('Content-Type', asset.contentType || 'application/octet-stream');
  headers.set('Cache-Control', 'private, max-age=300');
  headers.set('Content-Length', asset.buffer.length.toString());
  headers.set('X-Chart-Expires', new Date(asset.expiresAt).toISOString());
  headers.set('Content-Disposition', `inline; filename="${decodedId}.${asset.metadata?.format || 'bin'}"`);

  // Convert Buffer to Uint8Array for NextResponse compatibility
  return new NextResponse(new Uint8Array(asset.buffer), {
    status: 200,
    headers,
  });
}
