import React, { useState, useEffect } from 'react';
import { useJsApiLoader, GoogleMap, Marker, Polyline, DirectionsRenderer } from '@react-google-maps/api';
import { MapPin, AlertCircle, Navigation, Ambulance, User, Clock, ExternalLink, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GOOGLE_MAPS_API_KEY, mapContainerStyle, defaultCenter } from '../config/googleMaps';
import { collection, addDoc, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { calculateDistance, calculateETA } from '../utils/helpers';
import { openGoogleMapsDirections } from '../utils/locationTracking';

const EmergencyCaller = () => {
  const [location, setLocation] = useState(null);
  const [callerInfo, setCallerInfo] = useState({
    description: '',
  });
  const [paymentProfile, setPaymentProfile] = useState({ paymentMethod: 'cash', medicalAidName: '' });
  const [callerName, setCallerName] = useState('Anonymous Caller');
  const [callerUsername, setCallerUsername] = useState('anonymous');
  const [userGender, setUserGender] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [callSubmitted, setCallSubmitted] = useState(false);
  const [dispatchInfo, setDispatchInfo] = useState(null);
  const [driverInfo, setDriverInfo] = useState(null);
  const [isWaitingForDriver, setIsWaitingForDriver] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const result = await signOut();
    if (result.success) navigate('/login');
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          setLocation(defaultCenter);
        }
      );
    } else {
      setLocation(defaultCenter);
    }
  }, []);

  useEffect(() => {
    const loadProfilePayment = async () => {
      if (!currentUser?.uid) return;
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnapshot = await getDoc(userRef);
        if (!userSnapshot.exists()) return;

        const userData = userSnapshot.data();
        const preferredPaymentMethod = userData.preferredPaymentMethod || userData.paymentMethod || '';
        const usernameFromProfile =
          userData.username ||
          (typeof userData.email === 'string' ? userData.email.split('@')[0] : '') ||
          (typeof currentUser.email === 'string' ? currentUser.email.split('@')[0] : '') ||
          'anonymous';
        setCallerUsername(usernameFromProfile);
        setCallerName(userData.name || userData.username || currentUser.displayName || usernameFromProfile || 'Anonymous Caller');
        setUserGender(userData.gender || '');
        setUserAddress(userData.address || '');

        setPaymentProfile({
          paymentMethod: preferredPaymentMethod || 'cash',
          medicalAidName: preferredPaymentMethod === 'medical_aid' ? (userData.medicalAidName || '') : '',
        });
      } catch (error) {
        console.error('Error loading caller payment profile:', error);
      }
    };

    loadProfilePayment();
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!dispatchInfo?.callId) return;

    const unsubscribe = onSnapshot(doc(db, 'emergencyCalls', dispatchInfo.callId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        // Update dispatch message based on status
        if (data.status === 'pending' && data.policeApproved) {
          setDispatchInfo(prev => ({
            ...prev,
            message: 'Police verified! Searching for nearest ambulance...'
          }));
          setIsWaitingForDriver(true);
        } else if (data.status === 'dispatched' || data.driverId) {
          // If driver info is present in the doc, update it
          if (data.driverName) {
            setDriverInfo({
              name: data.driverName,
              vehicleNumber: data.vehiclePlate || data.vehicleNumber || 'Ambulance',
              vehicleType: data.vehicleType || 'ALS',
              location: data.driverLocation,
              estimatedArrival: data.eta || 'Calculating...',
              phone: data.driverPhone || null,
            });
            setIsWaitingForDriver(false);
            setDispatchInfo(prev => ({
              ...prev,
              message: `Ambulance dispatched! ${data.driverName} is on the way.`
            }));
          }
        } else if (data.status === 'rejected_by_police') {
          setDispatchInfo(prev => ({
            ...prev,
            message: 'Emergency call rejected by police department. Please call emergency services directly if this is an error.'
          }));
          setIsWaitingForDriver(false);
        }
      }
    });

    return () => unsubscribe();
  }, [dispatchInfo?.callId]);

  const handleSubmitEmergency = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();
      const paymentMethod = paymentProfile.paymentMethod || 'cash';
      const medicalAidName = paymentMethod === 'medical_aid' ? paymentProfile.medicalAidName || '' : '';
      const emergencyCall = {
        callerName,
        callerUsername,
        location: location || defaultCenter,
        description: callerInfo.description,
        gender: userGender || 'Not provided',
        roomNumber: userAddress || 'Not provided',
        address: userAddress || 'Not provided',
        paymentMethod,
        medicalAidName,
        priority: 'urgent',
        status: 'awaiting_police_approval',
        policeApproved: false,
        timestamp: now,
        callCreatedAt: now,
        dispatchedAt: null,
        driverEnRouteAt: null,
        callForwardedAt: null,
        driverArrivedAtCallerAt: null,
        enRouteToHospitalAt: null,
        arrivedAtHospitalAt: null,
        completedAt: null,
      };

      const docRef = await addDoc(collection(db, 'emergencyCalls'), emergencyCall);

      setCallSubmitted(true);
      setDispatchInfo({
        callId: docRef.id,
        message: 'Your emergency call has been received and is being verified by the police department. Please stay calm.',
      });

      // We no longer call the webhook here immediately.
      // It will be called once police approve the emergency.
      setIsWaitingForDriver(false); 
      
    } catch (error) {
      console.error('Error submitting emergency call:', error);
      alert('Error submitting emergency call. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openGoogleMapsTracking = () => {
    if (driverInfo?.location && location) {
      openGoogleMapsDirections({
        origin: driverInfo.location,
        destination: location,
      });
    }
  };

  if (callSubmitted) {
    return (
      <div className="min-h-screen bg-grid-pattern flex items-center justify-center p-4 relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-600"></div>

        <div className="bg-white rounded-lg p-6 max-w-4xl w-full shadow-2xl border border-gray-100">
          <div className="text-center mb-4">
            <div className={`w-16 h-16 ${isWaitingForDriver ? 'bg-yellow-100' : driverInfo ? 'bg-green-100' : 'bg-blue-100'} rounded-full flex items-center justify-center mx-auto mb-3 ${isWaitingForDriver ? 'animate-pulse' : ''}`}>
              {isWaitingForDriver ? (
                <Navigation className="w-8 h-8 text-yellow-600 animate-spin" />
              ) : driverInfo ? (
                <Ambulance className="w-8 h-8 text-green-600" />
              ) : (
                <Clock className="w-8 h-8 text-blue-600 animate-pulse" />
              )}
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              {isWaitingForDriver
                ? 'Searching for Ambulance...'
                : driverInfo
                  ? 'Ambulance Dispatched!'
                  : 'Awaiting Police Verification...'}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {dispatchInfo?.message}
            </p>
          </div>

          {driverInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">Driver Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-blue-700">Driver</p>
                    <p className="text-sm font-semibold text-blue-900">{driverInfo.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Ambulance className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-blue-700">Vehicle</p>
                    <p className="text-sm font-semibold text-blue-900">{driverInfo.vehicleNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-blue-700">Type</p>
                    <p className="text-sm font-semibold text-blue-900">{driverInfo.vehicleType}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-blue-700">ETA</p>
                    <p className="text-sm font-semibold text-blue-900">{driverInfo.estimatedArrival || 'Calculating...'}</p>
                  </div>
                </div>
              </div>
              {driverInfo.phone && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs text-blue-700">Contact: {driverInfo.phone}</p>
                </div>
              )}
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-gray-700">
              <strong>Call ID:</strong> {dispatchInfo?.callId}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              {isWaitingForDriver
                ? 'Please wait while we find the nearest available ambulance. This usually takes 30-60 seconds.'
                : driverInfo
                  ? 'The ambulance is on its way. Please stay calm and keep your phone nearby.'
                  : 'We are searching for the nearest available ambulance. Please stay on standby.'}
            </p>
          </div>

          {driverInfo && driverInfo.location && location && isLoaded && (
            <>
              <div className="h-[55vh] min-h-[320px] rounded-lg overflow-hidden border border-gray-200 mb-4">
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={location}
                  zoom={13}
                >
                  <Marker
                    position={location}
                    icon="http://maps.google.com/mapfiles/ms/icons/red-dot.png"
                    title="Your Location"
                  />
                  <Marker
                    position={driverInfo.location}
                    icon="http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                    title={`Ambulance: ${driverInfo.vehicleNumber}`}
                  />
                  <Polyline
                    path={[location, driverInfo.location]}
                    options={{
                      strokeColor: '#3B82F6',
                      strokeOpacity: 0.8,
                      strokeWeight: 3,
                    }}
                  />
                </GoogleMap>
              </div>

              <button
                onClick={openGoogleMapsTracking}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-medium text-sm hover:from-green-700 hover:to-emerald-700 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Open Live Tracking in Google Maps
              </button>
            </>
          )}

          {!driverInfo && !isWaitingForDriver && location && isLoaded && (
            <div className="h-[45vh] min-h-[260px] rounded-lg overflow-hidden border border-gray-200 mb-4">
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={location}
                zoom={15}
              >
                <Marker position={location} />
              </GoogleMap>
            </div>
          )}

          {!driverInfo && !isWaitingForDriver && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <AlertCircle className="w-10 h-10 text-yellow-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-yellow-900 mb-1">
                No Ambulance Available Yet
              </p>
              <p className="text-xs text-yellow-700">
                We are actively searching for the nearest ambulance. You will be notified as soon as one is assigned.
                Please stay calm and keep your phone nearby.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-grid-pattern p-4 relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-600"></div>

      <div className="max-w-6xl mx-auto pt-4">
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-100">
          <div className="bg-white p-4 border-b border-red-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center border border-red-100">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Emergency Dispatch</h1>
                  <p className="text-xs text-gray-600">Radar Emergency Response System</p>
                </div>
              </div>

              {currentUser && (
                <div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-red-600 border border-transparent hover:border-red-100"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h2 className="text-base font-semibold mb-4">Call for Help</h2>
                <form onSubmit={handleSubmitEmergency} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Emergency Description *
                    </label>
                    <textarea
                      value={callerInfo.description}
                      onChange={(e) => setCallerInfo({ ...callerInfo, description: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 resize-none"
                      rows="3"
                      placeholder="Describe the emergency..."
                      required
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-blue-900">Your Location</p>
                        <p className="text-xs text-blue-700">
                          {location
                            ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                            : 'Detecting location...'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !callerInfo.description
                    }
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-lg font-medium text-sm hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isSubmitting ? 'Calling for Help...' : 'Call Emergency Ambulance'}
                  </button>
                </form>
              </div>

              <div>
                <h2 className="text-base font-semibold mb-4">Your Location</h2>
                {isLoaded && location ? (
                  <div className="h-[55vh] min-h-[320px] rounded-lg overflow-hidden border border-gray-200">
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={location}
                      zoom={15}
                    >
                      <Marker position={location} />
                    </GoogleMap>
                  </div>
                ) : (
                  <div className="h-80 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Navigation className="w-10 h-10 text-gray-400 animate-spin" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyCaller;
