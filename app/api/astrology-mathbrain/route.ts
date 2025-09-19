import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Math Brain API is available',
    endpoints: ['GET', 'POST'],
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json().catch(() => ({}));
    
    console.log('POST /api/astrology-mathbrain received request for:', data.personA?.name || 'Unknown');
    
    // Return a maintenance message for now
    return NextResponse.json({
      success: false,
      error: 'Math Brain backend is under maintenance. Please use the legacy version or check back later.',
      code: 'BACKEND_UNAVAILABLE',
      received: {
        mode: data.mode,
        personAName: data.personA?.name,
        hasPersonB: !!data.personB,
        timestamp: new Date().toISOString()
      }
    }, { status: 503 });
    
  } catch (error: any) {
    console.error('Astrology MathBrain API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      code: 'ASTROLOGY_API_ERROR',
      message: error.message
    }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
  
  return new NextResponse('', { 
    status: 200, 
    headers: new Headers(headers as any)
  });
}
