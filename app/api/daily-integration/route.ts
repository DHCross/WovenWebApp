import { NextRequest } from 'next/server';
import { DailyIntegrationLayer } from '../../../src/feedback/daily-integration-layer.js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionData, ladderResults, integrationPreference } = body;

    // Validate required data
    if (!sessionData) {
      return Response.json({
        success: false,
        error: 'Missing session data for daily integration'
      }, { status: 400 });
    }

    // Initialize and generate daily integration
    const integrationLayer = new DailyIntegrationLayer();
    const result = await integrationLayer.generateDailyIntegration(
      sessionData, 
      ladderResults || {}, 
      integrationPreference
    );

    return Response.json(result);

  } catch (error) {
    console.error('Error in Daily Integration API:', error);
    return Response.json({
      success: false,
      error: 'Internal server error generating daily integration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}