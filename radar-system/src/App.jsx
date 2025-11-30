import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import EmergencyCaller from './components/EmergencyCaller';
import SystemAdmin from './components/SystemAdmin';
import HospitalAdmin from './components/HospitalAdminNew';
import HospitalManagement from './components/HospitalManagement';
import AmbulanceDriver from './components/AmbulanceDriverEnhanced';
import Login from './components/Login';
import SystemDocs from './components/SystemDocs';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { currentUser, userRole } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<EmergencyCaller />} />
          <Route path="/login" element={<Login />} />
          
          <Route 
            path="/admin" 
            element={
              <PrivateRoute allowedRoles={['admin']}>
                <SystemAdmin />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/hospital" 
            element={
              <PrivateRoute allowedRoles={['hospital']}>
                <HospitalAdmin />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/hospital/management" 
            element={
              <PrivateRoute allowedRoles={['hospital']}>
                <HospitalManagement />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/driver" 
            element={
              <PrivateRoute allowedRoles={['driver']}>
                <AmbulanceDriver />
              </PrivateRoute>
            } 
          />

          <Route path="/system-docs" element={<SystemDocs />} />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
