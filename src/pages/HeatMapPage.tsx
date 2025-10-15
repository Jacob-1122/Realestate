import { useState, useEffect, useCallback, memo, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import type { GeoJsonObject, Feature } from 'geojson';
import { Layers, X, ExternalLink, Home, Target, TrendingUp, DollarSign, ChevronDown, Star } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useTexasZipData } from '../hooks/useTexasZipData';
import { useCensusData } from '../hooks/useCensusData';
import { formatCurrency } from '../utils/apiHelpers';
import { estimateMedianHomePrice, getScoreColor } from '../utils/scoreCalculator';
import 'leaflet/dist/leaflet.css';

// Custom tooltip styles
const tooltipStyles = `
  .custom-tooltip {
    background: rgba(255, 255, 255, 0.95) !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 6px !important;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
    font-size: 12px !important;
    font-weight: 500 !important;
    color: #374151 !important;
    padding: 6px 8px !important;
    max-width: 150px !important;
    white-space: nowrap !important;
    pointer-events: none !important;
  }
  
  .custom-tooltip::before {
    border-top-color: rgba(255, 255, 255, 0.95) !important;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = tooltipStyles;
  document.head.appendChild(styleSheet);
}

// Debounce function to prevent excessive updates
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

// Calculate basic investment metrics from FMR data
function calculateBasicMetrics(fmr3br: number, actualHomePrice?: number) {
  const estimatedHomePrice = actualHomePrice || estimateMedianHomePrice(fmr3br);
  const maxPriceFor2Percent = Math.round(fmr3br / 0.02);
  const requiredRentFor2Percent = Math.round(estimatedHomePrice * 0.02);
  const rentToPriceRatio = estimatedHomePrice > 0 ? ((fmr3br * 12) / estimatedHomePrice) * 100 : 0;
  
  // Simple score based on rent-to-price ratio
  let score = 50; // default
  const monthlyRatio = fmr3br / estimatedHomePrice;
  if (monthlyRatio >= 0.02) score = 95;
  else if (monthlyRatio >= 0.015) score = 80;
  else if (monthlyRatio >= 0.01) score = 60;
  else if (monthlyRatio >= 0.008) score = 45;
  else score = 30;
  
  let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'C';
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  else grade = 'F';
  
  let recommendation: 'Excellent' | 'Good' | 'Fair' | 'Avoid' = 'Fair';
  if (score >= 80) recommendation = 'Excellent';
  else if (score >= 60) recommendation = 'Good';
  else if (score >= 40) recommendation = 'Fair';
  else recommendation = 'Avoid';
  
  return {
    maxPriceFor2Percent,
    requiredRentFor2Percent,
    actualHomePrice: actualHomePrice || null,
    estimatedHomePrice,
    rentToPriceRatio: Math.round(rentToPriceRatio * 100) / 100,
    score: Math.round(score),
    grade,
    recommendation
  };
}

// Component to track visible ZIPs in viewport
function ViewportTracker({ onViewportChange }: { onViewportChange: (zips: string[]) => void }) {
  const map = useMap();
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    // Debounced update function to prevent excessive calls
    const debouncedUpdate = debounce(() => {
      onViewportChange([]);
    }, 300); // Wait 300ms after user stops moving

    const handleMapMove = () => {
      debouncedUpdate();
    };

    map.on('moveend', handleMapMove);
    map.on('zoomend', handleMapMove);
    
    // Initial call
    handleMapMove();

    return () => {
      map.off('moveend', handleMapMove);
      map.off('zoomend', handleMapMove);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [map, onViewportChange]);

  return null;
}

const HeatMapPageComponent = memo(function HeatMapPage() {
  const navigate = useNavigate();
  const [geoJsonData, setGeoJsonData] = useState<GeoJsonObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [colorMetric, setColorMetric] = useState<'investment_score' | 'fmr_3' | 'fmr_2' | 'fmr_4'>('investment_score');
  const [visibleZips, setVisibleZips] = useState<string[]>([]);
  const [allZipCodes, setAllZipCodes] = useState<string[]>([]);
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  
  const { zipDataMap, getZipData, censusLoading, censusProgress } = useTexasZipData(visibleZips);
  
  // Fetch Census data for selected ZIP (for real-time single ZIP lookups)
  const { data: censusData, loading: singleZipCensusLoading } = useCensusData(selectedZip);

  // Load Texas GeoJSON data
  useEffect(() => {
    const loadGeoJson = async () => {
      try {
        setLoading(true);
        const response = await fetch('/data/tx_texas_zip_codes_geo.min.json');
        if (!response.ok) {
          throw new Error('Failed to load Texas ZIP data');
        }
        const data = await response.json();
        setGeoJsonData(data);
        
        // Extract all ZIP codes from GeoJSON
        if (data.features && Array.isArray(data.features)) {
          const zipCodes: string[] = [];
          data.features.forEach((feature: any) => {
            const zipCode = feature.properties?.ZCTA5CE10 || 
                          feature.properties?.ZCTA || 
                          feature.properties?.ZIP ||
                          feature.properties?.GEOID10;
            if (zipCode) {
              zipCodes.push(zipCode);
            }
          });
          console.log(`📍 Loaded ${zipCodes.length} Texas ZIP codes`);
          setAllZipCodes(zipCodes);
          // Load smaller initial batch to prevent freezing
          setVisibleZips(zipCodes.slice(0, 50));
        }
        
        setError(null);
      } catch (err) {
        console.error('Error loading GeoJSON:', err);
        setError('Failed to load map data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    loadGeoJson();
  }, []);

  // Get color for investment score
  const getColorForScore = useCallback((score: number | undefined): string => {
    if (score === undefined) return '#9ca3af'; // Gray for no data
    if (score >= 90) return '#10b981'; // A (Green)
    if (score >= 80) return '#84cc16'; // B (Lime)
    if (score >= 70) return '#fbbf24'; // C (Yellow)
    if (score >= 60) return '#fb923c'; // D (Orange)
    return '#ef4444'; // F (Red)
  }, []);

  // Get color for a ZIP based on FMR value
  const getColorForFMR = useCallback((fmrValue: number): string => {
    if (fmrValue === 0) return '#9ca3af'; // Gray for no data
    if (fmrValue >= 2000) return '#10b981'; // High (Green)
    if (fmrValue >= 1500) return '#84cc16'; // Medium-High (Lime)
    if (fmrValue >= 1000) return '#fbbf24'; // Medium (Yellow)
    if (fmrValue >= 750) return '#fb923c';  // Medium-Low (Orange)
    return '#ef4444'; // Low (Red)
  }, []);

  // Style function for GeoJSON features - memoized to prevent re-renders
  const styleFeature = useCallback((feature: Feature | undefined) => {
    if (!feature) return { fillColor: '#9ca3af', weight: 0.5, opacity: 0.5, color: 'white', fillOpacity: 0.4 };
    
    const zipCode = feature.properties?.ZCTA5CE10 || feature.properties?.ZCTA || feature.properties?.ZIP || feature.properties?.GEOID10;
    if (!zipCode) return { fillColor: '#9ca3af', weight: 0.5, opacity: 0.5, color: 'white', fillOpacity: 0.4 };

    const zipData = getZipData(zipCode);
    
    let color: string;
    if (colorMetric === 'investment_score') {
      // Color by investment score
      color = getColorForScore(zipData?.investmentScore);
    } else {
      // Color by FMR value
    const fmrValue = zipData ? zipData[colorMetric] : 0;
      color = getColorForFMR(fmrValue);
    }

    const isSelected = selectedZip === zipCode;

    return {
      fillColor: color,
      weight: isSelected ? 2 : 0.5,
      opacity: 1,
      color: isSelected ? '#2563eb' : 'white',
      fillOpacity: isSelected ? 0.8 : 0.6,
    };
  }, [colorMetric, getZipData, getColorForFMR, getColorForScore, selectedZip]);

  // Handle feature click - optimized with less frequent updates
  const onEachFeature = useCallback((feature: Feature, layer: L.Layer) => {
    const zipCode = feature.properties?.ZCTA5CE10 || feature.properties?.ZCTA || feature.properties?.ZIP;
    if (!zipCode) return;

    // Lazy load tooltip content
    layer.bindTooltip(() => {
    const zipData = getZipData(zipCode);
      return `
      <div style="padding: 4px;">
        <strong style="font-size: 13px;">ZIP: ${zipCode}</strong>
        ${zipData && !zipData.loading ? `<div style="margin-top: 2px; font-size: 11px;"><strong>3BR: ${formatCurrency(zipData.fmr_3)}</strong></div>` : ''}
      </div>
      `;
    }, {
      sticky: false,
      direction: 'top',
      offset: [0, -10],
      opacity: 0.9,
      className: 'custom-tooltip',
    });

    // Add hover effect
    layer.on({
      mouseover: (e) => {
        const target = e.target;
        target.setStyle({
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        });
      },
      mouseout: (e) => {
        const target = e.target;
        const isSelected = selectedZip === zipCode;
        target.setStyle({
          weight: isSelected ? 2 : 0.5,
          opacity: 1,
          fillOpacity: isSelected ? 0.8 : 0.6,
        });
      },
      click: () => {
        setSelectedZip(zipCode);
        setShowPopup(true);
      },
    });
  }, [getZipData, selectedZip]);

  const handleViewportChange = useCallback((_zips: string[]) => {
    // Progressive loading - load more ZIPs as needed, but more gradually
    setVisibleZips(prev => {
      const currentCount = prev.length;
      if (currentCount < allZipCodes.length) {
        // Load in smaller chunks to prevent freezing
        const increment = Math.min(100, allZipCodes.length - currentCount);
        return allZipCodes.slice(0, currentCount + increment);
      }
      return prev;
    });
  }, [allZipCodes]);

  const selectedZipData = selectedZip ? getZipData(selectedZip) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-gray-700 dark:text-gray-300">Loading Texas ZIP code data...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (error || !geoJsonData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-red-500 text-center mb-4">
            <h2 className="text-xl font-bold mb-2">Failed to Load Map</h2>
            <p className="text-gray-600 dark:text-gray-400">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="relative h-[calc(100vh-64px)] w-full">
        {/* Loading Info Bar */}
        <div className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white dark:bg-gray-800 rounded-lg shadow-lg px-3 sm:px-4 py-2 max-w-[calc(100vw-2rem)] sm:max-w-none">
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
              <span>
            <span className="font-semibold">{visibleZips.length}</span> of <span className="font-semibold">{allZipCodes.length}</span> ZIPs loaded
              </span>
              {censusLoading && (
                <>
                  <span className="hidden sm:inline text-gray-400">|</span>
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                    Census: <span className="font-semibold">{censusProgress.loaded}</span>/<span className="font-semibold">{censusProgress.total}</span>
                  </span>
                </>
              )}
              {!censusLoading && censusProgress.loaded > 0 && (
                <>
                  <span className="hidden sm:inline text-gray-400">|</span>
                  <span className="text-green-600 font-semibold">
                    ✓ {censusProgress.loaded} with scores
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Map Controls */}
        <div className="absolute top-16 sm:top-20 right-2 sm:right-4 z-[1000] bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 sm:p-4 space-y-2 sm:space-y-3 max-w-[calc(100vw-4rem)] sm:max-w-none">
          <div className="flex items-center gap-2 mb-1 sm:mb-2">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <span className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">View By</span>
          </div>
          
          {/* Custom Dropdown */}
          <div className="relative">
            <select
              value={colorMetric}
              onChange={(e) => setColorMetric(e.target.value as typeof colorMetric)}
              className="w-full px-3 sm:px-4 py-2.5 pr-8 sm:pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-gray-700 dark:text-white text-xs sm:text-sm appearance-none cursor-pointer bg-white dark:bg-gray-700 hover:border-primary transition-colors"
            >
              <option value="investment_score">⭐ Investment Rating (Recommended)</option>
              <option value="fmr_2">2 Bedroom FMR</option>
              <option value="fmr_3">3 Bedroom FMR</option>
              <option value="fmr_4">4 Bedroom FMR</option>
            </select>
            
            {/* Custom Dropdown Arrow */}
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-3 pointer-events-none">
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Legend */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2 sm:pt-3 mt-2 sm:mt-3">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
              {colorMetric === 'investment_score' ? 'Investment Rating' : 'FMR Range'}
            </div>
            {colorMetric === 'investment_score' ? (
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
                  <span className="text-gray-600 dark:text-gray-400">Grade A (90-100)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded" style={{ backgroundColor: '#84cc16' }}></div>
                  <span className="text-gray-600 dark:text-gray-400">Grade B (80-89)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded" style={{ backgroundColor: '#fbbf24' }}></div>
                  <span className="text-gray-600 dark:text-gray-400">Grade C (70-79)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded" style={{ backgroundColor: '#fb923c' }}></div>
                  <span className="text-gray-600 dark:text-gray-400">Grade D (60-69)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                  <span className="text-gray-600 dark:text-gray-400">Grade F (&lt;60)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded" style={{ backgroundColor: '#9ca3af' }}></div>
                  <span className="text-gray-600 dark:text-gray-400">No score</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
                <span className="text-gray-600 dark:text-gray-400">$2,000+</span>
              </div>
              <div className="flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded" style={{ backgroundColor: '#84cc16' }}></div>
                <span className="text-gray-600 dark:text-gray-400">$1,500-$2,000</span>
              </div>
              <div className="flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded" style={{ backgroundColor: '#fbbf24' }}></div>
                <span className="text-gray-600 dark:text-gray-400">$1,000-$1,500</span>
              </div>
              <div className="flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded" style={{ backgroundColor: '#fb923c' }}></div>
                <span className="text-gray-600 dark:text-gray-400">$750-$1,000</span>
              </div>
              <div className="flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                <span className="text-gray-600 dark:text-gray-400">Under $750</span>
              </div>
              <div className="flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded" style={{ backgroundColor: '#9ca3af' }}></div>
                <span className="text-gray-600 dark:text-gray-400">No data</span>
              </div>
            </div>
            )}
          </div>
        </div>

        {/* Map */}
        <MapContainer
          center={[31.0, -99.0]}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <GeoJSON
            key={`geojson-${colorMetric}-${zipDataMap.size}`}
            data={geoJsonData}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />

          <ViewportTracker onViewportChange={handleViewportChange} />
        </MapContainer>

        {/* Popup Modal */}
        {showPopup && selectedZip && selectedZipData && (() => {
          // Use actual Census data (prioritize batch data, fallback to single ZIP lookup)
          const actualHomePrice = selectedZipData.medianHomeValue || censusData?.medianHomeValue;
          const metrics = calculateBasicMetrics(selectedZipData.fmr_3, actualHomePrice);
          const scoreColor = getScoreColor(metrics.score);
          
          return (
            <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-2 sm:p-4" onClick={() => setShowPopup(false)}>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  ZIP {selectedZip}
                </h2>
                    {selectedZipData.metroAreaName && (
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {selectedZipData.metroAreaName}
                      </p>
                    )}
                  </div>
                <button
                  onClick={() => setShowPopup(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

                <div className="p-4 sm:p-6">
                  {/* Key Investment Metrics */}
                  <div className="mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
                      Key Investment Metrics
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      {/* Max Price for 2% Rule */}
                      <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-1 sm:gap-2 mb-1">
                          <Home className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Max Price (2% Rule)
                          </div>
                        </div>
                        <div className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white">
                          {formatCurrency(metrics.maxPriceFor2Percent)}
                        </div>
                      </div>

                      {/* Required Rent */}
                      <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-1 sm:gap-2 mb-1">
                          <Target className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Required Rent (2%)
                          </div>
                        </div>
                        <div className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white">
                          {formatCurrency(metrics.requiredRentFor2Percent)}/mo
                        </div>
                      </div>

                      {/* Avg Home Cost */}
                      <div className="p-2 sm:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-1 sm:gap-2 mb-1">
                          <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Median Home Value
                          </div>
                        </div>
                        {singleZipCensusLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-purple-600"></div>
                            <span className="text-xs sm:text-sm text-gray-500">Loading...</span>
                          </div>
                        ) : (
                          <>
                            <div className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white">
                              {formatCurrency(metrics.actualHomePrice || metrics.estimatedHomePrice)}
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                              {metrics.actualHomePrice ? 'US Census 2022' : 'Estimated'}
                            </div>
                          </>
                        )}
                      </div>

                      {/* 3BR FMR */}
                      <div className="p-2 sm:p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-center gap-1 sm:gap-2 mb-1">
                          <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            3 Bedroom FMR
                  </div>
                </div>
                        <div className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white">
                          {formatCurrency(selectedZipData.fmr_3)}/mo
                        </div>
                  </div>
                </div>
                  </div>

                  {/* Investment Rating */}
                  <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 text-center">
                      Investment Rating
                    </h3>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                      {/* Score Circle */}
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="8"
                            className="text-gray-200 dark:text-gray-700"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke={scoreColor}
                            strokeWidth="8"
                            strokeDasharray={`${(metrics.score / 100) * 251.2} 251.2`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="text-xl sm:text-2xl font-bold" style={{ color: scoreColor }}>
                            {metrics.score}
                          </div>
                          <div className="text-xs font-bold text-gray-600 dark:text-gray-400">
                            {metrics.grade}
                          </div>
                        </div>
                      </div>

                      {/* Recommendation */}
                      <div className="flex-1 w-full sm:w-auto">
                        <div
                          className="px-4 py-2 rounded-lg text-white font-bold text-center"
                          style={{ backgroundColor: scoreColor }}
                        >
                          {metrics.recommendation}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                          Based on FMR-to-price ratio ({metrics.rentToPriceRatio.toFixed(2)}%)
                          {metrics.actualHomePrice && <><br />Using actual Census data</>}
                        </p>
                  </div>
                </div>
                  </div>

                  {/* FMR Data */}
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      All FMR Rates
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Studio (0BR)</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(selectedZipData.fmr_0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="text-sm text-gray-600 dark:text-gray-400">1 Bedroom</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(selectedZipData.fmr_1)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="text-sm text-gray-600 dark:text-gray-400">2 Bedrooms</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(selectedZipData.fmr_2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded">
                        <span className="text-sm text-blue-600 dark:text-blue-400 font-semibold">3 Bedrooms</span>
                        <span className="font-bold text-blue-700 dark:text-blue-300">
                          {formatCurrency(selectedZipData.fmr_3)}
                        </span>
                </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="text-sm text-gray-600 dark:text-gray-400">4 Bedrooms</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(selectedZipData.fmr_4)}
                        </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => setShowPopup(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-semibold"
                >
                  Close
                </button>
                <button
                  onClick={() => navigate(`/search?zip=${selectedZip}`)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  <ExternalLink className="w-4 h-4" />
                  Full Analysis
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                    *FMR values from HUD FY2026 SAFMR data
              </p>
            </div>
          </div>
            </div>
          );
        })()}
      </div>
    </>
  );
});

export default HeatMapPageComponent;
export { HeatMapPageComponent as HeatMapPage };

