import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, Button, Input } from '@/components/UI';
import { staffApi } from '@/api/staff';
import { useStaffAuthStore } from '@/store/staffAuthStore';

const StaffLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useStaffAuthStore(state => state.login);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await staffApi.login(formData);
      login(response);
      
      // Navigate based on role
      const role = response.staff.role;
      if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/staff');
      }
    } catch (err) {
      console.error('Staff login error:', err);
      setError('Invalid credentials. Please check your email and password.');
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
            Sign in to access the staff management system
          </p>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Staff Login</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="text-sm text-red-600">{error}</div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="staff@onmaum.com"
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Back to main site */}
        <div className="text-center">
          <Link 
            to="/" 
            className="text-sm text-primary-600 hover:text-primary-500"
          >
            ← Back to OnMaum
          </Link>
        </div>

        {/* Role Information */}
        <Card>
          <CardContent className="text-center py-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Access Levels</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <div><span className="font-medium">Admin:</span> Full system access</div>
              <div><span className="font-medium">Counselor:</span> Session and user management</div>
              <div><span className="font-medium">Moderator:</span> Content moderation</div>
              <div><span className="font-medium">Support:</span> User support tools</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffLoginPage;