import { useState } from 'react';
import { DollarSign, Home, TrendingUp, Target, Calculator } from 'lucide-react';
import { InvestmentMetrics, FMRData } from '../types';
import { formatCurrency, formatPercentage } from '../utils/apiHelpers';
import { CashFlowCalculator } from './CashFlowCalculator';

interface MarketMetricsProps {
  metrics: InvestmentMetrics | null;
  loading?: boolean;
  censusData?: { medianHomeValue: number } | null;
  fmrData?: FMRData | null;
  censusLoading?: boolean;
}

export function MarketMetrics({ metrics, loading, censusData, fmrData, censusLoading }: MarketMetricsProps) {
  const [showCalculator, setShowCalculator] = useState(false);
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          No market metrics available
        </p>
      </div>
    );
  }

  // Get 3BR FMR for calculator
  const get3BRFMR = () => {
    let threeBedroomRent = fmrData?.data.fmr_3 || 0;
    
    if (threeBedroomRent === 0 && fmrData?.data.basicdata) {
      if (Array.isArray(fmrData.data.basicdata)) {
        const zipData = fmrData.data.basicdata.find((item: any) => item.zip_code === fmrData.zip_code);
        if (zipData && zipData['Three-Bedroom']) {
          threeBedroomRent = parseInt(zipData['Three-Bedroom']);
        }
      } else if (typeof fmrData.data.basicdata === 'object') {
        if (fmrData.data.basicdata['Three-Bedroom']) {
          threeBedroomRent = parseInt(fmrData.data.basicdata['Three-Bedroom']);
        }
      }
    }
    
    return threeBedroomRent;
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Key Investment Metrics
          </h2>
          <button
            onClick={() => setShowCalculator(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-all font-semibold text-sm"
          >
            <Calculator className="w-4 h-4" />
            Cash Flow Calc
          </button>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Max Price for 2% Rule */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <Home className="w-5 h-5 text-blue-600" />
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Max Price (2% Rule)
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {formatCurrency(metrics.estimatedPriceRange.median)}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Based on 3BR FMR • Range: {formatCurrency(metrics.estimatedPriceRange.low)} - {formatCurrency(metrics.estimatedPriceRange.high)}
          </div>
        </div>

        {/* Required Rent for 2% Rule */}
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-green-600" />
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Required Rent (2% Rule)
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {formatCurrency(metrics.requiredRentFor2Percent)}/mo
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Monthly rent needed for 2% rule
          </div>
        </div>

        {/* Average Home Cost */}
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Average Home Cost
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {censusLoading ? (
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-8 w-24"></div>
            ) : censusData ? (
              formatCurrency(censusData.medianHomeValue)
            ) : (
              formatCurrency(metrics.estimatedPriceRange.median)
            )}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {censusLoading ? 'Loading Census data...' : 
             censusData ? 'US Census median home value (2022)' : 
             'Estimated based on FMR (50x monthly rent)'}
          </div>
        </div>

        {/* 3 Bedroom FMR */}
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-yellow-600" />
            <div className="text-sm text-gray-600 dark:text-gray-400">
              3 Bedroom FMR
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {(() => {
              // Get 3BR rent from FMR data
              let threeBedroomRent = fmrData?.data.fmr_3 || 0;
              
              // Check if we need to extract from basicdata (Small Area FMR or regular FMR)
              if (threeBedroomRent === 0 && fmrData?.data.basicdata) {
                if (Array.isArray(fmrData.data.basicdata)) {
                  // Small Area FMR - array of ZIP codes
                  const zipData = fmrData.data.basicdata.find((item: any) => item.zip_code === fmrData.zip_code);
                  if (zipData && zipData['Three-Bedroom']) {
                    threeBedroomRent = parseInt(zipData['Three-Bedroom']);
                  }
                } else if (typeof fmrData.data.basicdata === 'object') {
                  // Regular FMR - object with direct values
                  if (fmrData.data.basicdata['Three-Bedroom']) {
                    threeBedroomRent = parseInt(fmrData.data.basicdata['Three-Bedroom']);
                  }
                }
              }
              
              return formatCurrency(threeBedroomRent);
            })()}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Monthly rent for 3BR
          </div>
        </div>
      </div>
      </div>

      {/* Cash Flow Calculator Modal */}
      <CashFlowCalculator
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
        fmrRent={get3BRFMR()}
        zipCode={fmrData?.zip_code || ''}
      />
    </>
  );
}

