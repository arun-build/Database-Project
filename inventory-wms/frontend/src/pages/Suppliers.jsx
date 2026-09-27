import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Truck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Package,
  ShoppingCart,
} from 'lucide-react';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [filters, setFilters] = useState({ page: 1, limit: 10, search: '', status: '' });
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [formData, setFormData] = useState({
    supplier_name: '', contact_person: '', email: '', phone: '', address: '', gst_number: '', status: 'Active'
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
      const res = await api.get(`/suppliers?${params.toString()}`);
      setSuppliers(res.data.data.suppliers);
      setTotalPages(res.data.data.pagination.pages);
      setTotalItems(res.data.data.pagination.total);
    } catch (e) { toast.error('Failed to fetch suppliers'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const handleFilterChange = (k, v) => setFilters(p => ({ ...p, [k]: v, page: 1 }));
  const handlePageChange = (p) => p >= 1 && p <= totalPages && setFilters(p => ({ ...p, page: p }));

  const validate = () => {
    const e = {};
    if (!formData.supplier_name.trim()) e.supplier_name = 'Name required';
    setFormErrors(e);
    return !Object.keys(e).length;
  };
  const reset = () => { setFormData({ supplier_name: '', contact_person: '', email: '', phone: '', address: '', gst_number: '', status: 'Active' }); setFormErrors({}); setEditingSupplier(null); };
  const openCreate = () => { reset(); setShowModal(true); };
  const openEdit = (s) => { setEditingSupplier(s); setFormData({ supplier_name: s.supplier_name, contact_person: s.contact_person || '', email: s.email || '', phone: s.phone || '', address: s.address || '', gst_number: s.gst_number || '', status: s.status }); setFormErrors({}); setShowModal(true); };
  const close = () => { setShowModal(false); reset(); };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      editingSupplier ? await api.put(`/suppliers/${editingSupplier.supplier_id}`, formData) : await api.post('/suppliers', formData);
      toast.success(editingSupplier ? 'Supplier updated' : 'Supplier created');
      close(); fetchSuppliers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSubmitting(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this supplier?')) return;
    try { await api.delete(`/suppliers/${id}`); toast.success('Deleted'); fetchSuppliers(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  };

  const statusBadge = s => ({ Active: 'badge-success', Inactive: 'badge-gray' })[s] || 'badge-gray';

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Truck className="w-6 h-6 text-primary-600" />Suppliers</h1>
          <p className="page-subtitle">Manage supplier relationships</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" />Add Supplier</button>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="p-4 border-b border-dark-100">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input type="text" placeholder="Search suppliers..." value={filters.search} onChange={e => handleFilterChange('search', e.target.value)} className="input pl-10" />
              </div>
              <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)} className="input w-auto">
                <option value="">All Status</option><option value="Active">Active</option><option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead><tr><th>Name</th><th>Contact</th><th>Email</th><th>Phone</th><th>GST</th><th>Products</th><th>POs</th><th>Status</th><th className="w-32">Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={9} className="text-center py-8"><Loader2 className="w-6 h-6 text-primary-600 animate-spin mx-auto" /></td></tr>
                : suppliers.length === 0 ? <tr><td colSpan={9} className="text-center py-8 text-dark-500">No suppliers</td></tr>
                : suppliers.map(s => <tr key={s.supplier_id}>
                  <td className="font-medium">{s.supplier_name}</td>
                  <td>{s.contact_person || '-'}</td>
                  <td>{s.email || '-'}</td>
                  <td>{s.phone || '-'}</td>
                  <td className="font-mono text-sm">{s.gst_number || '-'}</td>
                  <td><span className="badge badge-info">{s.product_count} SKUs</span></td>
                  <td><span className="badge badge-gray">{s.po_count} orders</span></td>
                  <td><span className={`badge ${statusBadge(s.status)}`}>{s.status}</span></td>
                  <td><div className="flex items-center gap-1">
                    <button onClick={() => openEdit(s)} className="p-2 text-dark-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg" title="Edit"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => del(s.supplier_id)} className="p-2 text-dark-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div></td>
                </tr>)}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && <div className="card-footer flex items-center justify-between">
            <p className="text-sm text-dark-500">Showing {((filters.page-1)*filters.limit)+1} to {Math.min(filters.page*filters.limit, totalItems)} of {totalItems}</p>
            <div className="flex gap-2">
              <button onClick={() => handlePageChange(filters.page-1)} disabled={filters.page===1||loading} className="btn-outline p-2"><ChevronLeft className="w-4 h-4" /></button>
              <span className="px-3 text-sm text-dark-600">Page {filters.page} of {totalPages}</span>
              <button onClick={() => handlePageChange(filters.page+1)} disabled={filters.page===totalPages||loading} className="btn-outline p-2"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>}
        </div>
      </div>

      {showModal && <div className="modal-overlay" onClick={close} role="dialog" aria-modal="true">
        <div className="modal max-w-lg" onClick={e=>e.stopPropagation()}>
          <div className="modal-header"><h2 className="modal-title">{editingSupplier?'Edit':'Add'} Supplier</h2>
            <button onClick={close} className="p-1 text-dark-400 hover:text-dark-600 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={submit} className="modal-body space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="label">Name *</label><input value={formData.supplier_name} onChange={e=>setFormData(p=>({...p,supplier_name:e.target.value}))} className={`input ${formErrors.supplier_name?'input-error':''}`} placeholder="TechSupply Inc" /></div>
              <div><label className="label">Contact Person</label><input value={formData.contact_person} onChange={e=>setFormData(p=>({...p,contact_person:e.target.value}))} className="input" placeholder="Robert Chen" /></div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="label">Email</label><input type="email" value={formData.email} onChange={e=>setFormData(p=>({...p,email:e.target.value}))} className="input" placeholder="robert@techsupply.com" /></div>
              <div><label className="label">Phone</label><input value={formData.phone} onChange={e=>setFormData(p=>({...p,phone:e.target.value}))} className="input" placeholder="+1-555-1001" /></div>
            </div>
            <div><label className="label">Address</label><textarea value={formData.address} onChange={e=>setFormData(p=>({...p,address:e.target.value}))} className="input min-h-[80px] resize-y" placeholder="100 Tech Park, San Jose, CA" /></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="label">GST Number</label><input value={formData.gst_number} onChange={e=>setFormData(p=>({...p,gst_number:e.target.value}))} className="input" placeholder="GST123456789" /></div>
              <div><label className="label">Status</label><select value={formData.status} onChange={e=>setFormData(p=>({...p,status:e.target.value}))} className="input"><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>
            </div>
            <div className="modal-footer"><button type="button" onClick={close} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" disabled={submitting}>{submitting?'Saving...':editingSupplier?'Update':'Create'}</button></div>
          </form>
        </div>
      </div>}
    </div>
  );
}