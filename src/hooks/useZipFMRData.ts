import { useState, useEffect, useCallback } from 'react';
import { FMRData } from '../types';
import { getCacheKey, getCachedData, setCachedData } from '../utils/apiHelpers';

interface UseZipFMRDataResult {
  data: FMRData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Parse a CSV line handling quoted fields properly
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let insideQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      fields.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }
  
  // Push the last field
  if (currentField) {
    fields.push(currentField.trim());
  }
  
  return fields;
}

/**
 * Custom hook to fetch FMR data directly from the CSV file by ZIP code
 * This eliminates the need for HUD API calls and county lookups
 */
export function useZipFMRData(zipCode: string | null): UseZipFMRDataResult {
  const [data, setData] = useState<FMRData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!zipCode || zipCode.length !== 5) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cacheKey = getCacheKey('fmr_csv', zipCode);
      
      // Check cache first
      const cached = getCachedData<FMRData>(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }

      // Fetch the CSV file
      const response = await fetch('/data/fy2026_safmrs.csv');
      
      if (!response.ok) {
        throw new Error(`Failed to load FMR data: ${response.statusText}`);
      }

      const csvContent = await response.text();
      
      // Parse CSV and find the matching ZIP code
      const lines = csvContent.split('\n');
      let zipLine: string | null = null;
      
      for (let i = 1; i < lines.length; i++) { // Skip header
        const line = lines[i];
        if (line.startsWith(zipCode + ',')) {
          zipLine = line;
          break;
        }
      }

      if (!zipLine) {
        throw new Error(`ZIP code ${zipCode} not found in FMR database`);
      }

      // Parse the CSV line properly (handle quoted fields with commas)
      const fields = parseCSVLine(zipLine);
      
      if (fields.length < 4) {
        throw new Error(`Invalid CSV format for ZIP ${zipCode}`);
      }

      const zip = fields[0];
      const hudAreaCode = fields[1];
      const areaName = fields[2];
      
      // Parse rent values (indices 3+ are rent values)
      const rentFields = fields.slice(3);
      const values = rentFields.map(v => {
        const cleaned = v.replace(/[$,]/g, '');
        return parseInt(cleaned) || 0;
      });

      // Extract bedroom counts (indices: 0,3,6,9,12 are the base rates)
      const fmr_0 = values[0] || 0;  // Studio/Efficiency
      const fmr_1 = values[3] || 0;  // 1BR
      const fmr_2 = values[6] || 0;  // 2BR
      const fmr_3 = values[9] || 0;  // 3BR
      const fmr_4 = values[12] || 0; // 4BR

      // Extract state abbreviation from area name (e.g., "St. Louis, MO-IL HUD Metro FMR Area")
      const stateMatch = areaName.match(/,\s*([A-Z]{2})/);
      const stateAbbr = stateMatch ? stateMatch[1] : '';

      // Transform to our FMR format
      const fmrData: FMRData = {
        zip_code: zip,
        year: 2026, // FY2026 data
        data: {
          basicdata: {
            hudAreaCode,
            areaName,
          },
          fmr_0,
          fmr_1,
          fmr_2,
          fmr_3,
          fmr_4,
          county_name: areaName, // Use area name as county for display
          state_alpha: stateAbbr,
          metro_name: areaName,
        },
      };

      console.log('📊 CSV FMR data loaded for ZIP', zipCode, ':', fmrData);

      // Cache the result
      setCachedData(cacheKey, fmrData);
      setData(fmrData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch FMR data from CSV';
      setError(errorMessage);
      console.error('CSV FMR Error:', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [zipCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

