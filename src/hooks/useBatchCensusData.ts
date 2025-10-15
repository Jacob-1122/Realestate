import { useState, useEffect } from 'react';
import { clearSessionCache } from '../utils/apiHelpers';

interface BatchCensusData {
  [zipCode: string]: {
    medianHomeValue: number;
    year: number;
  };
}

interface UseBatchCensusDataResult {
  data: BatchCensusData;
  loading: boolean;
  error: string | null;
  loadedCount: number;
  totalCount: number;
}

/**
 * Batch fetch Census data for multiple ZIP codes
 * Uses the Census API to get median home values for all provided ZIPs
 */
export function useBatchCensusData(zipCodes: string[]): UseBatchCensusDataResult {
  const [data, setData] = useState<BatchCensusData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedCount, setLoadedCount] = useState(0);

  useEffect(() => {
    if (zipCodes.length === 0) return;

    const fetchBatchData = async () => {
      setLoading(true);
      setError(null);
      
      // Skip cache check to avoid storage quota issues - always fetch fresh data
      console.log('📊 Fetching fresh Census data (cache disabled)');

      const apiKey = import.meta.env.VITE_CENSUS_API_KEY || 'demo';
      const batchResults: BatchCensusData = {};
      
      // Census API supports multiple ZIP codes in one request
      // We'll batch them in groups of 50 to avoid URL length limits
      const batchSize = 50;
      const totalBatches = Math.ceil(zipCodes.length / batchSize);
      
      console.log(`📊 Fetching Census data for ${zipCodes.length} ZIP codes in ${totalBatches} batches...`);

      for (let i = 0; i < zipCodes.length; i += batchSize) {
        const batch = zipCodes.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        
        try {
          // Construct the batch request
          // Format: for=zip code tabulation area:12345,12346,12347
          const zipList = batch.join(',');
          
          const isDevelopment = import.meta.env.DEV;
          const baseUrl = isDevelopment ? '/api/census' : 'https://api.census.gov';
          
          const apiUrl = `${baseUrl}/data/2022/acs/acs5?get=NAME,B25077_001E&for=zip%20code%20tabulation%20area:${zipList}&key=${apiKey}`;
          
          console.log(`Fetching batch ${batchNum}/${totalBatches} (${batch.length} ZIPs)...`);
          
          const response = await fetch(apiUrl);
          
          if (!response.ok) {
            console.warn(`Batch ${batchNum} failed: ${response.statusText}`);
            continue;
          }

          const result = await response.json();
          
          // Parse response: [["NAME","B25077_001E","zip code tabulation area"], ["ZCTA5 12345","150000","12345"], ...]
          if (Array.isArray(result) && result.length > 1) {
            // Skip header row (index 0)
            for (let j = 1; j < result.length; j++) {
              const row = result[j];
              if (row && row.length >= 3) {
                const zipCode = row[2]; // Third column is the ZIP code
                const medianValue = parseInt(row[1]); // Second column is median home value
                
                if (!isNaN(medianValue) && medianValue > 0) {
                  batchResults[zipCode] = {
                    medianHomeValue: medianValue,
                    year: 2022,
                  };
                }
              }
            }
          }
          
          setLoadedCount(Object.keys(batchResults).length);
          console.log(`Batch ${batchNum} complete. Total loaded: ${Object.keys(batchResults).length}`);
          
          // Small delay to avoid rate limiting
          if (i + batchSize < zipCodes.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
        } catch (err) {
          console.error(`Error fetching batch ${batchNum}:`, err);
        }
      }

      console.log(`✅ Batch Census fetch complete: ${Object.keys(batchResults).length} of ${zipCodes.length} ZIPs have data`);
      
      // Skip caching to avoid storage quota issues
      console.log('📊 Skipping Census cache to avoid storage quota issues');

      setData(batchResults);
      setLoadedCount(Object.keys(batchResults).length);
      setLoading(false);
    };

    fetchBatchData();
  }, [zipCodes.length]); // Only re-run if ZIP count changes

  return {
    data,
    loading,
    error,
    loadedCount,
    totalCount: zipCodes.length,
  };
}

