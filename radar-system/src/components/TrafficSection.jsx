import React, { useState } from 'react';
import { useJsApiLoader, GoogleMap, TrafficLayer } from '@react-google-maps/api';
import { Navigation, TrendingUp, AlertTriangle, ExternalLink } from 'lucide-react';
import { GOOGLE_MAPS_API_KEY, defaultCenter } from '../config/googleMaps';
import { openGoogleMapsDirections } from '../utils/locationTracking';

const TrafficSection = () => {
  const [center] = useState(defaultCenter);
  const [showTraffic, setShowTraffic] = useState(true);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const handleOpenInMaps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          openGoogleMapsDirections({
            origin: { lat: position.coords.latitude, lng: position.coords.longitude },
            destination: center,
          });
        },
        () => openGoogleMapsDirections({ origin: center, destination: center })
      );
      return;
    }
    openGoogleMapsDirections({ origin: center, destination: center });
  };

  return (
    <div className="h-full">
      <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-red-600" />
                Traffic Conditions
              </h3>
              <p className="text-xs text-gray-600 mt-1">Real-time traffic flow and congestion data</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setShowTraffic(!showTraffic)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  showTraffic
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {showTraffic ? 'Hide Traffic' : 'Show Traffic'}
              </button>
              <button
                onClick={handleOpenInMaps}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white flex items-center justify-center gap-2 hover:bg-blue-700"
              >
                <ExternalLink className="w-3 h-3" />
                Open in Google Maps
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 relative min-h-[50vh]">
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={center}
              zoom={13}
              options={{
                styles: [
                  {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }],
                  },
                ],
              }}
            >
              {showTraffic && <TrafficLayer />}
            </GoogleMap>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-100">
              <Navigation className="w-10 h-10 text-gray-400 animate-spin" />
            </div>
          )}

          {/* Traffic Legend Overlay */}
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs">
            <h4 className="text-xs font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Traffic Legend
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-6 h-1 bg-green-500" />
                <span className="text-gray-700">Free flow - Normal speed</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-1 bg-yellow-500" />
                <span className="text-gray-700">Moderate - Slower than usual</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-1 bg-red-500" />
                <span className="text-gray-700">Heavy - Significant delays</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-1 bg-red-700" />
                <span className="text-gray-700">Congested - Stop and go</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-1 bg-gray-900" />
                <span className="text-gray-700">Severe - Road closed/accident</span>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                <strong>Note:</strong> Traffic data updates in real-time. Use this to optimize ambulance routing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrafficSection;
