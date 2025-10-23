/**
 * Test suite for the Astrologer API wrapper module
 *
 * Demonstrates integration with Balance Meter pipeline and validates
 * typed fetchers and normalization hooks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AstrologerClient,
  AstrologerAPIError,
  normalizeAspect,
  normalizeAspects,
  aspectsToBalanceMeterDay,
  scaleBalanceMeterDay,
  createAstrologerClient,
  type SubjectModel,
  type AspectModel,
  type BalanceMeterDayInput,
} from '@/lib/api/astrologer';

// Mock fetch for testing
const mockFetch = vi.fn();

describe('Astrologer API Wrapper', () => {
  let client: AstrologerClient;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    client = new AstrologerClient({ apiKey: mockApiKey });
  });

  describe('Client Configuration', () => {
    it('should create client with default config', () => {
      const client = new AstrologerClient({ apiKey: mockApiKey });
      expect(client).toBeInstanceOf(AstrologerClient);
    });

    it('should create client from environment', () => {
      process.env.RAPIDAPI_KEY = mockApiKey;
      expect(createAstrologerClient()).toBeInstanceOf(AstrologerClient);
      delete process.env.RAPIDAPI_KEY;
    });

    it('should throw if RAPIDAPI_KEY not set', () => {
      delete process.env.RAPIDAPI_KEY;
      expect(() => createAstrologerClient()).toThrow('RAPIDAPI_KEY environment variable is required');
    });
  });

  describe('API Error Handling', () => {
    it.skip('should handle API errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: vi.fn().mockResolvedValue('Bad Request'),
      };

      mockFetch.mockReturnValueOnce(Promise.resolve(mockResponse as any));

      await expect(client.getBirthData({} as SubjectModel))
        .rejects
        .toThrow(AstrologerAPIError);
    });

    it('should retry on failure', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Server Error'),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'success', subject: {}, planets: [], houses: [] }),
        });

      const result = await client.getBirthData({} as SubjectModel);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.status).toBe('success');
    });
  });

  describe('Aspect Normalization', () => {
    const mockAspect: AspectModel = {
      p1_name: 'Sun',
      p2_name: 'Moon',
      aspect: 'trine',
      orbit: 2.5,
      diff: 120,
      p1_abs_pos: 45,
      p2_abs_pos: 165,
      aspect_degrees: 120,
    };

    it('should normalize single aspect', () => {
      const normalized = normalizeAspect(mockAspect);

      expect(normalized).toEqual({
        aspect: 'trine',
        orb: 2.5,
        transit_potency: 1.0,
        target_potency: 1.0,
        transit: 'Sun',
        target: 'Moon',
      });
    });

    it('should normalize aspect array', () => {
      const aspects = [mockAspect, mockAspect];
      const normalized = normalizeAspects(aspects);

      expect(normalized).toHaveLength(2);
      expect(normalized[0].aspect).toBe('trine');
    });
  });

  describe('Balance Meter Integration', () => {
    const mockSubject: SubjectModel = {
      name: 'Test Person',
      year: 1990,
      month: 5,
      day: 15,
      hour: 12,
      minute: 0,
      latitude: 40.7128,
      longitude: -74.006,
      timezone: 'America/New_York',
    };

    const mockAspects: AspectModel[] = [
      {
        p1_name: 'Sun',
        p2_name: 'Mars',
        aspect: 'square',
        orbit: 1.2,
        diff: 90,
        p1_abs_pos: 45,
        p2_abs_pos: 135,
        aspect_degrees: 90,
      },
    ];

    it('should convert aspects to Balance Meter day input', () => {
      const dayInput = aspectsToBalanceMeterDay(
        mockAspects,
        '2024-01-01',
        mockSubject,
      );

      expect(dayInput).toEqual({
        date: '2024-01-01',
        magnitude: 0.1, // 1 aspect / 10
        directional_bias: 0,
        volatility: 0.05, // 1 aspect / 20
        aspects: expect.any(Array),
        timezone: 'America/New_York',
      });
    });

    it('should scale Balance Meter inputs using canonical functions', () => {
      const dayInput: BalanceMeterDayInput = {
        date: '2024-01-01',
        magnitude: 0.5,
        directional_bias: 0.2,
        volatility: 0.3,
        timezone: 'America/New_York',
      };

      const scaled = scaleBalanceMeterDay(dayInput);

      expect(scaled.magnitude).toHaveProperty('value');
      expect(scaled.directionalBias).toHaveProperty('value');

      // Values should be properly scaled and rounded
      expect(typeof scaled.magnitude.value).toBe('number');
      expect(typeof scaled.directionalBias.value).toBe('number');
    });
  });

  describe('API Endpoints', () => {
    const mockSubject: SubjectModel = {
      name: 'Test Person',
      year: 1990,
      month: 5,
      day: 15,
      latitude: 40.7128,
      longitude: -74.006,
    };

    it('should call birth data endpoint', async () => {
      const mockResponse = {
        status: 'success',
        subject: mockSubject,
        planets: [],
        houses: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.getBirthData(mockSubject);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://astrologer.p.rapidapi.com/api/v4/birth-data',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-RapidAPI-Key': mockApiKey,
            'X-RapidAPI-Host': 'astrologer.p.rapidapi.com',
          }),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should call transit aspects data endpoint', async () => {
      const mockResponse = {
        status: 'success',
        aspects: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const transitDates = [{ year: 2024, month: 1, day: 1 }];
      const result = await client.getTransitAspectsData(mockSubject, transitDates);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockResponse);
    });

    it('should call relationship score endpoint', async () => {
      const mockResponse = {
        status: 'success',
        score: 25,
        qualitative_range: 'Good',
        description: 'Compatible relationship',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const subjectB: SubjectModel = { ...mockSubject, name: 'Partner' };
      const result = await client.getRelationshipScore(mockSubject, subjectB);

      expect(result.score).toBe(25);
      expect(result.qualitative_range).toBe('Good');
    });
  });
});
