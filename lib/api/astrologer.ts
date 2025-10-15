/**
 * Astrologer API v4.0.0 Wrapper Module
 *
 * Typed fetchers and normalization hooks for the Balance Meter pipeline.
 * Provides seamless integration with the Raven Calder scaling system.
 *
 * Based on OpenAPI 3.1.0 specification for Astrologer API v4.
 * @see https://rapidapi.com/kerykeion/api/astrologer/
 */

import { z } from 'zod';

// ============================================================================
// API Configuration & Authentication
// ============================================================================

const API_BASE_URL = 'https://astrologer.p.rapidapi.com';
const API_VERSION = 'v4';

export const ASTROLOGY_ENDPOINTS = {
  // Core endpoints
  BIRTH_DATA: `${API_BASE_URL}/api/${API_VERSION}/birth-data`,
  BIRTH_CHART: `${API_BASE_URL}/api/${API_VERSION}/birth-chart`,
  NATAL_ASPECTS_DATA: `${API_BASE_URL}/api/${API_VERSION}/natal-aspects-data`,

  // Transit endpoints
  TRANSIT_CHART: `${API_BASE_URL}/api/${API_VERSION}/transit-chart`,
  TRANSIT_ASPECTS_DATA: `${API_BASE_URL}/api/${API_VERSION}/transit-aspects-data`,

  // Relationship endpoints
  SYNASTRY_CHART: `${API_BASE_URL}/api/${API_VERSION}/synastry-chart`,
  SYNASTRY_ASPECTS_DATA: `${API_BASE_URL}/api/${API_VERSION}/synastry-aspects-data`,
  COMPOSITE_CHART: `${API_BASE_URL}/api/${API_VERSION}/composite-chart`,
  COMPOSITE_ASPECTS_DATA: `${API_BASE_URL}/api/${API_VERSION}/composite-aspects-data`,
  RELATIONSHIP_SCORE: `${API_BASE_URL}/api/${API_VERSION}/relationship-score`,

  // Utility endpoints
  NOW: `${API_BASE_URL}/api/${API_VERSION}/now`,
} as const;

// ============================================================================
// Zod Schemas (API Contract Models)
// ============================================================================

// Subject/Birth data models
export const SubjectModelSchema = z.object({
  name: z.string(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23).optional(),
  minute: z.number().int().min(0).max(59).optional(),
  latitude: z.number(),
  longitude: z.number(),
  city: z.string().optional(),
  nation: z.string().optional(),
  timezone: z.string().optional(),
  zodiac_type: z.enum(['Tropic', 'Sidereal']).optional(),
  sidereal_mode: z.string().optional(),
  houses_system_identifier: z.string().optional(),
});

export const PlanetModelSchema = z.object({
  name: z.string(),
  quality: z.string(),
  element: z.string(),
  sign: z.string(),
  sign_num: z.number(),
  position: z.number(),
  abs_pos: z.number(),
  emoji: z.string().optional(),
  point_type: z.string(),
  house: z.string().optional(),
  retrograde: z.boolean(),
});

export const HouseModelSchema = z.object({
  house: z.number(),
  sign: z.string(),
  sign_num: z.number(),
  position: z.number(),
});

export const AspectModelSchema = z.object({
  p1_name: z.string(),
  p2_name: z.string(),
  aspect: z.string(),
  orbit: z.number(),
  diff: z.number(),
  p1_abs_pos: z.number(),
  p2_abs_pos: z.number(),
  aspect_degrees: z.number(),
  color: z.string().optional(),
  aid: z.string().optional(),
});

// Response models
export const BirthDataResponseSchema = z.object({
  status: z.string(),
  subject: SubjectModelSchema,
  planets: z.array(PlanetModelSchema),
  houses: z.array(HouseModelSchema),
});

export const AspectsDataResponseSchema = z.object({
  status: z.string(),
  aspects: z.array(AspectModelSchema),
});

export const RelationshipScoreResponseSchema = z.object({
  status: z.string(),
  score: z.number(),
  qualitative_range: z.string(),
  description: z.string(),
});

// ============================================================================
// TypeScript Types (Inferred from Schemas)
// ============================================================================

export type SubjectModel = z.infer<typeof SubjectModelSchema>;
export type PlanetModel = z.infer<typeof PlanetModelSchema>;
export type HouseModel = z.infer<typeof HouseModelSchema>;
export type AspectModel = z.infer<typeof AspectModelSchema>;

export type BirthDataResponse = z.infer<typeof BirthDataResponseSchema>;
export type AspectsDataResponse = z.infer<typeof AspectsDataResponseSchema>;
export type RelationshipScoreResponse = z.infer<typeof RelationshipScoreResponseSchema>;

// ============================================================================
// API Client Configuration
// ============================================================================

export interface AstrologerConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

export class AstrologerAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'AstrologerAPIError';
  }
}

// ============================================================================
// Core API Client
// ============================================================================

export class AstrologerClient {
  private config: Required<AstrologerConfig>;

  constructor(config: AstrologerConfig) {
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || API_BASE_URL,
      timeout: config.timeout || 30000,
      retries: config.retries || 2,
    };
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'POST',
    body?: any
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': this.config.apiKey,
      'X-RapidAPI-Host': 'astrologer.p.rapidapi.com',
    };

    const requestOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    };

    if (body && method === 'POST') {
      requestOptions.body = JSON.stringify(body);
    }

    let lastError: Error;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const response = await fetch(url, requestOptions);

        if (!response.ok) {
          const errorText = await response.text();
          throw new AstrologerAPIError(
            `API request failed: ${response.status} ${response.statusText}`,
            response.status,
            errorText
          );
        }

        const data = await response.json();
        return data as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.config.retries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }
      }
    }

    throw lastError!;
  }

  // ============================================================================
  // Typed Fetchers (API Methods)
  // ============================================================================

  /**
   * Get birth data (planets, houses, no aspects)
   */
  async getBirthData(subject: SubjectModel): Promise<BirthDataResponse> {
    return this.request<BirthDataResponse>(
      `/api/${API_VERSION}/birth-data`,
      'POST',
      subject
    );
  }

  /**
   * Get natal aspects data only
   */
  async getNatalAspectsData(subject: SubjectModel): Promise<AspectsDataResponse> {
    return this.request<AspectsDataResponse>(
      `/api/${API_VERSION}/natal-aspects-data`,
      'POST',
      subject
    );
  }

  /**
   * Get transit aspects data for a subject on specific dates
   */
  async getTransitAspectsData(
    subject: SubjectModel,
    transitDates: Array<{ year: number; month: number; day: number }>
  ): Promise<AspectsDataResponse[]> {
    const requests = transitDates.map(transitDate =>
      this.request<AspectsDataResponse>(
        `/api/${API_VERSION}/transit-aspects-data`,
        'POST',
        { first_subject: subject, transit_subject: transitDate }
      )
    );

    return Promise.all(requests);
  }

  /**
   * Get synastry aspects data between two subjects
   */
  async getSynastryAspectsData(
    subjectA: SubjectModel,
    subjectB: SubjectModel
  ): Promise<AspectsDataResponse> {
    return this.request<AspectsDataResponse>(
      `/api/${API_VERSION}/synastry-aspects-data`,
      'POST',
      { first_subject: subjectA, second_subject: subjectB }
    );
  }

  /**
   * Get composite aspects data for two subjects
   */
  async getCompositeAspectsData(
    subjectA: SubjectModel,
    subjectB: SubjectModel
  ): Promise<AspectsDataResponse> {
    return this.request<AspectsDataResponse>(
      `/api/${API_VERSION}/composite-aspects-data`,
      'POST',
      { first_subject: subjectA, second_subject: subjectB }
    );
  }

  /**
   * Get relationship compatibility score
   */
  async getRelationshipScore(
    subjectA: SubjectModel,
    subjectB: SubjectModel
  ): Promise<RelationshipScoreResponse> {
    return this.request<RelationshipScoreResponse>(
      `/api/${API_VERSION}/relationship-score`,
      'POST',
      { first_subject: subjectA, second_subject: subjectB }
    );
  }

  /**
   * Get current astrological data
   */
  async getCurrentData(): Promise<BirthDataResponse> {
    return this.request<BirthDataResponse>(
      `/api/${API_VERSION}/now`,
      'GET'
    );
  }
}

// ============================================================================
// Normalization Hooks (Balance Meter Pipeline Integration)
// ============================================================================

import { scaleUnipolar, scaleBipolar } from '@/lib/balance/scale';

/**
 * Normalized aspect data for Balance Meter processing
 */
export interface NormalizedAspect {
  aspect: string;
  orb: number;
  transit_potency?: number;
  target_potency?: number;
  transit: string;
  target: string;
}

/**
 * Convert Astrologer API AspectModel to Balance Meter NormalizedAspect
 */
export function normalizeAspect(aspect: AspectModel): NormalizedAspect {
  return {
    aspect: aspect.aspect.toLowerCase(),
    orb: Math.abs(aspect.orbit),
    transit_potency: 1.0, // Default potency
    target_potency: 1.0,  // Default potency
    transit: aspect.p1_name,
    target: aspect.p2_name,
  };
}

/**
 * Convert array of AspectModel to NormalizedAspect array
 */
export function normalizeAspects(aspects: AspectModel[]): NormalizedAspect[] {
  return aspects.map(normalizeAspect);
}

/**
 * Balance Meter day input from transit aspects
 */
export interface BalanceMeterDayInput {
  date: string;
  magnitude: number;
  directional_bias: number;
  aspects?: NormalizedAspect[];
  timezone?: string;
}

/**
 * Transform transit aspects data into Balance Meter day inputs
 *
 * This function takes raw transit aspect data and computes the normalized
 * inputs needed for the Balance Meter scaling pipeline.
 */
export function aspectsToBalanceMeterDay(
  aspects: AspectModel[],
  date: string,
  baseSubject: SubjectModel,
  options: {
    timezone?: string;
  } = {}
): BalanceMeterDayInput {
  const normalizedAspects = normalizeAspects(aspects);

  // Compute basic metrics (placeholder - integrate with actual computation)
  // These would typically come from your existing aspect processing logic
  const magnitude = Math.min(normalizedAspects.length / 10, 1.0); // Scale 0-1
  const directionalBias = 0.0; // Placeholder - compute from aspect directions

  return {
    date,
    magnitude,
    directional_bias: directionalBias,
    aspects: normalizedAspects,
    timezone: options.timezone || baseSubject.timezone || 'America/Chicago',
  };
}


// ============================================================================
// Factory & Convenience Functions
// ============================================================================

/**
 * Create AstrologerClient from environment variables
 */
export function createAstrologerClient(): AstrologerClient {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    throw new Error('RAPIDAPI_KEY environment variable is required');
  }

  return new AstrologerClient({ apiKey });
}

/**
 * High-level function to fetch transit data and normalize for Balance Meter
 */
export async function fetchTransitDataForBalanceMeter(
  subject: SubjectModel,
  dates: Array<{ year: number; month: number; day: number; dateString: string }>,
  options: {
    timezone?: string;
  } = {}
): Promise<BalanceMeterDayInput[]> {
  const client = createAstrologerClient();

  const aspectsData = await client.getTransitAspectsData(subject, dates);

  return aspectsData.map((response, index) =>
    aspectsToBalanceMeterDay(
      response.aspects,
      dates[index].dateString,
      subject,
      options
    )
  );
}

/**
 * High-level function to fetch synastry data for relational analysis
 */
export async function fetchSynastryDataForBalanceMeter(
  subjectA: SubjectModel,
  subjectB: SubjectModel,
  dates: Array<{ year: number; month: number; day: number; dateString: string }>,
  options: {
    timezone?: string;
  } = {}
): Promise<{
  synastryAspects: NormalizedAspect[];
  compositeAspects: NormalizedAspect[];
  relationshipScore: RelationshipScoreResponse;
}> {
  const client = createAstrologerClient();

  const [synastryResponse, compositeResponse, scoreResponse] = await Promise.all([
    client.getSynastryAspectsData(subjectA, subjectB),
    client.getCompositeAspectsData(subjectA, subjectB),
    client.getRelationshipScore(subjectA, subjectB),
  ]);

  return {
    synastryAspects: normalizeAspects(synastryResponse.aspects),
    compositeAspects: normalizeAspects(compositeResponse.aspects),
    relationshipScore: scoreResponse,
  };
}