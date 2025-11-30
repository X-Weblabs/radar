export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const calculateETA = (distance) => {
  const avgSpeed = 60; // km/h average speed for ambulance
  const timeInHours = distance / avgSpeed;
  const minutes = Math.ceil(timeInHours * 60);
  return `${minutes} mins`;
};

export const findNearestAmbulance = (location, ambulances) => {
  const availableAmbulances = ambulances.filter(amb => amb.status === 'available');
  
  if (availableAmbulances.length === 0) return null;
  
  let nearest = availableAmbulances[0];
  let minDistance = calculateDistance(
    location.lat, location.lng,
    nearest.currentLocation.lat, nearest.currentLocation.lng
  );
  
  availableAmbulances.forEach(amb => {
    const distance = calculateDistance(
      location.lat, location.lng,
      amb.currentLocation.lat, amb.currentLocation.lng
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearest = amb;
    }
  });
  
  return { ambulance: nearest, distance: minDistance };
};

export const findNearestHospital = (location, hospitals) => {
  const availableHospitals = hospitals.filter(
    hosp => hosp.occupiedUnits < hosp.totalUnits
  );
  
  if (availableHospitals.length === 0) return null;
  
  let nearest = availableHospitals[0];
  let minDistance = calculateDistance(
    location.lat, location.lng,
    nearest.location.lat, nearest.location.lng
  );
  
  availableHospitals.forEach(hosp => {
    const distance = calculateDistance(
      location.lat, location.lng,
      hosp.location.lat, hosp.location.lng
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearest = hosp;
    }
  });
  
  return { hospital: nearest, distance: minDistance };
};

export const formatTimestamp = (timestamp, fallback = 'Not recorded') => {
  if (!timestamp) return fallback;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getPriorityColor = (priority) => {
  switch (priority) {
    case 'critical':
      return 'text-red-600 bg-red-100 border-red-300';
    case 'urgent':
      return 'text-orange-600 bg-orange-100 border-orange-300';
    case 'moderate':
      return 'text-yellow-600 bg-yellow-100 border-yellow-300';
    default:
      return 'text-gray-600 bg-gray-100 border-gray-300';
  }
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'available':
      return 'text-green-600 bg-green-100';
    case 'dispatched':
      return 'text-blue-600 bg-blue-100';
    case 'busy':
      return 'text-orange-600 bg-orange-100';
    case 'offline':
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};
