import React, { useState, useEffect } from 'react';
import { useJsApiLoader, GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { Hospital, Ambulance, User, Phone, MapPin, Clock, AlertCircle, Navigation2, Star, ExternalLink, X, Plus, UserPlus, UserMinus, Edit2, Trash2 } from 'lucide-react';
import { GOOGLE_MAPS_API_KEY } from '../config/googleMaps';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, secondaryAuth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { calculateDistance, calculateETA, formatTimestamp } from '../utils/helpers';
import { openGoogleMapsDirections } from '../utils/locationTracking';
import Header from './Header';

const HospitalAdminNew = () => {
  const { currentUser, userHospitalId, userHospitalName } = useAuth();
  const [activeSection, setActiveSection] = useState('hospitals');
  const [hospitals, setHospitals] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [emergencyCalls, setEmergencyCalls] = useState([]);
  const [trackingAmbulance, setTrackingAmbulance] = useState(null);
  const [trackingDriver, setTrackingDriver] = useState(null);
  const [hospitalLocation, setHospitalLocation] = useState({ lat: -25.7479, lng: 28.2293 });
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [showAddAmbulanceModal, setShowAddAmbulanceModal] = useState(false);
  const [driverForm, setDriverForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [ambulanceForm, setAmbulanceForm] = useState({ vehicleNumber: '', provider: '', vehicleType: 'ALS', capacity: '2', driverId: '', paramedics: '' });
  const [paramedicsInput, setParamedicsInput] = useState('');
  const [paramedicsChips, setParamedicsChips] = useState([]);
  const [showEditAmbulanceModal, setShowEditAmbulanceModal] = useState(false);
  const [editingAmbulance, setEditingAmbulance] = useState(null);
  const [editAmbulanceForm, setEditAmbulanceForm] = useState({ driverId: '', paramedics: '' });
  const [editParamedicsChips, setEditParamedicsChips] = useState([]);
  const [showEditDriverModal, setShowEditDriverModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [editDriverForm, setEditDriverForm] = useState({ phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patients, setPatients] = useState([]);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [patientForm, setPatientForm] = useState({ name: '', unit: '', condition: '', status: 'stable' });

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  useEffect(() => {
    if (!currentUser || !userHospitalId) return;

    // Get hospital data
    const hospitalsQuery = query(
      collection(db, 'hospitals'),
      where('__name__', '==', userHospitalId)
    );
    const unsubscribeHospitals = onSnapshot(hospitalsQuery, (snapshot) => {
      const hospitalsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHospitals(hospitalsList);
      if (hospitalsList.length > 0) {
        const hospitalRecord = hospitalsList[0];
        if (hospitalRecord.location) {
          setHospitalLocation(hospitalRecord.location);
        }
        setPatients(hospitalRecord.patients || []);
      }
    });

    // Get drivers for this hospital
    const driversQuery = query(
      collection(db, 'users'),
      where('hospitalId', '==', userHospitalId),
      where('role', '==', 'driver')
    );
    const unsubscribeDrivers = onSnapshot(driversQuery, (snapshot) => {
      const driversList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDrivers(driversList);
    });

    // Get ambulances for this hospital
    const ambulancesQuery = query(
      collection(db, 'ambulances'),
      where('hospitalId', '==', userHospitalId)
    );
    const unsubscribeAmbulances = onSnapshot(ambulancesQuery, (snapshot) => {
      const ambulancesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAmbulances(ambulancesList);
    });

    const callDocs = new Map();
    const callUnsubscribers = [];
    setEmergencyCalls([]);

    const updateEmergencyCallState = () => {
      const callsList = Array.from(callDocs.values()).sort(
        (a, b) => new Date(b.timestamp || b.callCreatedAt || 0) - new Date(a.timestamp || a.callCreatedAt || 0)
      );
      setEmergencyCalls(callsList);
    };

    const registerCallListener = (field, value) => {
      if (!value) return;
      const callsQuery = query(collection(db, 'emergencyCalls'), where(field, '==', value));
      const unsubscribe = onSnapshot(
        callsQuery,
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'removed') {
              callDocs.delete(change.doc.id);
              return;
            }
            callDocs.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
          });
          updateEmergencyCallState();
        },
        (error) => console.error('Error loading emergency calls:', error)
      );
      callUnsubscribers.push(unsubscribe);
    };

    registerCallListener('assignedHospitalId', userHospitalId);
    registerCallListener('assignedHospital', userHospitalName);

    return () => {
      unsubscribeHospitals();
      unsubscribeDrivers();
      unsubscribeAmbulances();
      callUnsubscribers.forEach(unsub => unsub());
    };
  }, [currentUser, userHospitalId, userHospitalName]);

  const getDriverStats = (driverId) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return { dispatchCount: 0, avgResponseTime: 'N/A', forwardedCalls: 0 };
    
    return {
      dispatchCount: driver.dispatchCount || 0,
      avgResponseTime: driver.avgResponseTime || 'N/A',
      forwardedCalls: driver.forwardedCalls || 0,
    };
  };

  const calculateDistanceToHospital = (ambulanceLocation) => {
    const distance = calculateDistance(
      ambulanceLocation.lat,
      ambulanceLocation.lng,
      hospitalLocation.lat,
      hospitalLocation.lng
    );
    return distance;
  };

  const isNearHospital = (ambulanceLocation, threshold = 2) => {
    const distance = calculateDistanceToHospital(ambulanceLocation);
    return distance <= threshold;
  };

  const openRouteFromHospital = (targetLocation) => {
    if (!targetLocation || !hospitalLocation) return;
    openGoogleMapsDirections({
      origin: hospitalLocation,
      destination: targetLocation,
    });
  };

  const handleTrackAmbulance = (ambulance) => {
    setTrackingAmbulance(ambulance);
  };

  const handleTrackDriver = (driver) => {
    const ambulance = ambulances.find(a => a.driverId === driver.id);
    setTrackingDriver({ ...driver, ambulance });
  };

  const availableDrivers = drivers.filter(driver => !ambulances.some(amb => amb.driverId === driver.id));

  const resetDriverForm = () => setDriverForm({ name: '', email: '', phone: '', password: '' });
  const resetAmbulanceForm = () => {
    setAmbulanceForm({ vehicleNumber: '', provider: '', vehicleType: 'ALS', capacity: '2', driverId: '', paramedics: '' });
    setParamedicsInput('');
    setParamedicsChips([]);
  };
  const resetPatientForm = () => setPatientForm({ name: '', unit: '', condition: '', status: 'stable' });

  const handleParamedicsKeyDown = (e) => {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      const value = paramedicsInput.trim();
      if (value && !paramedicsChips.includes(value)) {
        setParamedicsChips([...paramedicsChips, value]);
      }
      setParamedicsInput('');
    } else if (e.key === 'Backspace' && !paramedicsInput && paramedicsChips.length > 0) {
      setParamedicsChips(paramedicsChips.slice(0, -1));
    }
  };

  const removeParamedicChip = (index) => {
    setParamedicsChips(paramedicsChips.filter((_, i) => i !== index));
  };

  const handleEditParamedicsKeyDown = (e, inputValue, setInputValue) => {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      const value = inputValue.trim();
      if (value && !editParamedicsChips.includes(value)) {
        setEditParamedicsChips([...editParamedicsChips, value]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && editParamedicsChips.length > 0) {
      setEditParamedicsChips(editParamedicsChips.slice(0, -1));
    }
  };

  const removeEditParamedicChip = (index) => {
    setEditParamedicsChips(editParamedicsChips.filter((_, i) => i !== index));
  };

  const getDriverDispatchCount = (driverId) => {
    return emergencyCalls.filter(call => call.assignedDriverId === driverId).length;
  };

  const handleOpenEditAmbulance = (ambulance) => {
    setEditingAmbulance(ambulance);
    setEditAmbulanceForm({
      driverId: ambulance.driverId || '',
      paramedics: '',
    });
    setEditParamedicsChips(ambulance.paramedics || []);
    setShowEditAmbulanceModal(true);
  };

  const handleEditAmbulance = async (e) => {
    e.preventDefault();
    if (!editingAmbulance) return;
    setIsSubmitting(true);
    try {
      const ambulanceRef = doc(db, 'ambulances', editingAmbulance.id);
      const selectedDriver = drivers.find(d => d.id === editAmbulanceForm.driverId);
      const previousDriverId = editingAmbulance.driverId;

      await updateDoc(ambulanceRef, {
        driverId: selectedDriver?.id || null,
        driverName: selectedDriver?.name || null,
        driverPhone: selectedDriver?.phone || null,
        paramedics: editParamedicsChips,
      });

      if (previousDriverId && previousDriverId !== editAmbulanceForm.driverId) {
        const prevDriverRef = doc(db, 'users', previousDriverId);
        await updateDoc(prevDriverRef, {
          ambulanceId: null,
          assignedVehicle: null,
          vehiclePlate: null,
          assignedAmbulanceId: null,
          status: 'available',
        });
      }

      if (selectedDriver && selectedDriver.id !== previousDriverId) {
        const newDriverRef = doc(db, 'users', selectedDriver.id);
        await updateDoc(newDriverRef, {
          ambulanceId: editingAmbulance.id,
          assignedVehicle: editingAmbulance.vehicleNumber,
          vehiclePlate: editingAmbulance.vehicleNumber,
          assignedAmbulanceId: editingAmbulance.id,
          status: 'active',
        });
      }

      setShowEditAmbulanceModal(false);
      setEditingAmbulance(null);
      alert('Ambulance updated successfully.');
    } catch (error) {
      console.error('Error updating ambulance:', error);
      alert('Failed to update ambulance. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditDriver = (driver) => {
    setEditingDriver(driver);
    setEditDriverForm({ phone: driver.phone || '' });
    setShowEditDriverModal(true);
  };

  const handleEditDriver = async (e) => {
    e.preventDefault();
    if (!editingDriver) return;
    setIsSubmitting(true);
    try {
      const driverRef = doc(db, 'users', editingDriver.id);
      await updateDoc(driverRef, {
        phone: editDriverForm.phone,
      });

      setShowEditDriverModal(false);
      setEditingDriver(null);
      alert('Driver updated successfully.');
    } catch (error) {
      console.error('Error updating driver:', error);
      alert('Failed to update driver. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnassignDriver = async (driver) => {
    const confirm = window.confirm(`Are you sure you want to unassign ${driver.name} from their ambulance?`);
    if (!confirm) return;

    try {
      const ambulance = ambulances.find(a => a.driverId === driver.id);
      
      const driverRef = doc(db, 'users', driver.id);
      await updateDoc(driverRef, {
        ambulanceId: null,
        assignedVehicle: null,
        vehiclePlate: null,
        assignedAmbulanceId: null,
        status: 'available',
      });

      if (ambulance) {
        const ambulanceRef = doc(db, 'ambulances', ambulance.id);
        await updateDoc(ambulanceRef, {
          driverId: null,
          driverName: null,
          driverPhone: null,
        });
      }

      alert('Driver unassigned successfully.');
    } catch (error) {
      console.error('Error unassigning driver:', error);
      alert('Failed to unassign driver. Please try again.');
    }
  };

  const getVehicleTypeLabel = (type) => {
    if (type === 'BLS') return 'Basic Life Support';
    if (type === 'ALS') return 'Advanced Life Support';
    return type;
  };

  const handleAddDriver = async (e) => {
    e.preventDefault();
    if (!userHospitalId) return;
    setIsSubmitting(true);
    let driverCredential = null;
    try {
      const email = driverForm.email.trim().toLowerCase();
      driverCredential = await createUserWithEmailAndPassword(secondaryAuth, email, driverForm.password);
      const driverId = driverCredential.user.uid;

      await setDoc(doc(db, 'users', driverId), {
        name: driverForm.name,
        email,
        phone: driverForm.phone,
        role: 'driver',
        hospitalId: userHospitalId,
        hospitalName: userHospitalName || '',
        status: 'available',
        createdAt: new Date().toISOString(),
        dispatchCount: 0,
        currentLocation: null,
      });
      resetDriverForm();
      setShowAddDriverModal(false);
      alert('Driver account created successfully. Share the credentials so they can log in.');
    } catch (error) {
      console.error('Error adding driver:', error);
      if (driverCredential?.user) {
        try {
          await driverCredential.user.delete();
        } catch (cleanupError) {
          console.error('Error cleaning up driver auth user:', cleanupError);
        }
      }
      alert('Failed to add driver. Please try again.');
    } finally {
      setIsSubmitting(false);
      try {
        await signOut(secondaryAuth);
      } catch (signOutError) {
        console.warn('Secondary auth sign-out skipped:', signOutError.message);
      }
    }
  };

  const handleAddAmbulance = async (e) => {
    e.preventDefault();
    if (!userHospitalId) return;
    setIsSubmitting(true);
    const selectedDriver = drivers.find(driver => driver.id === ambulanceForm.driverId);
    try {
      const ambulanceData = {
        vehicleNumber: ambulanceForm.vehicleNumber,
        provider: ambulanceForm.provider,
        vehicleType: ambulanceForm.vehicleType,
        capacity: ambulanceForm.capacity,
        hospitalId: userHospitalId,
        hospitalName: userHospitalName || '',
        driverId: selectedDriver?.id || null,
        driverName: selectedDriver?.name || null,
        driverPhone: selectedDriver?.phone || null,
        paramedics: paramedicsChips,
        status: 'available',
        currentLocation: hospitalLocation || null,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'ambulances'), ambulanceData);

      if (selectedDriver) {
        const driverRef = doc(db, 'users', selectedDriver.id);
        await updateDoc(driverRef, {
          ambulanceId: docRef.id,
          assignedVehicle: ambulanceForm.vehicleNumber,
          vehiclePlate: ambulanceForm.vehicleNumber,
          assignedAmbulanceId: docRef.id,
          status: 'active',
        });
      }

      resetAmbulanceForm();
      setShowAddAmbulanceModal(false);
      alert('Ambulance added successfully.');
    } catch (error) {
      console.error('Error adding ambulance:', error);
      alert('Failed to add ambulance. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdmitPatient = async (e) => {
    e.preventDefault();
    if (!userHospitalId) return;
    const hospital = hospitals[0];
    if (!hospital) return;

    if (hospital.occupiedUnits >= hospital.totalUnits) {
      alert('Hospital at full capacity. Please free up a unit first.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newPatient = {
        id: Date.now().toString(),
        name: patientForm.name,
        unit: patientForm.unit,
        condition: patientForm.condition,
        status: patientForm.status,
        admittedAt: new Date().toISOString(),
      };

      const hospitalRef = doc(db, 'hospitals', hospital.id);
      await updateDoc(hospitalRef, {
        patients: [...(hospital.patients || []), newPatient],
        occupiedUnits: increment(1),
      });

      resetPatientForm();
      setShowPatientModal(false);
      alert('Patient admitted successfully.');
    } catch (error) {
      console.error('Error admitting patient:', error);
      alert('Failed to admit patient. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckoutPatient = async (patientId) => {
    if (!userHospitalId) return;
    const hospital = hospitals[0];
    if (!hospital) return;

    const confirm = window.confirm('Confirm patient checkout?');
    if (!confirm) return;

    try {
      const filteredPatients = (hospital.patients || []).filter(patient => patient.id !== patientId);
      const hospitalRef = doc(db, 'hospitals', hospital.id);
      await updateDoc(hospitalRef, {
        patients: filteredPatients,
        occupiedUnits: Math.max(0, hospital.occupiedUnits - 1),
      });
      alert('Patient checked out successfully.');
    } catch (error) {
      console.error('Error checking out patient:', error);
      alert('Failed to check out patient. Please try again.');
    }
  };

  const renderSidebar = () => (
    <div className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 min-h-0 lg:min-h-screen">
      <div className="p-4">
        <h2 className="text-sm font-bold text-gray-900 mb-1">Hospital Admin</h2>
        {userHospitalName && (
          <p className="text-xs text-red-600 mb-3 font-medium">{userHospitalName}</p>
        )}
        <nav className="space-y-1">
          <button
            onClick={() => setActiveSection('hospitals')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'hospitals'
                ? 'bg-red-50 text-red-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Hospital className="w-4 h-4" />
            Hospitals
          </button>
          <button
            onClick={() => setActiveSection('ambulances')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'ambulances'
                ? 'bg-red-50 text-red-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Ambulance className="w-4 h-4" />
            Ambulances
          </button>
          <button
            onClick={() => setActiveSection('drivers')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'drivers'
                ? 'bg-red-50 text-red-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <User className="w-4 h-4" />
            Drivers
          </button>
          <button
            onClick={() => setActiveSection('emergencyCalls')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'emergencyCalls'
                ? 'bg-red-50 text-red-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Phone className="w-4 h-4" />
            Emergency Calls
          </button>
        </nav>
      </div>
    </div>
  );

  const renderHospitals = () => (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Hospital Overview</h2>
          <p className="text-xs text-gray-600">Manage units, capacity, and patient admissions.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setShowPatientModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
          >
            <UserPlus className="w-4 h-4" />
            Admit Patient
          </button>
        </div>
      </div>
      <div className="grid gap-4">
        {hospitals.map(hospital => (
          <div key={hospital.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Hospital className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{hospital.name}</h3>
                  <p className="text-xs text-gray-600 mt-1">{hospital.address}</p>
                  <p className="text-xs text-gray-600">{hospital.contactNumber}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-600">
                      Capacity: {hospital.occupiedUnits}/{hospital.totalUnits}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs text-gray-600">{hospital.rating || '4.5'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
                hospital.occupiedUnits >= hospital.totalUnits
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {hospital.occupiedUnits >= hospital.totalUnits ? 'Full' : 'Available'}
              </div>
            </div>
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Current Patients</h4>
              {patients.length > 0 ? (
                <div className="space-y-3">
                  {patients.map(patient => (
                    <div key={patient.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{patient.name}</p>
                          <p className="text-xs text-gray-600">Unit: {patient.unit}</p>
                          <p className="text-xs text-gray-600">Condition: {patient.condition || 'N/A'}</p>
                          <p className="text-xs text-gray-500">Admitted: {new Date(patient.admittedAt).toLocaleString()}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                            patient.status === 'critical' ? 'bg-red-100 text-red-700' :
                            patient.status === 'stable' ? 'bg-green-100 text-green-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {patient.status || 'stable'}
                          </span>
                          <button
                            onClick={() => handleCheckoutPatient(patient.id)}
                            className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200"
                          >
                            <UserMinus className="w-3 h-3" />
                            Check Out
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 text-sm border border-dashed border-gray-200 rounded-lg">
                  No patients currently admitted.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAmbulances = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900">Ambulances</h2>
        <button
          onClick={() => setShowAddAmbulanceModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
        >
          <Plus className="w-4 h-4" />
          Add Ambulance
        </button>
      </div>
      {trackingAmbulance && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold">Tracking: {trackingAmbulance.vehicleNumber}</h3>
            <button
              onClick={() => setTrackingAmbulance(null)}
              className="text-xs text-gray-600 hover:text-gray-900"
            >
              Close
            </button>
          </div>
          {isLoaded && trackingAmbulance.currentLocation && (
            <div className="h-[50vh] min-h-[280px] rounded-lg overflow-hidden border border-gray-200 mb-3">
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={trackingAmbulance.currentLocation}
                zoom={13}
              >
                <Marker 
                  position={trackingAmbulance.currentLocation}
                  icon={{
                    url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                  }}
                />
                <Marker 
                  position={hospitalLocation}
                  icon={{
                    url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
                  }}
                />
              </GoogleMap>
            </div>
          )}
          {trackingAmbulance.currentLocation && (
            <button
              onClick={() => openRouteFromHospital(trackingAmbulance.currentLocation)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-sm font-medium hover:from-green-700 hover:to-emerald-700 mb-3"
            >
              <ExternalLink className="w-4 h-4" />
              Open Live Tracking in Google Maps
            </button>
          )}
          {trackingAmbulance.status === 'dispatched' && isNearHospital(trackingAmbulance.currentLocation) && (
            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-red-700 font-medium">
                Emergency - ETA: {calculateETA(calculateDistanceToHospital(trackingAmbulance.currentLocation))}
              </span>
            </div>
          )}
        </div>
      )}
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
                  <p className="text-xs text-gray-600">Provider: {ambulance.provider}</p>
                  <p className="text-xs text-gray-600">Driver: {ambulance.driverName || 'Not assigned'}</p>
                  <p className="text-xs text-gray-600">Type: {getVehicleTypeLabel(ambulance.vehicleType)}</p>
                  {ambulance.paramedics && ambulance.paramedics.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">Paramedics:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ambulance.paramedics.map((paramedic, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                            {paramedic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                  ambulance.status === 'available' ? 'bg-green-100 text-green-700' :
                  ambulance.status === 'dispatched' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {ambulance.status}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenEditAmbulance(ambulance)}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleTrackAmbulance(ambulance)}
                    className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700"
                  >
                    <Navigation2 className="w-3 h-3" />
                    Track
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDrivers = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900">Drivers</h2>
        <button
          onClick={() => setShowAddDriverModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
        >
          <Plus className="w-4 h-4" />
          Add Driver
        </button>
      </div>
      {trackingDriver && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold">Tracking: {trackingDriver.name}</h3>
            <button
              onClick={() => setTrackingDriver(null)}
              className="text-xs text-gray-600 hover:text-gray-900"
            >
              Close
            </button>
          </div>
          {isLoaded && trackingDriver.ambulance?.currentLocation && (
            <div className="h-[50vh] min-h-[280px] rounded-lg overflow-hidden border border-gray-200 mb-3">
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={trackingDriver.ambulance.currentLocation}
                zoom={13}
              >
                <Marker 
                  position={trackingDriver.ambulance.currentLocation}
                  icon={{
                    url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                  }}
                />
                <Marker 
                  position={hospitalLocation}
                  icon={{
                    url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
                  }}
                />
              </GoogleMap>
            </div>
          )}
          {trackingDriver.ambulance?.currentLocation && (
            <button
              onClick={() => openRouteFromHospital(trackingDriver.ambulance.currentLocation)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-sm font-medium hover:from-green-700 hover:to-emerald-700 mb-3"
            >
              <ExternalLink className="w-4 h-4" />
              Open Live Tracking in Google Maps
            </button>
          )}
          {trackingDriver.ambulance?.status === 'dispatched' && 
           trackingDriver.ambulance?.currentLocation && 
           isNearHospital(trackingDriver.ambulance.currentLocation) && (
            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-red-700 font-medium">
                Emergency - ETA: {calculateETA(calculateDistanceToHospital(trackingDriver.ambulance.currentLocation))}
              </span>
            </div>
          )}
        </div>
      )}
      <div className="grid gap-4">
        {drivers.map(driver => {
          const stats = getDriverStats(driver.id);
          const dispatchCount = getDriverDispatchCount(driver.id);
          const assignedAmbulance = ambulances.find(a => a.driverId === driver.id);
          return (
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
                    {assignedAmbulance && (
                      <p className="text-xs text-blue-600 mt-1">Assigned to: {assignedAmbulance.vehicleNumber}</p>
                    )}
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Dispatches:</span>
                        <span className="text-xs font-medium text-gray-900">{dispatchCount}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Avg Response:</span>
                        <span className="text-xs font-medium text-gray-900">{stats.avgResponseTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Forwarded:</span>
                        <span className="text-xs font-medium text-gray-900">{stats.forwardedCalls}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEditDriver(driver)}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleTrackDriver(driver)}
                      className="flex items-center gap-1 px-3 py-1 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700"
                    >
                      <Navigation2 className="w-3 h-3" />
                      Track
                    </button>
                  </div>
                  {assignedAmbulance && (
                    <button
                      onClick={() => handleUnassignDriver(driver)}
                      className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium hover:bg-orange-200"
                    >
                      <UserMinus className="w-3 h-3" />
                      Unassign
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderEmergencyCalls = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Emergency Calls</h2>
      <div className="grid gap-4">
        {emergencyCalls.length === 0 && (
          <div className="text-xs text-gray-500 text-center py-6 border border-dashed border-gray-200 rounded-lg">
            No emergency calls have been dispatched to this hospital yet.
          </div>
        )}
        {emergencyCalls.map(call => (
          <div key={call.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Call #{call.id.substring(0, 8)}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                    call.status === 'dispatched' ? 'bg-blue-100 text-blue-700' :
                    call.status === 'completed' ? 'bg-green-100 text-green-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {call.status}
                  </span>
                  {call.priority === 'urgent' && (
                    <span className="px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700">
                      Urgent
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500">{formatTimestamp(call.timestamp, 'Timestamp unavailable')}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Phone className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600">{call.callerPhone}</p>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600">{call.address || 'GPS Location'}</p>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600">{call.description}</p>
              </div>
              {call.gender && (
                <p className="text-xs text-gray-600">Gender: {call.gender}</p>
              )}
              {call.roomNumber && (
                <p className="text-xs text-gray-600">Room/House: {call.roomNumber}</p>
              )}
              {call.dispatchedAmbulance && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-600">Ambulance: {call.dispatchedAmbulance}</p>
                  {call.eta && <p className="text-xs text-gray-600">ETA: {call.eta}</p>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Hospital Admin Dashboard" subtitle="Manage Hospital Operations" />
      <div className="flex flex-col lg:flex-row">
        {renderSidebar()}
        <div className="flex-1 p-4 lg:p-6">
          {activeSection === 'hospitals' && renderHospitals()}
          {activeSection === 'ambulances' && renderAmbulances()}
          {activeSection === 'drivers' && renderDrivers()}
          {activeSection === 'emergencyCalls' && renderEmergencyCalls()}
        </div>
      </div>

      {showAddDriverModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Add Driver</h3>
              <button onClick={() => { setShowAddDriverModal(false); resetDriverForm(); }} className="p-2 text-gray-500 hover:text-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddDriver} className="p-4 space-y-3">
              <input
                type="text"
                placeholder="Full Name"
                value={driverForm.name}
                onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={driverForm.email}
                onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                required
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={driverForm.phone}
                onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                required
              />
              <input
                type="password"
                placeholder="Temporary Password"
                value={driverForm.password}
                onChange={(e) => setDriverForm({ ...driverForm, password: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                required
              />
              <div className="flex flex-col sm:flex-row gap-3 pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Driver'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddDriverModal(false); resetDriverForm(); }}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddAmbulanceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Add Ambulance</h3>
              <button onClick={() => { setShowAddAmbulanceModal(false); resetAmbulanceForm(); }} className="p-2 text-gray-500 hover:text-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddAmbulance} className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Vehicle Number / Plate"
                  value={ambulanceForm.vehicleNumber}
                  onChange={(e) => setAmbulanceForm({ ...ambulanceForm, vehicleNumber: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Provider"
                  value={ambulanceForm.provider}
                  onChange={(e) => setAmbulanceForm({ ...ambulanceForm, provider: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                  required
                />
                <select
                  value={ambulanceForm.vehicleType}
                  onChange={(e) => setAmbulanceForm({ ...ambulanceForm, vehicleType: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                >
                  <option value="ALS">ALS (Advanced Life Support)</option>
                  <option value="BLS">BLS (Basic Life Support)</option>
                </select>
                <input
                  type="number"
                  min="1"
                  placeholder="Capacity"
                  value={ambulanceForm.capacity}
                  onChange={(e) => setAmbulanceForm({ ...ambulanceForm, capacity: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">Assign Driver</label>
                {availableDrivers.length > 0 ? (
                  <select
                    value={ambulanceForm.driverId}
                    onChange={(e) => setAmbulanceForm({ ...ambulanceForm, driverId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                  >
                    <option value="">Select driver (optional)</option>
                    {availableDrivers.map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} • {driver.phone}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-gray-500">No available drivers. Add a driver first or unassign one.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">Paramedics (press comma or Enter to add)</label>
                <div className="flex flex-wrap gap-1 p-2 border border-gray-300 rounded-lg min-h-[42px] focus-within:border-teal-500">
                  {paramedicsChips.map((chip, index) => (
                    <span key={index} className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                      {chip}
                      <button type="button" onClick={() => removeParamedicChip(index)} className="hover:text-purple-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder={paramedicsChips.length === 0 ? "Type paramedic name..." : ""}
                    value={paramedicsInput}
                    onChange={(e) => setParamedicsInput(e.target.value)}
                    onKeyDown={handleParamedicsKeyDown}
                    className="flex-1 min-w-[120px] outline-none text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Ambulance'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddAmbulanceModal(false); resetAmbulanceForm(); }}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPatientModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Admit Patient</h3>
              <button onClick={() => { setShowPatientModal(false); resetPatientForm(); }} className="p-2 text-gray-500 hover:text-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdmitPatient} className="p-4 space-y-3">
              <input
                type="text"
                placeholder="Patient Name"
                value={patientForm.name}
                onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                required
              />
              <input
                type="text"
                placeholder="Unit / Ward (e.g., ICU-1)"
                value={patientForm.unit}
                onChange={(e) => setPatientForm({ ...patientForm, unit: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                required
              />
              <textarea
                placeholder="Condition / Notes"
                value={patientForm.condition}
                onChange={(e) => setPatientForm({ ...patientForm, condition: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
              />
              <select
                value={patientForm.status}
                onChange={(e) => setPatientForm({ ...patientForm, status: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
              >
                <option value="stable">Stable</option>
                <option value="moderate">Moderate</option>
                <option value="critical">Critical</option>
              </select>
              <div className="flex flex-col sm:flex-row gap-3 pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Admit Patient'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowPatientModal(false); resetPatientForm(); }}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditAmbulanceModal && editingAmbulance && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Edit Ambulance - {editingAmbulance.vehicleNumber}</h3>
              <button onClick={() => { setShowEditAmbulanceModal(false); setEditingAmbulance(null); }} className="p-2 text-gray-500 hover:text-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditAmbulance} className="p-4 space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">Change Driver</label>
                <select
                  value={editAmbulanceForm.driverId}
                  onChange={(e) => setEditAmbulanceForm({ ...editAmbulanceForm, driverId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                >
                  <option value="">No driver assigned</option>
                  {editingAmbulance.driverId && (
                    <option value={editingAmbulance.driverId}>
                      {editingAmbulance.driverName} (current)
                    </option>
                  )}
                  {availableDrivers.map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} • {driver.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">Paramedics (press comma or Enter to add)</label>
                <div className="flex flex-wrap gap-1 p-2 border border-gray-300 rounded-lg min-h-[42px] focus-within:border-teal-500">
                  {editParamedicsChips.map((chip, index) => (
                    <span key={index} className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                      {chip}
                      <button type="button" onClick={() => removeEditParamedicChip(index)} className="hover:text-purple-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder={editParamedicsChips.length === 0 ? "Type paramedic name..." : ""}
                    value={editAmbulanceForm.paramedics}
                    onChange={(e) => setEditAmbulanceForm({ ...editAmbulanceForm, paramedics: e.target.value })}
                    onKeyDown={(e) => handleEditParamedicsKeyDown(e, editAmbulanceForm.paramedics, (val) => setEditAmbulanceForm({ ...editAmbulanceForm, paramedics: val }))}
                    className="flex-1 min-w-[120px] outline-none text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowEditAmbulanceModal(false); setEditingAmbulance(null); }}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditDriverModal && editingDriver && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Edit Driver - {editingDriver.name}</h3>
              <button onClick={() => { setShowEditDriverModal(false); setEditingDriver(null); }} className="p-2 text-gray-500 hover:text-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditDriver} className="p-4 space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">Contact Phone</label>
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={editDriverForm.phone}
                  onChange={(e) => setEditDriverForm({ ...editDriverForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowEditDriverModal(false); setEditingDriver(null); }}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalAdminNew;
