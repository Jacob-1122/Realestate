import { useState, useEffect } from 'react';
import { parseCSVToZipData, aggregateByMetroArea, ZipFMRData, MetroAreaAggregate } from '../utils/fmrDataProcessor';
import { clearSessionCache } from '../utils/apiHelpers';

interface UseFMRDataReturn {
  metroAreas: MetroAreaAggregate[];
  zipData: ZipFMRData[];
  loading: boolean;
  error: string | null;
}

export function useFMRData(): UseFMRDataReturn {
  const [metroAreas, setMetroAreas] = useState<MetroAreaAggregate[]>([]);
  const [zipData, setZipData] = useState<ZipFMRData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Skip cache check to avoid storage quota issues - always fetch fresh data
        console.log('📊 Fetching fresh FMR data (cache disabled)');

        // Fetch the CSV file
        const response = await fetch('/data/fy2026_safmrs.csv');
        
        if (!response.ok) {
          throw new Error(`Failed to load FMR data: ${response.statusText}`);
        }

        const csvContent = await response.text();
        
        // Parse CSV to zip data
        const parsedZipData = parseCSVToZipData(csvContent);
        setZipData(parsedZipData);

        // Aggregate by metro area
        const aggregated = aggregateByMetroArea(parsedZipData);
        setMetroAreas(aggregated);

        // Skip caching entirely to avoid quota issues - the data loads fast enough
        console.log('📊 Skipping cache to avoid storage quota issues');

        console.log(`📊 Loaded ${parsedZipData.length} ZIP codes across ${aggregated.length} metro areas`);
      } catch (err) {
        console.error('Error loading FMR data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load FMR data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return { metroAreas, zipData, loading, error };
}

