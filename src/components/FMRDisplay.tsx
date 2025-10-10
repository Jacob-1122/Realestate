import React from 'react';
import { Home } from 'lucide-react';
import { FMRData } from '../types';
import { transformFMRData } from '../utils/dataTransformers';
import { formatCurrency } from '../utils/apiHelpers';

interface FMRDisplayProps {
  data: FMRData | null;
  loading?: boolean;
}

export function FMRDisplay({ data, loading }: FMRDisplayProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
          No Fair Market Rent data available
        </p>
      </div>
    );
  }

  const fmrDisplayData = transformFMRData(data);
  const bedroomLabels = ['Studio', '1 Bedroom', '2 Bedrooms', '3 Bedrooms', '4 Bedrooms'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Home className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Fair Market Rent (FMR)
        </h2>
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Fiscal Year {data.year} • HUD Data
        <div className="mt-1">
          <a 
            href="https://www.huduser.gov/portal/datasets/fmr/fmrs/FY2026_code/select_Geography.odn"
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 underline text-xs"
          >
            View Official HUD FMR Data →
          </a>
        </div>
      </div>

      <div className="space-y-3">
        {fmrDisplayData.map((item, index) => {
          const isThreeBedroom = item.bedrooms === 3;
          
          return (
            <div
              key={item.bedrooms}
              className={`p-4 rounded-lg border-2 transition-all ${
                isThreeBedroom
                  ? 'border-primary bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isThreeBedroom ? 'bg-primary' : 'bg-gray-400'
                    }`}
                  ></div>
                  <span className={`font-semibold ${
                    isThreeBedroom
                      ? 'text-primary text-lg'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {bedroomLabels[index]}
                  </span>
                </div>
                <span className={`font-bold ${
                  isThreeBedroom
                    ? 'text-primary text-xl'
                    : 'text-gray-900 dark:text-white text-lg'
                }`}>
                  {formatCurrency(item.rent)}/mo
                </span>
              </div>
              {isThreeBedroom && (
                <div className="mt-2 text-sm text-primary font-medium">
                  Most important for investors
                </div>
              )}
            </div>
          );
        })}
      </div>

      {data.data.county_name && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold">Location:</span> {data.data.county_name}, {data.data.state_alpha}
          </div>
          {data.data.metro_name && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              <span className="font-semibold">Metro:</span> {data.data.metro_name}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

