import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Warehouses from './pages/Warehouses';
import Inventory from './pages/Inventory';
import Suppliers from './pages/Suppliers';
import PurchaseOrders from './pages/PurchaseOrders';
import Transfers from './pages/Transfers';
import Reports from './pages/Reports';
import Users from './pages/Users';

function AppRoutes() {
  const { isAuthenticated, isAdmin, isManager, isStaff } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute allowedRoles={['Admin', 'Warehouse Manager', 'Staff']}><Products /></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute allowedRoles={['Admin', 'Warehouse Manager']}><Categories /></ProtectedRoute>} />
        <Route path="/warehouses" element={<ProtectedRoute allowedRoles={['Admin']}><Warehouses /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute allowedRoles={['Admin', 'Warehouse Manager', 'Staff']}><Inventory /></ProtectedRoute>} />
        <Route path="/suppliers" element={<ProtectedRoute allowedRoles={['Admin', 'Warehouse Manager']}><Suppliers /></ProtectedRoute>} />
        <Route path="/purchase-orders" element={<ProtectedRoute allowedRoles={['Admin', 'Warehouse Manager']}><PurchaseOrders /></ProtectedRoute>} />
        <Route path="/transfers" element={<ProtectedRoute allowedRoles={['Admin', 'Warehouse Manager', 'Staff']}><Transfers /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute allowedRoles={['Admin', 'Warehouse Manager']}><Reports /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute allowedRoles={['Admin']}><Users /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-50">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <AppRoutes />;
}