import { NextResponse } from 'next/server';
import { getUsageStats } from '../../../lib/usage-tracker';

export async function GET() {
  try {
    const stats = getUsageStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    return NextResponse.json({ error: 'Failed to fetch usage stats' }, { status: 500 });
  }
}
