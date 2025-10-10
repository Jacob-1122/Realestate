import React from 'react';
import { Shield, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { CrimeData } from '../types';

interface CrimeStatsProps {
  data: CrimeData | null;
  loading?: boolean;
}

/**
 * Convert crime rate to 1-10 scale (1 = safest, 10 = most dangerous)
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

function getScaleColor(scale: number): string {
  if (scale <= 3) return 'text-green-600 dark:text-green-400';
  if (scale <= 5) return 'text-yellow-600 dark:text-yellow-400';
  if (scale <= 7) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function getScaleBgColor(scale: number): string {
  if (scale <= 3) return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
  if (scale <= 5) return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
  if (scale <= 7) return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
  return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
}

export function CrimeStats({ data, loading }: CrimeStatsProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          Crime data not available
        </p>
      </div>
    );
  }

  const getTrendIcon = () => {
    if (!data.trend) return <Minus className="w-5 h-5 text-gray-400" />;
    if (data.trend === 'down') return <TrendingDown className="w-5 h-5 text-green-500" />;
    if (data.trend === 'up') return <TrendingUp className="w-5 h-5 text-red-500" />;
    return <Minus className="w-5 h-5 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (!data.trend) return 'text-gray-600';
    if (data.trend === 'down') return 'text-green-600';
    if (data.trend === 'up') return 'text-red-600';
    return 'text-gray-600';
  };

  // Calculate 1-10 scales
  const NATIONAL_VIOLENT_RATE = 380;
  const NATIONAL_PROPERTY_RATE = 1958;
  
  const violentScale = crimeRateTo10Scale(data.violent_crime_rate, NATIONAL_VIOLENT_RATE);
  const propertyScale = crimeRateTo10Scale(data.property_crime_rate, NATIONAL_PROPERTY_RATE);
  const overallScale = Math.round((violentScale * 0.6 + propertyScale * 0.4)); // Weight violent more

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Crime Statistics
        </h2>
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Year {data.year} • County-Level Data • Scale: 1 (Safest) - 10 (Most Dangerous)
      </div>

      <div className="space-y-4">
        <div className={`p-4 rounded-lg border ${getScaleBgColor(violentScale)}`}>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Violent Crime Level
          </div>
          <div className={`text-4xl font-bold ${getScaleColor(violentScale)}`}>
            {violentScale}/10
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {violentScale <= 3 ? 'Very Safe' : violentScale <= 5 ? 'Relatively Safe' : violentScale <= 7 ? 'Moderate Risk' : 'High Risk'}
          </div>
        </div>

        <div className={`p-4 rounded-lg border ${getScaleBgColor(propertyScale)}`}>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Property Crime Level
          </div>
          <div className={`text-4xl font-bold ${getScaleColor(propertyScale)}`}>
            {propertyScale}/10
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {propertyScale <= 3 ? 'Very Safe' : propertyScale <= 5 ? 'Relatively Safe' : propertyScale <= 7 ? 'Moderate Risk' : 'High Risk'}
          </div>
        </div>

        <div className={`p-4 rounded-lg border ${getScaleBgColor(overallScale)}`}>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Overall Safety Rating
          </div>
          <div className={`text-4xl font-bold ${getScaleColor(overallScale)}`}>
            {overallScale}/10
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Combined assessment
          </div>
        </div>

        {data.trend && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Year-over-Year Trend
              </span>
              <div className={`flex items-center gap-2 font-semibold ${getTrendColor()}`}>
                {getTrendIcon()}
                <span className="capitalize">{data.trend}</span>
                {data.percentChange !== undefined && (
                  <span className="text-sm">
                    ({data.percentChange > 0 ? '+' : ''}{data.percentChange.toFixed(1)}%)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
        <div className="text-xs text-gray-600 dark:text-gray-400">
          <span className="font-semibold">Location:</span> {data.county}, {data.state}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Data represents county-level statistics as ZIP codes don't align with FBI reporting districts.
        </div>
      </div>
    </div>
  );
}

