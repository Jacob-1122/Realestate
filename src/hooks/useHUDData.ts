import { useState, useEffect } from 'react';
import { FMRData } from '../types';
import { getCacheKey, getCachedData, setCachedData } from '../utils/apiHelpers';

const HUD_API_BASE = 'https://www.huduser.gov/hudapi/public/fmr';

interface UseHUDDataResult {
  data: FMRData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface HUDCountyData {
  state_code: string;
  fips_code: string;
  county_name: string;
  town_name?: string;
}

/**
 * Custom hook to fetch REAL Fair Market Rent data from HUD API
 * NO MOCK DATA - Uses actual HUD API with proper authentication
 */
export function useHUDData(zipCode: string | null, stateCode?: string | null, countyName?: string | null): UseHUDDataResult {
  const [data, setData] = useState<FMRData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!zipCode || zipCode.length !== 5) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);
    let timeoutId: number | undefined;

    try {
      // Get API key from environment
      const apiKey = import.meta.env.VITE_HUD_API_KEY;
      
      if (!apiKey) {
        throw new Error('HUD API key not found. Please add VITE_HUD_API_KEY to your .env file. Get one at: https://www.huduser.gov/portal/dataset/fmr-api.html');
      }

      const cacheKey = getCacheKey('hud_fmr', zipCode);
      
      // Check cache first
      const cached = getCachedData<FMRData>(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }

      // If we don't have state/county info yet, we can't proceed
      if (!stateCode || !countyName) {
        console.log('Waiting for location data...', { stateCode, countyName });
        setLoading(false);
        return;
      }

      // Add timeout to prevent hanging
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 30000) as unknown as number; // 30 second timeout

      const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      };

      // STEP 1: Get list of counties in the state to find entity ID
      const countiesUrl = `${HUD_API_BASE}/listCounties/${stateCode}`;
      console.log('Fetching counties from:', countiesUrl);
      
      const countiesResponse = await fetch(countiesUrl, { 
        headers,
        signal: controller.signal 
      });

      if (!countiesResponse.ok) {
        if (countiesResponse.status === 401) {
          throw new Error('Invalid HUD API key. Please verify your token at HUD User portal.');
        }
        if (countiesResponse.status === 403) {
          throw new Error('Not authorized. Make sure you registered for FMR API access.');
        }
        throw new Error(`Failed to fetch counties: ${countiesResponse.statusText}`);
      }

      const countiesData = await countiesResponse.json();
      console.log('Counties API Response:', countiesData);
      
      // Check if response has data
      if (!countiesData || typeof countiesData !== 'object') {
        throw new Error(`Invalid response format from HUD API`);
      }

      // Handle different response formats
      const countiesList = countiesData.data || countiesData.result || countiesData;
      
      if (!Array.isArray(countiesList) || countiesList.length === 0) {
        console.error('Counties data:', countiesList);
        throw new Error(`No counties found for state: ${stateCode}. The state may not be in the HUD database or the API format changed.`);
      }

      // Find matching county (handle variations like "County" suffix and abbreviations)
      const normalizedCountyName = countyName
        .toLowerCase()
        .replace(/\s+county\s*$/i, '')
        .replace(/^saint\s+/i, 'st. ')  // Convert "Saint" to "St."
        .replace(/^st\s+/i, 'st. ')     // Normalize "St" to "St."
        .trim();
      
      console.log('Looking for county:', countyName, '(normalized:', normalizedCountyName + ')');
      
      const matchingCounty = countiesList.find((c: HUDCountyData) => {
        const hudCountyName = c.county_name
          .toLowerCase()
          .replace(/\s+county\s*$/i, '')
          .replace(/^saint\s+/i, 'st. ')
          .replace(/^st\s+/i, 'st. ')
          .trim();
        
        // Try exact match first, then partial match
        return hudCountyName === normalizedCountyName || 
               hudCountyName.includes(normalizedCountyName) || 
               normalizedCountyName.includes(hudCountyName);
      });

      if (!matchingCounty) {
        console.error('Available counties:', countiesList.map((c: HUDCountyData) => c.county_name));
        
        // If county is "Unknown County", provide helpful error message
        if (countyName === 'Unknown County') {
          throw new Error(`Unable to determine county for ZIP ${zipCode}. Try clearing your browser cache and searching again, or try a different ZIP code.`);
        }
        
        throw new Error(`County "${countyName}" not found in HUD database for ${stateCode}. Available counties logged to console.`);
      }
      
      console.log('Matched county:', matchingCounty);

      // STEP 2: Get FMR data using the entity ID (fips_code)
      const entityId = matchingCounty.fips_code;
      const fmrUrl = `${HUD_API_BASE}/data/${entityId}`;
      console.log('Fetching FMR data from:', fmrUrl);
      
      const fmrResponse = await fetch(fmrUrl, { 
        headers,
        signal: controller.signal 
      });

      if (!fmrResponse.ok) {
        if (fmrResponse.status === 404) {
          throw new Error(`No FMR data available for ${countyName}, ${stateCode}`);
        }
        throw new Error(`Failed to fetch FMR data: ${fmrResponse.statusText}`);
      }

      const fmrData = await fmrResponse.json();
      console.log('FMR API Response:', fmrData);

      if (!fmrData.data && !fmrData.result) {
        console.error('Invalid FMR response:', fmrData);
        throw new Error('Invalid response from HUD API - no data field found');
      }

      const fmrResult = fmrData.data || fmrData.result || fmrData;

      // Check if this is a Small Area FMR (has array of ZIP codes)
      let fmrValues = fmrResult;
      
      if (fmrResult.basicdata && Array.isArray(fmrResult.basicdata)) {
        console.log('Small Area FMR detected - searching for ZIP', zipCode, 'in array of', fmrResult.basicdata.length, 'ZIPs');
        
        // Find the specific ZIP code in the array
        const zipData = fmrResult.basicdata.find((item: any) => item.zip_code === zipCode);
        
        if (zipData) {
          console.log('Found ZIP-specific FMR data:', zipData);
          console.log('ZIP-specific data keys:', Object.keys(zipData));
          fmrValues = zipData; // Use the ZIP-specific data directly
        } else {
          // If exact ZIP not found, use MSA-level data (first entry often has "MSA level" as zip_code)
          const msaData = fmrResult.basicdata.find((item: any) => item.zip_code === 'MSA level');
          if (msaData) {
            console.log('Using MSA-level FMR data:', msaData);
            fmrValues = {
              ...fmrResult,
              ...msaData,
              basicdata: msaData,
            };
          } else {
            console.warn('ZIP', zipCode, 'not found in Small Area FMR data. Available ZIPs:', 
              fmrResult.basicdata.slice(0, 10).map((item: any) => item.zip_code));
          }
        }
      }

      // Transform to our format
      const transformedData: FMRData = {
        zip_code: zipCode,
        year: parseInt(fmrResult.year || new Date().getFullYear().toString()),
        data: {
          basicdata: fmrResult.basicdata || {},
          fmr_0: parseInt(fmrValues.Efficiency || fmrValues.fmr_0 || '0'),
          fmr_1: parseInt(fmrValues['One-Bedroom'] || fmrValues.fmr_1 || '0'),
          fmr_2: parseInt(fmrValues['Two-Bedroom'] || fmrValues.fmr_2 || '0'),
          fmr_3: parseInt(fmrValues['Three-Bedroom'] || fmrValues.fmr_3 || '0'),
          fmr_4: parseInt(fmrValues['Four-Bedroom'] || fmrValues.fmr_4 || '0'),
          county_name: fmrResult.county_name || countyName,
          state_alpha: fmrResult.state_alpha || stateCode,
          metro_name: fmrResult.metro_name || fmrResult.area_name || '',
        },
      };

      console.log('FMR Values being used:', fmrValues);
      console.log('FMR Values type:', typeof fmrValues);
      console.log('FMR Values keys:', Object.keys(fmrValues || {}));
      console.log('Final transformed data:', transformedData);

      console.log('Transformed FMR data:', transformedData);

      // Cache the result
      setCachedData(cacheKey, transformedData);
      setData(transformedData);

      // Clear timeout on success
      if (timeoutId) clearTimeout(timeoutId);

    } catch (err) {
      // Clear timeout on error
      if (timeoutId) clearTimeout(timeoutId);
      
      // Handle AbortError specifically (from timeout)
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. The HUD API is taking too long to respond. Please try again.');
        console.error('HUD API Timeout:', err);
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch HUD data';
        // Don't show error if we're just waiting for location data
        if (!errorMessage.includes('Location data required')) {
          setError(errorMessage);
        }
        console.error('HUD API Error:', err);
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [zipCode, stateCode, countyName]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

