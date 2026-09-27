import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  XCircle,
  Boxes,
  Plus,
  Warehouse,
} from 'lucide-react';

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    warehouse_id: '',
    category_id: '',
    status: '',
  });
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [showStockOutModal, setShowStockOutModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [stockFormData, setStockFormData] = useState({
    product_id: '',
    warehouse_id: '',
    quantity: '',
    remarks: '',
  });
  const [stockFormErrors, setStockFormErrors] = useState({});
  const [stockSubmitting, setStockSubmitting] = useState(false);
  const [stockType, setStockType] = useState('in');

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await api.get(`/inventory?${params.toString()}`);
      setInventory(response.data.data.inventory);
      setTotalPages(response.data.data.pagination.pages);
      setTotalItems(response.data.data.pagination.total);
    } catch (error) {
      toast.error('Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/warehouses?limit=100&status=Active');
      setWarehouses(response.data.data.warehouses);
    } catch (error) {
      console.error('Failed to fetch warehouses');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories?limit=100');
      setCategories(response.data.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchWarehouses();
    fetchCategories();
  }, [fetchInventory]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setFilters(prev => ({ ...prev, page }));
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'In Stock': 'badge-success',
      'Low Stock': 'badge-warning',
      'Out of Stock': 'badge-danger',
    };
    return badges[status] || 'badge-gray';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'In Stock': return <Boxes className="w-4 h-4 text-green-500" />;
      case 'Low Stock': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'Out of Stock': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Boxes className="w-4 h-4 text-dark-400" />;
    }
  };

  const openStockModal = (item, type) => {
    setSelectedItem(item);
    setStockType(type);
    setStockFormData({
      product_id: String(item.product_id),
      warehouse_id: String(item.warehouse_id),
      quantity: '',
      remarks: '',
    });
    setStockFormErrors({});
    if (type === 'in') setShowStockInModal(true);
    else setShowStockOutModal(true);
  };

  const closeStockModals = () => {
    setShowStockInModal(false);
    setShowStockOutModal(false);
    setSelectedItem(null);
  };

  const validateStockForm = () => {
    const errors = {};
    if (!stockFormData.quantity || parseInt(stockFormData.quantity) < 1) {
      errors.quantity = 'Quantity must be at least 1';
    }
    setStockFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    if (!validateStockForm()) return;

    setStockSubmitting(true);
    try {
      const endpoint = stockType === 'in' ? '/inventory/stock-in' : '/inventory/stock-out';
      await api.post(endpoint, {
        product_id: parseInt(stockFormData.product_id),
        warehouse_id: parseInt(stockFormData.warehouse_id),
        quantity: parseInt(stockFormData.quantity),
        reference_type: 'MANUAL',
        remarks: stockFormData.remarks,
      });
      toast.success(stockType === 'in' ? 'Stock added successfully' : 'Stock removed successfully');
      closeStockModals();
      fetchInventory();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update stock';
      toast.error(message);
    } finally {
      setStockSubmitting(false);
    }
  };

  const summaryStats = inventory.reduce((acc, item) => {
    if (item.stock_status === 'In Stock') acc.inStock++;
    else if (item.stock_status === 'Low Stock') acc.lowStock++;
    else if (item.stock_status === 'Out of Stock') acc.outOfStock++;
    acc.totalQty += item.quantity_available;
    acc.totalValue += item.quantity_available * item.unit_price;
    return acc;
  }, { inStock: 0, lowStock: 0, outOfStock: 0, totalQty: 0, totalValue: 0 });

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-primary-600" />
            Inventory
          </h1>
          <p className="page-subtitle">View and manage stock across all warehouses</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openStockModal({}, 'in')} className="btn-primary">
            <Plus className="w-4 h-4" />
            Stock In
          </button>
          <button onClick={() => openStockModal({}, 'out')} className="btn-secondary">
            <ArrowDown className="w-4 h-4" />
            Stock Out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">In Stock</p>
              <p className="stat-value mt-1">{summaryStats.inStock}</p>
            </div>
            <div className="stat-icon bg-green-100 text-green-600">
              <Boxes className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Low Stock</p>
              <p className="stat-value mt-1 text-yellow-600">{summaryStats.lowStock}</p>
            </div>
            <div className="stat-icon bg-yellow-100 text-yellow-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Out of Stock</p>
              <p className="stat-value mt-1 text-red-600">{summaryStats.outOfStock}</p>
            </div>
            <div className="stat-icon bg-red-100 text-red-600">
              <XCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Total Units</p>
              <p className="stat-value mt-1">{summaryStats.totalQty.toLocaleString()}</p>
            </div>
            <div className="stat-icon bg-blue-100 text-blue-600">
              <Boxes className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Total Value</p>
              <p className="stat-value mt-1">${summaryStats.totalValue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</p>
            </div>
            <div className="stat-icon bg-emerald-100 text-emerald-600">
              <ArrowUp className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="p-4 border-b border-dark-100">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="input pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={filters.warehouse_id}
                  onChange={(e) => handleFilterChange('warehouse_id', e.target.value)}
                  className="input w-auto min-w-[180px]"
                >
                  <option value="">All Warehouses</option>
                  {warehouses.map(wh => (
                    <option key={wh.warehouse_id} value={wh.warehouse_id}>{wh.warehouse_name}</option>
                  ))}
                </select>
                <select
                  value={filters.category_id}
                  onChange={(e) => handleFilterChange('category_id', e.target.value)}
                  className="input w-auto min-w-[180px]"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.category_id} value={cat.category_id}>{cat.category_name}</option>
                  ))}
                </select>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="input w-auto"
                >
                  <option value="">All Status</option>
                  <option value="In Stock">In Stock</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Warehouse</th>
                  <th>Available</th>
                  <th>Reserved</th>
                  <th>Free</th>
                  <th>Reorder Level</th>
                  <th>Status</th>
                  <th>Value</th>
                  <th className="w-40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8">
                      <Loader2 className="w-6 h-6 text-primary-600 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : inventory.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-dark-500">
                      No inventory records found
                    </td>
                  </tr>
                ) : (
                  inventory.map(item => (
                    <tr key={item.inventory_id}>
                      <td>
                        <Link to={`/products/${item.product_id}`} className="font-medium text-dark-900 hover:text-primary-600">
                          {item.product_name}
                        </Link>
                      </td>
                      <td className="font-mono text-sm">{item.sku}</td>
                      <td>{item.category_name}</td>
                      <td>{item.warehouse_name}</td>
                      <td className="font-medium">{item.quantity_available}</td>
                      <td className="text-dark-500">{item.reserved_quantity}</td>
                      <td className="font-medium text-blue-600">{item.quantity_available - item.reserved_quantity}</td>
                      <td>{item.reorder_level}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(item.stock_status)} flex items-center gap-1`}>
                          {getStatusIcon(item.stock_status)}
                          {item.stock_status}
                        </span>
                      </td>
                      <td className="font-medium">${(item.quantity_available * item.unit_price).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openStockModal(item, 'in')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Stock In"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openStockModal(item, 'out')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Stock Out"
                            disabled={item.quantity_available === 0}
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="card-footer flex items-center justify-between">
              <p className="text-sm text-dark-500">
                Showing {((filters.page - 1) * filters.limit) + 1} to {Math.min(filters.page * filters.limit, totalItems)} of {totalItems} records
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={filters.page === 1 || loading}
                  className="btn-outline p-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 text-sm text-dark-600">
                  Page {filters.page} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={filters.page === totalPages || loading}
                  className="btn-outline p-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {(showStockInModal || showStockOutModal) && (
        <div className="modal-overlay" onClick={closeStockModals} role="dialog" aria-modal="true" aria-labelledby="stock-modal-title">
          <div className="modal max-w-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="stock-modal-title" className="modal-title flex items-center gap-2">
                {stockType === 'in' ? (
                  <>
                    <ArrowUp className="w-5 h-5 text-green-500" />
                    Add Stock In
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-5 h-5 text-red-500" />
                    Remove Stock Out
                  </>
                )}
              </h2>
              <button onClick={closeStockModals} className="p-1 text-dark-400 hover:text-dark-600 rounded-lg hover:bg-dark-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleStockSubmit} className="modal-body space-y-4">
              {selectedItem && (
                <div className="p-3 bg-dark-50 rounded-lg">
                  <p className="font-medium text-dark-900">{selectedItem.product_name}</p>
                  <p className="text-sm text-dark-500">{selectedItem.warehouse_name} • Available: {selectedItem.quantity_available}</p>
                </div>
              )}
              <div>
                <label htmlFor="stock_product" className="label">Product *</label>
                <select
                  id="stock_product"
                  value={stockFormData.product_id}
                  onChange={(e) => setStockFormData(prev => ({ ...prev, product_id: e.target.value }))}
                  className={`input ${stockFormErrors.product_id ? 'input-error' : ''}`}
                  disabled={!!selectedItem}
                >
                  <option value="">Select Product</option>
                  {inventory.map(item => (
                    <option key={item.product_id} value={item.product_id}>{item.product_name} ({item.sku})</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="stock_warehouse" className="label">Warehouse *</label>
                <select
                  id="stock_warehouse"
                  value={stockFormData.warehouse_id}
                  onChange={(e) => setStockFormData(prev => ({ ...prev, warehouse_id: e.target.value }))}
                  className={`input ${stockFormErrors.warehouse_id ? 'input-error' : ''}`}
                  disabled={!!selectedItem}
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map(wh => (
                    <option key={wh.warehouse_id} value={wh.warehouse_id}>{wh.warehouse_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="stock_quantity" className="label">Quantity *</label>
                <input
                  id="stock_quantity"
                  type="number"
                  min="1"
                  value={stockFormData.quantity}
                  onChange={(e) => setStockFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  className={`input ${stockFormErrors.quantity ? 'input-error' : ''}`}
                  placeholder="10"
                />
                {stockFormErrors.quantity && <p className="mt-1 text-sm text-red-500">{stockFormErrors.quantity}</p>}
              </div>
              <div>
                <label htmlFor="stock_remarks" className="label">Remarks</label>
                <textarea
                  id="stock_remarks"
                  value={stockFormData.remarks}
                  onChange={(e) => setStockFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  className="input min-h-[80px] resize-y"
                  placeholder="Reason for stock adjustment..."
                />
              </div>
              <div className="modal-footer">
                <button type="button" onClick={closeStockModals} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className={stockType === 'in' ? 'btn-primary' : 'btn-danger'} disabled={stockSubmitting}>
                  {stockSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </span>
                  ) : stockType === 'in' ? (
                    'Add Stock'
                  ) : (
                    'Remove Stock'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}