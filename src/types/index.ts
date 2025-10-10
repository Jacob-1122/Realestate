// HUD Fair Market Rent API Types
export interface FMRData {
  zip_code: string;
  year: number;
  data: {
    basicdata: {
      [key: string]: number;
    };
    fmr_0?: number;
    fmr_1?: number;
    fmr_2?: number;
    fmr_3?: number;
    fmr_4?: number;
    county_name?: string;
    state_alpha?: string;
    metro_name?: string;
    countyname?: string;
    state?: string;
  };
}

export interface FMRDisplay {
  bedrooms: number;
  rent: number;
}

// Crime Data Types
export interface CrimeData {
  county: string;
  state: string;
  violent_crime_rate: number;
  property_crime_rate: number;
  total_incidents: number;
  year: number;
  trend?: 'up' | 'down' | 'stable';
  percentChange?: number;
}

// ZIP Code Location Types
export interface ZipCodeLocation {
  zip: string;
  county: string;
  state: string;
  state_abbr: string;
  latitude: number;
  longitude: number;
  city?: string;
  population?: number;
}

// Investment Metrics Types
export interface InvestmentMetrics {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendation: 'Excellent' | 'Good' | 'Fair' | 'Avoid';
  estimatedPriceRange: {
    low: number;
    high: number;
    median: number;
  };
  averageHomeCost: number;
  requiredRentFor2Percent: number;
  rentToPriceRatio: number;
  breakdown: {
    fmrScore: number;
    crimeScore: number;
    densityScore: number;
    fmrWeight: number;
    crimeWeight: number;
    densityWeight: number;
  };
}

// Market Context Types
export interface MarketContext {
  county: string;
  state: string;
  metroArea?: string;
  population?: number;
  nearestCity?: string;
}

// Analysis Result (Combined Data)
export interface AnalysisResult {
  zipCode: string;
  fmrData: FMRData | null;
  crimeData: CrimeData | null;
  location: ZipCodeLocation | null;
  investmentMetrics: InvestmentMetrics | null;
  marketContext: MarketContext | null;
  timestamp: number;
}

// Saved Search Types
export interface SavedSearch {
  id: string;
  zipCode: string;
  result: AnalysisResult;
  savedAt: number;
  nickname?: string;
}

// Theme Types
export type Theme = 'light' | 'dark';

// Cache Types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Chart Data Types
export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface TrendDataPoint {
  year: number;
  violent: number;
  property: number;
}

// Comparison Types
export interface ComparisonData {
  zipCodes: string[];
  results: AnalysisResult[];
}

