import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ZipCodeLocation } from '../types';

interface ZipCodeMapProps {
  location: ZipCodeLocation | null;
  loading?: boolean;
}

// Custom component to handle map recenter
function RecenterMap({ location }: { location: ZipCodeLocation }) {
  const map = useMap();
  
  useEffect(() => {
    if (location) {
      map.setView([location.latitude, location.longitude], 12);
    }
  }, [location, map]);

  return null;
}

export function ZipCodeMap({ location, loading }: ZipCodeMapProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 h-96">
        <div className="animate-pulse h-full bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 h-96 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          Map unavailable
        </p>
      </div>
    );
  }

  // Create custom icon
  const customIcon = new Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Location Map
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {location.city && `${location.city}, `}{location.county}
        </p>
      </div>
      
      <div className="h-96">
        <MapContainer
          center={[location.latitude, location.longitude]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[location.latitude, location.longitude]} icon={customIcon}>
            <Popup>
              <div className="p-2">
                <div className="font-bold">ZIP {location.zip}</div>
                <div className="text-sm">{location.county}</div>
                <div className="text-sm">{location.state}</div>
              </div>
            </Popup>
          </Marker>
          <RecenterMap location={location} />
        </MapContainer>
      </div>
    </div>
  );
}

