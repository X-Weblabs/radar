import React, { useState, useEffect } from 'react';
import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api';
import { Plus, Hospital, Ambulance, User, Map, Activity, Phone, X, MapPin, Navigation } from 'lucide-react';
import { collection, addDoc, query, orderBy, setDoc, doc, onSnapshot, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut, deleteUser } from 'firebase/auth';
import { db, secondaryAuth } from '../config/firebase';
import { formatTimestamp, getStatusColor } from '../utils/helpers';
import { convertCallToTimeline } from '../utils/timelineHelpers';
import Header from './Header';
import Sidebar from './Sidebar';
import LiveMapSection from './LiveMapSection';
import TrafficSection from './TrafficSection';
import EmergencyTimeline from './EmergencyTimeline';
import { defaultCenter, GOOGLE_MAPS_API_KEY } from '../config/googleMaps';

const initialHospitalState = {
  name: '',
  address: '',
  contactNumber: '',
  totalUnits: '',
  type: 'public',
  adminEmail: '',
  adminPassword: '',
  location: { ...defaultCenter },
};

const SystemAdmin = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [activeTab, setActiveTab] = useState('hospitals');
  const [hospitals, setHospitals] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [emergencyCalls, setEmergencyCalls] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [pendingLocation, setPendingLocation] = useState(defaultCenter);
  const { isLoaded: mapsLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });


  const [newHospital, setNewHospital] = useState(() => ({ ...initialHospitalState }));

  const [newAmbulance, setNewAmbulance] = useState({
    vehicleNumber: '',
    provider: '',
    type: 'ALS',
    driverId: '',
  });
  const mapContainerStyle = { width: '100%', height: '100%' };

  useEffect(() => {
    const hospitalsRef = collection(db, 'hospitals');
    const ambulancesRef = collection(db, 'ambulances');
    const driversQuery = query(collection(db, 'users'), where('role', '==', 'driver'));
    const callsQuery = query(collection(db, 'emergencyCalls'), orderBy('timestamp', 'desc'));

    const unsubscribeHospitals = onSnapshot(hospitalsRef, (snapshot) => {
      setHospitals(snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() })));
    });

    const unsubscribeAmbulances = onSnapshot(ambulancesRef, (snapshot) => {
      setAmbulances(snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() })));
    });

    const unsubscribeDrivers = onSnapshot(driversQuery, (snapshot) => {
      setDrivers(snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() })));
    });

    const unsubscribeCalls = onSnapshot(callsQuery, (snapshot) => {
      setEmergencyCalls(snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() })));
    });

    return () => {
      unsubscribeHospitals();
      unsubscribeAmbulances();
      unsubscribeDrivers();
      unsubscribeCalls();
    };
  }, []);

  const handleAddHospital = async (e) => {
    e.preventDefault();
    if (!newHospital.adminEmail || !newHospital.adminPassword) {
      alert('Please provide hospital admin email and password.');
      return;
    }

    const trimmedEmail = newHospital.adminEmail.trim().toLowerCase();
    const hospitalRef = doc(collection(db, 'hospitals'));
    const timestamp = new Date().toISOString();
    let adminCredential = null;
    let adminUserId = null;

    if (!newHospital.location || !newHospital.location.lat || !newHospital.location.lng) {
      alert('Please select the hospital location on the map.');
      return;
    }

    try {
      adminCredential = await createUserWithEmailAndPassword(secondaryAuth, trimmedEmail, newHospital.adminPassword);
      adminUserId = adminCredential.user.uid;

      await setDoc(doc(db, 'users', adminUserId), {
        email: trimmedEmail,
        role: 'hospital',
        hospitalId: hospitalRef.id,
        hospitalName: newHospital.name,
        createdAt: timestamp,
      });

      const hospitalData = {
        name: newHospital.name,
        address: newHospital.address,
        contactNumber: newHospital.contactNumber,
        totalUnits: parseInt(newHospital.totalUnits, 10),
        occupiedUnits: 0,
        type: newHospital.type,
        location: { ...newHospital.location },
        adminEmail: trimmedEmail,
        adminUserId,
        adminCreated: true,
        createdAt: timestamp,
      };

      await setDoc(hospitalRef, hospitalData);

      setNewHospital({ ...initialHospitalState });
      setShowAddForm(false);

      alert(`Hospital and admin account created successfully!\n\nAdmin Email: ${trimmedEmail}`);
    } catch (error) {
      console.error('Error adding hospital:', error);
      if (adminCredential?.user) {
        try {
          await deleteUser(adminCredential.user);
        } catch (cleanupError) {
          console.error('Error cleaning up admin user:', cleanupError);
        }
      }
      alert(`Error adding hospital: ${error.message}`);
    } finally {
      try {
        await signOut(secondaryAuth);
      } catch (logoutError) {
        console.warn('Secondary auth sign-out skipped:', logoutError.message);
      }
    }
  };

  const handleLocationConfirm = () => {
    setNewHospital((prev) => ({ ...prev, location: { ...pendingLocation } }));
    setLocationPickerOpen(false);
  };

  const handleLocationCancel = () => {
    setLocationPickerOpen(false);
    setPendingLocation(newHospital.location || defaultCenter);
  };

  const handleAddAmbulance = async (e) => {
    e.preventDefault();
    try {
      const ambulanceData = {
        ...newAmbulance,
        status: 'available',
        currentLocation: { ...defaultCenter },
        lastUpdated: new Date().toISOString(),
      };
      await addDoc(collection(db, 'ambulances'), ambulanceData);
      setNewAmbulance({ vehicleNumber: '', provider: '', type: 'ALS', driverId: '' });
      setShowAddForm(false);
      alert('Ambulance added successfully!');
    } catch (error) {
      console.error('Error adding ambulance:', error);
      alert('Error adding ambulance');
    }
  };

  const renderDashboard = () => (
    <div>
      <div className="bg-white border border-red-100 rounded-lg p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-600"></div>
        <div className="absolute right-0 top-0 w-32 h-32 bg-red-50 rounded-bl-full opacity-50 -z-10"></div>
        
        <h2 className="text-2xl font-bold mb-2 text-gray-900">Welcome to Radar System</h2>
        <p className="text-gray-600">Emergency Response Management Dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Hospital className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Total Hospitals</p>
              <p className="text-2xl font-bold text-gray-900">{hospitals.length}</p>
            </div>
          </div>
          <button
            onClick={() => setActiveSection('hospitals')}
            className="w-full text-xs text-red-600 hover:text-red-700 font-medium"
          >
            View All →
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Ambulance className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Active Ambulances</p>
              <p className="text-2xl font-bold text-gray-900">{ambulances.length}</p>
            </div>
          </div>
          <button
            onClick={() => setActiveSection('ambulances')}
            className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            View All →
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Registered Drivers</p>
              <p className="text-2xl font-bold text-gray-900">{drivers.length}</p>
            </div>
          </div>
          <button
            onClick={() => setActiveSection('drivers')}
            className="w-full text-xs text-green-600 hover:text-green-700 font-medium"
          >
            View All →
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Emergency Calls</p>
              <p className="text-2xl font-bold text-gray-900">
                {emergencyCalls.filter(c => c.status === 'dispatched' || c.status === 'pending').length}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveSection('calls')}
            className="w-full text-xs text-red-600 hover:text-red-700 font-medium"
          >
            View All →
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Map className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Live Tracking</p>
              <p className="text-sm font-medium text-gray-900">Real-time Map</p>
            </div>
          </div>
          <button
            onClick={() => setActiveSection('live-map')}
            className="w-full text-xs text-gray-600 hover:text-gray-700 font-medium"
          >
            Open Map →
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Traffic Monitor</p>
              <p className="text-sm font-medium text-gray-900">Live Conditions</p>
            </div>
          </div>
          <button
            onClick={() => setActiveSection('traffic')}
            className="w-full text-xs text-red-600 hover:text-red-700 font-medium"
          >
            View Traffic →
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {emergencyCalls.slice(0, 5).map(call => (
            <div key={call.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Emergency Call #{call.id.substring(0, 8)}
                </p>
                <p className="text-xs text-gray-600">{call.description}</p>
              </div>
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                call.status === 'dispatched' ? 'bg-blue-100 text-blue-700' :
                call.status === 'completed' ? 'bg-green-100 text-green-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {call.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboard();
      case 'live-map':
        return <LiveMapSection ambulances={ambulances} emergencyCalls={emergencyCalls} />;
      case 'traffic':
        return <TrafficSection />;
      case 'hospitals':
      case 'ambulances':
      case 'drivers':
      case 'calls':
        return renderTabContent();
      default:
        return renderDashboard();
    }
  };

  const renderTabContent = () => (
    <div>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
            {['hospitals', 'ambulances', 'drivers', 'calls'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 px-4 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-red-50 text-red-600 border-b-2 border-red-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-4">
            {activeTab === 'hospitals' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-semibold">Hospitals in System</h2>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="bg-gradient-to-r from-red-600 to-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:from-red-700 hover:to-red-800"
                  >
                    <Plus className="w-4 h-4" />
                    Add Hospital
                  </button>
                </div>

                {showAddForm && (
                  <form onSubmit={handleAddHospital} className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Hospital Name"
                        value={newHospital.name}
                        onChange={(e) => setNewHospital({ ...newHospital, name: e.target.value })}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Address"
                        value={newHospital.address}
                        onChange={(e) => setNewHospital({ ...newHospital, address: e.target.value })}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Contact Number"
                        value={newHospital.contactNumber}
                        onChange={(e) => setNewHospital({ ...newHospital, contactNumber: e.target.value })}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Total Units"
                        value={newHospital.totalUnits}
                        onChange={(e) => setNewHospital({ ...newHospital, totalUnits: e.target.value })}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
                        required
                      />
                      <select
                        value={newHospital.type}
                        onChange={(e) => setNewHospital({ ...newHospital, type: e.target.value })}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
                      >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                      <div className="col-span-2 flex flex-col gap-2">
                        <label className="text-xs font-medium text-gray-700">Hospital Location (Latitude, Longitude)</label>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-red-500" />
                            {newHospital.location
                              ? `${newHospital.location.lat.toFixed(4)}, ${newHospital.location.lng.toFixed(4)}`
                              : 'Not set'}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setPendingLocation(newHospital.location || defaultCenter);
                              setLocationPickerOpen(true);
                            }}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700"
                          >
                            {newHospital.location ? 'Update Location' : 'Set Location'}
                          </button>
                        </div>
                      </div>
                      <input
                        type="email"
                        placeholder="Admin Email"
                        value={newHospital.adminEmail}
                        onChange={(e) => setNewHospital({ ...newHospital, adminEmail: e.target.value })}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
                        required
                      />
                      <input
                        type="password"
                        placeholder="Admin Password"
                        value={newHospital.adminPassword}
                        onChange={(e) => setNewHospital({ ...newHospital, adminPassword: e.target.value })}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
                        required
                      />
                      <button
                        type="submit"
                        className="bg-red-600 text-white px-4 py-2 text-sm rounded-lg font-medium hover:bg-red-700"
                      >
                        Save Hospital
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid gap-3">
                  {hospitals.map(hospital => (
                    <div key={hospital.id} className="border border-gray-200 rounded-lg p-3 hover:border-red-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                          <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Hospital className="w-4 h-4 text-red-600" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">{hospital.name}</h3>
                            <p className="text-xs text-gray-600">{hospital.address}</p>
                            <p className="text-xs text-gray-600">{hospital.contactNumber}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-600">
                            Units: {hospital.occupiedUnits}/{hospital.totalUnits}
                          </div>
                          <div className={`inline-block px-2 py-1 rounded-md text-xs font-medium mt-1 ${
                            hospital.occupiedUnits >= hospital.totalUnits 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {hospital.occupiedUnits >= hospital.totalUnits ? 'Full' : 'Available'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'ambulances' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-semibold">Ambulances in System</h2>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="bg-gradient-to-r from-red-600 to-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Ambulance
                  </button>
                </div>

                {showAddForm && (
                  <form onSubmit={handleAddAmbulance} className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Vehicle Number"
                        value={newAmbulance.vehicleNumber}
                        onChange={(e) => setNewAmbulance({ ...newAmbulance, vehicleNumber: e.target.value })}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Provider"
                        value={newAmbulance.provider}
                        onChange={(e) => setNewAmbulance({ ...newAmbulance, provider: e.target.value })}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
                        required
                      />
                      <select
                        value={newAmbulance.type}
                        onChange={(e) => setNewAmbulance({ ...newAmbulance, type: e.target.value })}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
                      >
                        <option value="ALS">ALS (Advanced Life Support)</option>
                        <option value="BLS">BLS (Basic Life Support)</option>
                      </select>
                      <button
                        type="submit"
                        className="bg-red-600 text-white px-4 py-2 text-sm rounded-lg font-medium hover:bg-red-700"
                      >
                        Save Ambulance
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid gap-3">
                  {ambulances.map(ambulance => (
                    <div key={ambulance.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-3">
                          <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Ambulance className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">{ambulance.vehicleNumber}</h3>
                            <p className="text-xs text-gray-600">Provider: {ambulance.provider}</p>
                            <p className="text-xs text-gray-600">Type: {ambulance.type}</p>
                            <p className="text-xs text-gray-600">Driver: {ambulance.driverName || 'Not assigned'}</p>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-lg text-xs font-medium ${getStatusColor(ambulance.status)}`}>
                          {ambulance.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'drivers' && (
              <div>
                <h2 className="text-base font-semibold mb-4">Registered Drivers</h2>
                <div className="grid gap-3">
                  {drivers.map(driver => (
                    <div key={driver.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex gap-3">
                        <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">{driver.name}</h3>
                          <p className="text-xs text-gray-600">{driver.email}</p>
                          <p className="text-xs text-gray-600">{driver.phone}</p>
                          <p className="text-xs text-gray-600">License: {driver.license}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'calls' && (
              <div>
                <h2 className="text-base font-semibold mb-4">Emergency Call Logs</h2>
                <div className="grid gap-3">
                  {emergencyCalls.map(call => (
                    <div 
                      key={call.id} 
                      className="border border-gray-200 rounded-lg p-3 hover:border-red-300 cursor-pointer transition-colors"
                      onClick={() => setSelectedCall(call)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-sm font-semibold text-gray-900">Call #{call.id.substring(0, 8)}</h3>
                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                              call.status === 'dispatched' ? 'bg-blue-100 text-blue-700' :
                              call.status === 'completed' ? 'bg-green-100 text-green-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {call.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">Phone: {call.callerPhone}</p>
                          <p className="text-xs text-gray-600">Location: {call.address || 'GPS Coordinates'}</p>
                          <p className="text-xs text-gray-600 mt-1">{call.description}</p>
                          <p className="text-xs text-gray-500 mt-1">{formatTimestamp(call.timestamp)}</p>
                        </div>
                        {call.dispatchedAmbulance && (
                          <div className="text-xs text-gray-600">
                            <p>Ambulance: {call.dispatchedAmbulance}</p>
                            {call.eta && <p>ETA: {call.eta}</p>}
                          </div>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-red-600 font-medium">
                        Click to view timeline →
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
      </div>
    </div>
  );

  const sidebarStats = {
    hospitals: hospitals.length,
    ambulances: ambulances.length,
    drivers: drivers.length,
    activeCalls: emergencyCalls.filter(c => c.status === 'dispatched' || c.status === 'pending').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="System Administrator" subtitle="Radar Emergency Response System" />
      <div className="flex">
        <Sidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection}
          userRole="admin"
          stats={sidebarStats}
        />
        <div className="flex-1 p-6">
          {renderContent()}
        </div>
      </div>

      {/* Emergency Call Timeline Modal */}
      {selectedCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Call Details & Timeline</h2>
                <p className="text-sm text-gray-600">Call #{selectedCall.id.substring(0, 8)}</p>
              </div>
              <button
                onClick={() => setSelectedCall(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {(() => {
                const timelineData = selectedCall.callLog || convertCallToTimeline(selectedCall);
                if (timelineData && timelineData.events && timelineData.events.length > 0) {
                  return <EmergencyTimeline callLog={timelineData} />;
                }

                return (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No timeline data available for this call</p>
                    <p className="text-xs mt-2">Timeline data will be generated once dispatch begins</p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {locationPickerOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Set Hospital Location</h3>
                <p className="text-xs text-gray-600">Click on the map to place the hospital marker.</p>
              </div>
              <button onClick={handleLocationCancel} className="p-2 text-gray-500 hover:text-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1">
              <div className="h-[50vh] rounded-lg overflow-hidden border border-gray-200">
                {mapsLoaded ? (
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={pendingLocation}
                    zoom={13}
                    onClick={(event) => {
                      const lat = event.latLng.lat();
                      const lng = event.latLng.lng();
                      setPendingLocation({ lat, lng });
                    }}
                  >
                    <Marker position={pendingLocation} />
                  </GoogleMap>
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gray-100">
                    <Navigation className="w-10 h-10 text-gray-400 animate-spin" />
                  </div>
                )}
              </div>
              <div className="mt-4 text-xs text-gray-600">
                Selected: {pendingLocation.lat.toFixed(5)}, {pendingLocation.lng.toFixed(5)}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 p-4 border-t border-gray-200">
              <button
                onClick={handleLocationConfirm}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-red-700 hover:to-red-800"
              >
                Confirm Location
              </button>
              <button
                onClick={handleLocationCancel}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemAdmin;
