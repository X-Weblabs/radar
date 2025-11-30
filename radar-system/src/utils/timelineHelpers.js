// Helper function to convert emergency call data to timeline events format
export const convertCallToTimeline = (callData) => {
  if (!callData) return null;

  const events = [];

  // 1. Call Received
  if (callData.callCreatedAt || callData.timestamp) {
    events.push({
      type: 'call_received',
      title: 'Emergency Call Received',
      description: `Caller: ${callData.callerPhone || 'Anonymous'} | ${callData.description}`,
      timestamp: callData.callCreatedAt || callData.timestamp,
      details: {
        phone: callData.callerPhone,
        location: callData.location,
        gender: callData.gender,
        roomNumber: callData.roomNumber,
      },
    });
  }

  // 2. Driver Dispatched
  if (callData.dispatchedAt) {
    events.push({
      type: 'dispatched',
      title: 'Ambulance Dispatched',
      description: `Driver assigned and en route to caller location`,
      timestamp: callData.dispatchedAt,
      details: {
        driver: callData.assignedDriver || 'Unknown Driver',
        vehicle: callData.assignedVehicle || 'Unknown Vehicle',
      },
    });
  }

  // 3. Call Forwarded (if applicable)
  if (callData.callForwardedAt) {
    events.push({
      type: 'forwarded',
      title: 'Dispatch Forwarded',
      description: `Forwarded by ${callData.forwardedBy || 'Driver'}`,
      timestamp: callData.callForwardedAt,
      details: {
        reason: callData.forwardReason || 'Not specified',
        forwarded_by: callData.forwardedBy,
      },
    });
  }

  // 4. Driver En Route (using driverEnRouteAt or dispatchedAt as fallback)
  if (callData.driverEnRouteAt) {
    events.push({
      type: 'en_route',
      title: 'Driver En Route',
      description: 'Ambulance is on the way to caller location',
      timestamp: callData.driverEnRouteAt,
    });
  }

  // 5. Patient Picked Up
  if (callData.driverArrivedAtCallerAt) {
    events.push({
      type: 'caller_picked',
      title: 'Patient Picked Up',
      description: 'Driver arrived at caller location and picked up patient',
      timestamp: callData.driverArrivedAtCallerAt,
    });
  }

  // 6. En Route to Hospital
  if (callData.enRouteToHospitalAt) {
    events.push({
      type: 'en_route',
      title: 'En Route to Hospital',
      description: `Transporting patient to ${callData.assignedHospital || 'hospital'}`,
      timestamp: callData.enRouteToHospitalAt,
      details: {
        hospital: callData.assignedHospital,
      },
    });
  }

  // 7. Arrived at Hospital
  if (callData.arrivedAtHospitalAt) {
    events.push({
      type: 'hospital_arrival',
      title: 'Arrived at Hospital',
      description: `Patient delivered to ${callData.assignedHospital || 'hospital'}`,
      timestamp: callData.arrivedAtHospitalAt,
      details: {
        hospital: callData.assignedHospital,
      },
    });
  }

  // 8. Call Completed
  if (callData.completedAt) {
    events.push({
      type: 'completed',
      title: 'Call Completed',
      description: 'Emergency response completed successfully',
      timestamp: callData.completedAt,
    });
  }

  // Sort events by timestamp
  events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return {
    callId: callData.id || 'Unknown',
    events: events,
    status: callData.status,
    duration: calculateTotalDuration(events),
  };
};

// Calculate total duration from first to last event
const calculateTotalDuration = (events) => {
  if (!events || events.length < 2) return null;

  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];

  const start = new Date(firstEvent.timestamp);
  const end = new Date(lastEvent.timestamp);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  const diff = end - start;
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return `${minutes}m ${seconds}s`;
};

// Calculate duration between two specific timestamps
export const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return null;
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  const diff = end - start;
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return `${minutes}m ${seconds}s`;
};

// Get response time (time from call received to driver dispatched)
export const getResponseTime = (callData) => {
  if (!callData.callCreatedAt || !callData.dispatchedAt) return 'N/A';
  return calculateDuration(callData.callCreatedAt, callData.dispatchedAt);
};

// Get pickup time (time from dispatched to patient picked up)
export const getPickupTime = (callData) => {
  if (!callData.dispatchedAt || !callData.driverArrivedAtCallerAt) return 'N/A';
  return calculateDuration(callData.dispatchedAt, callData.driverArrivedAtCallerAt);
};

// Get transport time (time from patient pickup to hospital arrival)
export const getTransportTime = (callData) => {
  if (!callData.driverArrivedAtCallerAt || !callData.arrivedAtHospitalAt) return 'N/A';
  return calculateDuration(callData.driverArrivedAtCallerAt, callData.arrivedAtHospitalAt);
};

// Get total time (time from call created to completed)
export const getTotalTime = (callData) => {
  if (!callData.callCreatedAt || !callData.completedAt) return 'N/A';
  return calculateDuration(callData.callCreatedAt, callData.completedAt);
};
