import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import type { GeoJsonObject, Feature } from 'geojson';
import { Layers, X, ExternalLink } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useTexasZipData } from '../hooks/useTexasZipData';
import { formatCurrency } from '../utils/apiHelpers';
import 'leaflet/dist/leaflet.css';

// Component to track visible ZIPs in viewport
function ViewportTracker({ onViewportChange }: { onViewportChange: (zips: string[]) => void }) {
  const map = useMap();
  
  useEffect(() => {
    const updateVisibleZips = () => {
      onViewportChange([]);
    };

    map.on('moveend', updateVisibleZips);
    map.on('zoomend', updateVisibleZips);
    
    updateVisibleZips();

    return () => {
      map.off('moveend', updateVisibleZips);
      map.off('zoomend', updateVisibleZips);
    };
  }, [map, onViewportChange]);

  return null;
}

const HeatMapPageComponent = memo(function HeatMapPage() {
  const navigate = useNavigate();
  const [geoJsonData, setGeoJsonData] = useState<GeoJsonObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [colorMetric, setColorMetric] = useState<'fmr_3' | 'fmr_2' | 'fmr_4'>('fmr_3');
  const [visibleZips, setVisibleZips] = useState<string[]>([]);
  const [allZipCodes, setAllZipCodes] = useState<string[]>([]);
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  
  const { zipDataMap, getZipData } = useTexasZipData(visibleZips);

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
          // Load first batch of ZIP codes
          setVisibleZips(zipCodes.slice(0, 200));
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
    const fmrValue = zipData ? zipData[colorMetric] : 0;
    const color = getColorForFMR(fmrValue);

    const isSelected = selectedZip === zipCode;

    return {
      fillColor: color,
      weight: isSelected ? 2 : 0.5,
      opacity: 1,
      color: isSelected ? '#2563eb' : 'white',
      fillOpacity: isSelected ? 0.8 : 0.6,
    };
  }, [colorMetric, getZipData, getColorForFMR, selectedZip]);

  // Handle feature click
  const onEachFeature = useCallback((feature: Feature, layer: L.Layer) => {
    const zipCode = feature.properties?.ZCTA5CE10 || feature.properties?.ZCTA || feature.properties?.ZIP;
    if (!zipCode) return;

    const zipData = getZipData(zipCode);
    
    // Bind tooltip for hover
    layer.bindTooltip(`
      <div style="padding: 4px;">
        <strong style="font-size: 13px;">ZIP: ${zipCode}</strong>
        ${zipData && !zipData.loading ? `<div style="margin-top: 2px; font-size: 11px;"><strong>3BR: ${formatCurrency(zipData.fmr_3)}</strong></div>` : ''}
      </div>
    `, {
      sticky: true,
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
        target.setStyle({
          weight: selectedZip === zipCode ? 2 : 0.5,
          opacity: 1,
          fillOpacity: selectedZip === zipCode ? 0.8 : 0.6,
        });
      },
      click: () => {
        setSelectedZip(zipCode);
        setShowPopup(true);
      },
    });
  }, [zipDataMap, getZipData, selectedZip]);

  const handleViewportChange = useCallback((_zips: string[]) => {
    // Progressive loading - load more ZIPs as needed
    setVisibleZips(prev => {
      const currentCount = prev.length;
      if (currentCount < allZipCodes.length) {
        return allZipCodes.slice(0, Math.min(currentCount + 200, allZipCodes.length));
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
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white dark:bg-gray-800 rounded-lg shadow-lg px-4 py-2">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold">{visibleZips.length}</span> of <span className="font-semibold">{allZipCodes.length}</span> ZIPs loaded
          </div>
        </div>

        {/* Map Controls */}
        <div className="absolute top-20 right-4 z-[1000] bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-5 h-5 text-primary" />
            <span className="font-semibold text-gray-900 dark:text-white">View By</span>
          </div>
          <select
            value={colorMetric}
            onChange={(e) => setColorMetric(e.target.value as typeof colorMetric)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-gray-700 dark:text-white text-sm"
          >
            <option value="fmr_2">2 Bedroom FMR</option>
            <option value="fmr_3">3 Bedroom FMR (Default)</option>
            <option value="fmr_4">4 Bedroom FMR</option>
          </select>

          {/* Legend */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">FMR Range</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
                <span className="text-gray-600 dark:text-gray-400">$2,000+</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#84cc16' }}></div>
                <span className="text-gray-600 dark:text-gray-400">$1,500-$2,000</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fbbf24' }}></div>
                <span className="text-gray-600 dark:text-gray-400">$1,000-$1,500</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fb923c' }}></div>
                <span className="text-gray-600 dark:text-gray-400">$750-$1,000</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                <span className="text-gray-600 dark:text-gray-400">Under $750</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#9ca3af' }}></div>
                <span className="text-gray-600 dark:text-gray-400">No data</span>
              </div>
            </div>
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
            key={`geojson-${colorMetric}`}
            data={geoJsonData}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />

          <ViewportTracker onViewportChange={handleViewportChange} />
        </MapContainer>

        {/* Popup Modal */}
        {showPopup && selectedZip && selectedZipData && (
          <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4" onClick={() => setShowPopup(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  ZIP {selectedZip}
                </h2>
                <button
                  onClick={() => setShowPopup(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* FMR Data */}
              <div className="space-y-3 mb-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Studio (0BR)</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(selectedZipData.fmr_0)}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">1 Bedroom</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(selectedZipData.fmr_1)}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">2 Bedrooms</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(selectedZipData.fmr_2)}
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-3">
                  <div className="text-sm text-blue-600 dark:text-blue-400">3 Bedrooms</div>
                  <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                    {formatCurrency(selectedZipData.fmr_3)}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">4 Bedrooms</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(selectedZipData.fmr_4)}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
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
                *Estimated FMR values based on location
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
});

export default HeatMapPageComponent;
export { HeatMapPageComponent as HeatMapPage };

