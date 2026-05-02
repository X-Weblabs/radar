import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'caller',
    paymentMethod: '',
    medicalAidName: '',
    gender: '',
    address: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.paymentMethod === 'medical_aid' && !formData.medicalAidName.trim()) {
      setError('Please provide your medical aid name.');
      return;
    }
    if (!formData.gender) {
      setError('Please select your gender.');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Please provide your phone number.');
      return;
    }
    if (!formData.address.trim()) {
      setError('Please provide your address.');
      return;
    }
    setLoading(true);
    try {
      const result = await signUp(formData.email, formData.password, formData.role, {
        name: formData.name,
        phone: formData.phone.trim(),
        preferredPaymentMethod: formData.paymentMethod || '',
        medicalAidName: formData.paymentMethod === 'medical_aid' ? formData.medicalAidName.trim() : '',
        gender: formData.gender,
        address: formData.address.trim(),
      });
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-grid-pattern flex items-center justify-center p-4 relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-600"></div>
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 border border-gray-100">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white border-2 border-red-100 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Create Account</h1>
          <p className="text-sm text-gray-600">Register to call for help</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
              placeholder="Jane Doe"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
              placeholder="email@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
              placeholder="+1 234 567 8900"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
                required
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Address & House Number</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
                placeholder="e.g. Room 204 or House 15"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Preferred Payment Method (Optional)</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  paymentMethod: e.target.value,
                  medicalAidName: e.target.value === 'medical_aid' ? formData.medicalAidName : '',
                })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
            >
              <option value="">None Selected</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="medical_aid">Medical Aid</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
              required
            >
              <option value="caller">Citizen (Caller)</option>
              <option value="police">Police Admin</option>
              <option value="hospital">Hospital Admin</option>
              <option value="driver">Ambulance Driver</option>
              <option value="admin">System Admin</option>
            </select>
          </div>

          {formData.paymentMethod === 'medical_aid' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Medical Aid Name</label>
              <input
                type="text"
                value={formData.medicalAidName}
                onChange={(e) => setFormData({ ...formData, medicalAidName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
                placeholder="e.g. Discovery Health"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-lg font-medium text-sm hover:from-red-700 hover:to-red-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'Creating...' : (
              <>
                <UserPlus className="w-4 h-4" />
                Create Account
              </>
            )}
          </button>
        </form>

        <div className="mt-3 text-center">
          <p className="text-xs text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-red-600 font-medium hover:underline">Login here</Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">By creating an account you agree to the terms.</p>
        </div>
      </div>
    </div>
  );
};

export default Register;
