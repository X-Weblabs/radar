import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { startLocationTracking, stopLocationTracking, updateUserLocation } from '../utils/locationTracking';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userHospitalId, setUserHospitalId] = useState(null);
  const [userHospitalName, setUserHospitalName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationWatchId, setLocationWatchId] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUser(user);
          setUserRole(userData.role);
          setUserHospitalId(userData.hospitalId || null);
          setUserHospitalName(userData.hospitalName || null);
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setUserHospitalId(null);
        setUserHospitalName(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role;
        setUserRole(role);
        setUserHospitalId(userData.hospitalId || null);
        setUserHospitalName(userData.hospitalName || null);
        
        if (role === 'driver' || role === 'hospital') {
          const watchId = startLocationTracking(
            userCredential.user.uid,
            role,
            (location) => {
              console.log(`Location updated for ${role}:`, location);
            }
          );
          setLocationWatchId(watchId);
        }
        
        return { success: true, role };
      }
      return { success: false, error: 'User role not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signUp = async (email, password, role, additionalData = {}) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email,
        role,
        ...additionalData,
        createdAt: new Date().toISOString(),
      });
      setUserRole(role);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      if (locationWatchId) {
        stopLocationTracking(locationWatchId);
        setLocationWatchId(null);
      }
      
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setUserRole(null);
      setUserHospitalId(null);
      setUserHospitalName(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    currentUser,
    userRole,
    userHospitalId,
    userHospitalName,
    signIn,
    signUp,
    signOut,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
