import React, { useState, useEffect } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { ZipCodeSearch } from './components/ZipCodeSearch';
import { FMRDisplay } from './components/FMRDisplay';
import { CrimeStats } from './components/CrimeStats';
import { InvestmentScore } from './components/InvestmentScore';
import { MarketMetrics } from './components/MarketMetrics';
import { MarketContext } from './components/MarketContext';
import { ZipCodeMap } from './components/ZipCodeMap';
import { Watchlist } from './components/Watchlist';
import { ComparisonTool } from './components/ComparisonTool';
import { PDFExport } from './components/PDFExport';
import { useHUDData } from './hooks/useHUDData';
import { useCrimeData } from './hooks/useCrimeData';
import { useZipCodeLookup } from './hooks/useZipCodeLookup';
import { useCensusData } from './hooks/useCensusData';
import { useLocalStorage } from './hooks/useLocalStorage';
import { calculateInvestmentScore, estimateMedianHomePrice } from './utils/scoreCalculator';
import { clearExpiredCache, generateId } from './utils/apiHelpers';
import { AnalysisResult, SavedSearch, MarketContext as MarketContextType } from './types';
import { Bookmark, GitCompare, History } from 'lucide-react';

function App() {
  const [currentZipCode, setCurrentZipCode] = useState<string | null>(null);
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

  // Calculate investment metrics when FMR data is available (don't wait for Census)
  const investmentMetrics = React.useMemo(() => {
    if (!fmrData) return null;
    
    // Check if we need to extract from basicdata (Small Area FMR or regular FMR)
    let threeBedroomRent = fmrData.data.fmr_3 || 0;
    
    if (threeBedroomRent === 0 && fmrData.data.basicdata) {
      if (Array.isArray(fmrData.data.basicdata)) {
        // Small Area FMR - array of ZIP codes
        const zipData = fmrData.data.basicdata.find((item: any) => item.zip_code === currentZipCode);
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
    
    // Use real Census data if available, otherwise estimate
    const medianHomePrice = censusData?.medianHomeValue || estimateMedianHomePrice(threeBedroomRent);
    
    return calculateInvestmentScore(fmrData, crimeData, medianHomePrice);
  }, [fmrData, crimeData, censusData]);

  // Separate loading states - don't wait for Census data
  const isMainDataLoading = fmrLoading || locationLoading || crimeLoading;
  const isCensusLoading = censusLoading;

  // Build market context
  const marketContext: MarketContextType | null = React.useMemo(() => {
    if (!location) return null;
    
    return {
      county: location.county,
      state: location.state,
      metroArea: fmrData?.data.metro_name,
      population: location.population,
      nearestCity: location.city,
    };
  }, [location, fmrData]);

  // Current analysis result
  const currentResult: AnalysisResult | null = React.useMemo(() => {
    if (!currentZipCode) return null;

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

    // Add to search history
    const newHistory = [zipCode, ...searchHistory.filter(z => z !== zipCode)].slice(0, 10);
    setSearchHistory(newHistory);
  };

  const handleSaveToWatchlist = () => {
    if (!currentResult) return;

    const existing = savedSearches.find(s => s.zipCode === currentZipCode);
    if (existing) {
      alert('This ZIP code is already in your watchlist');
      return;
    }

    const newSearch: SavedSearch = {
      id: generateId(),
      zipCode: currentZipCode!,
      result: currentResult,
      savedAt: Date.now(),
    };

    setSavedSearches([newSearch, ...savedSearches]);
    alert('Added to watchlist!');
  };

  const handleRemoveFromWatchlist = (id: string) => {
    setSavedSearches(savedSearches.filter(s => s.id !== id));
  };

  const handleSelectFromWatchlist = (zipCode: string) => {
    setCurrentZipCode(zipCode);
    setShowWatchlist(false);
  };

  const handleCompare = async (zipCodes: string[]) => {
    // For simplicity, we'll just show the comparison interface
    // In a real implementation, you'd fetch data for each ZIP code
    setComparisonResults([]);
    alert('Comparison feature would fetch data for: ' + zipCodes.join(', '));
  };

  const handleBack = () => {
    setCurrentZipCode(null);
    setShowComparison(false);
    setShowWatchlist(false);
  };

  // Remove this line since we're using separate loading states now

  return (
    <DashboardLayout showBackButton={currentZipCode !== null} onBack={handleBack}>
      <div className="space-y-8">
        {/* Search Bar (always visible) */}
        <div className="max-w-4xl mx-auto">
          <ZipCodeSearch onSearch={handleSearch} loading={isMainDataLoading} />
        </div>

        {/* Action Buttons */}
        {!currentZipCode && (
          <div className="flex justify-center gap-4 flex-wrap">
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
          <div className="max-w-4xl mx-auto">
            <Watchlist
              savedSearches={savedSearches}
              onSelect={handleSelectFromWatchlist}
              onRemove={handleRemoveFromWatchlist}
            />
          </div>
        )}

        {/* Comparison Tool */}
        {showComparison && !currentZipCode && (
          <div className="max-w-6xl mx-auto">
            <ComparisonTool
              onCompare={handleCompare}
              results={comparisonResults}
              onClose={() => setShowComparison(false)}
            />
          </div>
        )}

        {/* Recent Searches */}
        {!currentZipCode && !showWatchlist && !showComparison && searchHistory.length > 0 && (
          <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Recent Searches
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((zip) => (
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

        {/* Main Dashboard */}
        {currentZipCode && (
          <>
            {/* Error Display */}
            {fmrError && (
              <div className="max-w-4xl mx-auto bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
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

            {/* Export Button */}
            {currentResult && !isMainDataLoading && (
              <div className="flex justify-end gap-4">
                <PDFExport result={currentResult} />
                <button
                  onClick={handleSaveToWatchlist}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary hover:text-white transition-all"
                >
                  <Bookmark className="w-5 h-5" />
                  Save to Watchlist
                </button>
              </div>
            )}


            {/* Top Row: Investment Score & Market Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <InvestmentScore metrics={investmentMetrics} loading={isMainDataLoading} />
              <MarketMetrics 
                metrics={investmentMetrics} 
                loading={isMainDataLoading} 
                censusData={censusData} 
                fmrData={fmrData}
                censusLoading={isCensusLoading}
              />
            </div>

            {/* Middle Row: FMR Display & Crime Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FMRDisplay data={fmrData} loading={isMainDataLoading} />
              <CrimeStats data={crimeData} loading={isMainDataLoading} />
            </div>

            {/* Bottom Row: Map & Market Context */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ZipCodeMap location={location} loading={locationLoading} />
              </div>
              <div>
                <MarketContext context={marketContext} loading={isMainDataLoading} />
              </div>
            </div>
          </>
        )}

        {/* Welcome Message */}
        {!currentZipCode && !showWatchlist && !showComparison && (
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg shadow-lg p-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Welcome to Section 8 Investment Analyzer
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                Analyze rental property investment potential using HUD Fair Market Rent data, 
                crime statistics, and advanced metrics.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
                  <div className="text-primary text-2xl font-bold mb-2">1</div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                    Enter ZIP Code
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Search any US ZIP code to get started
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
                  <div className="text-primary text-2xl font-bold mb-2">2</div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                    Review Data
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    See FMR rates, crime stats, and investment scores
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
                  <div className="text-primary text-2xl font-bold mb-2">3</div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                    Make Decision
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Get actionable investment recommendations
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default App;