import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/UI';
import { useStaffAuthStore } from '@/store/staffAuth';
import { staffAuthApi } from '@/api/staff';

const StaffLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { staff, logout, isAdmin, isCounselor } = useStaffAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await staffAuthApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      navigate('/staff/login');
    }
  };

  const navigation = [
    {
      name: 'Dashboard',
      path: '/staff/dashboard',
      icon: '📊',
      roles: ['admin', 'counselor', 'moderator'],
    },
    {
      name: 'My Sessions',
      path: '/staff/sessions',
      icon: '💬',
      roles: ['counselor'],
    },
    {
      name: 'Posts & Replies',
      path: '/staff/posts',
      icon: '📝',
      roles: ['counselor', 'moderator'],
    },
    {
      name: 'User Management',
      path: '/admin/users',
      icon: '👥',
      roles: ['admin'],
    },
    {
      name: 'Content Management',
      path: '/admin/content',
      icon: '📋',
      roles: ['admin', 'moderator'],
    },
    {
      name: 'Staff Management',
      path: '/admin/staff',
      icon: '👨‍💼',
      roles: ['admin'],
    },
    {
      name: 'System Statistics',
      path: '/admin/stats',
      icon: '📈',
      roles: ['admin'],
    },
    {
      name: 'Audit Logs',
      path: '/admin/audit',
      icon: '📜',
      roles: ['admin'],
    },
  ];

  const hasAccess = (roles: string[]) => {
    if (!staff) return false;
    return isAdmin() || roles.includes(staff.role);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'counselor':
        return 'bg-blue-100 text-blue-800';
      case 'moderator':
        return 'bg-green-100 text-green-800';
      case 'support':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">OnMaum Staff Portal</h1>
              {staff && (
                <span className={`ml-4 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(staff.role)}`}>
                  {staff.role.toUpperCase()}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {staff && (
                <>
                  <div className="text-sm text-gray-600">
                    Welcome, <span className="font-medium">{staff.name}</span>
                  </div>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    size="sm"
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? 'Logging out...' : 'Logout'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <aside className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-sm border p-4">
              <ul className="space-y-2">
                {navigation
                  .filter(item => hasAccess(item.roles))
                  .map((item) => {
                    const isActive = location.pathname === item.path ||
                      (item.path !== '/staff/dashboard' && location.pathname.startsWith(item.path));
                    
                    return (
                      <li key={item.path}>
                        <button
                          onClick={() => navigate(item.path)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-primary-100 text-primary-700'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          <span className="mr-3">{item.icon}</span>
                          {item.name}
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </nav>

            {/* Quick Stats */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Info</h3>
              <div className="space-y-2 text-xs text-gray-600">
                <div>Role: {staff?.role}</div>
                <div>Department: {staff?.department || 'N/A'}</div>
                <div>Status: Active</div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>
              © 2024 OnMaum Staff Portal. All rights reserved.
            </div>
            <div className="flex space-x-4">
              <span>🔒 Secure Environment</span>
              <span>📋 All Activities Logged</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StaffLayout;