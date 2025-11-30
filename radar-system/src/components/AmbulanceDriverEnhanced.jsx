import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useJsApiLoader, GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { Ambulance, Navigation, MapPin, Hospital, Phone, Clock, AlertTriangle, List, CheckCircle, XCircle, ExternalLink, Truck, Users } from 'lucide-react';
import { GOOGLE_MAPS_API_KEY, defaultCenter } from '../config/googleMaps';
import { ref, set } from 'firebase/database';
import { rtdb } from '../config/firebase';
import { collection, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { findNearestHospital, calculateETA, calculateDistance, formatTimestamp } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { openGoogleMapsDirections } from '../utils/locationTracking';
import Header from './Header';

const DISPATCH_STATUSES = new Set(['pending', 'dispatched', 'transporting']);
const normalizeDriverStatus = (value) => (DISPATCH_STATUSES.has(value) ? value : 'available');

const AmbulanceDriverEnhanced = () => {
  const { currentUser } = useAuth();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [assignedCall, setAssignedCall] = useState(null);
  const [status, setStatus] = useState('available');
  const [directions, setDirections] = useState(null);
  const [destinationHospital, setDestinationHospital] = useState(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [stage, setStage] = useState('to_caller');
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [forwardReason, setForwardReason] = useState('');
  const [showDispatchList, setShowDispatchList] = useState(false);
  const [dispatchHistory, setDispatchHistory] = useState([]);
  const [driverProfile, setDriverProfile] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [assignedAmbulance, setAssignedAmbulance] = useState(null);
  const hasResetActiveStatusRef = useRef(false);
  const statusSyncRef = useRef({ status: null, callId: null });

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const driverVehicleId = driverProfile?.ambulanceId || driverProfile?.vehicleNumber || driverProfile?.assignedVehicle;

  const matchesDriver = useCallback(
    (call) => {
      if (!currentUser || !call) return false;
      const normalizedDriverName = driverProfile?.name?.toLowerCase();
      const assignedDriverName = call.assignedDriver?.toLowerCase();
      const assignedVehicle = call.assignedVehicle || call.dispatchedAmbulance || call.vehicleNumber;

      return (
        call.assignedDriverId === currentUser?.uid ||
        (normalizedDriverName && assignedDriverName && normalizedDriverName === assignedDriverName) ||
        (assignedVehicle && driverVehicleId && assignedVehicle === driverVehicleId)
      );
    },
    [currentUser?.uid, driverProfile?.name, driverVehicleId]
  );

  const formatAddress = (address, location) => {
    if (address) return address;
    if (location?.lat && location?.lng) {
      return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
    }
    return 'Unknown location';
  };

  const getRouteDestination = () => {
    if (stage === 'to_hospital') {
      return destinationHospital?.location;
    }
    return assignedCall?.location;
  };

  const handleExternalNavigation = () => {
    if (!currentLocation) return;
    const destination = getRouteDestination();
    if (!destination) return;
    openGoogleMapsDirections({ origin: currentLocation, destination });
  };

  const canOpenExternalNavigation = Boolean(currentLocation && getRouteDestination());

  useEffect(() => {
    if (!currentUser) return;
    const stopTracking = startLocationTracking();
    return () => {
      if (typeof stopTracking === 'function') {
        stopTracking();
      }
    };
  }, [currentUser, status, assignedCall?.id]);

  useEffect(() => {
    if (!currentUser) {
      hasResetActiveStatusRef.current = false;
      statusSyncRef.current = { status: null, callId: null };
      setDriverProfile(null);
      return;
    }

    const driverRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(
      driverRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const profile = { id: snapshot.id, ...snapshot.data() };
          setDriverProfile(profile);
          const profileStatus = profile.status;
          const shouldResetToAvailable = profileStatus === 'active' && !hasResetActiveStatusRef.current;

          if (shouldResetToAvailable) {
            hasResetActiveStatusRef.current = true;
            setStatus('available');
            updateDoc(driverRef, { status: 'available' }).catch((error) =>
              console.error('Error resetting driver status to available:', error)
            );
          } else {
            setStatus((prev) => {
              if (DISPATCH_STATUSES.has(profileStatus)) {
                return profileStatus;
              }
              if (DISPATCH_STATUSES.has(prev)) {
                return prev;
              }
              if (profileStatus) {
                return profileStatus;
              }
              return prev || 'available';
            });
          }
          setCurrentLocation((prev) => {
            if (prev || !profile.currentLocation) {
              return prev;
            }
            return profile.currentLocation;
          });
        } else {
          setDriverProfile(null);
          setStatus('available');
        }
      },
      (error) => console.error('Error loading driver profile:', error)
    );

    return unsubscribe;
  }, [currentUser]);

  useEffect(() => {
    const hospitalsRef = collection(db, 'hospitals');
    const unsubscribe = onSnapshot(
      hospitalsRef,
      (snapshot) => {
        setHospitals(snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() })));
      },
      (error) => console.error('Error loading hospitals:', error)
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const ambulanceId = driverProfile?.ambulanceId || driverProfile?.assignedAmbulanceId;
    if (!ambulanceId) {
      setAssignedAmbulance(null);
      return;
    }

    const ambulanceRef = doc(db, 'ambulances', ambulanceId);
    const unsubscribe = onSnapshot(
      ambulanceRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setAssignedAmbulance({ id: snapshot.id, ...snapshot.data() });
        } else {
          setAssignedAmbulance(null);
        }
      },
      (error) => console.error('Error loading ambulance:', error)
    );

    return unsubscribe;
  }, [driverProfile?.ambulanceId, driverProfile?.assignedAmbulanceId]);

  useEffect(() => {
    if (!currentUser) {
      setAssignedCall(null);
      setDispatchHistory([]);
      return;
    }

    const callsRef = collection(db, 'emergencyCalls');
    const unsubscribe = onSnapshot(
      callsRef,
      (snapshot) => {
        const calls = snapshot
          .docs
          .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }))
          .sort((a, b) => new Date(b.timestamp || b.callCreatedAt || 0) - new Date(a.timestamp || a.callCreatedAt || 0));

        const driverCalls = calls.filter(matchesDriver);
        const activeCall = driverCalls.find((call) => ['pending', 'dispatched', 'transporting'].includes(call.status));
        setAssignedCall(activeCall || null);
        setDispatchHistory(driverCalls.slice(0, 10));
      },
      (error) => console.error('Error loading emergency calls:', error)
    );

    return unsubscribe;
  }, [currentUser, matchesDriver]);

  useEffect(() => {
    if (currentLocation && assignedCall && stage === 'to_caller' && assignedCall.location) {
      calculateRoute(currentLocation, assignedCall.location);
    } else if (currentLocation && destinationHospital && stage === 'to_hospital' && destinationHospital.location) {
      calculateRoute(currentLocation, destinationHospital.location);
    }
  }, [currentLocation, assignedCall, destinationHospital, stage]);

  useEffect(() => {
    if (!assignedCall) {
      setStage('to_caller');
      setDestinationHospital(null);
      setStatus('available');
      return;
    }

    switch (assignedCall.status) {
      case 'transporting':
        setStage('to_hospital');
        setStatus('transporting');
        break;
      case 'completed':
        setStage('completed');
        setStatus('available');
        break;
      case 'forwarded':
        setStage('to_caller');
        setStatus('forwarded');
        break;
      case 'dispatched':
      case 'pending':
        setStage('to_caller');
        setStatus(assignedCall.status);
        break;
      default:
        setStage('to_caller');
    }
  }, [assignedCall]);

  useEffect(() => {
    if (!assignedCall) return;

    if (assignedCall.assignedHospitalId) {
      const hospital = hospitals.find((h) => h.id === assignedCall.assignedHospitalId);
      if (hospital) {
        setDestinationHospital(hospital);
        return;
      }
    }

    if (assignedCall.assignedHospital) {
      const hospital = hospitals.find((h) => h.name === assignedCall.assignedHospital);
      if (hospital) {
        setDestinationHospital(hospital);
        return;
      }
    }

    if (stage === 'to_hospital' && currentLocation) {
      const result = findNearestHospital(currentLocation, hospitals);
      setDestinationHospital(result?.hospital || null);
    }
  }, [assignedCall, hospitals, stage, currentLocation]);

  useEffect(() => {
    if (!assignedCall) {
      setDirections(null);
    }
  }, [assignedCall]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const normalizedStatus = normalizeDriverStatus(status);
    const callId = assignedCall?.id || null;
    const prev = statusSyncRef.current;
    if (prev.status === normalizedStatus && prev.callId === callId) {
      return;
    }
    statusSyncRef.current = { status: normalizedStatus, callId };

    const syncStatus = async () => {
      try {
        const driverRef = doc(db, 'users', currentUser.uid);
        await updateDoc(driverRef, {
          status: normalizedStatus,
          dispatchedCallId: callId || '',
          assignedCallId: callId || null,
          lastStatusUpdatedAt: new Date().toISOString(),
        });

        const ambulanceId = driverProfile?.ambulanceId || driverProfile?.assignedAmbulanceId;
        if (ambulanceId) {
          const ambulanceRef = doc(db, 'ambulances', ambulanceId);
          await updateDoc(ambulanceRef, {
            status: normalizedStatus === 'available' ? 'available' : normalizedStatus,
            currentCallId: callId || null,
            driverId: currentUser.uid,
          });
        }
      } catch (error) {
        console.error('Error syncing driver/ambulance status:', error);
      }
    };

    syncStatus();
  }, [status, assignedCall?.id, currentUser?.uid, driverProfile?.ambulanceId, driverProfile?.assignedAmbulanceId]);

  const startLocationTracking = () => {
    if (!navigator.geolocation || !currentUser) {
      if (!currentLocation) {
        setCurrentLocation({ ...defaultCenter });
      }
      return null;
    }

    setIsTrackingLocation(true);
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocation(newLocation);

        const driverStatus = normalizeDriverStatus(status);

        const locationRef = ref(rtdb, `locations/drivers/${currentUser.uid}`);
        set(locationRef, {
          lat: newLocation.lat,
          lng: newLocation.lng,
          timestamp: new Date().toISOString(),
          status: driverStatus,
          assignedCallId: assignedCall?.id || null,
        }).catch((error) => console.error('Real-time location update failed:', error));
      },
      (error) => {
        console.error('Error getting location:', error);
        if (!currentLocation) {
          setCurrentLocation({ ...defaultCenter });
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setIsTrackingLocation(false);
    };
  };

  const calculateRoute = async (origin, destination) => {
    if (!window.google) return;

    const directionsService = new window.google.maps.DirectionsService();
    
    try {
      const results = await directionsService.route({
        origin: origin,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      });
      
      setDirections(results);
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  };

  const handleArrivedAtCaller = async () => {
    if (window.confirm('Have you arrived at the caller location and picked up the patient?')) {
      const now = new Date().toISOString();
      const callRef = assignedCall?.id ? doc(db, 'emergencyCalls', assignedCall.id) : null;
      
      // Update emergency call in Firestore with timestamp
      try {
        if (callRef) {
          await updateDoc(callRef, {
            driverArrivedAtCallerAt: now,
            enRouteToHospitalAt: now,
            status: 'transporting',
            assignedDriverId: currentUser?.uid || null,
            assignedDriver: driverProfile?.name || null,
            assignedVehicle: driverVehicleId || assignedCall?.assignedVehicle || null,
          });
        }
      } catch (error) {
        console.error('Error updating call timestamp:', error);
      }

      // Call webhook for driver picked up patient
      try {
        const webhookResponse = await fetch('https://xweblabs25.app.n8n.cloud/webhook/emergency-dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callId: assignedCall?.id,
            driverInfo: {
              name: driverProfile?.name || 'Unknown Driver',
              vehicle: driverVehicleId || assignedCall?.assignedVehicle || 'Unassigned Vehicle',
              location: currentLocation,
              timestamp: now
            },
            patientInfo: {
              phone: assignedCall?.callerPhone,
              address: assignedCall?.address
            },
            eventType: 'driver_picked_up_patient'
          }),
        });
        
        if (!webhookResponse.ok) {
          console.error('Webhook response error:', webhookResponse.status);
        } else {
          console.log('Driver picked up patient webhook called successfully');
        }
      } catch (webhookError) {
        console.error('Webhook call failed:', webhookError);
      }

      setStage('to_hospital');
      setStatus('transporting');
      
      const result = findNearestHospital(currentLocation, hospitals);
      if (result) {
        setDestinationHospital(result.hospital);
        calculateRoute(currentLocation, result.hospital.location);
        if (callRef) {
          try {
            await updateDoc(callRef, {
              assignedHospitalId: result.hospital.id || null,
              assignedHospital: result.hospital.name || null,
            });
          } catch (error) {
            console.error('Error updating assigned hospital:', error);
          }
        }
      }
    }
  };

  const handleArrivedAtHospital = async () => {
    if (window.confirm('Have you delivered the patient to the hospital?')) {
      const now = new Date().toISOString();
      
      // Update emergency call in Firestore with timestamp
      try {
        if (assignedCall?.id) {
          const callRef = doc(db, 'emergencyCalls', assignedCall.id);
          await updateDoc(callRef, {
            arrivedAtHospitalAt: now,
            completedAt: now,
            status: 'completed',
            assignedHospital: destinationHospital?.name || 'Unknown Hospital',
            assignedHospitalId: destinationHospital?.id || null,
          });
        }
      } catch (error) {
        console.error('Error updating call timestamp:', error);
      }

      try {
        if (currentUser?.uid) {
          const driverRef = doc(db, 'users', currentUser.uid);
          await updateDoc(driverRef, {
            status: 'available',
            dispatchedCallId: '',
            assignedCallId: null,
            lastStatusUpdatedAt: now,
          });
        }

        const ambulanceId = driverProfile?.ambulanceId || driverProfile?.assignedAmbulanceId;
        if (ambulanceId) {
          const ambulanceRef = doc(db, 'ambulances', ambulanceId);
          await updateDoc(ambulanceRef, {
            status: 'available',
            currentCallId: null,
          });
        }
      } catch (error) {
        console.error('Error resetting driver/ambulance status:', error);
      }

      setStage('completed');
      setStatus('available');
      setAssignedCall(null);
      setDestinationHospital(null);
      setDirections(null);
      alert('Call completed successfully! Ready for next dispatch.');
    }
  };

  const handleForwardDispatch = async () => {
    if (!forwardReason.trim()) {
      alert('Please provide a reason for forwarding this dispatch.');
      return;
    }

    if (window.confirm(`Forward this dispatch?\nReason: ${forwardReason}`)) {
      const now = new Date().toISOString();
      
      // Update emergency call in Firestore with timestamp
      try {
        if (assignedCall?.id) {
          const callRef = doc(db, 'emergencyCalls', assignedCall.id);
          await updateDoc(callRef, {
            callForwardedAt: now,
            forwardReason: forwardReason,
            forwardedBy: driverProfile?.name || driverVehicleId || 'Driver',
            status: 'forwarded',
          });
        }
      } catch (error) {
        console.error('Error updating call timestamp:', error);
      }

      // Call webhook for forward dispatch
      try {
        const webhookResponse = await fetch('https://xweblabs25.app.n8n.cloud/webhook/emergency-dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callId: assignedCall?.id,
            forwardReason: forwardReason,
            driverInfo: {
              name: driverProfile?.name || 'Unknown Driver',
              vehicle: driverVehicleId || assignedCall?.assignedVehicle || 'Unassigned Vehicle',
              timestamp: now
            },
            eventType: 'forward_dispatch'
          }),
        });
        
        if (!webhookResponse.ok) {
          console.error('Webhook response error:', webhookResponse.status);
        } else {
          console.log('Forward dispatch webhook called successfully');
        }
      } catch (webhookError) {
        console.error('Webhook call failed:', webhookError);
      }

      alert(`Dispatch forwarded to AI for reassignment.\nReason: ${forwardReason}\n\nSearching for nearest available driver...`);
      
      setAssignedCall(null);
      setStage('to_caller');
      setStatus('available');
      setShowForwardDialog(false);
      setForwardReason('');
      setDirections(null);
      setDestinationHospital(null);
    }
  };

  const getETA = () => {
    if (!currentLocation || !assignedCall) return 'Calculating...';
    
    const destination = stage === 'to_caller' ? assignedCall.location : destinationHospital?.location;
    if (!destination) return 'Calculating...';
    
    const distance = calculateDistance(
      currentLocation.lat, currentLocation.lng,
      destination.lat, destination.lng
    );
    return calculateETA(distance);
  };

  const ForwardDispatchDialog = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Forward Dispatch</h3>
        <p className="text-sm text-gray-600 mb-4">
          Please provide a reason for forwarding this dispatch. The AI will search for the nearest available driver.
        </p>
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Reason for forwarding *
          </label>
          <select
            value={forwardReason}
            onChange={(e) => setForwardReason(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 mb-2"
          >
            <option value="">Select a reason</option>
            <option value="Vehicle mechanical issue">Vehicle mechanical issue</option>
            <option value="Medical emergency - driver">Medical emergency - driver</option>
            <option value="Accident">Accident</option>
            <option value="Fuel shortage">Fuel shortage</option>
            <option value="Traffic congestion">Traffic congestion</option>
            <option value="Other">Other</option>
          </select>
          {forwardReason === 'Other' && (
            <textarea
              placeholder="Please specify the reason..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
              rows="3"
              onChange={(e) => setForwardReason(e.target.value)}
            />
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleForwardDispatch}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700"
          >
            Confirm Forward
          </button>
          <button
            onClick={() => {
              setShowForwardDialog(false);
              setForwardReason('');
            }}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  const DispatchListView = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Dispatch History</h3>
          <button
            onClick={() => setShowDispatchList(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {assignedCall && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Current Dispatch</h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-blue-900">Call #{assignedCall.id.substring(0, 8)}</span>
                  <span className="px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                    Active
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-700"><strong>Phone:</strong> {assignedCall.callerPhone}</p>
                  <p className="text-xs text-gray-700"><strong>Coordinates:</strong> {formatAddress(assignedCall.address, assignedCall.location)}</p>
                  <p className="text-xs text-gray-700"><strong>Description:</strong> {assignedCall.description}</p>
                  <p className="text-xs text-gray-500">Dispatched: {formatTimestamp(assignedCall.timestamp, 'Timestamp unavailable')}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Previous Dispatches</h4>
            <div className="space-y-3">
              {dispatchHistory.length > 0 ? (
                dispatchHistory.map((dispatch) => {
                  const dispatchedTime = dispatch.dispatchedAt || dispatch.timestamp || dispatch.callCreatedAt;
                  const callLabel = dispatch.id ? dispatch.id.substring(0, 8) : 'N/A';
                  const addressLabel = dispatch.address || (dispatch.location ? `${dispatch.location.lat?.toFixed(4)}, ${dispatch.location.lng?.toFixed(4)}` : 'Unknown location');
                  return (
                    <div
                      key={dispatch.id}
                      className={`border rounded-lg p-4 ${
                        dispatch.status === 'completed' ? 'bg-green-50 border-green-200' :
                        dispatch.status === 'forwarded' ? 'bg-red-50 border-red-200' :
                        'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-semibold text-gray-900">Call #{callLabel}</span>
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-medium ${
                            dispatch.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : dispatch.status === 'forwarded'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {dispatch.status || 'unknown'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-700"><strong>Phone:</strong> {dispatch.callerPhone || 'Hidden'}</p>
                        <p className="text-xs text-gray-700"><strong>Address:</strong> {addressLabel}</p>
                        {dispatch.description && (
                          <p className="text-xs text-gray-700"><strong>Description:</strong> {dispatch.description}</p>
                        )}
                        {dispatch.status === 'completed' && (
                          <p className="text-xs text-gray-700"><strong>Hospital:</strong> {dispatch.assignedHospital || 'Not recorded'}</p>
                        )}
                        {dispatch.status === 'forwarded' && dispatch.forwardReason && (
                          <p className="text-xs text-red-700"><strong>Reason:</strong> {dispatch.forwardReason}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Dispatched: {formatTimestamp(dispatchedTime, 'Timestamp unavailable')}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-500">No previous dispatches recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const vehicleLabel = driverProfile?.assignedVehicle || assignedCall?.assignedVehicle || 'Unassigned Vehicle';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Ambulance Driver Dashboard" subtitle={`Vehicle Plates: ${vehicleLabel}`} />
      
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white border border-red-100 rounded-lg p-4 mb-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-600"></div>
          
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between relative z-10">
            <div className="flex gap-2">
              <div className={`px-3 py-2 rounded-lg text-xs font-semibold ${
                status === 'available' ? 'bg-green-100 text-green-700' :
                status === 'dispatched' ? 'bg-blue-100 text-blue-700' :
                status === 'transporting' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {status.toUpperCase()}
              </div>
              {isTrackingLocation && assignedCall && (
                <div className="px-3 py-2 rounded-lg bg-white/20 flex items-center gap-2 text-xs">
                  <Navigation className="w-3 h-3 animate-pulse" />
                  Tracking Active
                </div>
              )}
            </div>
            <button
              onClick={() => setShowDispatchList(true)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-gray-700"
            >
              <List className="w-4 h-4" />
              <span className="text-xs font-medium">Dispatch List</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Live Navigation</h2>
                {currentLocation && (
                  <div className="text-xs text-gray-600">
                    {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                  </div>
                )}
              </div>
              <div className="h-[55vh] min-h-[320px]">
                {isLoaded && currentLocation ? (
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={currentLocation}
                    zoom={14}
                  >
                    <Marker 
                      position={currentLocation} 
                      icon={{
                        url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                      }}
                    />
                    
                    {assignedCall?.location && stage === 'to_caller' && (
                      <Marker 
                        position={assignedCall.location}
                        icon={{
                          url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                        }}
                      />
                    )}
                    
                    {destinationHospital?.location && stage === 'to_hospital' && (
                      <Marker 
                        position={destinationHospital.location}
                        icon={{
                          url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
                        }}
                      />
                    )}
                    
                    {directions && (
                      <DirectionsRenderer directions={directions} />
                    )}
                  </GoogleMap>
                ) : (
                  <div className="h-full flex items-center justify-center bg-gray-100">
                    <Navigation className="w-12 h-12 text-gray-400 animate-spin" />
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-gray-100">
                <button
                  onClick={handleExternalNavigation}
                  disabled={!canOpenExternalNavigation}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ExternalLink className="w-4 h-4" />
                  Continue in Google Maps
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {assignedCall && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
                <h2 className="text-sm font-semibold mb-3">Active Dispatch</h2>
                
                <div className="space-y-3">
                  {stage === 'to_caller' && (
                    <>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-4 h-4 text-red-600" />
                          <span className="text-xs font-semibold text-red-900">Caller Location</span>
                        </div>
                        <p className="text-xs text-gray-700">{formatAddress(assignedCall.address, assignedCall.location)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-red-600" />
                          <span className="text-xs font-medium text-red-700">ETA: {getETA()}</span>
                        </div>
                      </div>

                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-700 mb-1">Emergency Description</p>
                        <p className="text-xs text-gray-900">{assignedCall.description}</p>
                        {assignedCall.gender && (
                          <p className="text-xs text-gray-700 mt-1">Gender: {assignedCall.gender}</p>
                        )}
                        {assignedCall.roomNumber && (
                          <p className="text-xs text-gray-700">Room/House: {assignedCall.roomNumber}</p>
                        )}
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 text-gray-600" />
                          <p className="text-xs text-gray-700">{assignedCall.callerPhone}</p>
                        </div>
                      </div>

                      {canOpenExternalNavigation && (
                        <button
                          onClick={handleExternalNavigation}
                          className="w-full bg-white border border-red-200 text-red-600 py-2 rounded-lg text-xs font-medium hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open Route in Google Maps
                        </button>
                      )}

                      <button
                        onClick={handleArrivedAtCaller}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:from-green-700 hover:to-emerald-700 transition-all"
                      >
                        Arrived at Caller Location
                      </button>

                      <button
                        onClick={() => setShowForwardDialog(true)}
                        className="w-full bg-red-100 text-red-700 py-2 rounded-lg text-sm font-medium hover:bg-red-200 transition-all flex items-center justify-center gap-2"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Forward Dispatch
                      </button>
                    </>
                  )}

                  {stage === 'to_hospital' && destinationHospital && (
                    <>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Hospital className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-semibold text-green-900">Destination Hospital</span>
                        </div>
                        <p className="text-xs font-semibold text-gray-900">{destinationHospital.name}</p>
                        <p className="text-xs text-gray-700">{destinationHospital.address}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-green-600" />
                          <span className="text-xs font-medium text-green-700">ETA: {getETA()}</span>
                        </div>
                      </div>

                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs text-gray-700">
                          Available Units: {destinationHospital.totalUnits - destinationHospital.occupiedUnits}/{destinationHospital.totalUnits}
                        </p>
                        <p className="text-xs text-gray-700 mt-1">
                          Contact: {destinationHospital.contactNumber}
                        </p>
                      </div>

                      {canOpenExternalNavigation && (
                        <button
                          onClick={handleExternalNavigation}
                          className="w-full bg-white border border-green-200 text-green-700 py-2 rounded-lg text-xs font-medium hover:bg-green-50 transition-all flex items-center justify-center gap-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open Route in Google Maps
                        </button>
                      )}

                      <button
                        onClick={handleArrivedAtHospital}
                        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-cyan-700 transition-all"
                      >
                        Delivered to Hospital
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {!assignedCall && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Ambulance className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Available for Dispatch</h3>
                  <p className="text-xs text-gray-600">Waiting for emergency call assignment</p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
              <h2 className="text-sm font-semibold mb-3">Quick Stats</h2>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Calls Today</span>
                  <span className="text-sm font-semibold">5</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Hours Active</span>
                  <span className="text-sm font-semibold">6.5h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Avg Response Time</span>
                  <span className="text-sm font-semibold">8 mins</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Forwarded Calls</span>
                  <span className="text-sm font-semibold">1</span>
                </div>
              </div>
            </div>

            {assignedAmbulance && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <h2 className="text-sm font-semibold">Assigned Ambulance</h2>
                </div>
                <div className="space-y-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-600">Vehicle Plates</span>
                      <span className="text-sm font-semibold text-blue-700">{assignedAmbulance.vehicleNumber}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-600">Vehicle Type</span>
                      <span className="text-sm font-medium">
                        {assignedAmbulance.vehicleType === 'ALS' ? 'Advanced Life Support' : 
                         assignedAmbulance.vehicleType === 'BLS' ? 'Basic Life Support' : 
                         assignedAmbulance.vehicleType || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Provider</span>
                      <span className="text-sm font-medium">{assignedAmbulance.provider || 'N/A'}</span>
                    </div>
                  </div>
                  
                  {assignedAmbulance.paramedics && assignedAmbulance.paramedics.length > 0 && (
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-3 h-3 text-purple-600" />
                        <span className="text-xs font-medium text-purple-700">Paramedics on Board</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {assignedAmbulance.paramedics.map((paramedic, idx) => (
                          <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                            {paramedic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {(!assignedAmbulance.paramedics || assignedAmbulance.paramedics.length === 0) && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">No paramedics assigned</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!assignedAmbulance && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-4 h-4 text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-500">Assigned Ambulance</h2>
                </div>
                <div className="text-center py-4">
                  <p className="text-xs text-gray-500">No ambulance assigned</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showForwardDialog && <ForwardDispatchDialog />}
      {showDispatchList && <DispatchListView />}
    </div>
  );
};

export default AmbulanceDriverEnhanced;
