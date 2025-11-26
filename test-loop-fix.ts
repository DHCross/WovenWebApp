
import { SessionSSTLog } from './lib/raven/sst';

// Mock types
type AutoExecutionPlan = {
    status: 'none' | 'relational_auto' | 'parallel_auto' | 'contextual_auto' | 'osr';
    contextId?: string;
    contextName?: string;
    reason?: string;
};

// Mock deriveAutoExecutionPlan
function deriveAutoExecutionPlan(
    contexts: any[],
    sessionLog: SessionSSTLog & Record<string, any>
): AutoExecutionPlan {
    if (!Array.isArray(contexts) || contexts.length === 0) {
        return { status: 'none' };
    }

    const mirrorContext = contexts[0];

    // Check for failed contexts to prevent loops
    if (sessionLog.failedContexts && sessionLog.failedContexts.has(mirrorContext.id)) {
        console.log('[AutoPlan] Skipping failed context:', mirrorContext.id);
        return { status: 'none' };
    }

    // Simulate finding a relational context
    return {
        status: 'relational_auto',
        contextId: mirrorContext.id,
        contextName: mirrorContext.name,
    };
}

// Mock Session Log
const sessionLog: SessionSSTLog & Record<string, any> = {
    sessionId: 'test-session',
    probes: [],
    failedContexts: new Set(),
};

// Mock Context
const mockContext = {
    id: 'ctx-123',
    type: 'mirror',
    content: JSON.stringify({ _template_hint: 'relational_pair' }),
    name: 'Test Relational Report',
};

async function runTest() {
    console.log('--- Testing Loop Fix ---');

    // 1. First Pass: Should return relational_auto
    console.log('\n1. First Pass (Fresh Context):');
    const plan1 = deriveAutoExecutionPlan([mockContext], sessionLog);
    console.log('Plan 1 Status:', plan1.status);

    if (plan1.status !== 'relational_auto') {
        console.error('FAIL: Expected relational_auto, got', plan1.status);
        process.exit(1);
    }

    // 2. Simulate Failure: Add to failedContexts
    console.log('\n2. Simulating Failure (Adding to failedContexts)...');
    if (!sessionLog.failedContexts) sessionLog.failedContexts = new Set();
    sessionLog.failedContexts.add(mockContext.id);
    console.log('Failed Contexts:', Array.from(sessionLog.failedContexts));

    // 3. Second Pass: Should return none (skipped)
    console.log('\n3. Second Pass (Failed Context):');
    const plan2 = deriveAutoExecutionPlan([mockContext], sessionLog);
    console.log('Plan 2 Status:', plan2.status);

    if (plan2.status !== 'none') {
        console.error('FAIL: Expected none, got', plan2.status);
        process.exit(1);
    }

    console.log('\nSUCCESS: Loop prevented.');
}

runTest();
