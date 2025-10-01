/**
 * Saved Charts Manager
 *
 * Manages saved chart configurations for quick access.
 * Currently uses localStorage with future upgrade path to cloud storage (Firebase/Supabase).
 *
 * Storage format:
 * - Key: `woven.savedCharts.{userId}` or `woven.savedCharts.local` (if not authenticated)
 * - Value: JSON array of saved chart configurations
 */

export interface SavedChart {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  person: {
    name: string;
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
    city?: string;
    state?: string;
    country?: string;
    latitude?: number | string;
    longitude?: number | string;
    timezone?: string;
    zodiac_type?: string;
  };
  relationship?: {
    type?: string;
    intimacy_tier?: string;
    role?: string;
    notes?: string;
  };
  tags?: string[];
}

export interface SavedChartsList {
  charts: SavedChart[];
  lastUpdated: string;
}

const STORAGE_KEY_PREFIX = 'woven.savedCharts';

function getStorageKey(userId?: string | null): string {
  return `${STORAGE_KEY_PREFIX}.${userId || 'local'}`;
}

export function getSavedCharts(userId?: string | null): SavedChart[] {
  try {
    const key = getStorageKey(userId);
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    if (!stored) return [];

    const parsed: SavedChartsList = JSON.parse(stored);
    return Array.isArray(parsed.charts) ? parsed.charts : [];
  } catch (e) {
    console.error('Failed to load saved charts:', e);
    return [];
  }
}

export function saveChart(chart: Omit<SavedChart, 'id' | 'createdAt' | 'updatedAt'>, userId?: string | null): SavedChart {
  const charts = getSavedCharts(userId);

  const newChart: SavedChart = {
    ...chart,
    id: generateChartId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  charts.push(newChart);

  const list: SavedChartsList = {
    charts,
    lastUpdated: new Date().toISOString(),
  };

  const key = getStorageKey(userId);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(key, JSON.stringify(list));
  }

  return newChart;
}

export function updateChart(id: string, updates: Partial<Omit<SavedChart, 'id' | 'createdAt'>>, userId?: string | null): SavedChart | null {
  const charts = getSavedCharts(userId);
  const index = charts.findIndex(c => c.id === id);

  if (index === -1) return null;

  charts[index] = {
    ...charts[index],
    ...updates,
    id: charts[index].id, // Preserve ID
    createdAt: charts[index].createdAt, // Preserve creation date
    updatedAt: new Date().toISOString(),
  };

  const list: SavedChartsList = {
    charts,
    lastUpdated: new Date().toISOString(),
  };

  const key = getStorageKey(userId);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(key, JSON.stringify(list));
  }

  return charts[index];
}

export function deleteChart(id: string, userId?: string | null): boolean {
  const charts = getSavedCharts(userId);
  const filtered = charts.filter(c => c.id !== id);

  if (filtered.length === charts.length) return false; // Chart not found

  const list: SavedChartsList = {
    charts: filtered,
    lastUpdated: new Date().toISOString(),
  };

  const key = getStorageKey(userId);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(key, JSON.stringify(list));
  }

  return true;
}

export function getChart(id: string, userId?: string | null): SavedChart | null {
  const charts = getSavedCharts(userId);
  return charts.find(c => c.id === id) || null;
}

function generateChartId(): string {
  return `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Future upgrade path: Cloud storage functions
export async function syncChartsToCloud(userId: string): Promise<void> {
  // TODO: Implement Firebase/Supabase sync
  throw new Error('Cloud sync not yet implemented');
}

export async function loadChartsFromCloud(userId: string): Promise<SavedChart[]> {
  // TODO: Implement Firebase/Supabase fetch
  throw new Error('Cloud sync not yet implemented');
}
