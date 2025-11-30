import React, { useState, useEffect } from 'react';
import { useJsApiLoader, GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import { Hospital, Ambulance, User, Plus, Edit2, Trash2, X, Navigation, ExternalLink, MapPin } from 'lucide-react';
import { GOOGLE_MAPS_API_KEY } from '../config/googleMaps';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { subscribeToUserLocation, openGoogleMapsDirections, calculateDistance } from '../utils/locationTracking';
import Header from './Header';

const HospitalManagement = () => {
  const { currentUser, userHospitalId } = useAuth();
  const [activeTab, setActiveTab] = useState('drivers');
  const [drivers, setDrivers] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [trackedEntity, setTrackedEntity] = useState(null);
  const [trackedLocation, setTrackedLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showRouteMap, setShowRouteMap] = useState(false);
  const [customProvider, setCustomProvider] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    licenseNumber: '',
    vehicleNumber: '',
    vehicleType: 'ALS',
    capacity: '2',
    driverId: '',
    provider: '',
  });

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  useEffect(() => {
    if (!currentUser || !userHospitalId) return;

    const driversQuery = query(
      collection(db, 'users'),
      where('hospitalId', '==', userHospitalId),
      where('role', '==', 'driver')
    );
    const unsubscribeDrivers = onSnapshot(driversQuery, (snapshot) => {
      const driversList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDrivers(driversList);
    });

    const ambulancesQuery = query(
      collection(db, 'ambulances'),
      where('hospitalId', '==', userHospitalId)
    );
    const unsubscribeAmbulances = onSnapshot(ambulancesQuery, (snapshot) => {
      const ambulancesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAmbulances(ambulancesList);
    });

    const hospitalsQuery = query(collection(db, 'hospitals'));
    const unsubscribeHospitals = onSnapshot(hospitalsQuery, (snapshot) => {
      const hospitalsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHospitals(hospitalsList);
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.error('Error getting location:', error)
      );
    }

    return () => {
      unsubscribeDrivers();
      unsubscribeAmbulances();
      unsubscribeHospitals();
    };
  }, [currentUser, userHospitalId]);

  useEffect(() => {
    if (!trackedEntity) return;

    const unsubscribe = subscribeToUserLocation(
      trackedEntity.id,
      trackedEntity.type === 'driver' ? 'driver' : 'ambulance',
      (location) => {
        setTrackedLocation(location);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [trackedEntity]);

  const handleAddDriver = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'users'), {
        ...formData,
        role: 'driver',
        hospitalId: userHospitalId,
        status: 'available',
        createdAt: new Date().toISOString(),
      });
      setShowAddModal(false);
      resetForm();
      alert('Driver added successfully!');
    } catch (error) {
      console.error('Error adding driver:', error);
      alert('Error adding driver');
    }
  };

  const handleAddAmbulance = async (e) => {
    e.preventDefault();
    try {
      const driver = drivers.find(d => d.id === formData.driverId);
      
      const ambulanceData = {
        vehicleNumber: formData.vehicleNumber,
        vehicleType: formData.vehicleType,
        type: formData.vehicleType,
        capacity: formData.capacity,
        hospitalId: userHospitalId,
        status: 'available',
        driverId: formData.driverId || null,
        driverName: driver ? driver.name : null,
        driverPhone: driver ? driver.phone : null,
        provider: formData.provider,
        currentLocation: userLocation || { lat: -25.7479, lng: 28.2293 },
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'ambulances'), ambulanceData);
      
      if (formData.driverId) {
        const driverRef = doc(db, 'users', formData.driverId);
        await updateDoc(driverRef, {
          ambulanceId: ambulanceData.vehicleNumber,
          status: 'active',
        });
      }

      setShowAddModal(false);
      resetForm();
      setCustomProvider(false);
      alert('Ambulance added successfully!');
    } catch (error) {
      console.error('Error adding ambulance:', error);
      alert('Error adding ambulance');
    }
  };

  const handleUpdateDriver = async (e) => {
    e.preventDefault();
    try {
      const driverRef = doc(db, 'users', selectedItem.id);
      await updateDoc(driverRef, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        licenseNumber: formData.licenseNumber,
        updatedAt: new Date().toISOString(),
      });
      setShowEditModal(false);
      setSelectedItem(null);
      resetForm();
      alert('Driver updated successfully!');
    } catch (error) {
      console.error('Error updating driver:', error);
      alert('Error updating driver');
    }
  };

  const handleUpdateAmbulance = async (e) => {
    e.preventDefault();
    try {
      const driver = drivers.find(d => d.id === formData.driverId);
      const ambulanceRef = doc(db, 'ambulances', selectedItem.id);
      
      await updateDoc(ambulanceRef, {
        vehicleNumber: formData.vehicleNumber,
        vehicleType: formData.vehicleType,
        type: formData.vehicleType,
        capacity: formData.capacity,
        driverId: formData.driverId || null,
        driverName: driver ? driver.name : null,
        driverPhone: driver ? driver.phone : null,
        provider: formData.provider,
        lastUpdated: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      if (formData.driverId && formData.driverId !== selectedItem.driverId) {
        const driverRef = doc(db, 'users', formData.driverId);
        await updateDoc(driverRef, {
          ambulanceId: formData.vehicleNumber,
          status: 'active',
        });
      }

      setShowEditModal(false);
      setSelectedItem(null);
      resetForm();
      setCustomProvider(false);
      alert('Ambulance updated successfully!');
    } catch (error) {
      console.error('Error updating ambulance:', error);
      alert('Error updating ambulance');
    }
  };

  const handleDeleteDriver = async (driverId) => {
    if (window.confirm('Are you sure you want to delete this driver?')) {
      try {
        await deleteDoc(doc(db, 'users', driverId));
        alert('Driver deleted successfully!');
      } catch (error) {
        console.error('Error deleting driver:', error);
        alert('Error deleting driver');
      }
    }
  };

  const handleDeleteAmbulance = async (ambulanceId) => {
    if (window.confirm('Are you sure you want to delete this ambulance?')) {
      try {
        await deleteDoc(doc(db, 'ambulances', ambulanceId));
        alert('Ambulance deleted successfully!');
      } catch (error) {
        console.error('Error deleting ambulance:', error);
        alert('Error deleting ambulance');
      }
    }
  };

  const handleTrack = (entity, type) => {
    setTrackedEntity({ ...entity, type });
    setShowRouteMap(true);
  };

  const handleLiveTracking = () => {
    if (trackedLocation && trackedEntity && userLocation) {
      openGoogleMapsDirections({
        origin: userLocation,
        destination: { lat: trackedLocation.lat, lng: trackedLocation.lng },
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      licenseNumber: '',
      vehicleNumber: '',
      vehicleType: 'ALS',
      capacity: '2',
      driverId: '',
      provider: '',
    });
    setCustomProvider(false);
  };

  const openEditModal = (item, type) => {
    setSelectedItem({ ...item, type });
    if (type === 'driver') {
      setFormData({
        name: item.name || '',
        email: item.email || '',
        phone: item.phone || '',
        licenseNumber: item.licenseNumber || '',
        vehicleNumber: '',
        vehicleType: '',
        capacity: '',
        driverId: '',
        provider: '',
      });
    } else {
      const isCustomProvider = !hospitals.find(h => h.name === item.provider);
      setCustomProvider(isCustomProvider);
      
      setFormData({
        name: '',
        email: '',
        phone: '',
        licenseNumber: '',
        vehicleNumber: item.vehicleNumber || '',
        vehicleType: item.vehicleType || item.type || 'ALS',
        capacity: item.capacity || '2',
        driverId: item.driverId || '',
        provider: item.provider || '',
      });
    }
    setShowEditModal(true);
  };

  const getDistance = () => {
    if (!userLocation || !trackedLocation) return null;
    return calculateDistance(
      userLocation.lat,
      userLocation.lng,
      trackedLocation.lat,
      trackedLocation.lng
    );
  };

  const renderDrivers = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Drivers ({drivers.length})</h2>
        <button
          onClick={() => {
            setActiveTab('drivers');
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
        >
          <Plus className="w-4 h-4" />
          Add Driver
        </button>
      </div>

      <div className="grid gap-4">
        {drivers.map(driver => (
          <div key={driver.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{driver.name}</h3>
                  <p className="text-xs text-gray-600">{driver.email}</p>
                  <p className="text-xs text-gray-600">{driver.phone}</p>
                  <p className="text-xs text-gray-600">License: {driver.licenseNumber}</p>
                  <div className="mt-2">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      driver.status === 'available' ? 'bg-green-100 text-green-700' :
                      driver.status === 'on-duty' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {driver.status || 'available'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleTrack(driver, 'driver')}
                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                  title="Track"
                >
                  <Navigation className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openEditModal(driver, 'driver')}
                  className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteDriver(driver.id)}
                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {drivers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No drivers added yet</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderAmbulances = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Ambulances ({ambulances.length})</h2>
        <button
          onClick={() => {
            setActiveTab('ambulances');
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
        >
          <Plus className="w-4 h-4" />
          Add Ambulance
        </button>
      </div>

      <div className="grid gap-4">
        {ambulances.map(ambulance => (
          <div key={ambulance.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Ambulance className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{ambulance.vehicleNumber}</h3>
                  <p className="text-xs text-gray-600">Type: {ambulance.vehicleType || ambulance.type}</p>
                  <p className="text-xs text-gray-600">Capacity: {ambulance.capacity} patients</p>
                  {ambulance.driverName && (
                    <p className="text-xs text-gray-600">Driver: {ambulance.driverName}</p>
                  )}
                  {ambulance.provider && (
                    <p className="text-xs text-gray-600">Provider: {ambulance.provider}</p>
                  )}
                  <div className="mt-2">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      ambulance.status === 'available' ? 'bg-green-100 text-green-700' :
                      ambulance.status === 'dispatched' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {ambulance.status || 'available'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleTrack(ambulance, 'ambulance')}
                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                  title="Track"
                >
                  <Navigation className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openEditModal(ambulance, 'ambulance')}
                  className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteAmbulance(ambulance.id)}
                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {ambulances.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Ambulance className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No ambulances added yet</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderAddModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">
            Add {activeTab === 'drivers' ? 'Driver' : 'Ambulance'}
          </h3>
          <button onClick={() => { setShowAddModal(false); resetForm(); }}>
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={activeTab === 'drivers' ? handleAddDriver : handleAddAmbulance} className="space-y-3">
          {activeTab === 'drivers' ? (
            <>
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                required
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                required
              />
              <input
                type="text"
                placeholder="License Number"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                required
              />
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="Vehicle Number (e.g., GP-AMB-001)"
                value={formData.vehicleNumber}
                onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                required
              />
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle Type</label>
                <select
                  value={formData.vehicleType}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="ALS">ALS (Advanced Life Support)</option>
                  <option value="BLS">BLS (Basic Life Support)</option>
                  <option value="CCT">CCT (Critical Care Transport)</option>
                  <option value="Neonatal">Neonatal</option>
                </select>
              </div>

              <input
                type="number"
                placeholder="Patient Capacity"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                min="1"
                max="10"
                required
              />

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Assign Driver (Optional)</label>
                <select
                  value={formData.driverId}
                  onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="">-- No Driver Assigned --</option>
                  {drivers.filter(d => !d.ambulanceId || d.ambulanceId === formData.vehicleNumber).map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} - {driver.phone}
                    </option>
                  ))}
                </select>
                {drivers.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">No drivers available. Add drivers first.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Provider/Hospital</label>
                <div className="flex gap-2">
                  <select
                    value={customProvider ? 'custom' : formData.provider}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setCustomProvider(true);
                        setFormData({ ...formData, provider: '' });
                      } else {
                        setCustomProvider(false);
                        setFormData({ ...formData, provider: e.target.value });
                      }
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="">-- Select Provider --</option>
                    {hospitals.map(hospital => (
                      <option key={hospital.id} value={hospital.name}>
                        {hospital.name}
                      </option>
                    ))}
                    <option value="custom">+ Add Custom Provider</option>
                  </select>
                </div>
                {customProvider && (
                  <input
                    type="text"
                    placeholder="Enter provider name (e.g., ER24, Netcare 911)"
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg mt-2"
                    required
                  />
                )}
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700"
            >
              Add {activeTab === 'drivers' ? 'Driver' : 'Ambulance'}
            </button>
            <button
              type="button"
              onClick={() => { setShowAddModal(false); resetForm(); }}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderEditModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">
            Edit {selectedItem?.type === 'driver' ? 'Driver' : 'Ambulance'}
          </h3>
          <button onClick={() => { setShowEditModal(false); setSelectedItem(null); resetForm(); }}>
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={selectedItem?.type === 'driver' ? handleUpdateDriver : handleUpdateAmbulance} className="space-y-3">
          {selectedItem?.type === 'driver' ? (
            <>
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                required
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                required
              />
              <input
                type="text"
                placeholder="License Number"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                required
              />
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="Vehicle Number"
                value={formData.vehicleNumber}
                onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                required
              />
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle Type</label>
                <select
                  value={formData.vehicleType}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="ALS">ALS (Advanced Life Support)</option>
                  <option value="BLS">BLS (Basic Life Support)</option>
                  <option value="CCT">CCT (Critical Care Transport)</option>
                  <option value="Neonatal">Neonatal</option>
                </select>
              </div>

              <input
                type="number"
                placeholder="Patient Capacity"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                min="1"
                max="10"
                required
              />

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Assign Driver (Optional)</label>
                <select
                  value={formData.driverId}
                  onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="">-- No Driver Assigned --</option>
                  {drivers.filter(d => !d.ambulanceId || d.ambulanceId === selectedItem?.vehicleNumber || d.id === formData.driverId).map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} - {driver.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Provider/Hospital</label>
                <div className="flex gap-2">
                  <select
                    value={customProvider ? 'custom' : formData.provider}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setCustomProvider(true);
                        setFormData({ ...formData, provider: '' });
                      } else {
                        setCustomProvider(false);
                        setFormData({ ...formData, provider: e.target.value });
                      }
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="">-- Select Provider --</option>
                    {hospitals.map(hospital => (
                      <option key={hospital.id} value={hospital.name}>
                        {hospital.name}
                      </option>
                    ))}
                    <option value="custom">+ Add Custom Provider</option>
                  </select>
                </div>
                {customProvider && (
                  <input
                    type="text"
                    placeholder="Enter provider name (e.g., ER24, Netcare 911)"
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg mt-2"
                    required
                  />
                )}
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700"
            >
              Update
            </button>
            <button
              type="button"
              onClick={() => { setShowEditModal(false); setSelectedItem(null); resetForm(); }}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderTrackingMap = () => {
    if (!showRouteMap || !trackedEntity) return null;

    const distance = getDistance();

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold">
                Tracking: {trackedEntity.name || trackedEntity.vehicleNumber}
              </h3>
              {distance && (
                <p className="text-sm text-gray-600">Distance: {distance.toFixed(2)} km</p>
              )}
            </div>
            <button onClick={() => { setShowRouteMap(false); setTrackedEntity(null); setTrackedLocation(null); }}>
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="h-[55vh] min-h-[320px] rounded-lg overflow-hidden border border-gray-200 mb-4">
            {isLoaded && userLocation ? (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={trackedLocation || userLocation}
                zoom={13}
              >
                {userLocation && (
                  <Marker
                    position={userLocation}
                    icon="http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                    title="Your Location"
                  />
                )}

                {trackedLocation && (
                  <>
                    <Marker
                      position={{ lat: trackedLocation.lat, lng: trackedLocation.lng }}
                      icon={trackedEntity.type === 'driver' 
                        ? "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
                        : "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                      }
                      title={trackedEntity.name || trackedEntity.vehicleNumber}
                    />

                    {userLocation && (
                      <Polyline
                        path={[
                          userLocation,
                          { lat: trackedLocation.lat, lng: trackedLocation.lng }
                        ]}
                        options={{
                          strokeColor: '#0EA5E9',
                          strokeOpacity: 0.8,
                          strokeWeight: 3,
                        }}
                      />
                    )}
                  </>
                )}
              </GoogleMap>
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-100">
                <Navigation className="w-10 h-10 text-gray-400 animate-spin" />
              </div>
            )}
          </div>

          <div className="space-y-3">
            {trackedLocation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-semibold text-blue-900">Current Location</p>
                </div>
                <p className="text-xs text-blue-700">
                  Coordinates: {trackedLocation.lat.toFixed(6)}, {trackedLocation.lng.toFixed(6)}
                </p>
                <p className="text-xs text-blue-700">
                  Last Update: {new Date(trackedLocation.timestamp).toLocaleString()}
                </p>
              </div>
            )}

            <button
              onClick={handleLiveTracking}
              disabled={!trackedLocation || !userLocation}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-sm font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ExternalLink className="w-4 h-4" />
              Open Live Navigation in Google Maps
            </button>

            {!trackedLocation && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                <p className="text-xs text-yellow-700">
                  Waiting for location data... Make sure the {trackedEntity.type} is logged in and location tracking is enabled.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Hospital Management" subtitle="Manage Drivers & Ambulances" />
      
      <div className="max-w-7xl mx-auto p-4">
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('drivers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'drivers'
                ? 'bg-teal-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <User className="w-4 h-4" />
            Drivers
          </button>
          <button
            onClick={() => setActiveTab('ambulances')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'ambulances'
                ? 'bg-teal-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Ambulance className="w-4 h-4" />
            Ambulances
          </button>
        </div>

        {activeTab === 'drivers' && renderDrivers()}
        {activeTab === 'ambulances' && renderAmbulances()}
      </div>

      {showAddModal && renderAddModal()}
      {showEditModal && renderEditModal()}
      {renderTrackingMap()}
    </div>
  );
};

export default HospitalManagement;
