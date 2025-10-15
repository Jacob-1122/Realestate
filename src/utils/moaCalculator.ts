// Utilities for calculating Maximum Offer Amount (MOA) and generating search URLs

import { MetroAreaAggregate } from './fmrDataProcessor';
import { MOASettings } from '../types/listings';

/**
 * Calculate Maximum Offer Amount based on FMR and target rule
 * @param metro - Metro area aggregate data
 * @param settings - MOA calculation settings
 * @returns Maximum offer amount in dollars
 */
export function calculateMOA(
  metro: MetroAreaAggregate,
  settings: MOASettings
): number {
  const avgRent = metro[`avg${settings.bedrooms}br`];
  
  if (!avgRent || avgRent === 0) {
    return 0;
  }
  
  // MOA = (Monthly Rent × 12) / Target Rule
  // For 2% rule: MOA = Rent / 0.02
  const moa = avgRent / (settings.targetRule / 100);
  
  // Apply buffer (e.g., 15% below MOA for safety margin)
  return Math.round(moa * settings.buffer);
}

/**
 * Generate Realtor.com search URL for a ZIP code
 * @param zipCode - 5-digit ZIP code
 * @param maxPrice - Maximum price to search
 * @param minBeds - Minimum number of bedrooms
 * @returns Search URL string
 */
export function generateSearchUrl(
  zipCode: string,
  maxPrice: number,
  minBeds: number
): string {
  // Realtor.com URL format with ZIP code
  return `https://www.realtor.com/realestateandhomes-search/${zipCode}/type-single-family-home/beds-${minBeds}/price-na-${maxPrice}`;
}

/**
 * Generate search URL for multiple ZIP codes (uses first ZIP as representative)
 * @param zipCodes - Array of ZIP codes
 * @param maxPrice - Maximum price to search
 * @param minBeds - Minimum number of bedrooms
 * @returns Search URL string for the first ZIP code
 */
export function generateMultiZipSearchUrl(
  zipCodes: string[],
  maxPrice: number,
  minBeds: number
): string {
  // Realtor.com doesn't support comma-separated ZIPs, so use first ZIP as representative
  const firstZip = zipCodes[0] || '00000';
  return `https://www.realtor.com/realestateandhomes-search/${firstZip}/type-single-family-home/beds-${minBeds}/price-na-${maxPrice}`;
}

/**
 * Generate cache key for storing listing data
 * @param identifier - Metro name or ZIP code
 * @param maxPrice - Maximum price
 * @param minBeds - Minimum bedrooms
 * @returns Unique cache key
 */
export function getCacheKey(
  identifier: string,
  maxPrice: number,
  minBeds: number
): string {
  // Create a unique, stable key
  const normalized = identifier.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `listing_${normalized}_${maxPrice}_${minBeds}`;
}

/**
 * Format time ago from timestamp
 * @param isoString - ISO timestamp string
 * @returns Human-readable time ago string
 */
export function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes}m ago`;
  }
  
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

