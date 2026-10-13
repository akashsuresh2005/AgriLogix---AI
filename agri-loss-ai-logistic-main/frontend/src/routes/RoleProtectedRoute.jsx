import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function RoleProtectedRoute({ allowedRoles = [] }) {
  const { user } = useAuth();
  const userRole = user?.role || 'farmer';

  if (!allowedRoles.includes(userRole)) {
    // Redirect to user's default dashboard based on role
    const defaultDashboard =
      userRole === 'admin'
        ? '/admin/dashboard'
        : userRole === 'warehouse_manager'
        ? '/manager/dashboard'
        : '/farmer/dashboard';

    return <Navigate to={defaultDashboard} replace />;
  }

  return <Outlet />;
}
