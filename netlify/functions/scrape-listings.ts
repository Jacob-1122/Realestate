// Netlify Function to scrape real estate listing counts

import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

interface ScraperRequest {
  zipCode?: string;
  metroAreaName?: string;
  maxPrice: number;
  minBeds: number;
}

interface ScraperResponse {
  success: boolean;
  count?: number;
  metroAreaName?: string;
  timestamp?: string;
  error?: string;
}

/**
 * Scrape Realtor.com for listing count by ZIP code
 */
async function scrapeRealtorCount(
  zipCode: string,
  maxPrice: number,
  minBeds: number
): Promise<number> {
  try {
    const url = `https://www.realtor.com/realestateandhomes-search/${zipCode}/beds-${minBeds}/price-na-${maxPrice}/type-single-family-home`;

    console.log(`Scraping ZIP ${zipCode}: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      },
    });

    if (!response.ok) {
      console.error(`HTTP ${response.status}: ${response.statusText}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Try multiple patterns to extract count from HTML
    const patterns = [
      /(\d+,?\d*)\s+(?:homes?|properties|listings?|results?)/i,
      /"total_count":\s*(\d+)/i,
      /"count":\s*(\d+)/i,
      /showing\s+(\d+,?\d*)/i,
      /of\s+(\d+,?\d*)\s+(?:homes?|properties)/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const count = parseInt(match[1].replace(/,/g, ''));
        if (!isNaN(count) && count >= 0) {
          console.log(`Found ${count} listings for ZIP ${zipCode}`);
          return count;
        }
      }
    }

    // If no match found, return 0 (no error, just no listings)
    console.log(`No listings found for ZIP ${zipCode} (no match in HTML)`);
    return 0;
  } catch (error) {
    console.error('Scraping error:', error);
    throw error;
  }
}

/**
 * Netlify Function handler
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<{ statusCode: number; headers: any; body: string }> => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Method not allowed. Use POST.' 
      } as ScraperResponse),
    };
  }

  try {
    // Parse request body
    const body: ScraperRequest = JSON.parse(event.body || '{}');
    const { zipCode, maxPrice, minBeds } = body;

    // Validate required parameters
    if (!zipCode || !maxPrice || !minBeds) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Missing required parameters: zipCode, maxPrice, minBeds' 
        } as ScraperResponse),
      };
    }

    // Scrape listing count for ZIP code
    const count = await scrapeRealtorCount(zipCode, maxPrice, minBeds);

    // Return successful response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        count,
        zipCode,
        timestamp: new Date().toISOString(),
      } as ScraperResponse),
    };
  } catch (error) {
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      } as ScraperResponse),
    };
  }
};

