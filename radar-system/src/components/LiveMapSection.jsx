import React, { useState, useEffect } from 'react';
import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api';
import { Ambulance, Navigation, MapPin, AlertCircle, ExternalLink } from 'lucide-react';
import { GOOGLE_MAPS_API_KEY, defaultCenter } from '../config/googleMaps';
import { openGoogleMapsDirections } from '../utils/locationTracking';

const LiveMapSection = ({ ambulances, emergencyCalls }) => {
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [center, setCenter] = useState(defaultCenter);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  // Get active ambulances (dispatched or en route)
  const activeAmbulances = ambulances.filter(
    amb => amb.status === 'dispatched' || amb.status === 'transporting'
  );

  // Get pending emergency calls
  const pendingCalls = emergencyCalls.filter(call => call.status === 'pending');

  const getAmbulanceColor = (status) => {
    switch (status) {
      case 'available':
        return 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
      case 'dispatched':
        return 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
      case 'transporting':
        return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
      case 'busy':
        return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
      default:
        return 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
    }
  };

  return (
    <div className="h-full flex flex-col xl:flex-row gap-4">
      {/* Map */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Live Ambulance Tracking</h3>
          <p className="text-xs text-gray-600 mt-1">
            Real-time location of all ambulances in the system
          </p>
        </div>
        <div className="h-[55vh] min-h-[320px] xl:h-[calc(100vh-250px)]">
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={center}
              zoom={12}
            >
              {/* Show all ambulances */}
              {ambulances.map(ambulance => (
                ambulance.currentLocation && (
                  <Marker
                    key={ambulance.id}
                    position={ambulance.currentLocation}
                    icon={getAmbulanceColor(ambulance.status)}
                    onClick={() => setSelectedAmbulance(ambulance)}
                    title={`${ambulance.vehicleNumber} - ${ambulance.status}`}
                  />
                )
              ))}

              {/* Show pending emergency calls */}
              {pendingCalls.map(call => (
                call.location && (
                  <Marker
                    key={call.id}
                    position={call.location}
                    icon="http://maps.google.com/mapfiles/ms/icons/red-dot.png"
                    title="Pending Emergency Call"
                  />
                )
              ))}
            </GoogleMap>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-100">
              <Navigation className="w-10 h-10 text-gray-400 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Sidebar with ambulance list */}
      <div className="w-full xl:w-80 space-y-4">
        {/* Active Ambulances */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Ambulance className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold">Active Ambulances ({activeAmbulances.length})</h3>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {activeAmbulances.map(amb => (
              <div
                key={amb.id}
                className="p-2 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div 
                    onClick={() => {
                      setSelectedAmbulance(amb);
                      if (amb.currentLocation) {
                        setCenter(amb.currentLocation);
                      }
                    }}
                    className="cursor-pointer flex-1"
                  >
                    <p className="text-xs font-semibold text-gray-900">{amb.vehicleNumber}</p>
                    <p className="text-xs text-gray-600">{amb.provider}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-md text-xs font-medium ${
                    amb.status === 'dispatched' ? 'bg-blue-100 text-blue-700' :
                    amb.status === 'transporting' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {amb.status}
                  </div>
                </div>
                {amb.eta && (
                  <div className="flex items-center gap-1 mb-2">
                    <AlertCircle className="w-3 h-3 text-red-600 animate-pulse" />
                    <span className="text-xs text-red-600 font-medium">ETA: {amb.eta}</span>
                  </div>
                )}
                {amb.currentLocation && (
                  <button
                    onClick={() => openGoogleMapsDirections({
                      origin: center,
                      destination: amb.currentLocation,
                    })}
                    className="w-full flex items-center justify-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Navigate in Google Maps
                  </button>
                )}
              </div>
            ))}
            {activeAmbulances.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-4">No active dispatches</p>
            )}
          </div>
        </div>

        {/* All Ambulances Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold mb-3">All Ambulances</h3>
          <div className="space-y-2">
            {ambulances.map(amb => (
              <div key={amb.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    amb.status === 'available' ? 'bg-green-500' :
                    amb.status === 'dispatched' ? 'bg-blue-500' :
                    amb.status === 'transporting' ? 'bg-red-500' :
                    'bg-red-500'
                  }`} />
                  <span className="text-gray-900">{amb.vehicleNumber}</span>
                </div>
                <span className="text-gray-600">{amb.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Map Legend */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold mb-3">Map Legend</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Dispatched</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Transporting</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Emergency Call / Busy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMapSection;
