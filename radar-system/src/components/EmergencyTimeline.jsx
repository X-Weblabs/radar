import React from 'react';
import { Clock, Phone, Ambulance, Navigation2, Hospital, CheckCircle, AlertTriangle } from 'lucide-react';

const EmergencyTimeline = ({ callLog }) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return null;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
    const diff = endDate - startDate;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const formatDetailValue = (value) => {
    if (value === null || value === undefined) return 'Unknown';
    if (typeof value === 'object') {
      if (typeof value.lat === 'number' && typeof value.lng === 'number') {
        return `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}`;
      }
      try {
        return JSON.stringify(value);
      } catch (error) {
        return 'Details unavailable';
      }
    }
    return value;
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'call_received':
        return <Phone className="w-4 h-4 text-red-600" />;
      case 'dispatched':
        return <Ambulance className="w-4 h-4 text-blue-600" />;
      case 'en_route':
        return <Navigation2 className="w-4 h-4 text-red-600" />;
      case 'caller_picked':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'hospital_arrival':
        return <Hospital className="w-4 h-4 text-blue-600" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'forwarded':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'call_received':
        return 'border-red-300 bg-red-50';
      case 'dispatched':
        return 'border-blue-300 bg-blue-50';
      case 'en_route':
        return 'border-red-300 bg-red-50';
      case 'caller_picked':
        return 'border-green-300 bg-green-50';
      case 'hospital_arrival':
        return 'border-blue-300 bg-blue-50';
      case 'completed':
        return 'border-green-300 bg-green-50';
      case 'forwarded':
        return 'border-red-300 bg-red-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  if (!callLog || !callLog.events || callLog.events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No timeline data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Emergency Timeline</h3>
          <span className="text-xs text-gray-600">Call ID: {callLog.callId}</span>
        </div>

        <div className="relative">
          <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-gray-200"></div>

          <div className="space-y-6">
            {callLog.events.map((event, index) => {
              const nextEvent = callLog.events[index + 1];
              const duration = nextEvent 
                ? calculateDuration(event.timestamp, nextEvent.timestamp) 
                : null;

              return (
                <div key={index} className="relative pl-12">
                  <div className={`absolute left-0 w-10 h-10 rounded-full border-2 flex items-center justify-center ${getEventColor(event.type)}`}>
                    {getEventIcon(event.type)}
                  </div>

                  <div className={`border rounded-lg p-3 ${getEventColor(event.type)}`}>
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="text-sm font-semibold text-gray-900">{event.title}</h4>
                      <span className="text-xs font-mono text-gray-600">{formatTime(event.timestamp)}</span>
                    </div>
                    
                    {event.description && (
                      <p className="text-xs text-gray-700 mb-1">{event.description}</p>
                    )}

                    {event.details && (
                      <div className="text-xs text-gray-600 space-y-0.5">
                        {Object.entries(event.details).map(([key, value]) => (
                          <div key={key}>
                                <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span> {formatDetailValue(value)}
                          </div>
                        ))}
                      </div>
                    )}

                    {duration && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <div className="flex-1 border-t-2 border-dotted border-gray-300"></div>
                          <span className="font-medium">Duration: {duration}</span>
                          <div className="flex-1 border-t-2 border-dotted border-gray-300"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-600">Call Received</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatTime(callLog.events[0]?.timestamp)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">First Dispatch</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatTime(callLog.events.find(e => e.type === 'dispatched')?.timestamp) || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Patient Picked</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatTime(callLog.events.find(e => e.type === 'caller_picked')?.timestamp) || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Completed</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatTime(callLog.events.find(e => e.type === 'completed')?.timestamp) || 'Ongoing'}
              </p>
            </div>
          </div>
        </div>

        {callLog.totalResponseTime && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">Total Response Time</span>
              <span className="text-lg font-bold text-blue-600">{callLog.totalResponseTime}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencyTimeline;

export const sampleCallLog = {
  callId: 'CALL-2025-001',
  callerId: '+27 82 123 4567',
  totalResponseTime: '18m 45s',
  events: [
    {
      type: 'call_received',
      title: 'Emergency Call Received',
      timestamp: '2025-11-21T09:30:15',
      description: 'Caller reported chest pain and difficulty breathing',
      details: {
        location: '123 Main Street, Pretoria',
        gender: 'Male',
        room_number: 'House 15',
      },
    },
    {
      type: 'dispatched',
      title: 'Ambulance Dispatched',
      timestamp: '2025-11-21T09:30:25',
      description: 'AI dispatched nearest available ambulance',
      details: {
        driver: 'Jane Doe',
        ambulance: 'AZ325',
        provider: 'ER24',
      },
    },
    {
      type: 'en_route',
      title: 'En Route to Caller',
      timestamp: '2025-11-21T09:31:00',
      description: 'Driver confirmed and proceeding to location',
      details: {
        estimated_eta: '8 minutes',
      },
    },
    {
      type: 'caller_picked',
      title: 'Patient Picked Up',
      timestamp: '2025-11-21T09:38:45',
      description: 'Patient loaded into ambulance',
      details: {
        response_time: '8m 30s',
      },
    },
    {
      type: 'en_route',
      title: 'En Route to Hospital',
      timestamp: '2025-11-21T09:40:00',
      description: 'Proceeding to nearest available hospital',
      details: {
        hospital: 'Pretoria General Hospital',
        estimated_eta: '12 minutes',
      },
    },
    {
      type: 'hospital_arrival',
      title: 'Arrived at Hospital',
      timestamp: '2025-11-21T09:48:30',
      description: 'Ambulance arrived at hospital emergency department',
      details: {
        hospital: 'Pretoria General Hospital',
      },
    },
    {
      type: 'completed',
      title: 'Call Completed',
      timestamp: '2025-11-21T09:49:00',
      description: 'Patient successfully handed over to hospital staff',
      details: {
        total_time: '18m 45s',
      },
    },
  ],
};

export const sampleForwardedCallLog = {
  callId: 'CALL-2025-002',
  callerId: '+27 83 234 5678',
  totalResponseTime: '15m 20s',
  events: [
    {
      type: 'call_received',
      title: 'Emergency Call Received',
      timestamp: '2025-11-21T10:15:30',
      description: 'Motor vehicle accident reported',
      details: {
        location: '456 Oak Avenue, Centurion',
        gender: 'Female',
        room_number: 'N/A',
      },
    },
    {
      type: 'dispatched',
      title: 'Ambulance Dispatched',
      timestamp: '2025-11-21T10:15:42',
      description: 'First ambulance dispatched',
      details: {
        driver: 'John Smith',
        ambulance: 'AZ123',
        provider: 'Netcare 911',
      },
    },
    {
      type: 'forwarded',
      title: 'Dispatch Forwarded',
      timestamp: '2025-11-21T10:18:12',
      description: 'First driver unable to proceed',
      details: {
        reason: 'Vehicle mechanical issue',
        forwarded_by: 'John Smith (AZ123)',
      },
    },
    {
      type: 'dispatched',
      title: 'Re-dispatched to Alternative Ambulance',
      timestamp: '2025-11-21T10:18:25',
      description: 'AI found alternative ambulance',
      details: {
        driver: 'John Doe',
        ambulance: 'AZ786',
        provider: 'ER24',
      },
    },
    {
      type: 'caller_picked',
      title: 'Patient Picked Up',
      timestamp: '2025-11-21T10:25:50',
      description: 'Patient loaded into ambulance',
      details: {
        response_time: '10m 20s',
      },
    },
    {
      type: 'hospital_arrival',
      title: 'Arrived at Hospital',
      timestamp: '2025-11-21T10:30:10',
      description: 'Delivered to Life Groenkloof Hospital',
      details: {
        hospital: 'Life Groenkloof Hospital',
      },
    },
    {
      type: 'completed',
      title: 'Call Completed',
      timestamp: '2025-11-21T10:30:50',
      description: 'Patient successfully handed over',
      details: {
        total_time: '15m 20s',
      },
    },
  ],
};
