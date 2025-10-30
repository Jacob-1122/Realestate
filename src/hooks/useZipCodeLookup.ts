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
      // Note: Nominatim requires proper User-Agent and has rate limiting
      const url = `https://nominatim.openstreetmap.org/search?postalcode=${zipCode}&country=US&format=json&addressdetails=1`;
      
      let result: any = null;
      let address: any = {};
      
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Section8InvestmentAnalyzer/1.0 (https://section8proj.netlify.app/)',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': typeof window !== 'undefined' ? window.location.origin : 'https://section8proj.netlify.app/',
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          // If we get rate limited or blocked, continue to fallback methods
          if (response.status === 429 || response.status === 403) {
            console.warn('⚠️ Nominatim rate limited or blocked, trying fallback methods...');
            // Continue to fallbacks below instead of throwing
          } else {
            throw new Error(`Failed to fetch location data: ${response.statusText}`);
          }
        } else {
          const results = await response.json();
          
          if (results && results.length > 0) {
            result = results[0];
            address = result.address || {};
          } else {
            console.warn('⚠️ Nominatim returned no results, trying fallback methods...');
          }
        }
      } catch (fetchError) {
        // If fetch fails (CORS, network, etc.), log and continue to fallbacks
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw fetchError; // Re-throw timeout errors
        }
        console.warn('⚠️ Nominatim API failed, trying fallback methods:', fetchError);
        // Set default values so fallbacks can still work
        if (!result) {
          result = { lat: '0', lon: '0', address: {} };
        }
        if (!address || Object.keys(address).length === 0) {
          address = {};
        }
      }

      // Extract county name from various possible fields
      let countyName = address.county || address.county_name || address.region;
      
      // If still no county, try to extract from display_name (often has format: "City, County, State, ZIP, Country")
      if (!countyName && result && result.display_name) {
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

      // Final fallback: Try to extract county/state from CSV file
      // Always try CSV fallback if we don't have county, even if Nominatim failed
      if (!countyName || !address.state) {
        console.log('🔄 Trying CSV fallback to extract location info...');
        try {
          const csvResponse = await fetch('/data/fy2026_safmrs.csv', { signal: controller.signal });
          if (csvResponse.ok) {
            const csvText = await csvResponse.text();
            const lines = csvText.split('\n');
            
            // Find the line with this ZIP code
            for (let i = 1; i < lines.length; i++) {
              if (lines[i].startsWith(zipCode + ',')) {
                // Parse the CSV line properly handling quoted fields
                const fields: string[] = [];
                let currentField = '';
                let insideQuotes = false;
                
                for (let j = 0; j < lines[i].length; j++) {
                  const char = lines[i][j];
                  if (char === '"') {
                    insideQuotes = !insideQuotes;
                  } else if (char === ',' && !insideQuotes) {
                    fields.push(currentField.trim().replace(/^"|"$/g, ''));
                    currentField = '';
                  } else {
                    currentField += char;
                  }
                }
                if (currentField) {
                  fields.push(currentField.trim().replace(/^"|"$/g, ''));
                }
                
                if (fields.length >= 3) {
                  const areaName = fields[2];
                  console.log('Found CSV area name:', areaName);
                  
                  // Extract state abbreviation from area name (e.g., "St. Louis, MO-IL HUD Metro FMR Area")
                  const stateMatch = areaName.match(/,\s*([A-Z]{2})/);
                  if (stateMatch) {
                    const stateAbbr = stateMatch[1];
                    const stateName = getStateNameFromAbbr(stateAbbr);
                    
                    // Update address state if missing
                    if (stateName && !address.state) {
                      address.state = stateName;
                      console.log('✅ CSV fallback found state:', stateName);
                    }
                    
                    // Try to extract city name from area name
                    const cityMatch = areaName.match(/^([^,]+),/);
                    if (cityMatch && !address.city && !address.town && !address.village) {
                      // Update city if missing
                      address.city = cityMatch[1].trim();
                      console.log('✅ CSV fallback found city:', address.city);
                    }
                  }
                }
                break;
              }
            }
          }
        } catch (csvError) {
          console.warn('⚠️ CSV fallback failed:', csvError);
        }
      }
      
      // Clean up county name - remove " County" suffix if present for matching
      const cleanCountyName = countyName ? countyName.replace(/ County$/i, '') + ' County' : 'Unknown County';

      const locationData: ZipCodeLocation = {
        zip: zipCode,
        county: cleanCountyName,
        state: address.state || 'Unknown State',
        state_abbr: getStateAbbreviation(address.state),
        latitude: result ? parseFloat(result.lat || '0') : 0,
        longitude: result ? parseFloat(result.lon || '0') : 0,
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

/**
 * Convert state abbreviation to full name
 */
function getStateNameFromAbbr(abbr: string): string | undefined {
  const states: { [key: string]: string } = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming'
  };

  return states[abbr.toUpperCase()];
}

