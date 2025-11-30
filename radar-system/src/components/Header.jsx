import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Header = ({ title, subtitle }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { currentUser, userRole, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const result = await signOut();
    if (result.success) {
      navigate('/login');
    }
  };

  const getRoleDisplayName = (role) => {
    const roleMap = {
      'admin': 'System Admin',
      'hospital': 'Hospital Admin',
      'driver': 'Ambulance Driver',
    };
    return roleMap[role] || role;
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="text-xs text-gray-600">{subtitle}</p>}
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-xs font-medium text-gray-900">{currentUser?.email}</p>
              <p className="text-xs text-gray-500">{getRoleDisplayName(userRole)}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {showProfileMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 mb-2">Profile Information</p>
                  <div className="space-y-1">
                    <div>
                      <p className="text-xs font-medium text-gray-700">Email</p>
                      <p className="text-xs text-gray-600">{currentUser?.email}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700">Role</p>
                      <p className="text-xs text-gray-600">{getRoleDisplayName(userRole)}</p>
                    </div>
                    {currentUser?.uid && (
                      <div>
                        <p className="text-xs font-medium text-gray-700">User ID</p>
                        <p className="text-xs text-gray-600 break-all font-mono">{currentUser.uid}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;
