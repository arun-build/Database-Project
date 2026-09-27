import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Warehouse,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Users,
  Boxes,
  TrendingUp,
} from 'lucide-react';

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    status: '',
  });
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [managers, setManagers] = useState([]);
  const [formData, setFormData] = useState({
    warehouse_name: '',
    location: '',
    capacity: '',
    manager_id: '',
    contact_number: '',
    status: 'Active',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await api.get(`/warehouses?${params.toString()}`);
      setWarehouses(response.data.data.warehouses);
      setTotalPages(response.data.data.pagination.pages);
      setTotalItems(response.data.data.pagination.total);
    } catch (error) {
      toast.error('Failed to fetch warehouses');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchManagers = async () => {
    try {
      const response = await api.get('/users?role_id=2&limit=100');
      setManagers(response.data.data.users);
    } catch (error) {
      console.error('Failed to fetch managers');
    }
  };

  useEffect(() => {
    fetchWarehouses();
    fetchManagers();
  }, [fetchWarehouses]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setFilters(prev => ({ ...prev, page }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.warehouse_name.trim()) errors.warehouse_name = 'Warehouse name is required';
    if (!formData.location.trim()) errors.location = 'Location is required';
    if (!formData.capacity || parseInt(formData.capacity) < 1) errors.capacity = 'Capacity must be at least 1';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      warehouse_name: '',
      location: '',
      capacity: '',
      manager_id: '',
      contact_number: '',
      status: 'Active',
    });
    setFormErrors({});
    setEditingWarehouse(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      warehouse_name: warehouse.warehouse_name,
      location: warehouse.location,
      capacity: String(warehouse.capacity),
      manager_id: String(warehouse.manager_id || ''),
      contact_number: warehouse.contact_number || '',
      status: warehouse.status,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const data = {
        ...formData,
        capacity: parseInt(formData.capacity),
        manager_id: formData.manager_id ? parseInt(formData.manager_id) : null,
      };

      if (editingWarehouse) {
        await api.put(`/warehouses/${editingWarehouse.warehouse_id}`, data);
        toast.success('Warehouse updated successfully');
      } else {
        await api.post('/warehouses', data);
        toast.success('Warehouse created successfully');
      }
      closeModal();
      fetchWarehouses();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to save warehouse';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (warehouseId) => {
    if (!confirm('Are you sure you want to delete this warehouse? This action cannot be undone.')) return;

    try {
      await api.delete(`/warehouses/${warehouseId}`);
      toast.success('Warehouse deleted successfully');
      fetchWarehouses();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete warehouse';
      toast.error(message);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      Active: 'badge-success',
      Inactive: 'badge-gray',
      Maintenance: 'badge-warning',
    };
    return badges[status] || 'badge-gray';
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-primary-600" />
            Warehouses
          </h1>
          <p className="page-subtitle">Manage warehouse locations and capacities</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Warehouse
        </button>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="p-4 border-b border-dark-100">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="text"
                placeholder="Search warehouses..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Manager</th>
                  <th>Capacity</th>
                  <th>Products</th>
                  <th>Stock</th>
                  <th>Utilization</th>
                  <th>Status</th>
                  <th className="w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8">
                      <Loader2 className="w-6 h-6 text-primary-600 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : warehouses.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-dark-500">
                      No warehouses found
                    </td>
                  </tr>
                ) : (
                  warehouses.map(wh => (
                    <tr key={wh.warehouse_id}>
                      <td className="font-medium">{wh.warehouse_name}</td>
                      <td className="max-w-xs truncate">{wh.location}</td>
                      <td>
                        {wh.manager_name ? (
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-dark-400" />
                            <span>{wh.manager_name}</span>
                          </div>
                        ) : (
                          <span className="text-dark-400">Unassigned</span>
                        )}
                      </td>
                      <td>{wh.capacity.toLocaleString()}</td>
                      <td><span className="badge badge-info">{wh.product_count} SKUs</span></td>
                      <td>{wh.total_stock.toLocaleString()} units</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-dark-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-600 transition-all duration-300"
                              style={{ width: `${Math.min(100, wh.utilization_percentage || 0)}%` }}
                            />
                          </div>
                          <span className="text-sm text-dark-600 w-16 text-right">{wh.utilization_percentage || 0}%</span>
                        </div>
                      </td>
                      <td><span className={`badge ${getStatusBadge(wh.status)}`}>{wh.status}</span></td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(wh)}
                            className="p-2 text-dark-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(wh.warehouse_id)}
                            className="p-2 text-dark-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
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
                Showing {((filters.page - 1) * filters.limit) + 1} to {Math.min(filters.page * filters.limit, totalItems)} of {totalItems} warehouses
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

      {showModal && (
        <div className="modal-overlay" onClick={closeModal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="modal max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="modal-title" className="modal-title">{editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}</h2>
              <button onClick={closeModal} className="p-1 text-dark-400 hover:text-dark-600 rounded-lg hover:bg-dark-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="warehouse_name" className="label">Warehouse Name *</label>
                  <input
                    id="warehouse_name"
                    type="text"
                    value={formData.warehouse_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, warehouse_name: e.target.value }))}
                    className={`input ${formErrors.warehouse_name ? 'input-error' : ''}`}
                    placeholder="Main Warehouse"
                  />
                  {formErrors.warehouse_name && <p className="mt-1 text-sm text-red-500">{formErrors.warehouse_name}</p>}
                </div>
                <div>
                  <label htmlFor="capacity" className="label">Capacity *</label>
                  <input
                    id="capacity"
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                    className={`input ${formErrors.capacity ? 'input-error' : ''}`}
                    placeholder="10000"
                  />
                  {formErrors.capacity && <p className="mt-1 text-sm text-red-500">{formErrors.capacity}</p>}
                </div>
              </div>
              <div>
                <label htmlFor="location" className="label">Location *</label>
                <textarea
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className={`input ${formErrors.location ? 'input-error' : ''} min-h-[80px] resize-y`}
                  placeholder="123 Industrial Blvd, New York, NY 10001"
                />
                {formErrors.location && <p className="mt-1 text-sm text-red-500">{formErrors.location}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="manager_id" className="label">Manager</label>
                  <select
                    id="manager_id"
                    value={formData.manager_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, manager_id: e.target.value }))}
                    className="input"
                  >
                    <option value="">Select Manager (Optional)</option>
                    {managers.map(mgr => (
                      <option key={mgr.user_id} value={mgr.user_id}>{mgr.full_name} ({mgr.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="contact_number" className="label">Contact Number</label>
                  <input
                    id="contact_number"
                    type="text"
                    value={formData.contact_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_number: e.target.value }))}
                    className="input"
                    placeholder="+1-555-0101"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="status" className="label">Status</label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="input"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </span>
                  ) : editingWarehouse ? (
                    'Update Warehouse'
                  ) : (
                    'Create Warehouse'
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