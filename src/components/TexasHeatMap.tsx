import { useState, useEffect, useCallback, memo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import type { GeoJsonObject, Feature } from 'geojson';
import { Map as LeafletIcon, Layers } from 'lucide-react';
import { useTexasZipData } from '../hooks/useTexasZipData';
import { formatCurrency } from '../utils/apiHelpers';
import 'leaflet/dist/leaflet.css';

interface TexasHeatMapProps {
  onZipClick: (zipCode: string) => void;
}

// Component to track visible ZIPs in viewport
function ViewportTracker({ onViewportChange }: { onViewportChange: (zips: string[]) => void }) {
  const map = useMap();
  
  useEffect(() => {
    const updateVisibleZips = () => {
      // In production, you'd extract ZIPs from visible features
      // For now, we'll trigger on map movement
      onViewportChange([]);
    };

    map.on('moveend', updateVisibleZips);
    map.on('zoomend', updateVisibleZips);
    
    updateVisibleZips(); // Initial call

    return () => {
      map.off('moveend', updateVisibleZips);
      map.off('zoomend', updateVisibleZips);
    };
  }, [map, onViewportChange]);

  return null;
}

const TexasHeatMap = memo(function TexasHeatMap({ onZipClick }: TexasHeatMapProps) {
  const [geoJsonData, setGeoJsonData] = useState<GeoJsonObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [colorMetric, setColorMetric] = useState<'fmr_3' | 'fmr_2' | 'fmr_4'>('fmr_3');
  const [visibleZips, setVisibleZips] = useState<string[]>([]);
  
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
          // Load first batch of ZIP codes
          setVisibleZips(zipCodes.slice(0, 100));
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

  // Style function for GeoJSON features
  const styleFeature = useCallback((feature: Feature | undefined) => {
    if (!feature) return {};
    
    const zipCode = feature.properties?.ZCTA5CE10 || feature.properties?.ZCTA || feature.properties?.ZIP;
    if (!zipCode) return { fillColor: '#9ca3af', weight: 0.5, opacity: 0.5, color: 'white', fillOpacity: 0.4 };

    const zipData = getZipData(zipCode);
    const fmrValue = zipData ? zipData[colorMetric] : 0;
    const color = getColorForFMR(fmrValue);

    return {
      fillColor: color,
      weight: 0.5,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.6,
    };
  }, [colorMetric, zipDataMap, getColorForFMR, getZipData]);

  // Handle each feature (add tooltips and click handlers)
  const onEachFeature = useCallback((feature: Feature, layer: L.Layer) => {
    const zipCode = feature.properties?.ZCTA5CE10 || feature.properties?.ZCTA || feature.properties?.ZIP;
    if (!zipCode) return;

    const zipData = getZipData(zipCode);
    
    // Bind tooltip
    layer.bindTooltip(`
      <div style="padding: 8px;">
        <strong style="font-size: 14px;">ZIP: ${zipCode}</strong><br/>
        ${zipData && !zipData.loading ? `
          <div style="margin-top: 4px; font-size: 12px;">
            <div>Studio: ${formatCurrency(zipData.fmr_0)}</div>
            <div>1BR: ${formatCurrency(zipData.fmr_1)}</div>
            <div>2BR: ${formatCurrency(zipData.fmr_2)}</div>
            <div><strong>3BR: ${formatCurrency(zipData.fmr_3)}</strong></div>
            <div>4BR: ${formatCurrency(zipData.fmr_4)}</div>
          </div>
        ` : '<div style="margin-top: 4px; font-size: 12px;">Loading...</div>'}
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
          weight: 0.5,
          opacity: 1,
          fillOpacity: 0.6,
        });
      },
      click: () => {
        onZipClick(zipCode);
      },
    });
  }, [zipDataMap, getZipData, onZipClick]);

  const handleViewportChange = useCallback((zips: string[]) => {
    setVisibleZips(zips);
  }, []);

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
            <LeafletIcon className="w-16 h-16 mx-auto mb-4" />
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
    <div className="relative h-screen w-full">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 space-y-3">
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

        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
          Click any ZIP to view full analysis
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={[31.0, -99.0]} // Center of Texas
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <GeoJSON
          data={geoJsonData}
          style={styleFeature}
          onEachFeature={onEachFeature}
        />

        <ViewportTracker onViewportChange={handleViewportChange} />
      </MapContainer>

      {/* Info Banner */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white dark:bg-gray-800 rounded-lg shadow-lg px-4 py-2">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          <strong>Texas Section 8 Heat Map</strong> - Hover over ZIP codes to see FMR data
        </p>
      </div>
    </div>
  );
});

// Export both default and named for flexibility
export default TexasHeatMap;
export { TexasHeatMap };

