import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStaffAuthStore, isStaffAuthenticated } from '@/store/staffAuth';

interface StaffProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  requireAuth?: boolean;
}

const StaffProtectedRoute: React.FC<StaffProtectedRouteProps> = ({
  children,
  requiredRole,
  requireAuth = true,
}) => {
  const location = useLocation();
  const { staff, hasRole, isAdmin } = useStaffAuthStore();

  // Check authentication
  const authenticated = isStaffAuthenticated();

  if (requireAuth && !authenticated) {
    // Redirect to staff login with return path
    return <Navigate to="/staff/login" state={{ from: location }} replace />;
  }

  // If authentication not required (for login page), just render children
  if (!requireAuth) {
    return <>{children}</>;
  }

  // Check role requirements
  if (requiredRole && staff) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    // Admin has access to everything
    const hasAccess = isAdmin() || roles.some(role => hasRole(role));
    
    if (!hasAccess) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-4">
              You don't have permission to access this resource.
            </p>
            <p className="text-sm text-gray-500">
              Required role: {roles.join(' or ')}
              <br />
              Your role: {staff.role}
            </p>
            <button
              onClick={() => window.history.back()}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default StaffProtectedRoute;