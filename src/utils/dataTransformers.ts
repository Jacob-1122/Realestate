import { FMRData, FMRDisplay, ChartDataPoint, CrimeData, TrendDataPoint } from '../types';

/**
 * Transform HUD FMR API response to FMRDisplay array
 */
export function transformFMRData(fmrData: FMRData | null): FMRDisplay[] {
  if (!fmrData || !fmrData.data) return [];

  const displays: FMRDisplay[] = [];
  const data = fmrData.data;

  // First try to get values from transformed FMR data
  let fmrValues = {
    0: data.fmr_0 || 0,
    1: data.fmr_1 || 0,
    2: data.fmr_2 || 0,
    3: data.fmr_3 || 0,
    4: data.fmr_4 || 0,
  };

  // If all values are 0, try to extract from basicdata
  if (Object.values(fmrValues).every(val => val === 0) && data.basicdata) {
    if (Array.isArray(data.basicdata)) {
      // Small Area FMR - find ZIP-specific data
      const zipData = data.basicdata.find((item: any) => item.zip_code === fmrData.zip_code);
      if (zipData) {
        fmrValues = {
          0: parseInt(zipData.Efficiency || '0'),
          1: parseInt(zipData['One-Bedroom'] || '0'),
          2: parseInt(zipData['Two-Bedroom'] || '0'),
          3: parseInt(zipData['Three-Bedroom'] || '0'),
          4: parseInt(zipData['Four-Bedroom'] || '0'),
        };
      }
    } else if (typeof data.basicdata === 'object') {
      // Regular FMR - direct object values
      fmrValues = {
        0: parseInt(data.basicdata.Efficiency || '0'),
        1: parseInt(data.basicdata['One-Bedroom'] || '0'),
        2: parseInt(data.basicdata['Two-Bedroom'] || '0'),
        3: parseInt(data.basicdata['Three-Bedroom'] || '0'),
        4: parseInt(data.basicdata['Four-Bedroom'] || '0'),
      };
    }
  }

  // Create display array
  for (let i = 0; i <= 4; i++) {
    const rent = fmrValues[i as keyof typeof fmrValues];
    if (typeof rent === 'number' && rent > 0) {
      displays.push({
        bedrooms: i,
        rent: rent,
      });
    }
  }

  return displays;
}

/**
 * Transform FMR data to chart data
 */
export function transformFMRToChartData(fmrData: FMRData | null): ChartDataPoint[] {
  if (!fmrData || !fmrData.data) return [];

  const chartData: ChartDataPoint[] = [];
  const data = fmrData.data;
  
  const bedroomLabels = ['Studio', '1 BR', '2 BR', '3 BR', '4 BR'];
  const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  for (let i = 0; i <= 4; i++) {
    const key = `fmr_${i}` as keyof typeof data;
    const rent = data[key];
    
    if (typeof rent === 'number' && rent > 0) {
      chartData.push({
        name: bedroomLabels[i],
        value: rent,
        color: colors[i],
      });
    }
  }

  return chartData;
}

/**
 * Transform crime data to trend chart format
 */
export function transformCrimeToTrendData(
  crimeData: CrimeData | null,
  historicalData?: CrimeData[]
): TrendDataPoint[] {
  if (!crimeData) return [];

  const trendData: TrendDataPoint[] = [];

  // If we have historical data, use it
  if (historicalData && historicalData.length > 0) {
    historicalData.forEach(data => {
      trendData.push({
        year: data.year,
        violent: data.violent_crime_rate,
        property: data.property_crime_rate,
      });
    });
  } else {
    // Otherwise, just show current year
    trendData.push({
      year: crimeData.year,
      violent: crimeData.violent_crime_rate,
      property: crimeData.property_crime_rate,
    });
  }

  return trendData.sort((a, b) => a.year - b.year);
}

/**
 * Get bedroom label
 */
export function getBedroomLabel(bedrooms: number): string {
  if (bedrooms === 0) return 'Studio';
  return `${bedrooms} Bedroom${bedrooms > 1 ? 's' : ''}`;
}

/**
 * Parse HUD API response and normalize data structure
 */
export function normalizeHUDResponse(response: any): FMRData | null {
  if (!response || !response.data) return null;

  try {
    const data = response.data;
    
    return {
      zip_code: response.zip_code || '',
      year: response.year || new Date().getFullYear(),
      data: {
        basicdata: data.basicdata || {},
        fmr_0: data.fmr_0 || data.Efficiency || 0,
        fmr_1: data.fmr_1 || data.One_Bedroom || 0,
        fmr_2: data.fmr_2 || data.Two_Bedroom || 0,
        fmr_3: data.fmr_3 || data.Three_Bedroom || 0,
        fmr_4: data.fmr_4 || data.Four_Bedroom || 0,
        county_name: data.county_name || data.countyname || '',
        state_alpha: data.state_alpha || data.state || '',
        metro_name: data.metro_name || '',
      },
    };
  } catch (error) {
    console.error('Error normalizing HUD response:', error);
    return null;
  }
}

/**
 * Calculate crime trend
 */
export function calculateCrimeTrend(
  current: CrimeData,
  previous: CrimeData | null
): 'up' | 'down' | 'stable' {
  if (!previous) return 'stable';

  const currentTotal = current.violent_crime_rate + current.property_crime_rate;
  const previousTotal = previous.violent_crime_rate + previous.property_crime_rate;
  
  const change = ((currentTotal - previousTotal) / previousTotal) * 100;

  if (change > 5) return 'up';
  if (change < -5) return 'down';
  return 'stable';
}

/**
 * Calculate percent change
 */
export function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

