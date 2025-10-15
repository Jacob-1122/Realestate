// React hook for background fetching of listing counts

import { useState, useEffect, useRef, useCallback } from 'react';
import { MetroAreaAggregate } from '../utils/fmrDataProcessor';
import { ListingCount, MOASettings } from '../types/listings';
import {
  calculateMOA,
  generateMultiZipSearchUrl,
  getCacheKey,
} from '../utils/moaCalculator';
import {
  getCachedListingCount,
  setCachedListingCount,
  clearExpiredCache,
} from '../utils/listingCache';

interface UseListingCountsOptions {
  metroAreas: MetroAreaAggregate[];
  moaSettings: MOASettings;
  enabled: boolean;
}

interface UseListingCountsReturn {
  listingCounts: Map<string, ListingCount>;
  progress: { loaded: number; total: number };
  isComplete: boolean;
  refetch: (metroName: string) => Promise<void>;
}

export function useListingCounts({
  metroAreas,
  moaSettings,
  enabled,
}: UseListingCountsOptions): UseListingCountsReturn {
  const [listingCounts, setListingCounts] = useState<Map<string, ListingCount>>(
    new Map()
  );
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  
  const queueRef = useRef<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize listing counts with pending status
  useEffect(() => {
    if (!enabled || metroAreas.length === 0) return;

    const initialCounts = new Map<string, ListingCount>();
    
    metroAreas.forEach((metro) => {
      const moa = calculateMOA(metro, moaSettings);
      // Generate search URL with all ZIP codes in metro
      const searchUrl = generateMultiZipSearchUrl(
        metro.zipCodes,
        moa,
        moaSettings.bedrooms
      );

      initialCounts.set(metro.metroAreaName, {
        metroAreaName: metro.metroAreaName,
        maxPrice: moa,
        minBeds: moaSettings.bedrooms,
        count: null,
        searchUrl,
        lastUpdated: '',
        status: 'pending',
      });
    });

    setListingCounts(initialCounts);
    setProgress({ loaded: 0, total: metroAreas.length });

    // Clear expired cache on mount
    clearExpiredCache();
  }, [metroAreas, moaSettings, enabled]);

  // Fetch listing count for a single metro by aggregating ZIP codes
  const fetchListingForMetro = useCallback(
    async (metro: MetroAreaAggregate) => {
      const moa = calculateMOA(metro, moaSettings);
      const searchUrl = generateMultiZipSearchUrl(
        metro.zipCodes,
        moa,
        moaSettings.bedrooms
      );
      const cacheKey = getCacheKey(metro.metroAreaName, moa, moaSettings.bedrooms);

      // Update to loading status
      setListingCounts((prev) => {
        const updated = new Map(prev);
        const current = updated.get(metro.metroAreaName);
        if (current) {
          updated.set(metro.metroAreaName, { ...current, status: 'loading' });
        }
        return updated;
      });

      try {
        // Check cache first
        const cached = await getCachedListingCount(cacheKey);

        if (cached) {
          // Use cached data
          setListingCounts((prev) => {
            const updated = new Map(prev);
            updated.set(metro.metroAreaName, {
              metroAreaName: metro.metroAreaName,
              maxPrice: moa,
              minBeds: moaSettings.bedrooms,
              count: cached.count,
              searchUrl: cached.searchUrl,
              lastUpdated: new Date(Date.now() - cached.age).toISOString(),
              status: 'cached',
            });
            return updated;
          });

          setProgress((prev) => ({ ...prev, loaded: prev.loaded + 1 }));
          return;
        }

        // Fetch fresh data from API - aggregate counts from all ZIP codes
        let totalCount = 0;
        const zipCodes = metro.zipCodes;
        
        // Process ZIP codes in batches of 2 with 30-second delay
        for (let i = 0; i < zipCodes.length; i++) {
          if (abortControllerRef.current?.signal.aborted) break;
          
          const zipCode = zipCodes[i];
          
          try {
            const response = await fetch('/.netlify/functions/scrape-listings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                zipCode: zipCode,
                maxPrice: moa,
                minBeds: moaSettings.bedrooms,
              }),
              signal: abortControllerRef.current?.signal,
            });

            // Handle 404 (function not available locally)
            if (response.status === 404) {
              throw new Error('Netlify function not deployed. Deploy to Netlify to enable scraping.');
            }

            const data = await response.json();

            if (data.success && typeof data.count === 'number') {
              totalCount += data.count;
            }
          } catch (error: any) {
            if (error.name === 'AbortError') {
              throw error;
            }
            console.error(`Error fetching ZIP ${zipCode}:`, error);
            // Continue with other ZIPs even if one fails
          }
          
          // Rate limit: wait 30 seconds after every 2nd ZIP
          if ((i + 1) % 2 === 0 && i < zipCodes.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 30000));
          }
        }
        
        const data = {
          success: true,
          count: totalCount
        };

        if (data.success && typeof data.count === 'number') {
          // Cache the result
          await setCachedListingCount(cacheKey, data.count, searchUrl);

          setListingCounts((prev) => {
            const updated = new Map(prev);
            updated.set(metro.metroAreaName, {
              metroAreaName: metro.metroAreaName,
              maxPrice: moa,
              minBeds: moaSettings.bedrooms,
              count: data.count,
              searchUrl: searchUrl,
              lastUpdated: new Date().toISOString(),
              status: 'fresh',
            });
            return updated;
          });

          setProgress((prev) => ({ ...prev, loaded: prev.loaded + 1 }));
        } else {
          throw new Error('Failed to aggregate listing counts from ZIP codes');
        }
      } catch (error: any) {
        // Don't log abort errors
        if (error.name === 'AbortError') {
          return;
        }

        console.error(`Error fetching listings for ${metro.metroAreaName}:`, error);
        
        setListingCounts((prev) => {
          const updated = new Map(prev);
          const current = updated.get(metro.metroAreaName);
          if (current) {
            updated.set(metro.metroAreaName, {
              ...current,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
          return updated;
        });

        setProgress((prev) => ({ ...prev, loaded: prev.loaded + 1 }));
      }
    },
    [moaSettings]
  );

  // Process queue with rate limiting
  useEffect(() => {
    if (!enabled || metroAreas.length === 0) return;

    // Create abort controller
    abortControllerRef.current = new AbortController();

    const processQueue = async () => {
      // Build queue from metro areas
      queueRef.current = metroAreas.map((m) => m.metroAreaName);

      // Process each metro sequentially with delay
      for (const metroName of queueRef.current) {
        if (abortControllerRef.current?.signal.aborted) break;
        
        const metro = metroAreas.find((m) => m.metroAreaName === metroName);
        if (!metro) continue;

        await fetchListingForMetro(metro);

        // Rate limit: wait 30 seconds before next request (2 per minute)
        if (queueRef.current.indexOf(metroName) < queueRef.current.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 30000));
        }
      }
    };

    processQueue();

    // Cleanup on unmount
    return () => {
      abortControllerRef.current?.abort();
      queueRef.current = [];
    };
  }, [metroAreas, enabled, fetchListingForMetro]);

  // Manual refetch function
  const refetch = useCallback(
    async (metroName: string) => {
      const metro = metroAreas.find((m) => m.metroAreaName === metroName);
      if (!metro) return;
      
      await fetchListingForMetro(metro);
    },
    [metroAreas, fetchListingForMetro]
  );

  return {
    listingCounts,
    progress,
    isComplete: progress.loaded === progress.total && progress.total > 0,
    refetch,
  };
}

