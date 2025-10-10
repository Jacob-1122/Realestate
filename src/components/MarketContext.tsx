import React from 'react';
import { MapPin, Users } from 'lucide-react';
import { MarketContext as MarketContextType } from '../types';
import { formatNumber } from '../utils/apiHelpers';

interface MarketContextProps {
  context: MarketContextType | null;
  loading?: boolean;
}

export function MarketContext({ context, loading }: MarketContextProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!context) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Location
        </h2>
      </div>

      <div className="space-y-3">
        {context.nearestCity && (
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">City</div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {context.nearestCity}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">County</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {context.county}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">State</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {context.state}
            </div>
          </div>
        </div>

        {context.population && (
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-primary mt-1" />
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Population</div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {formatNumber(context.population)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

