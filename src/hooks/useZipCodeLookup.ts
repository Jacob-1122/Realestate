import { useState, useEffect } from 'react';
import { ZipCodeLocation } from '../types';
import { getCacheKey, getCachedData, setCachedData } from '../utils/apiHelpers';

interface UseZipCodeLookupResult {
  location: ZipCodeLocation | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom hook to lookup ZIP code location data
 * Uses Nominatim (OpenStreetMap) for free geocoding
 */
export function useZipCodeLookup(zipCode: string | null): UseZipCodeLookupResult {
  const [location, setLocation] = useState<ZipCodeLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!zipCode || zipCode.length !== 5) {
      setLocation(null);
      return;
    }

    setLoading(true);
    setError(null);
    let timeoutId: number | undefined;

    try {
      const cacheKey = getCacheKey('zipcode', zipCode);
      const cached = getCachedData<ZipCodeLocation>(cacheKey);
      
      // Only use cache if it has a valid county (not "Unknown County")
      if (cached && cached.county !== 'Unknown County') {
        setLocation(cached);
        setLoading(false);
        return;
      }

      // Add timeout to prevent hanging
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 15000) as unknown as number; // 15 second timeout

      // Use Nominatim for geocoding (free, no API key required)
      const url = `https://nominatim.openstreetmap.org/search?postalcode=${zipCode}&country=US&format=json&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Section8InvestmentAnalyzer/1.0',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch location data');
      }

      const results = await response.json();
      
      if (!results || results.length === 0) {
        throw new Error('ZIP code not found');
      }

      const result = results[0];
      const address = result.address || {};

      // Extract county name from various possible fields
      let countyName = address.county || address.county_name || address.region;
      
      // If still no county, try to extract from display_name (often has format: "City, County, State, ZIP, Country")
      if (!countyName && result.display_name) {
        const parts = result.display_name.split(',').map((p: string) => p.trim());
        // County is often the second or third part
        for (const part of parts) {
          if (part.toLowerCase().includes('county')) {
            countyName = part;
            break;
          }
        }
      }
      
      // If still no county, try Zippopotam.us API as fallback (CORS-enabled)
      if (!countyName) {
        console.log('🔄 Nominatim failed to find county, trying Zippopotam.us API fallback...');
        try {
          const zippoUrl = `https://api.zippopotam.us/us/${zipCode}`;
          const zippoResponse = await fetch(zippoUrl, { signal: controller.signal });
          if (zippoResponse.ok) {
            const zippoData = await zippoResponse.json();
            console.log('Zippopotam API response:', zippoData);
            // Zippopotam returns places with state/county info
            if (zippoData.places && zippoData.places.length > 0) {
              // Try to get county from the place data
              const place = zippoData.places[0];
              // Sometimes county is in 'state' field or we need to infer from place name
              if (place['place name']) {
                // For Missouri ZIP codes, try FCC API with coordinates
                console.log('Trying FCC with Zippopotam coordinates...');
                const lat = place.latitude;
                const lon = place.longitude;
                try {
                  // Use a CORS proxy for FCC API
                  const fccUrl = `https://geo.fcc.gov/api/census/area?lat=${lat}&lon=${lon}&format=json`;
                  const fccResponse = await fetch(fccUrl, { 
                    signal: controller.signal,
                    mode: 'cors'
                  });
                  if (fccResponse.ok) {
                    const fccData = await fccResponse.json();
                    if (fccData.results && fccData.results.length > 0) {
                      const countyData = fccData.results[0].county_name;
                      if (countyData) {
                        countyName = countyData;
                        console.log('✅ FCC API (via Zippopotam) found county:', countyName);
                      }
                    }
                  }
                } catch (fccError) {
                  console.warn('⚠️ FCC API via Zippopotam failed:', fccError);
                }
              }
            }
          }
        } catch (zippoError) {
          console.warn('⚠️ Zippopotam API fallback failed:', zippoError);
        }
      }
      
      // Clean up county name - remove " County" suffix if present for matching
      const cleanCountyName = countyName ? countyName.replace(/ County$/i, '') + ' County' : 'Unknown County';

      const locationData: ZipCodeLocation = {
        zip: zipCode,
        county: cleanCountyName,
        state: address.state || 'Unknown State',
        state_abbr: getStateAbbreviation(address.state),
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        city: address.city || address.town || address.village || undefined,
        population: undefined, // Would need separate Census API call
      };
      
      console.log('Geocoding result:', result);
      console.log('Extracted county:', cleanCountyName);

      // Only cache if we have a valid county (not "Unknown County")
      if (cleanCountyName !== 'Unknown County') {
        setCachedData(cacheKey, locationData);
      }
      setLocation(locationData);

      // Clear timeout on success
      if (timeoutId) clearTimeout(timeoutId);

    } catch (err) {
      // Clear timeout on error
      if (timeoutId) clearTimeout(timeoutId);
      
      // Handle AbortError specifically (from timeout)
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. The geocoding service is taking too long. Please try again.');
        console.error('Geocoding Timeout:', err);
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to lookup ZIP code';
        setError(errorMessage);
        console.error('ZIP Code Lookup Error:', err);
      }
      setLocation(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [zipCode]);

  return {
    location,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Convert state name to abbreviation
 */
function getStateAbbreviation(stateName: string | undefined): string {
  if (!stateName) return '';
  
  const states: { [key: string]: string } = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
    'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
    'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
    'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
    'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
    'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
    'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
    'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
    'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
    'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
    'Wisconsin': 'WI', 'Wyoming': 'WY'
  };

  return states[stateName] || stateName;
}

