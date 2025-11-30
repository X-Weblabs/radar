import React, { useState, useEffect } from 'react';
import { useJsApiLoader, GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { Ambulance, Navigation, MapPin, AlertCircle, Hospital, ExternalLink } from 'lucide-react';
import { GOOGLE_MAPS_API_KEY, defaultCenter } from '../config/googleMaps';
import { subscribeToAllDriverLocations, subscribeToAllHospitalLocations, calculateDistance, openGoogleMapsDirections } from '../utils/locationTracking';

const LiveMapSectionEnhanced = ({ ambulances = [], emergencyCalls = [], hospitals = [] }) => {
  const [driverLocations, setDriverLocations] = useState({});
  const [hospitalLocations, setHospitalLocations] = useState({});
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [center, setCenter] = useState(defaultCenter);
  const [userLocation, setUserLocation] = useState(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  useEffect(() => {
    const unsubscribeDrivers = subscribeToAllDriverLocations((locations) => {
      setDriverLocations(locations || {});
    });

    const unsubscribeHospitals = subscribeToAllHospitalLocations((locations) => {
      setHospitalLocations(locations || {});
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.error('Error getting user location:', error)
      );
    }

    return () => {
      if (unsubscribeDrivers) unsubscribeDrivers();
      if (unsubscribeHospitals) unsubscribeHospitals();
    };
  }, []);

  const activeAmbulances = ambulances.filter(
    amb => amb.status === 'dispatched' || amb.status === 'transporting'
  );

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

  const getDistanceFromUser = (lat, lng) => {
    if (!userLocation) return null;
    return calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
  };

  const getNavigationOrigin = () => userLocation || center;

  const openDirectionsTo = (target) => {
    if (!target?.lat || !target?.lng) return;
    const origin = getNavigationOrigin();
    if (!origin?.lat || !origin?.lng) return;
    openGoogleMapsDirections({ origin, destination: target });
  };

  return (
    <div className="h-full flex flex-col xl:flex-row gap-4">
      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Live Tracking Map</h3>
          <p className="text-xs text-gray-600 mt-1">
            Real-time location of drivers, hospitals, and emergency calls
          </p>
        </div>
        <div className="h-[55vh] min-h-[320px] xl:h-[calc(100vh-250px)]">
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={center}
              zoom={12}
            >
              {Object.entries(driverLocations).map(([driverId, location]) => (
                <Marker
                  key={`driver-${driverId}`}
                  position={{ lat: location.lat, lng: location.lng }}
                  icon={getAmbulanceColor(location.status || 'available')}
                  onClick={() => setSelectedMarker({ type: 'driver', id: driverId, data: location })}
                  title={`Driver - ${location.status || 'active'}`}
                />
              ))}

              {Object.entries(hospitalLocations).map(([hospitalId, location]) => (
                <Marker
                  key={`hospital-${hospitalId}`}
                  position={{ lat: location.lat, lng: location.lng }}
                  icon="http://maps.google.com/mapfiles/ms/icons/hospitals.png"
                  onClick={() => setSelectedMarker({ type: 'hospital', id: hospitalId, data: location })}
                  title="Hospital"
                />
              ))}

              {hospitals.map(hospital => (
                hospital.location && (
                  <Marker
                    key={`hospital-static-${hospital.id}`}
                    position={hospital.location}
                    icon="http://maps.google.com/mapfiles/ms/icons/hospitals.png"
                    onClick={() => setSelectedMarker({ type: 'hospital-static', id: hospital.id, data: hospital })}
                    title={hospital.name}
                  />
                )
              ))}

              {pendingCalls.map(call => (
                call.location && (
                  <Marker
                    key={`call-${call.id}`}
                    position={call.location}
                    icon="http://maps.google.com/mapfiles/ms/icons/red-dot.png"
                    onClick={() => setSelectedMarker({ type: 'emergency', id: call.id, data: call })}
                    title="Emergency Call"
                  />
                )
              ))}

              {userLocation && (
                <Marker
                  position={userLocation}
                  icon="http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                  title="Your Location"
                />
              )}

              {selectedMarker && (
                <InfoWindow
                  position={
                    selectedMarker.type === 'driver' || selectedMarker.type === 'hospital'
                      ? { lat: selectedMarker.data.lat, lng: selectedMarker.data.lng }
                      : selectedMarker.data.location
                  }
                  onCloseClick={() => setSelectedMarker(null)}
                >
                  <div className="p-2">
                    {selectedMarker.type === 'driver' && (
                      <div>
                        <h3 className="font-semibold text-sm mb-1">Ambulance Driver</h3>
                        <p className="text-xs text-gray-600">Status: {selectedMarker.data.status || 'active'}</p>
                        <p className="text-xs text-gray-600">
                          Last Update: {new Date(selectedMarker.data.timestamp).toLocaleTimeString()}
                        </p>
                        {userLocation && (
                          <p className="text-xs text-gray-600 mt-1">
                            Distance: {getDistanceFromUser(selectedMarker.data.lat, selectedMarker.data.lng)?.toFixed(2)} km
                          </p>
                        )}
                        <button
                          onClick={() => openDirectionsTo({
                            lat: selectedMarker.data.lat,
                            lng: selectedMarker.data.lng,
                          })}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Navigate
                        </button>
                      </div>
                    )}
                    {(selectedMarker.type === 'hospital' || selectedMarker.type === 'hospital-static') && (
                      <div>
                        <h3 className="font-semibold text-sm mb-1">
                          {selectedMarker.data.name || 'Hospital'}
                        </h3>
                        {selectedMarker.data.address && (
                          <p className="text-xs text-gray-600">{selectedMarker.data.address}</p>
                        )}
                        {selectedMarker.data.totalUnits && (
                          <p className="text-xs text-gray-600">
                            Available: {selectedMarker.data.totalUnits - selectedMarker.data.occupiedUnits}/{selectedMarker.data.totalUnits}
                          </p>
                        )}
                        {userLocation && selectedMarker.data.location && (
                          <p className="text-xs text-gray-600 mt-1">
                            Distance: {getDistanceFromUser(
                              selectedMarker.data.location.lat,
                              selectedMarker.data.location.lng
                            )?.toFixed(2)} km
                          </p>
                        )}
                        <button
                          onClick={() => {
                            const loc = selectedMarker.data.location || { lat: selectedMarker.data.lat, lng: selectedMarker.data.lng };
                            openDirectionsTo(loc);
                          }}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Navigate
                        </button>
                      </div>
                    )}
                    {selectedMarker.type === 'emergency' && (
                      <div>
                        <h3 className="font-semibold text-sm mb-1">Emergency Call</h3>
                        <p className="text-xs text-gray-600">{selectedMarker.data.description}</p>
                        <p className="text-xs text-gray-600">Caller: {selectedMarker.data.callerName}</p>
                        {userLocation && (
                          <p className="text-xs text-gray-600 mt-1">
                            Distance: {getDistanceFromUser(
                              selectedMarker.data.location.lat,
                              selectedMarker.data.location.lng
                            )?.toFixed(2)} km
                          </p>
                        )}
                        <button
                          onClick={() => openDirectionsTo(selectedMarker.data.location)}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Navigate
                        </button>
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-100">
              <Navigation className="w-10 h-10 text-gray-400 animate-spin" />
            </div>
          )}
        </div>
      </div>

      <div className="w-full xl:w-80 space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Ambulance className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold">Active Drivers ({Object.keys(driverLocations).length})</h3>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Object.entries(driverLocations).map(([driverId, location]) => {
              const distance = getDistanceFromUser(location.lat, location.lng);
              return (
                <div
                  key={driverId}
                  onClick={() => {
                    setSelectedMarker({ type: 'driver', id: driverId, data: location });
                    setCenter({ lat: location.lat, lng: location.lng });
                  }}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-900">Driver {driverId.slice(0, 8)}</p>
                      <p className="text-xs text-gray-600">{location.status || 'active'}</p>
                    </div>
                    <div className={`px-2 py-1 rounded-md text-xs font-medium ${
                      location.status === 'dispatched' ? 'bg-blue-100 text-blue-700' :
                      location.status === 'transporting' ? 'bg-red-100 text-red-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {distance ? `${distance.toFixed(1)} km` : 'N/A'}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Updated: {new Date(location.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              );
            })}
            {Object.keys(driverLocations).length === 0 && (
              <p className="text-xs text-gray-500 text-center py-4">No active drivers</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Hospital className="w-4 h-4 text-green-600" />
            <h3 className="text-sm font-semibold">Nearby Hospitals ({hospitals.length})</h3>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {hospitals.map(hospital => {
              const distance = hospital.location ? getDistanceFromUser(hospital.location.lat, hospital.location.lng) : null;
              return (
                <div
                  key={hospital.id}
                  onClick={() => {
                    if (hospital.location) {
                      setSelectedMarker({ type: 'hospital-static', id: hospital.id, data: hospital });
                      setCenter(hospital.location);
                    }
                  }}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-green-50 cursor-pointer transition-colors"
                >
                  <p className="text-xs font-semibold text-gray-900">{hospital.name}</p>
                  <p className="text-xs text-gray-600">
                    Available: {hospital.totalUnits - hospital.occupiedUnits}/{hospital.totalUnits}
                  </p>
                  {distance && (
                    <p className="text-xs text-green-600 font-medium mt-1">
                      {distance.toFixed(1)} km away
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold mb-3">Map Legend</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Available Driver</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Dispatched Driver</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Transporting</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Emergency Call</span>
            </div>
            <div className="flex items-center gap-2">
              <Hospital className="w-3 h-3 text-green-600" />
              <span>Hospital</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Your Location</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMapSectionEnhanced;
