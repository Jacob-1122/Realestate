import { useState, useEffect } from 'react';
import { CrimeData } from '../types';
import { getCacheKey, getCachedData, setCachedData } from '../utils/apiHelpers';

interface UseCrimeDataResult {
  data: CrimeData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom hook to fetch crime data
 * Note: This uses mock data since FBI Crime Data API requires complex state/county lookups
 * In production, you would implement proper FBI API integration with ZIP-to-county mapping
 */
export function useCrimeData(county: string | null, state: string | null): UseCrimeDataResult {
  const [data, setData] = useState<CrimeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!county || !state) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cacheKey = getCacheKey('crime', `${state}_${county}`);
      const cached = getCachedData<CrimeData>(cacheKey);
      
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }

      // In production, implement real FBI Crime Data API integration
      // For now, generate realistic mock data based on county characteristics
      const mockData = generateMockCrimeData(county, state);
      
      setCachedData(cacheKey, mockData);
      setData(mockData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch crime data';
      setError(errorMessage);
      console.error('Crime Data Error:', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [county, state]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Generate realistic mock crime data
 * In production, replace with actual FBI Crime Data API calls
 */
function generateMockCrimeData(county: string, state: string): CrimeData {
  // National averages (per 100k)
  const baseViolent = 380;
  const baseProperty = 1958;
  
  // Add some variation based on county name hash (consistent for same county)
  const hash = county.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variation = (hash % 100) / 100; // 0 to 1
  
  const violentRate = Math.round(baseViolent * (0.5 + variation));
  const propertyRate = Math.round(baseProperty * (0.5 + variation));
  
  return {
    county,
    state,
    violent_crime_rate: violentRate,
    property_crime_rate: propertyRate,
    total_incidents: Math.round((violentRate + propertyRate) * 10), // Assuming 1M population
    year: new Date().getFullYear() - 1, // Crime data is usually 1 year behind
    trend: Math.random() > 0.5 ? 'down' : 'stable',
    percentChange: Math.random() * 10 - 5, // -5% to +5%
  };
}

