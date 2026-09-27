import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  Tags,
  Warehouse,
  Boxes,
  Truck,
  ShoppingCart,
  ArrowRightLeft,
  FileText,
  Users,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['Admin', 'Warehouse Manager', 'Staff'] },
  { name: 'Products', href: '/products', icon: Package, roles: ['Admin', 'Warehouse Manager', 'Staff'] },
  { name: 'Categories', href: '/categories', icon: Tags, roles: ['Admin', 'Warehouse Manager'] },
  { name: 'Warehouses', href: '/warehouses', icon: Warehouse, roles: ['Admin'] },
  { name: 'Inventory', href: '/inventory', icon: Boxes, roles: ['Admin', 'Warehouse Manager', 'Staff'] },
  { name: 'Suppliers', href: '/suppliers', icon: Truck, roles: ['Admin', 'Warehouse Manager'] },
  { name: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart, roles: ['Admin', 'Warehouse Manager'] },
  { name: 'Stock Transfers', href: '/transfers', icon: ArrowRightLeft, roles: ['Admin', 'Warehouse Manager', 'Staff'] },
  { name: 'Reports', href: '/reports', icon: FileText, roles: ['Admin', 'Warehouse Manager'] },
  { name: 'Users', href: '/users', icon: Users, roles: ['Admin'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const filteredNav = navigation.filter(item => item.roles.includes(user?.role_name));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-dark-50">
      <aside
        className={`fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out bg-dark-900 ${collapsed ? 'w-16' : 'w-64'} lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Sidebar"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 border-b border-dark-800">
            {!collapsed && (
              <NavLink to="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-white">InventoryWMS</span>
              </NavLink>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors lg:hidden"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" role="navigation" aria-label="Main navigation">
            {filteredNav.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'sidebar-link-active' : ''} ${collapsed ? 'justify-center px-3' : ''}`
                }
                title={collapsed ? item.name : undefined}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                {!collapsed && <span>{item.name}</span>}
              </NavLink>
            ))}
          </nav>

          <div className="p-3 border-t border-dark-800">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
                  <p className="text-xs text-dark-400 capitalize">{user?.role_name?.toLowerCase()}</p>
                </div>
              )}
            </div>
            {!collapsed && (
              <div className="mt-3 space-y-1">
                <NavLink
                  to="/profile"
                  className="sidebar-link"
                  onClick={() => setSidebarOpen(false)}
                >
                  <User className="w-5 h-5" />
                  <span>Profile</span>
                </NavLink>
                <button
                  onClick={handleLogout}
                  className="sidebar-link text-red-400 hover:bg-red-500/10 hover:text-red-300 w-full text-left"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className={`lg:pl-64 transition-all duration-300 ${collapsed ? 'lg:pl-16' : ''}`}>
        <header className="sticky top-0 z-30 bg-white border-b border-dark-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-dark-500 hover:bg-dark-100"
                aria-label="Open sidebar"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-lg font-semibold text-dark-900 hidden sm:block">
                Inventory & Warehouse Management
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="relative p-2 rounded-lg text-dark-500 hover:bg-dark-100 transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              
              <div className="hidden sm:flex items-center gap-3 px-3 py-2 bg-dark-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-700" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-dark-900">{user?.full_name}</p>
                  <p className="text-xs text-dark-500 capitalize">{user?.role_name}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8" role="main">
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}