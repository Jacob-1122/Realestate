// Utility to parse and aggregate FMR data by metro area

export interface ZipFMRData {
  zipCode: string;
  hudAreaCode: string;
  metroAreaName: string;
  safmr0br: number;
  safmr1br: number;
  safmr2br: number;
  safmr3br: number;
  safmr4br: number;
}

export interface MetroAreaAggregate {
  metroAreaName: string;
  hudAreaCode: string;
  state: string;
  zipCount: number;
  zipCodes: string[];
  
  // Average values
  avg0br: number;
  avg1br: number;
  avg2br: number;
  avg3br: number;
  avg4br: number;
  
  // Min values
  min0br: number;
  min1br: number;
  min2br: number;
  min3br: number;
  min4br: number;
  
  // Max values
  max0br: number;
  max1br: number;
  max2br: number;
  max3br: number;
  max4br: number;
  
  // Median values
  median0br: number;
  median1br: number;
  median2br: number;
  median3br: number;
  median4br: number;
  
  // Individual zip data for expansion
  zipDetails: ZipFMRData[];
}

/**
 * Parse a currency string like "$3,950" to a number
 */
function parseCurrency(value: string): number {
  if (!value) return 0;
  return parseFloat(value.replace(/[$,]/g, '')) || 0;
}

/**
 * Extract state abbreviation from metro area name
 * e.g., "Seattle-Bellevue, WA HUD Metro FMR Area" -> "WA"
 * e.g., "Sullivan County, NH" -> "NH"
 * e.g., "Nevada County, CA" -> "CA"
 */
function extractState(metroAreaName: string): string {
  // Try multiple patterns to extract state
  // Pattern 1: ", ST " (space after state abbreviation)
  let match = metroAreaName.match(/,\s*([A-Z]{2})\s/);
  if (match) return match[1];
  
  // Pattern 2: ", ST-" (hyphen after state, like "FL-")
  match = metroAreaName.match(/,\s*([A-Z]{2})-/);
  if (match) return match[1];
  
  // Pattern 3: ", ST$" (end of string, like "County, NH")
  match = metroAreaName.match(/,\s*([A-Z]{2})$/);
  if (match) return match[1];
  
  // Pattern 4: " ST " anywhere in the string
  match = metroAreaName.match(/\s([A-Z]{2})\s/);
  if (match) return match[1];
  
  return 'Unknown';
}

/**
 * Calculate median from an array of numbers
 */
function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  
  return sorted[middle];
}

/**
 * Parse CSV content and return array of zip FMR data
 */
export function parseCSVToZipData(csvContent: string): ZipFMRData[] {
  const lines = csvContent.split('\n');
  const zipData: ZipFMRData[] = [];
  
  // Find where the actual data starts (after the header rows)
  let dataStartIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Look for a line that starts with a 5-digit zip code
    if (/^\d{5},/.test(line)) {
      dataStartIndex = i;
      break;
    }
  }
  
  // Parse data rows
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Split by comma, but handle quoted values
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue); // Add the last value
    
    if (values.length < 18) continue; // Need at least zip, area code, name, and 5 bedroom types (each with 3 fields)
    
    const zipCode = values[0].trim();
    const hudAreaCode = values[1].trim();
    const metroAreaName = values[2].trim();
    
    // Skip if invalid zip code
    if (!/^\d{5}$/.test(zipCode)) continue;
    
    // Parse SAFMR values (every 3rd column starting from index 3)
    const safmr0br = parseCurrency(values[3]);
    const safmr1br = parseCurrency(values[6]);
    const safmr2br = parseCurrency(values[9]);
    const safmr3br = parseCurrency(values[12]);
    const safmr4br = parseCurrency(values[15]);
    
    zipData.push({
      zipCode,
      hudAreaCode,
      metroAreaName,
      safmr0br,
      safmr1br,
      safmr2br,
      safmr3br,
      safmr4br,
    });
  }
  
  return zipData;
}

/**
 * Aggregate zip data by metro area
 */
export function aggregateByMetroArea(zipData: ZipFMRData[]): MetroAreaAggregate[] {
  const metroMap = new Map<string, ZipFMRData[]>();
  
  // Group by metro area name
  zipData.forEach(zip => {
    const existing = metroMap.get(zip.metroAreaName) || [];
    existing.push(zip);
    metroMap.set(zip.metroAreaName, existing);
  });
  
  // Calculate aggregates
  const aggregates: MetroAreaAggregate[] = [];
  
  metroMap.forEach((zips, metroAreaName) => {
    if (zips.length === 0) return;
    
    const state = extractState(metroAreaName);
    const hudAreaCode = zips[0].hudAreaCode;
    
    // Extract all values for each bedroom type
    const values0br = zips.map(z => z.safmr0br).filter(v => v > 0);
    const values1br = zips.map(z => z.safmr1br).filter(v => v > 0);
    const values2br = zips.map(z => z.safmr2br).filter(v => v > 0);
    const values3br = zips.map(z => z.safmr3br).filter(v => v > 0);
    const values4br = zips.map(z => z.safmr4br).filter(v => v > 0);
    
    // Calculate statistics
    const aggregate: MetroAreaAggregate = {
      metroAreaName,
      hudAreaCode,
      state,
      zipCount: zips.length,
      zipCodes: zips.map(z => z.zipCode),
      
      // Averages
      avg0br: values0br.length > 0 ? values0br.reduce((a, b) => a + b, 0) / values0br.length : 0,
      avg1br: values1br.length > 0 ? values1br.reduce((a, b) => a + b, 0) / values1br.length : 0,
      avg2br: values2br.length > 0 ? values2br.reduce((a, b) => a + b, 0) / values2br.length : 0,
      avg3br: values3br.length > 0 ? values3br.reduce((a, b) => a + b, 0) / values3br.length : 0,
      avg4br: values4br.length > 0 ? values4br.reduce((a, b) => a + b, 0) / values4br.length : 0,
      
      // Min
      min0br: values0br.length > 0 ? Math.min(...values0br) : 0,
      min1br: values1br.length > 0 ? Math.min(...values1br) : 0,
      min2br: values2br.length > 0 ? Math.min(...values2br) : 0,
      min3br: values3br.length > 0 ? Math.min(...values3br) : 0,
      min4br: values4br.length > 0 ? Math.min(...values4br) : 0,
      
      // Max
      max0br: values0br.length > 0 ? Math.max(...values0br) : 0,
      max1br: values1br.length > 0 ? Math.max(...values1br) : 0,
      max2br: values2br.length > 0 ? Math.max(...values2br) : 0,
      max3br: values3br.length > 0 ? Math.max(...values3br) : 0,
      max4br: values4br.length > 0 ? Math.max(...values4br) : 0,
      
      // Median
      median0br: calculateMedian(values0br),
      median1br: calculateMedian(values1br),
      median2br: calculateMedian(values2br),
      median3br: calculateMedian(values3br),
      median4br: calculateMedian(values4br),
      
      zipDetails: zips,
    };
    
    aggregates.push(aggregate);
  });
  
  return aggregates;
}

/**
 * Format number as currency
 */
export function formatCurrency(value: number): string {
  if (value === 0) return 'N/A';
  return `$${Math.round(value).toLocaleString()}`;
}

/**
 * Format range as currency
 */
export function formatRange(min: number, max: number): string {
  if (min === 0 && max === 0) return 'N/A';
  if (min === max) return formatCurrency(min);
  return `${formatCurrency(min)} - ${formatCurrency(max)}`;
}

