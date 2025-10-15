import React, { useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/UI';
import { useStaffAuthStore } from '@/store/staffAuthStore';
import { staffApi } from '@/api/staff';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { staff, logout } = useStaffAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await staffApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      navigate('/staff/login');
    }
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/staff', label: 'Staff Management', icon: '👨‍💼' },
    { path: '/admin/users', label: 'User Management', icon: '👥' },
    { path: '/admin/posts', label: 'Post Management', icon: '📝' },
    { path: '/admin/sessions', label: 'Session Management', icon: '💬' },
    { path: '/admin/reports', label: 'Report Management', icon: '🚨' },
    { path: '/admin/audit-logs', label: 'Audit Logs', icon: '📋' },
    { path: '/admin/statistics', label: 'Statistics', icon: '📈' },
    { path: '/admin/settings', label: 'System Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 bg-red-600 text-white">
          <h1 className="text-lg font-semibold">OnMaum Admin</h1>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            ✕
          </button>
        </div>

        {/* Admin Info */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 font-medium">
                {staff?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{staff?.name}</p>
              <p className="text-xs text-red-600 font-medium">Administrator</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActiveRoute(item.path)
                  ? 'bg-red-100 text-red-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Quick Actions */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <Link
            to="/staff"
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <span className="text-lg">👨‍💼</span>
            <span>Staff Portal</span>
          </Link>
          
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-gray-600 hover:text-gray-900"
          >
            <span className="mr-3">🚪</span>
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            ☰
          </button>

          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-medium text-gray-900">
              Admin Portal
            </h2>
            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
              Administrator
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
              <span>{staff?.email}</span>
            </div>
            
            {/* System Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-xs text-gray-600">System Online</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminLayout;