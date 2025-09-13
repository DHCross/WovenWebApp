import { NextRequest } from 'next/server';
import { AdviceLadderTree } from '../../../src/feedback/advice-ladder-tree.js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hookStack, sessionContext, userNeed } = body;

    // Validate required data
    if (!hookStack || !sessionContext) {
      return Response.json({
        success: false,
        error: 'Missing required data for Advice Ladder Tree processing'
      }, { status: 400 });
    }

    // Initialize and process the ladder tree
    const ladder = new AdviceLadderTree();
    const result = await ladder.processHookStack(hookStack, sessionContext, userNeed);

    return Response.json(result);

  } catch (error) {
    console.error('Error in Advice Ladder Tree API:', error);
    return Response.json({
      success: false,
      error: 'Internal server error processing therapeutic integration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}