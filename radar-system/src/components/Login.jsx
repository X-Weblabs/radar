import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn(formData.email, formData.password);
      if (result.success) {
        switch (result.role) {
          case 'admin':
            navigate('/admin');
            break;
          case 'hospital':
            navigate('/hospital');
            break;
          case 'driver':
            navigate('/driver');
            break;
          default:
            navigate('/');
        }
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
      {/* Abstract subtle red accents */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-600"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-bl-full opacity-50 -z-10"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-50 rounded-tr-full opacity-50 -z-10"></div>

      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 border border-gray-100">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white border-2 border-red-100 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Radar System</h1>
          <p className="text-sm text-gray-600">Emergency Response Platform</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}



        <form onSubmit={handleSubmit} className="space-y-3">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-lg font-medium text-sm hover:from-red-700 hover:to-red-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              'Loading...'
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Login
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Hospital admin accounts are provisioned directly by the Radar System Administrator.
          </p>
        </div>

        <div className="mt-3 text-center">
          <a href="/" className="text-xs text-gray-600 hover:text-red-700 font-medium">
            Emergency? Click here to call for help →
          </a>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Demo Credentials:<br />
            Email: admin@radar.com | Password: admin123
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
