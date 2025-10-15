import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Navbar } from '../components/Navbar';
import { DashboardLayout } from '../components/DashboardLayout';
import { FMRDisplay } from '../components/FMRDisplay';
import { CrimeStats } from '../components/CrimeStats';
import { InvestmentScore } from '../components/InvestmentScore';
import { MarketMetrics } from '../components/MarketMetrics';
import { MarketContext } from '../components/MarketContext';
import { ZipCodeMap } from '../components/ZipCodeMap';
import { useFMRData } from '../hooks/useFMRData';
import { useZipFMRData } from '../hooks/useZipFMRData';
import { useCrimeData } from '../hooks/useCrimeData';
import { useZipCodeLookup } from '../hooks/useZipCodeLookup';
import { useCensusData } from '../hooks/useCensusData';
import { MetroAreaAggregate, formatCurrency, formatRange } from '../utils/fmrDataProcessor';
import { MOASettings } from '../types/listings';
import { calculateInvestmentScore, estimateMedianHomePrice } from '../utils/scoreCalculator';
import { MarketContext as MarketContextType } from '../types';
import { ChevronDown, ChevronUp, Search, TrendingUp, TrendingDown, Building2, MapPin, Filter, X, ChevronLeft, ChevronRight, CheckSquare, Square, ArrowLeft } from 'lucide-react';

type SortField = 'name' | 'state' | 'zipCount' | 'avg1br' | 'avg2br' | 'avg3br' | 'avg4br';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'all' | 'top' | 'bottom';

export function MetroAreaAnalysisPage() {
  const { metroAreas, loading, error } = useFMRData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('avg2br');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [bedroomFilter, setBedroomFilter] = useState<1 | 2 | 3 | 4>(3);
  const [zipModalOpen, setZipModalOpen] = useState(false);
  const [selectedMetroForModal, setSelectedMetroForModal] = useState<MetroAreaAggregate | null>(null);
  const [selectedZipCode, setSelectedZipCode] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  
  const stateDropdownRef = useRef<HTMLDivElement>(null);

  // MOA Settings for listing counts (kept for future use)
  const [moaSettings] = useState<MOASettings>({
    targetRule: 2.0, // 2% rule
    bedrooms: 3, // 3-bedroom properties
    buffer: 1.0, // No buffer
  });

  // Listing counts feature disabled for now - can be enabled later
  // const { listingCounts, progress, isComplete } = useListingCounts({
  //   metroAreas: metroAreas,
  //   moaSettings,
  //   enabled: false, // Disabled
  // });

  // Get unique states
  const states = useMemo(() => {
    const stateSet = new Set(metroAreas.map(m => m.state));
    return Array.from(stateSet).sort();
  }, [metroAreas]);

  // Filter and sort metro areas
  const filteredAndSorted = useMemo(() => {
    let filtered = metroAreas;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(metro => 
        metro.metroAreaName.toLowerCase().includes(term) ||
        metro.state.toLowerCase().includes(term)
      );
    }

    // Apply state filter
    if (selectedStates.size > 0) {
      filtered = filtered.filter(metro => selectedStates.has(metro.state));
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortField) {
        case 'name':
          aVal = a.metroAreaName;
          bVal = b.metroAreaName;
          break;
        case 'state':
          aVal = a.state;
          bVal = b.state;
          break;
        case 'zipCount':
          aVal = a.zipCount;
          bVal = b.zipCount;
          break;
        case 'avg1br':
          aVal = a.avg1br;
          bVal = b.avg1br;
          break;
        case 'avg2br':
          aVal = a.avg2br;
          bVal = b.avg2br;
          break;
        case 'avg3br':
          aVal = a.avg3br;
          bVal = b.avg3br;
          break;
        case 'avg4br':
          aVal = a.avg4br;
          bVal = b.avg4br;
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc' 
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    // Apply view mode filter
    if (viewMode === 'top') {
      filtered = filtered.slice(0, 50);
    } else if (viewMode === 'bottom') {
      filtered = filtered.slice(-50).reverse();
    }

    return filtered;
  }, [metroAreas, searchTerm, selectedStates, sortField, sortDirection, viewMode]);

  // Paginated results
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSorted.slice(startIndex, endIndex);
  }, [filteredAndSorted, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStates, sortField, sortDirection, viewMode, itemsPerPage]);

  // Close state dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target as Node)) {
        setStateDropdownOpen(false);
      }
    };

    if (stateDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [stateDropdownOpen]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleState = (state: string) => {
    const newStates = new Set(selectedStates);
    if (newStates.has(state)) {
      newStates.delete(state);
    } else {
      newStates.add(state);
    }
    setSelectedStates(newStates);
  };

  const clearStateFilters = () => {
    setSelectedStates(new Set());
  };

  const openZipModal = (metro: MetroAreaAggregate) => {
    setSelectedMetroForModal(metro);
    setSelectedZipCode(null); // Reset selected ZIP when opening metro view
      setZipModalOpen(true);
  };

  const closeZipModal = () => {
    setZipModalOpen(false);
    setSelectedMetroForModal(null);
    setSelectedZipCode(null);
  };

  const openZipAnalysis = (zipCode: string) => {
    setSelectedZipCode(zipCode);
    // Keep the modal open, just switch the view
  };

  const backToMetroView = () => {
    setSelectedZipCode(null);
    // Keep modal open, go back to ZIP list
  };

  // Render ZIP Analysis Component
  const ZipAnalysisView = ({ zipCode }: { zipCode: string }) => {
    const { location, loading: locationLoading } = useZipCodeLookup(zipCode);
    const { data: fmrData, loading: fmrLoading, error: fmrError } = useZipFMRData(zipCode);
    const { data: crimeData, loading: crimeLoading } = useCrimeData(
      location?.county || null,
      location?.state || null
    );
    const { data: censusData, loading: censusLoading } = useCensusData(zipCode);

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

      return calculateInvestmentScore(fmrData, crimeData, medianHomePrice, populationDensity);
    }, [fmrData, crimeData, location, censusData]);

    const marketContext: MarketContextType | null = React.useMemo(() => {
      if (!location) return null;
      
      return {
        metroArea: `${location.city || location.zip}, ${location.state}` || 'Unknown',
        county: location.county || 'Unknown',
        state: location.state || 'Unknown',
        population: location.population || 0,
        nearestCity: location.city,
      };
    }, [location]);

    const loading = locationLoading || fmrLoading || crimeLoading || censusLoading;
    const hasData = !loading && fmrData && location;

    return (
      <div className="space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading ZIP code data...</p>
            </div>
          </div>
        )}

        {fmrError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-600 dark:text-red-400">
              <strong>Error:</strong> {fmrError}
            </p>
          </div>
        )}

        {hasData && (
          <>
            {investmentMetrics && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1">
                  <InvestmentScore metrics={investmentMetrics} />
                </div>
                <div className="lg:col-span-2">
                  <MarketMetrics 
                    metrics={investmentMetrics} 
                    fmrData={fmrData}
                    censusData={censusData}
                    censusLoading={censusLoading}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FMRDisplay data={fmrData} />
              {crimeData && <CrimeStats data={crimeData} />}
            </div>

            {location && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ZipCodeMap location={location} />
                {marketContext && <MarketContext context={marketContext} />}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    );
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <DashboardLayout>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
              <p className="text-lg text-gray-700 dark:text-gray-300">
                Loading Metro Area Data...
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Processing 50,000+ ZIP codes
              </p>
            </div>
          </div>
        </DashboardLayout>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <DashboardLayout>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">
                Error Loading Data
              </h3>
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        </DashboardLayout>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Metro Area FMR Analysis
              </h1>
            </div>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Analyze Fair Market Rents across {metroAreas.length} metro areas covering {metroAreas.reduce((sum, m) => sum + m.zipCount, 0).toLocaleString()} ZIP codes nationwide
            </p>
          </div>

          {/* Filters and Search */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search metro areas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                />
              </div>

              {/* State Filter Dropdown */}
              <div className="relative" ref={stateDropdownRef}>
                {/* Dropdown Button */}
                <button
                  onClick={() => setStateDropdownOpen(!stateDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    <span className="text-xs sm:text-sm">
                      {selectedStates.size === 0 
                        ? 'All States' 
                        : selectedStates.size === 1
                        ? Array.from(selectedStates)[0]
                        : `${selectedStates.size} States Selected`
                      }
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform ${stateDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Panel */}
                {stateDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Select States {selectedStates.size > 0 && `(${selectedStates.size})`}
                      </span>
                      {selectedStates.size > 0 && (
                        <button
                          onClick={clearStateFilters}
                          className="text-xs text-primary hover:text-primary/80 font-semibold flex items-center gap-1 transition-colors"
                        >
                          <X className="w-3 h-3" />
                          Clear all
                        </button>
                      )}
                    </div>
                    
                    {/* Scrollable checkbox grid */}
                    <div className="max-h-64 overflow-y-auto p-2">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                        {states.map(state => (
                          <button
                            key={state}
                            onClick={() => toggleState(state)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                              selectedStates.has(state)
                                ? 'bg-primary text-white shadow-md'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {selectedStates.has(state) ? (
                              <CheckSquare className="w-4 h-4 flex-shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 flex-shrink-0" />
                            )}
                            <span>{state}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Row: View Mode and Bedroom Filter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* View Mode */}
                <div className="flex gap-1 sm:gap-2">
                  <button
                    onClick={() => setViewMode('all')}
                    className={`flex-1 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold transition-all text-xs sm:text-sm ${
                      viewMode === 'all'
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setViewMode('top')}
                    className={`flex-1 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1 text-xs sm:text-sm ${
                      viewMode === 'top'
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Top 50</span>
                    <span className="sm:hidden">Top</span>
                  </button>
                  <button
                    onClick={() => setViewMode('bottom')}
                    className={`flex-1 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1 text-xs sm:text-sm ${
                      viewMode === 'bottom'
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Bottom 50</span>
                    <span className="sm:hidden">Low</span>
                  </button>
                </div>

                {/* Bedroom Filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 pointer-events-none" />
                  <select
                    value={bedroomFilter}
                    onChange={(e) => setBedroomFilter(Number(e.target.value) as 1 | 2 | 3 | 4)}
                    className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer text-xs sm:text-sm"
                  >
                    <option value={1}>1 Bedroom Range</option>
                    <option value={2}>2 Bedroom Range</option>
                    <option value={3}>3 Bedroom Range</option>
                    <option value={4}>4 Bedroom Range</option>
                  </select>
                </div>
              </div>

              {/* Results count and pagination controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredAndSorted.length}</span> of <span className="font-semibold text-gray-900 dark:text-white">{metroAreas.length}</span> metro areas
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    FMR Range: {bedroomFilter}BR
                  </div>
                </div>
                
                {/* Items per page selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Show:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                  </select>
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">per page</span>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center hover:text-primary"
                      >
                        <span className="hidden sm:inline">Metro Area</span>
                        <span className="sm:hidden">Metro</span>
                        <SortIcon field="name" />
                      </button>
                    </th>
                    <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('state')}
                        className="flex items-center hover:text-primary"
                      >
                        State
                        <SortIcon field="state" />
                      </button>
                    </th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('zipCount')}
                        className="flex items-center hover:text-primary"
                      >
                        ZIP Codes
                        <SortIcon field="zipCount" />
                      </button>
                    </th>
                    <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('avg1br')}
                        className="flex items-center hover:text-primary"
                      >
                        Avg 1BR
                        <SortIcon field="avg1br" />
                      </button>
                    </th>
                    <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('avg2br')}
                        className="flex items-center hover:text-primary"
                      >
                        Avg 2BR
                        <SortIcon field="avg2br" />
                      </button>
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('avg3br')}
                        className="flex items-center hover:text-primary"
                      >
                        <span className="hidden sm:inline">Avg 3BR</span>
                        <span className="sm:hidden">3BR</span>
                        <SortIcon field="avg3br" />
                      </button>
                    </th>
                    <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('avg4br')}
                        className="flex items-center hover:text-primary"
                      >
                        Avg 4BR
                        <SortIcon field="avg4br" />
                      </button>
                    </th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Range
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedResults.map((metro) => (
                    <React.Fragment key={metro.metroAreaName}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                          <div className="max-w-[120px] sm:max-w-xs truncate" title={metro.metroAreaName}>
                            {metro.metroAreaName}
                          </div>
                          <div className="sm:hidden text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {metro.state} • {metro.zipCount} ZIPs
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {metro.state}
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {metro.zipCount}
                        </td>
                        <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-semibold">
                          {formatCurrency(metro.avg1br)}
                        </td>
                        <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-semibold">
                          {formatCurrency(metro.avg2br)}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-semibold">
                          {formatCurrency(metro.avg3br)}
                        </td>
                        <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-semibold">
                          {formatCurrency(metro.avg4br)}
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {bedroomFilter === 1 && formatRange(metro.min1br, metro.max1br)}
                          {bedroomFilter === 2 && formatRange(metro.min2br, metro.max2br)}
                          {bedroomFilter === 3 && formatRange(metro.min3br, metro.max3br)}
                          {bedroomFilter === 4 && formatRange(metro.min4br, metro.max4br)}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => openZipModal(metro)}
                            className="text-primary hover:text-primary/80 font-semibold flex items-center gap-1 transition-colors text-xs sm:text-sm"
                          >
                            <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">View ZIPs</span>
                            <span className="sm:hidden">View</span>
                          </button>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Page info */}
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Page <span className="font-semibold text-gray-900 dark:text-white">{currentPage}</span> of <span className="font-semibold text-gray-900 dark:text-white">{totalPages}</span>
                  </div>

                  {/* Pagination buttons */}
                  <div className="flex items-center gap-2">
                    {/* Previous button */}
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                      {/* First page */}
                      {currentPage > 3 && (
                        <>
                          <button
                            onClick={() => goToPage(1)}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
                          >
                            1
                          </button>
                          {currentPage > 4 && <span className="text-gray-400">...</span>}
                        </>
                      )}

                      {/* Current page range */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => page >= currentPage - 2 && page <= currentPage + 2)
                        .map(page => (
                          <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={`px-3 py-1.5 rounded-lg border transition-colors text-sm ${
                              page === currentPage
                                ? 'bg-primary text-white border-primary'
                                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {page}
                          </button>
                        ))}

                      {/* Last page */}
                      {currentPage < totalPages - 2 && (
                        <>
                          {currentPage < totalPages - 3 && <span className="text-gray-400">...</span>}
                          <button
                            onClick={() => goToPage(totalPages)}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
                          >
                            {totalPages}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Next button */}
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Jump to page */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Go to:</span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={currentPage}
                      onChange={(e) => {
                        const page = parseInt(e.target.value);
                        if (page >= 1 && page <= totalPages) {
                          goToPage(page);
                        }
                      }}
                      className="w-16 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-center focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ZIP Codes Modal */}
        {zipModalOpen && selectedMetroForModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  {selectedZipCode && (
                    <button
                      onClick={backToMetroView}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Back to metro area"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedZipCode ? `ZIP ${selectedZipCode}` : selectedMetroForModal.metroAreaName}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedZipCode 
                        ? selectedMetroForModal.metroAreaName
                        : `${selectedMetroForModal.zipCount} ZIP Codes • ${selectedMetroForModal.state}`
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeZipModal}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedZipCode ? (
                  <ZipAnalysisView zipCode={selectedZipCode} />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedMetroForModal.zipDetails.map((zip) => {
                      // Calculate MOA based on THIS ZIP's 3BR FMR, not the metro average
                      const zipMoa = Math.round(zip.safmr3br / (moaSettings.targetRule / 100));
                      
                      return (
                        <div
                          key={zip.zipCode}
                          className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary transition-all hover:shadow-md"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-xl font-bold text-primary">{zip.zipCode}</div>
                            <button
                              onClick={() => openZipAnalysis(zip.zipCode)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                            >
                              <Search className="w-4 h-4" />
                              Search
                            </button>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">1BR:</span>
                              <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(zip.safmr1br)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">2BR:</span>
                              <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(zip.safmr2br)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">3BR:</span>
                              <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(zip.safmr3br)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">4BR:</span>
                              <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(zip.safmr4br)}</span>
                            </div>
                            
                            <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-700 dark:text-gray-300 font-medium">MOA (2%):</span>
                                <span className="text-lg font-bold text-primary">{formatCurrency(zipMoa)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              {!selectedZipCode && (
                <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    💡 MOA calculated using 2% rule on each ZIP's 3BR FMR
                  </div>
                  <button
                    onClick={closeZipModal}
                    className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </DashboardLayout>
    </>
  );
}

