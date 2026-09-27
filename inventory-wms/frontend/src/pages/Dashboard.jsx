import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Package,
  Warehouse,
  Boxes,
  AlertTriangle,
  XCircle,
  Truck,
  ShoppingCart,
  DollarSign,
  ArrowUpRight,
  TrendingDown,
  Clock,
  RefreshCw,
  Plus,
  ArrowRightLeft,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_products: 0,
    total_warehouses: 0,
    total_stock: 0,
    low_stock_products: 0,
    out_of_stock_products: 0,
    total_suppliers: 0,
    pending_purchase_orders: 0,
    inventory_value: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [pendingPOs, setPendingPOs] = useState([]);
  const [charts, setCharts] = useState({
    stockInOut: [],
    byCategory: [],
    byWarehouse: [],
    monthlyPurchases: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, chartsRes] = await Promise.all([
        api.get('/reports/dashboard/stats'),
        api.get('/reports/dashboard/charts?days=30'),
      ]);

      const rawStats = statsRes.data?.data?.stats;
      const parsedStats = Array.isArray(rawStats) ? rawStats[0] : (rawStats || {});

      setStats({
        total_products: Number(parsedStats.total_products || 0),
        total_warehouses: Number(parsedStats.total_warehouses || 0),
        total_stock: Number(parsedStats.total_stock || 0),
        low_stock_products: Number(parsedStats.low_stock_products || 0),
        out_of_stock_products: Number(parsedStats.out_of_stock_products || 0),
        total_suppliers: Number(parsedStats.total_suppliers || 0),
        pending_purchase_orders: Number(parsedStats.pending_purchase_orders || 0),
        inventory_value: Number(parsedStats.inventory_value || 0),
      });

      setRecentTransactions(statsRes.data?.data?.recent_transactions || []);
      setLowStockAlerts(statsRes.data?.data?.low_stock_alerts || []);
      setPendingPOs(statsRes.data?.data?.pending_purchase_orders || []);

      const rawCharts = chartsRes.data?.data || {};
      setCharts({
        stockInOut: rawCharts.stockInOut || rawCharts.stock_in_out || [],
        byCategory: rawCharts.byCategory || rawCharts.by_category || [],
        byWarehouse: rawCharts.byWarehouse || rawCharts.by_warehouse || [],
        monthlyPurchases: rawCharts.monthlyPurchases || rawCharts.monthly_purchases || [],
      });
    } catch (error) {
      console.error('Dashboard load error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const statCards = [
    { label: 'Total Products', value: stats.total_products, icon: Package, color: 'bg-indigo-50 text-indigo-600 border-indigo-100', trend: 'Active', trendIcon: ArrowUpRight },
    { label: 'Total Warehouses', value: stats.total_warehouses, icon: Warehouse, color: 'bg-blue-50 text-blue-600 border-blue-100', trend: 'Operational', trendIcon: ArrowUpRight },
    { label: 'Total Stock Units', value: (stats.total_stock || 0).toLocaleString(), icon: Boxes, color: 'bg-emerald-50 text-emerald-600 border-emerald-100', trend: 'In Stock', trendIcon: ArrowUpRight },
    { label: 'Low Stock Items', value: stats.low_stock_products, icon: AlertTriangle, color: 'bg-amber-50 text-amber-600 border-amber-100', trend: stats.low_stock_products > 0 ? 'Needs attention' : 'All good', trendIcon: stats.low_stock_products > 0 ? AlertTriangle : TrendingDown },
    { label: 'Out of Stock', value: stats.out_of_stock_products, icon: XCircle, color: 'bg-rose-50 text-rose-600 border-rose-100', trend: stats.out_of_stock_products > 0 ? 'Critical' : 'All stocked', trendIcon: stats.out_of_stock_products > 0 ? XCircle : TrendingDown },
    { label: 'Total Suppliers', value: stats.total_suppliers, icon: Truck, color: 'bg-purple-50 text-purple-600 border-purple-100', trend: 'Verified', trendIcon: ArrowUpRight },
    { label: 'Pending POs', value: stats.pending_purchase_orders, icon: ShoppingCart, color: 'bg-orange-50 text-orange-600 border-orange-100', trend: stats.pending_purchase_orders > 0 ? 'Action needed' : 'Clear', trendIcon: stats.pending_purchase_orders > 0 ? Clock : TrendingDown },
    { label: 'Inventory Value', value: `$${(stats.inventory_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, color: 'bg-teal-50 text-teal-600 border-teal-100', trend: 'Total valuation', trendIcon: ArrowUpRight },
  ];

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading dashboard">
        <div className="page-header">
          <div>
            <h1 className="page-title text-2xl font-bold text-dark-900">Dashboard</h1>
            <p className="page-subtitle text-dark-500 text-sm">Overview of your inventory and warehouse operations</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse bg-white">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-dark-200 rounded" />
                <div className="h-10 w-10 bg-dark-200 rounded-lg" />
              </div>
              <div className="mt-4 h-7 w-28 bg-dark-200 rounded" />
              <div className="mt-2 h-4 w-16 bg-dark-200 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card animate-pulse h-80 bg-white" />
          <div className="card animate-pulse h-80 bg-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title text-2xl font-bold text-dark-900">Dashboard</h1>
          <p className="page-subtitle text-dark-500 text-sm">Real-time inventory intelligence, movements, and key performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/inventory" className="btn btn-outline text-xs">
            <Boxes className="w-3.5 h-3.5 mr-1" /> Stock In/Out
          </Link>
          <Link to="/products" className="btn btn-primary text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Product
          </Link>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="btn btn-secondary text-xs"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trendIcon;
          return (
            <div
              key={index}
              className="card p-5 bg-white border border-dark-100/80 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-dark-500">{stat.label}</p>
                <div className={`p-2.5 rounded-xl border ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-dark-900 tracking-tight">{stat.value}</p>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-dark-500">
                <TrendIcon className="w-3.5 h-3.5 text-primary-600" />
                <span className="font-medium text-dark-600">{stat.trend}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-dark-900">Stock Movements (30 Days)</h2>
              <p className="text-xs text-dark-500">Daily Stock In vs Stock Out trends</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Stock In
              </span>
              <span className="flex items-center gap-1.5 text-rose-600">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Stock Out
              </span>
            </div>
          </div>
          <div className="card-body">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.stockInOut}>
                  <defs>
                    <linearGradient id="colorStockIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorStockOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value, name) => [value, name === 'stock_in' ? 'Stock In' : 'Stock Out']}
                  />
                  <Area type="monotone" dataKey="stock_in" stroke="#10b981" fillOpacity={1} fill="url(#colorStockIn)" strokeWidth={2} name="Stock In" />
                  <Area type="monotone" dataKey="stock_out" stroke="#ef4444" fillOpacity={1} fill="url(#colorStockOut)" strokeWidth={2} name="Stock Out" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-dark-900">Inventory by Category</h2>
              <p className="text-xs text-dark-500">Stock distribution across product categories</p>
            </div>
            <Link to="/categories" className="text-xs font-semibold text-primary-600 hover:text-primary-700">View categories &rarr;</Link>
          </div>
          <div className="card-body">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.byCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="total_quantity"
                    nameKey="category_name"
                    label={({ category_name, percent }) => `${category_name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {(charts.byCategory || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px' }}
                    formatter={(value) => [Number(value).toLocaleString(), 'Units']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-dark-900">Warehouse Stock Distribution</h2>
              <p className="text-xs text-dark-500">Physical stock capacity across locations</p>
            </div>
            <Link to="/warehouses" className="text-xs font-semibold text-primary-600 hover:text-primary-700">View warehouses &rarr;</Link>
          </div>
          <div className="card-body">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.byWarehouse} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="warehouse_name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px' }}
                    formatter={(value) => [Number(value).toLocaleString(), 'Units']}
                  />
                  <Bar dataKey="total_stock" fill="#6366f1" radius={[0, 6, 6, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-dark-900">Monthly Purchase Trends</h2>
              <p className="text-xs text-dark-500">Procurement spend and order frequency</p>
            </div>
            <Link to="/purchase-orders" className="text-xs font-semibold text-primary-600 hover:text-primary-700">View POs &rarr;</Link>
          </div>
          <div className="card-body">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...(charts.monthlyPurchases || [])].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month_name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px' }}
                    formatter={(value, name) => {
                      if (name === 'Amount ($)') return [`$${Number(value).toLocaleString()}`, 'Total Amount'];
                      if (name === 'Orders') return [value, 'Orders'];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="total_amount" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} name="Amount ($)" />
                  <Line type="monotone" dataKey="total_orders" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} name="Orders" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-600" />
              <h2 className="text-base font-semibold text-dark-900">Recent Stock Transactions</h2>
            </div>
            <Link to="/reports" className="text-xs font-semibold text-primary-600 hover:text-primary-700">Audit report &rarr;</Link>
          </div>
          <div className="card-body p-0">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Warehouse</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Performed By</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-6 text-dark-500">No recent transactions</td>
                    </tr>
                  ) : (
                    recentTransactions.slice(0, 8).map((txn) => (
                      <tr key={txn.transaction_id}>
                        <td>
                          <div>
                            <p className="font-medium text-dark-900">{txn.product_name}</p>
                            <p className="text-xs text-dark-400 font-mono">{txn.sku}</p>
                          </div>
                        </td>
                        <td className="text-sm text-dark-600">{txn.warehouse_name}</td>
                        <td>
                          <span className={`badge ${
                            txn.transaction_type === 'STOCK_IN' ? 'badge-success' :
                            txn.transaction_type === 'STOCK_OUT' ? 'badge-danger' : 'badge-info'
                          }`}>
                            {txn.transaction_type}
                          </span>
                        </td>
                        <td className={`font-semibold text-sm ${txn.transaction_type === 'STOCK_IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {txn.transaction_type === 'STOCK_IN' ? '+' : '-'}{txn.quantity}
                        </td>
                        <td className="text-sm text-dark-600">{txn.performed_by}</td>
                        <td className="text-xs text-dark-400">{new Date(txn.transaction_date).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-semibold text-dark-900">Low Stock Alerts</h2>
            </div>
            <Link to="/reports" className="text-xs font-semibold text-primary-600 hover:text-primary-700">View all &rarr;</Link>
          </div>
          <div className="card-body p-0">
            {lowStockAlerts.length === 0 ? (
              <div className="p-8 text-center text-dark-500">
                <Boxes className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="font-medium text-dark-700">Stock Levels Optimal</p>
                <p className="text-xs text-dark-400 mt-1">No items currently below reorder thresholds</p>
              </div>
            ) : (
              <div className="divide-y divide-dark-100 max-h-96 overflow-y-auto">
                {lowStockAlerts.slice(0, 6).map((item) => (
                  <div key={item.inventory_id} className="p-3.5 hover:bg-dark-50/70 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-semibold text-sm text-dark-900 truncate">{item.product_name}</p>
                        <p className="text-xs text-dark-500 truncate">{item.warehouse_name} • {item.category_name}</p>
                      </div>
                      <span className={`badge shrink-0 ${item.stock_status === 'Out of Stock' ? 'badge-danger' : 'badge-warning'}`}>
                        {item.stock_status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-dark-500">
                      <span>Available: <strong className="text-dark-800">{item.quantity_available}</strong></span>
                      <span>Reorder: <strong className="text-dark-800">{item.reorder_level}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            <h2 className="text-base font-semibold text-dark-900">Pending Purchase Orders</h2>
          </div>
          <Link to="/purchase-orders" className="text-xs font-semibold text-primary-600 hover:text-primary-700">View all &rarr;</Link>
        </div>
        <div className="card-body p-0">
          {pendingPOs.length === 0 ? (
            <div className="p-6 text-center text-dark-500">
              <ShoppingCart className="w-10 h-10 text-dark-300 mx-auto mb-2" />
              <p className="text-sm font-medium">No pending purchase orders</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>PO #</th>
                    <th>Supplier</th>
                    <th>Order Date</th>
                    <th>Expected Delivery</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPOs.slice(0, 6).map((po) => (
                    <tr key={po.po_id}>
                      <td className="font-mono font-medium text-primary-600">PO-{String(po.po_id).padStart(4, '0')}</td>
                      <td className="font-medium text-dark-900">{po.supplier_name}</td>
                      <td>{new Date(po.order_date).toLocaleDateString()}</td>
                      <td>{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : '-'}</td>
                      <td className="font-semibold text-dark-900">${Number(po.total_amount).toLocaleString()}</td>
                      <td><span className="badge badge-warning">{po.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}