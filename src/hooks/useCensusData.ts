import { useState, useEffect } from 'react';
import { getCacheKey, getCachedData, setCachedData } from '../utils/apiHelpers';

interface CensusData {
  zipCode: string;
  medianHomeValue: number;
  year: number;
  source: string;
}

interface UseCensusDataResult {
  data: CensusData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom hook to fetch median home values from US Census Bureau API
 * FREE - No API key required
 */
export function useCensusData(zipCode: string | null): UseCensusDataResult {
  const [data, setData] = useState<CensusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!zipCode || zipCode.length !== 5) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cacheKey = getCacheKey('census_homevalue', zipCode);
      
      // Check cache first
      const cached = getCachedData<CensusData>(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }

      // US Census Bureau API endpoint for median home values by ZIP code
      // B25077_001E = Median value of owner-occupied housing units
      const apiKey = import.meta.env.VITE_CENSUS_API_KEY || 'demo';
      
      // Use proxy in development, direct API in production
      const isDevelopment = import.meta.env.DEV;
      const baseUrl = isDevelopment 
        ? '/api/census' 
        : 'https://api.census.gov';
      
      const apiUrl = `${baseUrl}/data/2022/acs/acs5?get=B25077_001E&for=zip%20code%20tabulation%20area:${zipCode}&key=${apiKey}`;
      
      console.log('Fetching Census data from:', apiUrl, '(dev mode:', isDevelopment, ')');
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Census API request failed: ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('Census API Response Text:', responseText);

      // Check if response is HTML (error page)
      if (responseText.trim().startsWith('<')) {
        throw new Error('Received HTML response instead of JSON - API may be unavailable');
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Invalid JSON response from Census API');
      }

      console.log('Census API Response:', result);

      // Parse the response
      // Format: [["B25077_001E","zip code tabulation area"],["50000","72404"]]
      if (!result || !Array.isArray(result) || result.length < 2) {
        throw new Error('Invalid response format from Census API');
      }

      const dataRow = result[1]; // Second row contains the data
      if (!dataRow || dataRow.length < 2) {
        throw new Error('No data found for this ZIP code');
      }

      const medianValue = parseInt(dataRow[0]);
      
      if (isNaN(medianValue) || medianValue <= 0) {
        throw new Error('Invalid median home value from Census API');
      }

      const censusData: CensusData = {
        zipCode,
        medianHomeValue: medianValue,
        year: 2022, // Census ACS 5-year data
        source: 'US Census Bureau ACS'
      };

      console.log('Processed Census data:', censusData);

      // Cache the result
      setCachedData(cacheKey, censusData);
      setData(censusData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Census data';
      setError(errorMessage);
      console.error('Census API Error:', err);
      
      // Fallback: Use estimated median home value based on FMR
      console.log('Using fallback estimation for Census data');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [zipCode]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
