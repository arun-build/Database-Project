import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  RotateCcw,
  Clock,
  Package,
  Warehouse,
  FileText,
} from 'lucide-react';

export default function Transfers() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [viewingTransfer, setViewingTransfer] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    status: '',
    source_warehouse_id: '',
    destination_warehouse_id: ''
  });
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    product_id: '',
    source_warehouse_id: '',
    destination_warehouse_id: '',
    quantity: '',
    remarks: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.append(k, v);
      });
      const res = await api.get(`/transfers?${params.toString()}`);
      if (res.data?.data) {
        setTransfers(res.data.data.transfers || []);
        setTotalPages(res.data.data.pagination?.pages || 1);
        setTotalItems(res.data.data.pagination?.total || 0);
      }
    } catch (e) {
      console.error('Fetch transfers error:', e);
      toast.error('Failed to fetch transfers');
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchWarehouses = async () => {
    try {
      const r = await api.get('/warehouses?limit=100&status=Active');
      setWarehouses(r.data.data.warehouses || []);
    } catch (e) {
      console.error('Fetch warehouses error:', e);
    }
  };

  const fetchProducts = async () => {
    try {
      const r = await api.get('/products?limit=100&status=Active');
      setProducts(r.data.data.products || []);
    } catch (e) {
      console.error('Fetch products error:', e);
    }
  };

  useEffect(() => {
    fetchTransfers();
    fetchWarehouses();
    fetchProducts();
  }, [fetchTransfers]);

  const handleFilterChange = (k, v) => setFilters(p => ({ ...p, [k]: v, page: 1 }));
  const handlePageChange = (p) => {
    if (p >= 1 && p <= totalPages) {
      setFilters(prev => ({ ...prev, page: p }));
    }
  };

  const validate = () => {
    const e = {};
    if (!formData.product_id) e.product_id = 'Product is required';
    if (!formData.source_warehouse_id) e.source_warehouse_id = 'Source warehouse is required';
    if (!formData.destination_warehouse_id) e.destination_warehouse_id = 'Destination warehouse is required';
    if (formData.source_warehouse_id && formData.destination_warehouse_id && formData.source_warehouse_id === formData.destination_warehouse_id) {
      e.destination_warehouse_id = 'Destination must be different from source';
    }
    if (!formData.quantity || parseInt(formData.quantity) < 1) e.quantity = 'Valid quantity (>= 1) is required';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const reset = () => {
    setFormData({
      product_id: '',
      source_warehouse_id: '',
      destination_warehouse_id: '',
      quantity: '',
      remarks: ''
    });
    setFormErrors({});
  };

  const openCreate = () => {
    reset();
    setShowModal(true);
  };

  const close = () => {
    setShowModal(false);
    reset();
  };

  const openView = (transfer) => {
    setViewingTransfer(transfer);
  };

  const closeView = () => {
    setViewingTransfer(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.post('/transfers', {
        product_id: parseInt(formData.product_id),
        source_warehouse_id: parseInt(formData.source_warehouse_id),
        destination_warehouse_id: parseInt(formData.destination_warehouse_id),
        quantity: parseInt(formData.quantity),
        remarks: formData.remarks
      });
      toast.success('Stock transfer request created');
      close();
      fetchTransfers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const approve = async (id) => {
    try {
      await api.put(`/transfers/${id}/approve`);
      toast.success('Transfer approved');
      fetchTransfers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve transfer');
    }
  };

  const complete = async (id) => {
    try {
      await api.put(`/transfers/${id}/complete`);
      toast.success('Transfer completed & stock moved');
      fetchTransfers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete transfer');
    }
  };

  const cancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this transfer?')) return;
    try {
      await api.put(`/transfers/${id}/cancel`);
      toast.success('Transfer cancelled');
      fetchTransfers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel transfer');
    }
  };

  const statusBadge = (s) => ({
    Pending: 'badge-warning',
    Approved: 'badge-info',
    Completed: 'badge-success',
    Cancelled: 'badge-danger'
  })[s] || 'badge-gray';

  const statusIcon = (s) => {
    if (s === 'Pending') return <Clock className="w-3.5 h-3.5" />;
    if (s === 'Approved') return <CheckCircle className="w-3.5 h-3.5 text-blue-600" />;
    if (s === 'Completed') return <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />;
    return <XCircle className="w-3.5 h-3.5 text-rose-600" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title text-2xl font-bold text-dark-900 flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-primary-600" />
            Stock Transfers
          </h1>
          <p className="page-subtitle text-dark-500 text-sm">
            Manage inter-warehouse inventory transfers, approvals, and physical fulfillment
          </p>
        </div>
        <button onClick={openCreate} className="btn btn-primary text-xs">
          <Plus className="w-4 h-4 mr-1" /> New Transfer
        </button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-dark-100 bg-dark-50/50">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                type="text"
                placeholder="Search transfer or product..."
                value={filters.search}
                onChange={e => handleFilterChange('search', e.target.value)}
                className="input pl-9 text-xs"
              />
            </div>
            <select
              value={filters.status}
              onChange={e => handleFilterChange('status', e.target.value)}
              className="input w-auto text-xs"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <select
              value={filters.source_warehouse_id}
              onChange={e => handleFilterChange('source_warehouse_id', e.target.value)}
              className="input w-auto min-w-[170px] text-xs"
            >
              <option value="">All Source Warehouses</option>
              {warehouses.map(w => <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}</option>)}
            </select>
            <select
              value={filters.destination_warehouse_id}
              onChange={e => handleFilterChange('destination_warehouse_id', e.target.value)}
              className="input w-auto min-w-[170px] text-xs"
            >
              <option value="">All Destination Warehouses</option>
              {warehouses.map(w => <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}</option>)}
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Product</th>
                <th>Source</th>
                <th>Destination</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Requested By</th>
                <th>Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-dark-500">
                    <ArrowRightLeft className="w-10 h-10 mx-auto mb-2 text-dark-300" />
                    <p className="font-medium text-dark-700">No stock transfers found</p>
                    <p className="text-xs text-dark-400 mt-1">Create a new transfer request to move items between warehouses</p>
                  </td>
                </tr>
              ) : (
                transfers.map(t => (
                  <tr key={t.transfer_id}>
                    <td className="font-mono text-xs font-semibold text-primary-600">
                      TR-{String(t.transfer_id).padStart(4, '0')}
                    </td>
                    <td>
                      <Link to={`/products`} className="font-semibold text-dark-900 hover:text-primary-600">
                        {t.product_name}
                      </Link>
                      <p className="text-xs text-dark-400 font-mono">{t.sku}</p>
                    </td>
                    <td className="text-dark-700 text-sm">{t.source_warehouse_name}</td>
                    <td className="text-dark-700 text-sm">{t.destination_warehouse_name}</td>
                    <td className="font-bold text-dark-900">{t.quantity}</td>
                    <td>
                      <span className={`badge ${statusBadge(t.status)} inline-flex items-center gap-1.5`}>
                        {statusIcon(t.status)}
                        {t.status}
                      </span>
                    </td>
                    <td className="text-sm text-dark-600">{t.requested_by_name}</td>
                    <td className="text-xs text-dark-500">
                      {new Date(t.transfer_date).toLocaleDateString()}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openView(t)}
                          className="p-1.5 text-dark-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {t.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => approve(t.transfer_id)}
                              className="btn btn-secondary py-1 px-2.5 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                              title="Approve Transfer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => cancel(t.transfer_id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Cancel Request"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {t.status === 'Approved' && (
                          <>
                            <button
                              onClick={() => complete(t.transfer_id)}
                              className="btn btn-primary py-1 px-2.5 text-xs"
                              title="Complete Stock Transfer"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => cancel(t.transfer_id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Cancel Request"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
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
            <p className="text-xs text-dark-500">
              Showing page <strong className="text-dark-800">{filters.page}</strong> of <strong className="text-dark-800">{totalPages}</strong> ({totalItems} total records)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(filters.page - 1)}
                disabled={filters.page === 1 || loading}
                className="btn btn-outline py-1 px-2.5 text-xs disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
              </button>
              <button
                onClick={() => handlePageChange(filters.page + 1)}
                disabled={filters.page === totalPages || loading}
                className="btn btn-outline py-1 px-2.5 text-xs disabled:opacity-40"
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: New Transfer Request */}
      {showModal && (
        <div className="modal-overlay" onClick={close} role="dialog" aria-modal="true">
          <div className="modal max-w-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-primary-600" />
                <h2 className="modal-title">New Transfer Request</h2>
              </div>
              <button onClick={close} className="p-1 text-dark-400 hover:text-dark-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submit} className="modal-body space-y-4">
              <div>
                <label className="label">Product *</label>
                <select
                  value={formData.product_id}
                  onChange={e => setFormData(p => ({ ...p, product_id: e.target.value }))}
                  className={`input ${formErrors.product_id ? 'input-error' : ''}`}
                >
                  <option value="">Select Product</option>
                  {products.map(p => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.product_name} ({p.sku})
                    </option>
                  ))}
                </select>
                {formErrors.product_id && <p className="mt-1 text-xs text-rose-500">{formErrors.product_id}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Source Warehouse *</label>
                  <select
                    value={formData.source_warehouse_id}
                    onChange={e => setFormData(p => ({ ...p, source_warehouse_id: e.target.value }))}
                    className={`input ${formErrors.source_warehouse_id ? 'input-error' : ''}`}
                  >
                    <option value="">Select Source</option>
                    {warehouses.map(w => (
                      <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}</option>
                    ))}
                  </select>
                  {formErrors.source_warehouse_id && <p className="mt-1 text-xs text-rose-500">{formErrors.source_warehouse_id}</p>}
                </div>
                <div>
                  <label className="label">Destination Warehouse *</label>
                  <select
                    value={formData.destination_warehouse_id}
                    onChange={e => setFormData(p => ({ ...p, destination_warehouse_id: e.target.value }))}
                    className={`input ${formErrors.destination_warehouse_id ? 'input-error' : ''}`}
                  >
                    <option value="">Select Destination</option>
                    {warehouses.map(w => (
                      <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}</option>
                    ))}
                  </select>
                  {formErrors.destination_warehouse_id && <p className="mt-1 text-xs text-rose-500">{formErrors.destination_warehouse_id}</p>}
                </div>
              </div>

              <div>
                <label className="label">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))}
                  className={`input ${formErrors.quantity ? 'input-error' : ''}`}
                  placeholder="e.g. 25"
                />
                {formErrors.quantity && <p className="mt-1 text-xs text-rose-500">{formErrors.quantity}</p>}
              </div>

              <div>
                <label className="label">Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={e => setFormData(p => ({ ...p, remarks: e.target.value }))}
                  className="input min-h-[75px] resize-y"
                  placeholder="Reason for transfer (optional)..."
                />
              </div>

              <div className="modal-footer">
                <button type="button" onClick={close} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Transfer Details */}
      {viewingTransfer && (
        <div className="modal-overlay" onClick={closeView} role="dialog" aria-modal="true">
          <div className="modal max-w-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-600" />
                <h2 className="modal-title">Transfer TR-{String(viewingTransfer.transfer_id).padStart(4, '0')}</h2>
              </div>
              <button onClick={closeView} className="p-1 text-dark-400 hover:text-dark-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body space-y-3.5 text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-dark-100">
                <span className="text-dark-500">Status</span>
                <span className={`badge ${statusBadge(viewingTransfer.status)}`}>
                  {viewingTransfer.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-500">Product</span>
                <span className="font-semibold text-dark-900">{viewingTransfer.product_name} ({viewingTransfer.sku})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-500">Quantity</span>
                <span className="font-bold text-dark-900">{viewingTransfer.quantity} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-500">Source Warehouse</span>
                <span className="text-dark-900">{viewingTransfer.source_warehouse_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-500">Destination Warehouse</span>
                <span className="text-dark-900">{viewingTransfer.destination_warehouse_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-500">Requested By</span>
                <span className="text-dark-900">{viewingTransfer.requested_by_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-500">Approved By</span>
                <span className="text-dark-900">{viewingTransfer.approved_by_name || 'Pending Approval'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-500">Requested Date</span>
                <span className="text-dark-900">{new Date(viewingTransfer.transfer_date).toLocaleString()}</span>
              </div>
              {viewingTransfer.completed_date && (
                <div className="flex justify-between">
                  <span className="text-dark-500">Completed Date</span>
                  <span className="text-dark-900">{new Date(viewingTransfer.completed_date).toLocaleString()}</span>
                </div>
              )}
              {viewingTransfer.remarks && (
                <div className="pt-2 border-t border-dark-100">
                  <span className="text-xs text-dark-400 font-medium">Remarks:</span>
                  <p className="text-xs text-dark-700 mt-1 bg-dark-50 p-2.5 rounded-lg">{viewingTransfer.remarks}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={closeView} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}