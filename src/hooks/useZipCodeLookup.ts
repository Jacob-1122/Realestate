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
      
      if (cached) {
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

      setCachedData(cacheKey, locationData);
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

