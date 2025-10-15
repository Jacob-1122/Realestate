// IndexedDB cache layer for listing counts

import { ListingCountCache } from '../types/listings';

const DB_NAME = 'RealEstateAnalyzerDB';
const STORE_NAME = 'listingCounts';
const DB_VERSION = 1;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB database
 */
async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      // Create object store if it doesn't exist
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Get cached listing count from IndexedDB
 * @param cacheKey - Unique cache key
 * @returns Cached data with age, or null if not found/expired
 */
export async function getCachedListingCount(
  cacheKey: string
): Promise<{ count: number; searchUrl: string; age: number } | null> {
  try {
    const database = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(cacheKey);

      request.onsuccess = () => {
        const data: ListingCountCache | undefined = request.result;
        
        if (!data) {
          resolve(null);
          return;
        }

        const age = Date.now() - data.timestamp;
        
        // Return null if data is expired
        if (age > CACHE_DURATION) {
          resolve(null);
          return;
        }

        resolve({
          count: data.count,
          searchUrl: data.searchUrl,
          age: age,
        });
      };

      request.onerror = () => {
        console.error('Error reading from cache:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('IndexedDB error:', error);
    return null;
  }
}

/**
 * Save listing count to IndexedDB cache
 * @param cacheKey - Unique cache key
 * @param count - Number of listings
 * @param searchUrl - Search URL for the listings
 */
export async function setCachedListingCount(
  cacheKey: string,
  count: number,
  searchUrl: string
): Promise<void> {
  try {
    const database = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const data: ListingCountCache = {
        count,
        searchUrl,
        timestamp: Date.now(),
      };

      const request = store.put(data, cacheKey);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Error writing to cache:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('IndexedDB error:', error);
  }
}

/**
 * Clear expired cache entries
 */
export async function clearExpiredCache(): Promise<void> {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      
      if (cursor) {
        const data: ListingCountCache = cursor.value;
        const age = Date.now() - data.timestamp;
        
        // Delete if expired
        if (age > CACHE_DURATION) {
          cursor.delete();
        }
        
        cursor.continue();
      }
    };

    request.onerror = () => {
      console.error('Error clearing expired cache:', request.error);
    };
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Clear all cached listing data
 */
export async function clearAllCache(): Promise<void> {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log('Cache cleared successfully');
        resolve();
      };
      
      request.onerror = () => {
        console.error('Error clearing cache:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  freshEntries: number;
  expiredEntries: number;
}> {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();

    return new Promise((resolve) => {
      let totalEntries = 0;
      let freshEntries = 0;
      let expiredEntries = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          totalEntries++;
          const data: ListingCountCache = cursor.value;
          const age = Date.now() - data.timestamp;
          
          if (age > CACHE_DURATION) {
            expiredEntries++;
          } else {
            freshEntries++;
          }
          
          cursor.continue();
        } else {
          resolve({ totalEntries, freshEntries, expiredEntries });
        }
      };

      request.onerror = () => {
        resolve({ totalEntries: 0, freshEntries: 0, expiredEntries: 0 });
      };
    });
  } catch (error) {
    return { totalEntries: 0, freshEntries: 0, expiredEntries: 0 };
  }
}

