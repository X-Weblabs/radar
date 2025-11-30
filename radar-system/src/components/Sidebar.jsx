import React from 'react';
import { 
  Hospital, 
  Ambulance, 
  User, 
  Phone, 
  Map, 
  Activity, 
  Users,
  Navigation,
  AlertCircle,
  Bed,
  UserPlus,
  TrendingUp
} from 'lucide-react';

const Sidebar = ({ activeSection, onSectionChange, userRole, stats }) => {
  const getSectionsByRole = () => {
    switch (userRole) {
      case 'admin':
        return [
          { id: 'dashboard', name: 'Dashboard', icon: Activity },
          { id: 'live-map', name: 'Live Tracking', icon: Map },
          { id: 'traffic', name: 'Traffic Conditions', icon: TrendingUp },
          { id: 'hospitals', name: 'Hospitals', icon: Hospital },
          { id: 'ambulances', name: 'Ambulances', icon: Ambulance },
          { id: 'drivers', name: 'Drivers', icon: Users },
          { id: 'calls', name: 'Emergency Calls', icon: Phone },
        ];
      case 'hospital':
        return [
          { id: 'dashboard', name: 'Dashboard', icon: Activity },
          { id: 'patients', name: 'Patient Management', icon: Bed },
          { id: 'check-in', name: 'Check In Patient', icon: UserPlus },
          { id: 'incoming', name: 'Incoming Ambulances', icon: Ambulance },
          { id: 'hospital-info', name: 'Hospital Info', icon: Hospital },
        ];
      case 'driver':
        return [
          { id: 'dispatch', name: 'Current Dispatch', icon: AlertCircle },
          { id: 'navigation', name: 'Navigation', icon: Navigation },
          { id: 'stats', name: 'Statistics', icon: Activity },
        ];
      default:
        return [];
    }
  };

  const sections = getSectionsByRole();

  return (
    <div className="w-56 bg-white border-r border-gray-200 h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Radar System</h2>
            <p className="text-xs text-gray-500">Emergency Response</p>
          </div>
        </div>
      </div>

      {userRole === 'admin' && stats && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-br from-red-50 to-red-100">
          <h3 className="text-xs font-semibold text-gray-700 mb-2">System Overview</h3>
          <div className="space-y-2">
            <div 
              className="flex items-center justify-between p-2 bg-white rounded-lg cursor-pointer hover:bg-red-50 transition-colors"
              onClick={() => onSectionChange('hospitals')}
            >
              <div className="flex items-center gap-2">
                <Hospital className="w-4 h-4 text-red-600" />
                <span className="text-xs text-gray-700">Hospitals</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{stats.hospitals || 0}</span>
            </div>
            
            <div 
              className="flex items-center justify-between p-2 bg-white rounded-lg cursor-pointer hover:bg-red-50 transition-colors"
              onClick={() => onSectionChange('ambulances')}
            >
              <div className="flex items-center gap-2">
                <Ambulance className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-gray-700">Ambulances</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{stats.ambulances || 0}</span>
            </div>
            
            <div 
              className="flex items-center justify-between p-2 bg-white rounded-lg cursor-pointer hover:bg-red-50 transition-colors"
              onClick={() => onSectionChange('drivers')}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" />
                <span className="text-xs text-gray-700">Drivers</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{stats.drivers || 0}</span>
            </div>
            
            <div 
              className="flex items-center justify-between p-2 bg-white rounded-lg cursor-pointer hover:bg-red-50 transition-colors"
              onClick={() => onSectionChange('calls')}
            >
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-red-600" />
                <span className="text-xs text-gray-700">Active Calls</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{stats.activeCalls || 0}</span>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-2 space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            
            return (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-red-50 text-red-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{section.name}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="bg-red-50 rounded-lg p-3">
          <p className="text-xs font-medium text-red-900">Need Help?</p>
          <p className="text-xs text-red-700 mt-1">Contact support for assistance</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
