import { ref, set, onValue, off } from 'firebase/database';
import { doc, updateDoc } from 'firebase/firestore';
import { rtdb, db } from '../config/firebase';

export const startLocationTracking = (userId, userRole, onLocationUpdate) => {
  if (!navigator.geolocation) {
    console.error('Geolocation is not supported by this browser');
    return null;
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        timestamp: new Date().toISOString(),
        accuracy: position.coords.accuracy,
      };

      updateUserLocation(userId, userRole, location);
      
      if (onLocationUpdate) {
        onLocationUpdate(location);
      }
    },
    (error) => {
      console.error('Error getting location:', error);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    }
  );

  return watchId;
};

export const stopLocationTracking = (watchId) => {
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
  }
};

export const updateUserLocation = async (userId, userRole, location) => {
  try {
    const locationRef = ref(rtdb, `locations/${userRole}s/${userId}`);
    await set(locationRef, location);

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      currentLocation: {
        lat: location.lat,
        lng: location.lng,
      },
      lastLocationUpdate: location.timestamp,
    });
  } catch (error) {
    console.error('Error updating location:', error);
  }
};

export const subscribeToUserLocation = (userId, userRole, callback) => {
  const locationRef = ref(rtdb, `locations/${userRole}s/${userId}`);
  
  onValue(locationRef, (snapshot) => {
    const location = snapshot.val();
    if (location && callback) {
      callback(location);
    }
  });

  return () => off(locationRef);
};

export const subscribeToAllDriverLocations = (callback) => {
  const driversRef = ref(rtdb, 'locations/drivers');
  
  onValue(driversRef, (snapshot) => {
    const locations = snapshot.val();
    if (locations && callback) {
      callback(locations);
    }
  });

  return () => off(driversRef);
};

export const subscribeToAllHospitalLocations = (callback) => {
  const hospitalsRef = ref(rtdb, 'locations/hospitals');
  
  onValue(hospitalsRef, (snapshot) => {
    const locations = snapshot.val();
    if (locations && callback) {
      callback(locations);
    }
  });

  return () => off(hospitalsRef);
};

export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const buildLatLngParam = (point) => `${point.lat},${point.lng}`;

export const buildGoogleMapsDirectionsUrl = ({ origin, destination, travelMode = 'driving' }) => {
  if (!destination?.lat || !destination?.lng) return null;

  const params = new URLSearchParams({
    api: '1',
    destination: buildLatLngParam(destination),
    travelmode: travelMode,
  });

  if (origin?.lat && origin?.lng) {
    params.set('origin', buildLatLngParam(origin));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

export const openGoogleMapsDirections = ({ origin, destination, travelMode = 'driving' }) => {
  const url = buildGoogleMapsDirectionsUrl({ origin, destination, travelMode });
  if (!url) return;
  window.open(url, '_blank');
};

export const openGoogleMapsNavigation = (destinationLat, destinationLng, destinationName, origin) => {
  const destination = { lat: destinationLat, lng: destinationLng, name: destinationName };

  if (origin?.lat && origin?.lng) {
    openGoogleMapsDirections({ origin, destination });
    return;
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        openGoogleMapsDirections({
          origin: { lat: position.coords.latitude, lng: position.coords.longitude },
          destination,
        });
      },
      () => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${destinationLat},${destinationLng}`,'_blank');
      }
    );
  } else {
    window.open(`https://www.google.com/maps/search/?api=1&query=${destinationLat},${destinationLng}`,'_blank');
  }
};
