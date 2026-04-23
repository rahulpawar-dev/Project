import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './context/store';
import Home from './pages/Home';
import Auth from './pages/Auth';
import PatientDashboard from './pages/PatientDashboard';
import AttendantDashboard from './pages/AttendantDashboard';
import ReceptionDashboard from './pages/ReceptionDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import { normalizeRole } from './utils/roles';
import './App.css';

const DASHBOARD_PATHS = {
  patient: '/patient-dashboard',
  attendant: '/attendant-dashboard',
  doctor: '/doctor-dashboard',
  reception: '/reception-dashboard',
  admin: '/admin-dashboard',
  'super-admin': '/super-admin-dashboard',
};

function getDashboardPath(role) {
  return DASHBOARD_PATHS[normalizeRole(role)] || '/patient-dashboard';
}

function ProtectedRoute({ children, requiredRoles }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  const normalizedUserRole = normalizeRole(user?.role);
  const normalizedRequiredRoles = (requiredRoles || []).map((role) => normalizeRole(role));

  if (requiredRoles && (!normalizedUserRole || !normalizedRequiredRoles.includes(normalizedUserRole))) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userRole = useAuthStore((state) => state.user?.role);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/auth"
          element={isAuthenticated ? <Navigate to={getDashboardPath(userRole)} replace /> : <Auth />}
        />
        
        <Route
          path="/patient-dashboard"
          element={
            <ProtectedRoute requiredRoles={['patient']}>
              <PatientDashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/attendant-dashboard"
          element={
            <ProtectedRoute requiredRoles={['attendant', 'doctor']}>
              <AttendantDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctor-dashboard"
          element={
            <ProtectedRoute requiredRoles={['doctor', 'attendant']}>
              <AttendantDashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/reception-dashboard"
          element={
            <ProtectedRoute requiredRoles={['reception']}>
              <ReceptionDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute requiredRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin-dashboard"
          element={
            <ProtectedRoute requiredRoles={['super-admin']}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
