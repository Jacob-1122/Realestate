import { TrendingUp } from 'lucide-react';
import { InvestmentMetrics } from '../types';
import { getScoreColor } from '../utils/scoreCalculator';

interface InvestmentScoreProps {
  metrics: InvestmentMetrics | null;
  loading?: boolean;
}

export function InvestmentScore({ metrics, loading }: InvestmentScoreProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          No investment metrics available
        </p>
      </div>
    );
  }

  const scoreColor = getScoreColor(metrics.score);
  const circumference = 2 * Math.PI * 70; // radius = 70
  const strokeDashoffset = circumference - (metrics.score / 100) * circumference;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Investment Rating
        </h2>
      </div>

      {/* Circular Progress Indicator */}
      <div className="flex flex-col items-center justify-center mb-6">
        <div className="relative w-48 h-48">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* Progress circle */}
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke={scoreColor}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-5xl font-bold" style={{ color: scoreColor }}>
              {metrics.score}
            </div>
            <div className="text-xl font-bold text-gray-600 dark:text-gray-400">
              Grade {metrics.grade}
            </div>
          </div>
        </div>

        <div
          className="mt-4 px-6 py-2 rounded-full text-white font-bold text-lg"
          style={{ backgroundColor: scoreColor }}
        >
          {metrics.recommendation}
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="space-y-3 mb-6">
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Score Breakdown:
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              FMR-to-Price Ratio ({metrics.breakdown.fmrWeight}%)
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {metrics.breakdown.fmrScore}/100
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${metrics.breakdown.fmrScore}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Crime Safety ({metrics.breakdown.crimeWeight}%)
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {metrics.breakdown.crimeScore}/100
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${metrics.breakdown.crimeScore}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Population Density ({metrics.breakdown.densityWeight}%)
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {metrics.breakdown.densityScore}/100
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${metrics.breakdown.densityScore}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        Score calculated with dynamic weighting. FMR ratio prioritized; crime and density weights adjust based on performance.
      </div>
    </div>
  );
}

