import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  FileText,
  AlertTriangle,
  DollarSign,
  ArrowUpDown,
  ShoppingCart,
  Download,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';

const reportTypes = [
  { id: 'low-stock', name: 'Low Stock Report', icon: AlertTriangle, description: 'Products below reorder level' },
  { id: 'inventory-value', name: 'Inventory Valuation', icon: DollarSign, description: 'Stock value by product and warehouse' },
  { id: 'transactions', name: 'Stock Transactions', icon: ArrowUpDown, description: 'Stock in/out history with filters' },
  { id: 'purchase-orders', name: 'Purchase Orders', icon: ShoppingCart, description: 'PO status and supplier summary' },
  { id: 'inventory', name: 'Inventory Summary', icon: FileText, description: 'Complete inventory listing' },
];

export default function Reports() {
  const [activeReport, setActiveReport] = useState('low-stock');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    warehouse_id: '',
    category_id: '',
    supplier_id: '',
    product_id: '',
    transaction_type: '',
    status: '',
    start_date: '',
    end_date: '',
  });
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  const fetchFilterData = async () => {
    try {
      const [wh, cat, sup, prod] = await Promise.all([
        api.get('/warehouses?limit=100&status=Active'),
        api.get('/categories?limit=100'),
        api.get('/suppliers?limit=100&status=Active'),
        api.get('/products?limit=100&status=Active'),
      ]);
      setWarehouses(wh.data.data.warehouses);
      setCategories(cat.data.data.categories);
      setSuppliers(sup.data.data.suppliers);
      setProducts(prod.data.data.products);
    } catch (error) {
      console.error('Failed to fetch filter data');
    }
  };

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = '';
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      switch (activeReport) {
        case 'low-stock':
          endpoint = `/reports/low-stock?${params.toString()}`;
          break;
        case 'inventory-value':
          endpoint = `/reports/inventory-value?${params.toString()}`;
          break;
        case 'transactions':
          endpoint = `/reports/transactions?${params.toString()}`;
          break;
        case 'purchase-orders':
          endpoint = `/reports/purchase-orders?${params.toString()}`;
          break;
        case 'inventory':
          endpoint = `/reports/inventory-summary?${params.toString()}`;
          break;
        default:
          endpoint = `/reports/low-stock?${params.toString()}`;
      }

      const response = await api.get(endpoint);
      if (response.data?.data) {
        setReportData(response.data.data.report || []);
        setTotalPages(response.data.data.pagination?.pages || 1);
        setTotalItems(response.data.data.pagination?.total || (response.data.data.report || []).length);
        if (response.data.data.summary) {
          setSummary(response.data.data.summary);
        } else {
          setSummary(null);
        }
      } else {
        setReportData([]);
        setTotalPages(1);
        setTotalItems(0);
      }
    } catch (error) {
      toast.error('Failed to fetch report');
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [activeReport, filters]);

  useEffect(() => {
    fetchFilterData();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setFilters(prev => ({ ...prev, page }));
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      params.append('type', activeReport);

      const response = await api.get(`/reports/export?${params.toString()}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${activeReport}_report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const renderSummaryCards = () => {
    if (activeReport === 'inventory-value' && summary) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card p-4 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100">
            <p className="text-sm font-medium text-dark-500">Total Cost Value</p>
            <p className="text-2xl font-bold text-dark-900 mt-1">${Number(summary.total_cost_value).toLocaleString()}</p>
          </div>
          <div className="card p-4 bg-gradient-to-br from-emerald-50 to-white border border-emerald-100">
            <p className="text-sm font-medium text-dark-500">Total Retail Value</p>
            <p className="text-2xl font-bold text-dark-900 mt-1">${Number(summary.total_retail_value).toLocaleString()}</p>
          </div>
          <div className="card p-4 bg-gradient-to-br from-blue-50 to-white border border-blue-100">
            <p className="text-sm font-medium text-dark-500">Potential Profit</p>
            <p className="text-2xl font-bold text-green-600 mt-1">${Number(summary.potential_profit).toLocaleString()}</p>
          </div>
        </div>
      );
    }

    if (activeReport === 'purchase-orders' && summary) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card p-4 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100">
            <p className="text-sm font-medium text-dark-500">Total Orders</p>
            <p className="text-2xl font-bold text-dark-900 mt-1">{summary.total_orders}</p>
          </div>
          <div className="card p-4 bg-gradient-to-br from-emerald-50 to-white border border-emerald-100">
            <p className="text-sm font-medium text-dark-500">Total Amount</p>
            <p className="text-2xl font-bold text-dark-900 mt-1">${Number(summary.total_amount).toLocaleString()}</p>
          </div>
          <div className="card p-4 bg-gradient-to-br from-purple-50 to-white border border-purple-100">
            <p className="text-sm font-medium text-dark-500">Unique Suppliers</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{summary.unique_suppliers}</p>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderFilters = () => {
    const commonFilters = (
      <div className="flex flex-wrap gap-4 items-center">
        <select value={filters.warehouse_id} onChange={e => handleFilterChange('warehouse_id', e.target.value)} className="input w-auto min-w-[180px]">
          <option value="">All Warehouses</option>
          {warehouses.map(w => <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}</option>)}
        </select>
        <select value={filters.category_id} onChange={e => handleFilterChange('category_id', e.target.value)} className="input w-auto min-w-[180px]">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
        </select>
      </div>
    );

    if (activeReport === 'transactions') {
      return (
        <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-dark-100 bg-dark-50/50">
          {commonFilters}
          <div className="flex flex-wrap gap-4 items-center">
            <select value={filters.transaction_type} onChange={e => handleFilterChange('transaction_type', e.target.value)} className="input w-auto">
              <option value="">All Transaction Types</option>
              <option value="STOCK_IN">Stock In</option>
              <option value="STOCK_OUT">Stock Out</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="STOCK_TRANSFER">Transfer</option>
            </select>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input type="date" value={filters.start_date} onChange={e => handleFilterChange('start_date', e.target.value)} className="input pl-9" placeholder="From" />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input type="date" value={filters.end_date} onChange={e => handleFilterChange('end_date', e.target.value)} className="input pl-9" placeholder="To" />
            </div>
          </div>
        </div>
      );
    }

    if (activeReport === 'purchase-orders') {
      return (
        <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-dark-100 bg-dark-50/50">
          <div className="flex flex-wrap gap-4 items-center">
            <select value={filters.supplier_id} onChange={e => handleFilterChange('supplier_id', e.target.value)} className="input w-auto min-w-[180px]">
              <option value="">All Suppliers</option>
              {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>)}
            </select>
            <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)} className="input w-auto">
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Received">Received</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input type="date" value={filters.start_date} onChange={e => handleFilterChange('start_date', e.target.value)} className="input pl-9" placeholder="From" />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input type="date" value={filters.end_date} onChange={e => handleFilterChange('end_date', e.target.value)} className="input pl-9" placeholder="To" />
            </div>
          </div>
        </div>
      );
    }

    if (activeReport === 'inventory-value') {
      return (
        <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-dark-100 bg-dark-50/50">
          {commonFilters}
          <div className="flex flex-wrap gap-4 items-center">
            <select value={filters.supplier_id} onChange={e => handleFilterChange('supplier_id', e.target.value)} className="input w-auto min-w-[180px]">
              <option value="">All Suppliers</option>
              {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>)}
            </select>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 border-b border-dark-100 bg-dark-50/50">
        {commonFilters}
      </div>
    );
  };

  const renderTable = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      );
    }

    if (reportData.length === 0) {
      return (
        <div className="text-center py-12 text-dark-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-dark-300" />
          <p className="text-base font-medium text-dark-700">No records found</p>
          <p className="text-sm">Try adjusting your filter criteria</p>
        </div>
      );
    }

    if (activeReport === 'low-stock') {
      return (
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Warehouse</th>
              <th>Available</th>
              <th>Reorder Level</th>
              <th>Deficit</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((item, idx) => (
              <tr key={item.inventory_id || idx}>
                <td className="font-medium text-dark-900">{item.product_name}</td>
                <td className="font-mono text-xs text-dark-500">{item.sku}</td>
                <td>{item.category_name}</td>
                <td>{item.warehouse_name}</td>
                <td className="font-semibold text-dark-900">{item.quantity_available}</td>
                <td>{item.reorder_level}</td>
                <td className="text-red-600 font-semibold">-{Math.abs(item.stock_deficit || 0)}</td>
                <td>
                  <span className={`badge ${item.stock_status === 'Out of Stock' ? 'badge-danger' : 'badge-warning'}`}>
                    {item.stock_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeReport === 'inventory-value') {
      return (
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Supplier</th>
              <th>Warehouse</th>
              <th>Qty</th>
              <th>Unit Cost</th>
              <th>Cost Value</th>
              <th>Retail Value</th>
              <th>Profit Margin</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((item, idx) => (
              <tr key={item.inventory_id || idx}>
                <td className="font-medium text-dark-900">{item.product_name}</td>
                <td className="font-mono text-xs text-dark-500">{item.sku}</td>
                <td>{item.category_name}</td>
                <td>{item.supplier_name}</td>
                <td>{item.warehouse_name}</td>
                <td className="font-semibold">{item.quantity_available}</td>
                <td>${Number(item.unit_price).toFixed(2)}</td>
                <td className="font-medium">${Number(item.cost_value).toLocaleString()}</td>
                <td className="font-medium">${Number(item.retail_value).toLocaleString()}</td>
                <td className="font-semibold text-green-600">${Number(item.potential_profit).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeReport === 'transactions') {
      return (
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th>SKU</th>
              <th>Warehouse</th>
              <th>Type</th>
              <th>Qty</th>
              <th>Performed By</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((item, idx) => (
              <tr key={item.transaction_id || idx}>
                <td className="text-dark-500 text-xs">{new Date(item.transaction_date).toLocaleString()}</td>
                <td className="font-medium text-dark-900">{item.product_name}</td>
                <td className="font-mono text-xs text-dark-500">{item.sku}</td>
                <td>{item.warehouse_name}</td>
                <td>
                  <span className={`badge ${item.transaction_type === 'STOCK_IN' ? 'badge-success' : 'badge-danger'}`}>
                    {item.transaction_type}
                  </span>
                </td>
                <td className="font-bold">{item.quantity}</td>
                <td>{item.performed_by}</td>
                <td className="text-xs text-dark-500">{item.remarks || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeReport === 'purchase-orders') {
      return (
        <table className="table">
          <thead>
            <tr>
              <th>PO #</th>
              <th>Supplier</th>
              <th>Order Date</th>
              <th>Expected</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th>Created By</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((item, idx) => (
              <tr key={item.po_id || idx}>
                <td className="font-mono font-medium text-primary-600">PO-{String(item.po_id).padStart(4, '0')}</td>
                <td className="font-medium text-dark-900">{item.supplier_name}</td>
                <td>{new Date(item.order_date).toLocaleDateString()}</td>
                <td>{item.expected_delivery_date ? new Date(item.expected_delivery_date).toLocaleDateString() : '-'}</td>
                <td className="font-semibold text-dark-900">${Number(item.total_amount).toLocaleString()}</td>
                <td>
                  <span className={`badge ${
                    item.status === 'Pending' ? 'badge-warning' : 
                    item.status === 'Approved' ? 'badge-info' : 
                    item.status === 'Received' ? 'badge-success' : 'badge-danger'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td>{item.created_by_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeReport === 'inventory') {
      return (
        <table className="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Category</th>
              <th>Warehouse</th>
              <th>Available</th>
              <th>Reorder Level</th>
              <th>Unit Cost</th>
              <th>Stock Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((item, idx) => (
              <tr key={(item.sku || '') + (item.warehouse_name || '') + idx}>
                <td className="font-mono text-xs text-dark-500">{item.sku}</td>
                <td className="font-medium text-dark-900">{item.product_name}</td>
                <td>{item.category_name}</td>
                <td>{item.warehouse_name}</td>
                <td className="font-bold text-dark-900">{item.quantity_available}</td>
                <td>{item.reorder_level}</td>
                <td>${Number(item.unit_price).toFixed(2)}</td>
                <td className="font-semibold text-dark-900">${Number(item.stock_value).toLocaleString()}</td>
                <td>
                  <span className={`badge ${
                    item.stock_status === 'In Stock' ? 'badge-success' : 
                    item.stock_status === 'Low Stock' ? 'badge-warning' : 'badge-danger'
                  }`}>
                    {item.stock_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title text-2xl font-bold text-dark-900">Reports & Analytics</h1>
          <p className="page-subtitle text-dark-500 text-sm">Comprehensive inventory intelligence, valuations, and audit logs</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchReport} className="btn btn-outline" title="Refresh">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button onClick={handleExport} className="btn btn-primary" title="Export CSV">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {reportTypes.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveReport(tab.id);
                setFilters(prev => ({ ...prev, page: 1 }));
              }}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                isActive
                  ? 'bg-primary-50/70 border-primary-500 shadow-sm ring-1 ring-primary-500'
                  : 'bg-white border-dark-200 hover:border-dark-300 hover:bg-dark-50/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`p-1.5 rounded-lg ${isActive ? 'bg-primary-600 text-white' : 'bg-dark-100 text-dark-600'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-sm font-semibold ${isActive ? 'text-primary-900' : 'text-dark-800'}`}>
                  {tab.name}
                </span>
              </div>
              <p className="text-xs text-dark-500 line-clamp-1">{tab.description}</p>
            </button>
          );
        })}
      </div>

      {renderSummaryCards()}

      <div className="card">
        {renderFilters()}
        <div className="table-container">
          {renderTable()}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-dark-100 bg-dark-50/50">
            <p className="text-xs text-dark-500">
              Showing page <span className="font-semibold text-dark-800">{filters.page}</span> of{' '}
              <span className="font-semibold text-dark-800">{totalPages}</span> ({totalItems} total records)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(filters.page - 1)}
                disabled={filters.page <= 1}
                className="btn btn-outline py-1.5 px-3 text-xs disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </button>
              <button
                onClick={() => handlePageChange(filters.page + 1)}
                disabled={filters.page >= totalPages}
                className="btn btn-outline py-1.5 px-3 text-xs disabled:opacity-40"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}