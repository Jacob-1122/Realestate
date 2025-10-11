import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bookmark, GitCompare, History } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { DashboardLayout } from '../components/DashboardLayout';
import { ZipCodeSearch } from '../components/ZipCodeSearch';
import { FMRDisplay } from '../components/FMRDisplay';
import { CrimeStats } from '../components/CrimeStats';
import { InvestmentScore } from '../components/InvestmentScore';
import { MarketMetrics } from '../components/MarketMetrics';
import { MarketContext } from '../components/MarketContext';
import { ZipCodeMap } from '../components/ZipCodeMap';
import { Watchlist } from '../components/Watchlist';
import { ComparisonTool } from '../components/ComparisonTool';
import { PDFExport } from '../components/PDFExport';
import { useHUDData } from '../hooks/useHUDData';
import { useCrimeData } from '../hooks/useCrimeData';
import { useZipCodeLookup } from '../hooks/useZipCodeLookup';
import { useCensusData } from '../hooks/useCensusData';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { calculateInvestmentScore, estimateMedianHomePrice } from '../utils/scoreCalculator';
import { clearExpiredCache } from '../utils/apiHelpers';
import { AnalysisResult, SavedSearch, MarketContext as MarketContextType } from '../types';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const zipFromUrl = searchParams.get('zip');
  
  const [currentZipCode, setCurrentZipCode] = useState<string | null>(zipFromUrl);
  const [searchHistory, setSearchHistory] = useLocalStorage<string[]>('search_history', []);
  const [savedSearches, setSavedSearches] = useLocalStorage<SavedSearch[]>('saved_searches', []);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<AnalysisResult[]>([]);
  const [showWatchlist, setShowWatchlist] = useState(false);

  // Fetch data for current ZIP code
  const { location, loading: locationLoading } = useZipCodeLookup(currentZipCode);
  const { data: fmrData, loading: fmrLoading, error: fmrError } = useHUDData(
    currentZipCode,
    location?.state_abbr || null,
    location?.county || null
  );
  const { data: crimeData, loading: crimeLoading } = useCrimeData(
    location?.county || null,
    location?.state || null
  );
  const { data: censusData, loading: censusLoading } = useCensusData(currentZipCode);

  // Clear expired cache on mount
  useEffect(() => {
    clearExpiredCache();
  }, []);

  // Update URL when ZIP changes
  useEffect(() => {
    if (currentZipCode) {
      setSearchParams({ zip: currentZipCode });
    } else {
      setSearchParams({});
    }
  }, [currentZipCode, setSearchParams]);

  // Calculate investment metrics
  const investmentMetrics = React.useMemo(() => {
    if (!fmrData || !location) return null;

    let threeBedroomRent = fmrData.data.fmr_3 || 0;
    if (threeBedroomRent === 0 && fmrData.data.basicdata) {
      if (Array.isArray(fmrData.data.basicdata)) {
        const zipData = fmrData.data.basicdata.find((item: any) => item.zip_code === fmrData.zip_code);
        if (zipData && zipData['Three-Bedroom']) {
          threeBedroomRent = parseInt(zipData['Three-Bedroom']);
        }
      } else if (typeof fmrData.data.basicdata === 'object') {
        if (fmrData.data.basicdata['Three-Bedroom']) {
          const value = fmrData.data.basicdata['Three-Bedroom'];
          threeBedroomRent = typeof value === 'string' ? parseInt(value) : value;
        }
      }
    }

    const medianHomePrice = censusData?.medianHomeValue || estimateMedianHomePrice(threeBedroomRent);
    const populationDensity = location.population || 0;

    return calculateInvestmentScore(fmrData, crimeData, populationDensity, medianHomePrice);
  }, [fmrData, crimeData, location, censusData]);

  const marketContext: MarketContextType | null = React.useMemo(() => {
    if (!location) return null;
    
    return {
      metroArea: `${location.city || location.zip}, ${location.state}` || 'Unknown',
      county: location.county || 'Unknown',
      state: location.state || 'Unknown',
      populationDensity: location.population || 0,
      nearbyAmenities: [],
    };
  }, [location]);

  const currentResult: AnalysisResult | null = React.useMemo(() => {
    if (!currentZipCode || !fmrData) return null;

    return {
      zipCode: currentZipCode,
      fmrData,
      crimeData,
      location,
      investmentMetrics,
      marketContext,
      timestamp: Date.now(),
    };
  }, [currentZipCode, fmrData, crimeData, location, investmentMetrics, marketContext]);

  const handleSearch = (zipCode: string) => {
    setCurrentZipCode(zipCode);
    setShowComparison(false);
    setShowWatchlist(false);

    const newHistory = [zipCode, ...searchHistory.filter(z => z !== zipCode)].slice(0, 10);
    setSearchHistory(newHistory);
  };

  // Removed handleSaveToWatchlist - not needed in this simplified version

  const handleRemoveFromWatchlist = (id: string) => {
    setSavedSearches(savedSearches.filter(s => s.result && s.result.zipCode !== id));
  };

  const handleSelectFromWatchlist = (zipCode: string) => {
    setShowWatchlist(false);
    handleSearch(zipCode);
  };

  const handleCompare = (_zipCodes: string[]) => {
    // In a real implementation, you'd fetch data for all ZIPs
    // For now, just show the current result
    setComparisonResults(currentResult ? [currentResult] : []);
  };

  const isMainDataLoading = locationLoading || fmrLoading;
  const hasData = currentZipCode && fmrData && !fmrError;

  return (
    <>
      <Navbar />
      <DashboardLayout>
        {/* Search Bar */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <ZipCodeSearch onSearch={handleSearch} loading={isMainDataLoading} />
        </div>

        {/* Action Buttons */}
        {!currentZipCode && (
          <div className="flex justify-center gap-4 flex-wrap px-4">
            <button
              onClick={() => setShowWatchlist(!showWatchlist)}
              className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:border-primary transition-all shadow-sm"
            >
              <Bookmark className="w-5 h-5" />
              Watchlist ({savedSearches.length})
            </button>
            
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:border-primary transition-all shadow-sm"
            >
              <GitCompare className="w-5 h-5" />
              Compare ZIP Codes
            </button>
          </div>
        )}

        {/* Watchlist View */}
        {showWatchlist && !currentZipCode && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Watchlist
              savedSearches={savedSearches}
              onSelect={handleSelectFromWatchlist}
              onRemove={handleRemoveFromWatchlist}
            />
          </div>
        )}

        {/* Comparison Tool */}
        {showComparison && !currentZipCode && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <ComparisonTool
              onCompare={handleCompare}
              results={comparisonResults}
              onClose={() => setShowComparison(false)}
            />
          </div>
        )}

        {/* Recent Searches */}
        {!currentZipCode && !showWatchlist && !showComparison && searchHistory.length > 0 && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Recent Searches
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map(zip => (
                <button
                  key={zip}
                  onClick={() => handleSearch(zip)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-primary hover:text-white transition-all"
                >
                  {zip}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {fmrError && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-600 dark:text-red-400">
              <strong>Error:</strong> {fmrError}
            </p>
            {fmrError.includes('API key') && (
              <p className="text-sm text-red-500 mt-2">
                💡 Get your free HUD API key at: <a href="https://www.huduser.gov/portal/dataset/fmr-api.html" target="_blank" rel="noopener noreferrer" className="underline">HUD User Portal</a>
              </p>
            )}
            {fmrError.includes('cache') && (
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
              >
                Clear Cache & Reload
              </button>
            )}
          </div>
        )}

        {/* Main Content */}
        {hasData && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="flex justify-end">
              <PDFExport result={currentResult!} />
            </div>

            {investmentMetrics && (
              <div className="grid lg:grid-cols-2 gap-6">
                <InvestmentScore 
                  metrics={investmentMetrics} 
                  loading={isMainDataLoading}
                />
                <MarketMetrics 
                  metrics={investmentMetrics} 
                  loading={isMainDataLoading}
                  censusData={censusData}
                  fmrData={fmrData}
                  censusLoading={censusLoading}
                />
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
              <FMRDisplay data={fmrData} loading={fmrLoading} />
              <CrimeStats data={crimeData} loading={crimeLoading} />
            </div>

            {marketContext && (
              <MarketContext context={marketContext} loading={locationLoading} />
            )}

            {location && (
              <ZipCodeMap 
                location={location}
                loading={locationLoading}
              />
            )}
          </div>
        )}
      </DashboardLayout>
    </>
  );
}

