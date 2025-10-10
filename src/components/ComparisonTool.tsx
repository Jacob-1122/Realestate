import React, { useState } from 'react';
import { GitCompare, X } from 'lucide-react';
import { AnalysisResult } from '../types';
import { formatCurrency, formatPercentage, isValidZipCode } from '../utils/apiHelpers';
import { getScoreColor } from '../utils/scoreCalculator';

interface ComparisonToolProps {
  onCompare: (zipCodes: string[]) => void;
  results: AnalysisResult[];
  onClose: () => void;
}

export function ComparisonTool({ onCompare, results, onClose }: ComparisonToolProps) {
  const [zipCodes, setZipCodes] = useState<string[]>(['', '', '']);

  const handleZipCodeChange = (index: number, value: string) => {
    const newZipCodes = [...zipCodes];
    newZipCodes[index] = value.replace(/\D/g, '').slice(0, 5);
    setZipCodes(newZipCodes);
  };

  const handleCompare = () => {
    const validZipCodes = zipCodes.filter(zip => isValidZipCode(zip));
    if (validZipCodes.length >= 2) {
      onCompare(validZipCodes);
    }
  };

  const validZipCount = zipCodes.filter(zip => isValidZipCode(zip)).length;

  if (results.length > 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <GitCompare className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              ZIP Code Comparison
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Metric
                </th>
                {results.map(result => (
                  <th key={result.zipCode} className="text-center py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                    {result.zipCode}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {/* Investment Score */}
              <tr>
                <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                  Investment Score
                </td>
                {results.map(result => (
                  <td key={result.zipCode} className="py-3 px-4 text-center">
                    <span
                      className="text-lg font-bold"
                      style={{ color: getScoreColor(result.investmentMetrics?.score || 0) }}
                    >
                      {result.investmentMetrics?.score || 'N/A'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* 3BR Rent */}
              <tr>
                <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                  3BR Monthly Rent
                </td>
                {results.map(result => (
                  <td key={result.zipCode} className="py-3 px-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                    {result.fmrData?.data.fmr_3 ? formatCurrency(result.fmrData.data.fmr_3) : 'N/A'}
                  </td>
                ))}
              </tr>

              {/* Estimated Price */}
              <tr>
                <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                  Est. Property Price
                </td>
                {results.map(result => (
                  <td key={result.zipCode} className="py-3 px-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                    {result.investmentMetrics?.estimatedPriceRange.median 
                      ? formatCurrency(result.investmentMetrics.estimatedPriceRange.median)
                      : 'N/A'}
                  </td>
                ))}
              </tr>

              {/* Rent-to-Price Ratio */}
              <tr>
                <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                  Rent-to-Price Ratio
                </td>
                {results.map(result => (
                  <td key={result.zipCode} className="py-3 px-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                    {result.investmentMetrics?.rentToPriceRatio 
                      ? formatPercentage(result.investmentMetrics.rentToPriceRatio)
                      : 'N/A'}
                  </td>
                ))}
              </tr>

              {/* Violent Crime Rate */}
              <tr>
                <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                  Violent Crime Rate
                </td>
                {results.map(result => (
                  <td key={result.zipCode} className="py-3 px-4 text-center text-sm text-gray-700 dark:text-gray-300">
                    {result.crimeData?.violent_crime_rate || 'N/A'}
                  </td>
                ))}
              </tr>

              {/* Recommendation */}
              <tr>
                <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                  Recommendation
                </td>
                {results.map(result => (
                  <td key={result.zipCode} className="py-3 px-4 text-center">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {result.investmentMetrics?.recommendation || 'N/A'}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <GitCompare className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Compare ZIP Codes
        </h2>
      </div>

      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Enter 2-3 ZIP codes to compare their investment potential side-by-side
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {zipCodes.map((zip, index) => (
          <div key={index}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ZIP Code {index + 1} {index >= 2 && '(Optional)'}
            </label>
            <input
              type="text"
              value={zip}
              onChange={(e) => handleZipCodeChange(index, e.target.value)}
              placeholder="12345"
              maxLength={5}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleCompare}
        disabled={validZipCount < 2}
        className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        Compare {validZipCount} ZIP Code{validZipCount !== 1 ? 's' : ''}
      </button>
    </div>
  );
}

