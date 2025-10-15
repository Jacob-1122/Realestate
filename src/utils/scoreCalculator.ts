import { InvestmentMetrics, FMRData, CrimeData } from '../types';

/**
 * Calculate investment score based on FMR, crime data, and population density
 */
export function calculateInvestmentScore(
  fmrData: FMRData | null,
  crimeData: CrimeData | null,
  medianHomePrice: number,
  populationDensity: number = 1000
): InvestmentMetrics | null {
  if (!fmrData) {
    return null;
  }

  // Get 3BR rent (most important for investors)
  let threeBedroomRent = fmrData.data.fmr_3 || 0;
  
  // Check if we need to extract from basicdata (Small Area FMR or regular FMR)
  if (threeBedroomRent === 0 && fmrData.data.basicdata) {
    if (Array.isArray(fmrData.data.basicdata)) {
      // Small Area FMR - array of ZIP codes
      const zipData = fmrData.data.basicdata.find((item: any) => item.zip_code === fmrData.zip_code);
      if (zipData && zipData['Three-Bedroom']) {
        threeBedroomRent = parseInt(zipData['Three-Bedroom']);
      }
    } else if (typeof fmrData.data.basicdata === 'object') {
      // Regular FMR - object with direct values
      if (fmrData.data.basicdata['Three-Bedroom']) {
        const value = fmrData.data.basicdata['Three-Bedroom'];
        threeBedroomRent = typeof value === 'string' ? parseInt(value) : value;
      }
    }
  }
  
  // If we don't have FMR data yet, return null (will show loading state)
  if (threeBedroomRent === 0) {
    return null;
  }
  
  // Calculate individual scores
  const fmrScore = calculateFMRScore(threeBedroomRent, medianHomePrice);
  const crimeScore = calculateCrimeScore(crimeData);
  const densityScore = calculateDensityScore(populationDensity);
  
  // Calculate dynamic weights based on performance
  // FMR gets base 60% weight (most important)
  const fmrWeight = 0.6;
  
  // Crime weight is exponential: lower when safe (good score), higher when dangerous (bad score)
  // Safe areas (90-100 score) get 15% weight, dangerous areas (0-20 score) get 30% weight
  const crimeWeight = calculateCrimeWeight(crimeScore);
  
  // Density weight is exponential: lower when good density (score 4+), higher when poor density
  // Good density (60-100 score) gets 10% weight, poor density (0-40 score) gets 25% weight
  const densityWeight = calculateDensityWeight(densityScore);
  
  // Normalize weights to ensure they sum to 1.0
  const totalWeight = fmrWeight + crimeWeight + densityWeight;
  const normalizedFmrWeight = fmrWeight / totalWeight;
  const normalizedCrimeWeight = crimeWeight / totalWeight;
  const normalizedDensityWeight = densityWeight / totalWeight;
  
  // Weighted total score (0-100)
  const totalScore = Math.round(
    (fmrScore * normalizedFmrWeight) + (crimeScore * normalizedCrimeWeight) + (densityScore * normalizedDensityWeight)
  );
  
  // Calculate MAX price you can pay to hit 2% rule based on actual 3BR FMR
  const maxPriceFor2PercentRule = Math.round(threeBedroomRent / 0.02);
  
  // Use the actual median home price (from Census or estimated)
  const averageHomeCost = medianHomePrice;
  
  // Calculate other metrics
  const rentToPriceRatio = medianHomePrice > 0 ? (threeBedroomRent * 12) / medianHomePrice : 0;
  // Required rent for 2% rule based on actual average home cost
  const requiredRentFor2Percent = Math.round(medianHomePrice * 0.02);
  
  return {
    score: totalScore,
    grade: scoreToGrade(totalScore),
    recommendation: scoreToRecommendation(totalScore),
    estimatedPriceRange: {
      low: Math.round(maxPriceFor2PercentRule * 0.85), // 15% below max
      high: maxPriceFor2PercentRule, // This is the MAX for 2% rule
      median: maxPriceFor2PercentRule, // Use max as the target
    },
    averageHomeCost: averageHomeCost,
    requiredRentFor2Percent,
    rentToPriceRatio: Math.round(rentToPriceRatio * 10000) / 100, // percentage with 2 decimals
    breakdown: {
      fmrScore: Math.round(fmrScore),
      crimeScore: Math.round(crimeScore),
      densityScore: Math.round(densityScore),
      fmrWeight: Math.round(normalizedFmrWeight * 100),
      crimeWeight: Math.round(normalizedCrimeWeight * 100),
      densityWeight: Math.round(normalizedDensityWeight * 100),
    },
  };
}

/**
 * Calculate FMR score based on rent-to-price ratio
 */
function calculateFMRScore(monthlyRent: number, homePrice: number): number {
  if (homePrice === 0) return 50; // default middle score
  
  const monthlyRatio = monthlyRent / homePrice;
  
  if (monthlyRatio >= 0.02) return 100; // 2%+ monthly
  if (monthlyRatio >= 0.015) return 75; // 1.5-2%
  if (monthlyRatio >= 0.01) return 50;  // 1-1.5%
  return 25; // <1%
}

/**
 * Calculate crime safety score (lower crime = higher score)
 * This should match the 1-10 scale displayed in CrimeStats component
 */
function calculateCrimeScore(crimeData: CrimeData | null): number {
  if (!crimeData) return 50; // default middle score if no data
  
  // National averages (per 100k population)
  const NATIONAL_VIOLENT_RATE = 380;
  const NATIONAL_PROPERTY_RATE = 1958;
  
  const violentRate = crimeData.violent_crime_rate;
  const propertyRate = crimeData.property_crime_rate;
  
  // Convert to 1-10 scale (same logic as CrimeStats component)
  const violentScale = crimeRateTo10Scale(violentRate, NATIONAL_VIOLENT_RATE);
  const propertyScale = crimeRateTo10Scale(propertyRate, NATIONAL_PROPERTY_RATE);
  
  // Calculate overall scale (weight violent more heavily)
  const overallScale = Math.round((violentScale * 0.6 + propertyScale * 0.4));
  
  // Convert 1-10 scale to 0-100 score (1=safest=100 points, 10=most dangerous=0 points)
  return Math.round((11 - overallScale) * 10);
}

/**
 * Convert crime rate to 1-10 scale (1 = safest, 10 = most dangerous)
 * This matches the logic in CrimeStats component
 */
function crimeRateTo10Scale(rate: number, nationalAverage: number): number {
  const ratio = rate / nationalAverage;
  if (ratio <= 0.3) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.7) return 3;
  if (ratio <= 0.9) return 4;
  if (ratio <= 1.1) return 5;
  if (ratio <= 1.3) return 6;
  if (ratio <= 1.5) return 7;
  if (ratio <= 1.8) return 8;
  if (ratio <= 2.2) return 9;
  return 10;
}

/**
 * Calculate population density score (higher density = more rental demand)
 */
function calculateDensityScore(populationDensity: number): number {
  // Density thresholds (people per sq mile)
  if (populationDensity >= 5000) return 100; // Urban
  if (populationDensity >= 2000) return 80;  // Suburban
  if (populationDensity >= 1000) return 60;  // Town
  if (populationDensity >= 500) return 40;   // Rural
  return 20; // Very rural
}

/**
 * Calculate exponential crime weight based on crime score
 * Lower weight when safe (good score), higher weight when dangerous (bad score)
 */
function calculateCrimeWeight(crimeScore: number): number {
  // Crime score: 100 = safest, 0 = most dangerous
  // Weight: 0.15 (15%) when safe, 0.30 (30%) when dangerous
  
  if (crimeScore >= 80) return 0.15; // Very safe - minimal weight
  if (crimeScore >= 60) return 0.18; // Safe - low weight
  if (crimeScore >= 40) return 0.22; // Moderate - medium weight
  if (crimeScore >= 20) return 0.26; // Dangerous - high weight
  return 0.30; // Very dangerous - maximum weight
}

/**
 * Calculate exponential density weight based on density score
 * Lower weight when good density (score 60+/rating 4+), higher weight when poor density
 */
function calculateDensityWeight(densityScore: number): number {
  // Density score: 100 = best, 0 = worst
  // Weight: 0.10 (10%) when good density (60+), 0.25 (25%) when poor density
  
  if (densityScore >= 60) return 0.10; // Good density (4+ rating) - minimal weight
  if (densityScore >= 40) return 0.15; // Moderate density - medium weight
  if (densityScore >= 20) return 0.20; // Poor density - high weight
  return 0.25; // Very poor density - maximum weight
}

/**
 * Convert numeric score to letter grade
 */
function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Convert numeric score to investment recommendation
 */
function scoreToRecommendation(score: number): 'Excellent' | 'Good' | 'Fair' | 'Avoid' {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Avoid';
}

/**
 * Get color for score (for UI)
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981'; // Green
  if (score >= 60) return '#f59e0b'; // Yellow
  if (score >= 40) return '#fb923c'; // Orange
  return '#ef4444'; // Red
}

/**
 * Estimate median home price based on FMR (rough estimation)
 * In real implementation, this would come from Zillow or similar API
 */
export function estimateMedianHomePrice(threeBedroomRent: number): number {
  // Rule of thumb: home price is about 50x monthly rent in average markets
  // Adjust based on rent level
  let multiplier = 50;
  
  if (threeBedroomRent >= 2000) {
    multiplier = 60; // Higher rent areas tend to have higher price-to-rent ratios
  } else if (threeBedroomRent <= 1000) {
    multiplier = 40; // Lower rent areas tend to have lower ratios
  }
  
  return Math.round(threeBedroomRent * multiplier);
}

