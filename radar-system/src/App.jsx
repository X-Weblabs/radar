import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import EmergencyCaller from './components/EmergencyCaller';
import SystemAdmin from './components/SystemAdmin';
import HospitalAdmin from './components/HospitalAdminNew';
import HospitalManagement from './components/HospitalManagement';
import AmbulanceDriver from './components/AmbulanceDriverEnhanced';
import Login from './components/Login';
import Register from './components/Register';
import SystemDocs from './components/SystemDocs';
import PoliceAdmin from './components/PoliceAdmin';

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

const Home = () => {
  const { userRole } = useAuth();
  
  switch (userRole) {
    case 'admin':
      return <Navigate to="/admin" />;
    case 'police':
      return <Navigate to="/police" />;
    case 'hospital':
      return <Navigate to="/hospital" />;
    case 'driver':
      return <Navigate to="/driver" />;
    default:
      return <EmergencyCaller />;
  }
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          } />
          <Route path="/register" element={<Register />} />
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
            path="/police" 
            element={
              <PrivateRoute allowedRoles={['police', 'admin']}>
                <PoliceAdmin />
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
