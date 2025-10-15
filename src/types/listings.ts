// Types for real estate listing data and MOA calculations

export interface ListingCount {
  metroAreaName: string;
  maxPrice: number;
  minBeds: number;
  count: number | null;
  searchUrl: string;
  lastUpdated: string;
  status: 'loading' | 'cached' | 'fresh' | 'error' | 'pending';
  error?: string;
}

export interface MOASettings {
  targetRule: number; // 2.0 for 2% rule, 1.5 for 1.5% rule, etc.
  bedrooms: 1 | 2 | 3 | 4;
  buffer: number; // 1.0 = no buffer, 0.85 = 15% buffer below MOA
}

export interface ListingCountCache {
  count: number;
  timestamp: number;
  searchUrl: string;
}

export interface ScraperRequest {
  metroAreaName: string;
  maxPrice: number;
  minBeds: number;
}

export interface ScraperResponse {
  success: boolean;
  count?: number;
  metroAreaName?: string;
  timestamp?: string;
  error?: string;
}

