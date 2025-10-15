import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStaffAuthStore } from '@/store/staffAuthStore';

interface StaffProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requireAuth?: boolean;
}

const StaffProtectedRoute: React.FC<StaffProtectedRouteProps> = ({
  children,
  requiredRoles = [],
  requireAuth = true,
}) => {
  const location = useLocation();
  const { staff, isAuthenticated, clearAuth } = useStaffAuthStore();

  // Check if staff authentication is required
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/staff/login" state={{ from: location }} replace />;
  }

  // If not requiring auth and user is authenticated, redirect to dashboard
  if (!requireAuth && isAuthenticated) {
    if (staff?.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/staff" replace />;
    }
  }

  // Check role-based access
  if (requireAuth && staff && requiredRoles.length > 0) {
    if (!requiredRoles.includes(staff.role)) {
      // Unauthorized access - redirect to appropriate dashboard
      if (staff.role === 'admin') {
        return <Navigate to="/admin" replace />;
      } else {
        return <Navigate to="/staff" replace />;
      }
    }
  }

  return <>{children}</>;
};

export default StaffProtectedRoute;