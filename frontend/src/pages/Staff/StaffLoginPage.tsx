import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Input, Card, CardContent, CardHeader } from '@/components/UI';
import { staffAuthApi } from '@/api/staff';
import { useStaffAuthStore } from '@/store/staffAuth';

const StaffLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setError, setLoading, isAuthenticated, isLoading, error } = useStaffAuthStore();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/staff/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await staffAuthApi.login(formData);
      login(response);
      
      // Redirect to intended page or dashboard
      const from = (location.state as any)?.from?.pathname || '/staff/dashboard';
      navigate(from, { replace: true });
      
    } catch (err: any) {
      console.error('Staff login failed:', err);
      const errorMessage = err.response?.data?.detail || 'Login failed. Please check your credentials.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">OnMaum Staff Portal</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your staff account
          </p>
        </div>

        {/* Login Form */}
        <Card className="mt-8">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Staff Login</h2>
            <p className="text-sm text-gray-600">
              Enter your staff credentials to access the portal
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex">
                    <div className="text-red-400">⚠️</div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your staff email"
                  disabled={isLoading}
                  className="w-full"
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  className="w-full"
                  required
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign In to Staff Portal'
                )}
              </Button>
            </form>

            {/* Additional Info */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                This portal is for OnMaum staff members only.
                <br />
                If you're a user, please use the main platform.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex justify-center">
              <div className="text-blue-400">🔒</div>
              <div className="ml-3">
                <p className="text-xs text-blue-700">
                  <strong>Security Notice:</strong> All staff activities are logged and monitored for security purposes.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Main Site */}
        <div className="text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-primary-600 hover:text-primary-500 underline"
          >
            ← Back to main site
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffLoginPage;