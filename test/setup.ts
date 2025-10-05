import { vi } from 'vitest';

const mockResponse =
  'Your constitutional blueprint—Leo dominant with Scorpio co-anchors—remains stable under current calibration.';

const createMock = () => ({
  callGemini: vi.fn(async () => mockResponse),
  generateText: vi.fn(async () => mockResponse),
  generateStream: vi.fn(async function* () {
    yield { delta: mockResponse };
  }),
});

vi.mock('../lib/llm', () => createMock());
vi.mock('@/lib/llm', () => createMock());
