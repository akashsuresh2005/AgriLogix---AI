import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import GuestLayout from '../layouts/GuestLayout';
import AppLayout from '../layouts/AppLayout';

// Guards
import ProtectedRoute from './ProtectedRoute';
import RoleProtectedRoute from './RoleProtectedRoute';

// Guest & Auth Pages
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import Profile from '../pages/Profile';
import Notifications from '../pages/Notifications';
import NotFound from '../pages/NotFound';

// Role Views - Farmer
import FarmerDashboard from '../pages/farmer/FarmerDashboard';
import NewPrediction from '../pages/farmer/NewPrediction';
import MyPredictions from '../pages/farmer/MyPredictions';
import LossAnalysis from '../pages/farmer/LossAnalysis';
import WarehouseFinder from '../pages/farmer/WarehouseFinder';
import ShipmentBooking from '../pages/farmer/ShipmentBooking';

// Role Views - Manager
import ManagerDashboard from '../pages/manager/ManagerDashboard';
import WarehouseCapacity from '../pages/manager/WarehouseCapacity';
import IncomingShipments from '../pages/manager/IncomingShipments';
import StockRiskMonitoring from '../pages/manager/StockRiskMonitoring';

// Role Views - Admin
import AdminDashboard from '../pages/admin/AdminDashboard';
import FacilityManagement from '../pages/admin/FacilityManagement';
import UserManagement from '../pages/admin/UserManagement';
import SystemHealth from '../pages/admin/SystemHealth';
import ModelPerformance from '../pages/admin/ModelPerformance';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public / Guest Routes */}
      <Route element={<GuestLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      {/* Authenticated Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Common Authenticated Views */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />

          {/* Farmer Routes */}
          <Route element={<RoleProtectedRoute allowedRoles={['farmer', 'admin']} />}>
            <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
            <Route path="/farmer/predict" element={<NewPrediction />} />
            <Route path="/farmer/predictions" element={<MyPredictions />} />
            <Route path="/farmer/loss-analysis" element={<LossAnalysis />} />
            <Route path="/farmer/warehouses" element={<WarehouseFinder />} />
            <Route path="/farmer/shipments" element={<ShipmentBooking />} />
          </Route>

          {/* Warehouse Manager Routes */}
          <Route element={<RoleProtectedRoute allowedRoles={['warehouse_manager', 'admin']} />}>
            <Route path="/manager/dashboard" element={<ManagerDashboard />} />
            <Route path="/manager/capacity" element={<WarehouseCapacity />} />
            <Route path="/manager/shipments" element={<IncomingShipments />} />
            <Route path="/manager/risk-monitoring" element={<StockRiskMonitoring />} />
          </Route>

          {/* System Admin Routes */}
          <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/facilities" element={<FacilityManagement />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/system-health" element={<SystemHealth />} />
            <Route path="/admin/model-performance" element={<ModelPerformance />} />
          </Route>
        </Route>
      </Route>

      {/* 404 Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
