import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// Serve the legacy Math Brain index.html under /math-brain
export async function GET(req: NextRequest) {
  const fs = await import('fs/promises');
  const path = await import('path');

  const filePath = path.resolve(process.cwd(), 'index.html');
  try {
    const file = await fs.readFile(filePath, { encoding: 'utf-8' });
    return new Response(file, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  } catch (e: any) {
    return new Response(`Math Brain file not found: ${e.message}`, { status: 404 });
  }
}
