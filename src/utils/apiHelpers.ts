import { CacheEntry } from '../types';

const CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Fetch with caching support
 */
export async function fetchWithCache<T>(
  url: string,
  cacheKey: string,
  forceRefresh: boolean = false
): Promise<T> {
  // Check cache first
  if (!forceRefresh) {
    const cached = getCachedData<T>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Fetch fresh data
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Cache the data
  setCachedData(cacheKey, data);
  
  return data;
}

/**
 * Get cached data from localStorage
 */
export function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
}

/**
 * Set cached data in localStorage
 */
export function setCachedData<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION_MS,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.error('Error writing to cache:', error);
  }
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      try {
        const value = localStorage.getItem(key);
        if (!value) continue;

        const entry = JSON.parse(value);
        if (entry.expiresAt && now > entry.expiresAt) {
          keysToRemove.push(key);
        }
      } catch {
        // Skip invalid entries
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    if (keysToRemove.length > 0) {
      console.log(`🧹 Cleared ${keysToRemove.length} expired cache entries`);
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Clear session storage cache when quota exceeded
 */
export function clearSessionCache(): void {
  try {
    // Clear FMR and Census cache keys
    const keysToRemove = ['fmr_data_cache_v1', 'texas_census_batch_v1'];
    
    keysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
    });
    
    console.log('🧹 Cleared session storage cache');
  } catch (error) {
    console.error('Error clearing session cache:', error);
  }
}

/**
 * Clear all application cache (both localStorage and sessionStorage)
 * Useful for troubleshooting storage quota issues
 */
export function clearAllCache(): void {
  try {
    // Clear localStorage cache entries
    const localStorageKeys = Object.keys(localStorage);
    const cacheKeys = localStorageKeys.filter(key => key.startsWith('cache_'));
    
    cacheKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Clear sessionStorage cache entries
    const sessionStorageKeys = Object.keys(sessionStorage);
    const sessionCacheKeys = sessionStorageKeys.filter(key => 
      key.includes('fmr_data_cache') || 
      key.includes('texas_census_batch')
    );
    
    sessionCacheKeys.forEach(key => {
      sessionStorage.removeItem(key);
    });
    
    console.log(`🧹 Cleared all cache: ${cacheKeys.length} localStorage + ${sessionCacheKeys.length} sessionStorage entries`);
  } catch (error) {
    console.error('Error clearing all cache:', error);
  }
}

/**
 * Validate US ZIP code format
 */
export function isValidZipCode(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get cache key for API requests
 */
export function getCacheKey(type: string, identifier: string): string {
  return `cache_${type}_${identifier}`;
}

