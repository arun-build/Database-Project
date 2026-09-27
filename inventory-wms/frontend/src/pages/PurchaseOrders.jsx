import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Edit,
  Eye,
  Trash2,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  CheckCircle,
  Clock,
  Package,
  Truck,
  DollarSign,
} from 'lucide-react';

export default function PurchaseOrders() {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [filters, setFilters] = useState({ page: 1, limit: 10, search: '', status: '', supplier_id: '' });
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({ supplier_id: '', order_date: '', expected_delivery_date: '', items: [{ product_id: '', quantity: 1, unit_price: '' }] });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchPOs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
      const res = await api.get(`/purchase-orders?${params.toString()}`);
      setPos(res.data.data.purchase_orders);
      setTotalPages(res.data.data.pagination.pages);
      setTotalItems(res.data.data.pagination.total);
    } catch (e) { toast.error('Failed to fetch POs'); }
    finally { setLoading(false); }
  }, [filters]);

  const fetchSuppliers = async () => { try { const r = await api.get('/suppliers?limit=100&status=Active'); setSuppliers(r.data.data.suppliers); } catch {} };
  const fetchProducts = async () => { try { const r = await api.get('/products?limit=100&status=Active'); setProducts(r.data.data.products); } catch {} };

  useEffect(() => { fetchPOs(); fetchSuppliers(); fetchProducts(); }, [fetchPOs]);

  const handleFilterChange = (k, v) => setFilters(p => ({ ...p, [k]: v, page: 1 }));
  const handlePageChange = (p) => p >= 1 && p <= totalPages && setFilters(p => ({ ...p, page: p }));

  const addItem = () => setFormData(p => ({ ...p, items: [...p.items, { product_id: '', quantity: 1, unit_price: '' }] }));
  const removeItem = (i) => setFormData(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, value) => setFormData(p => ({ ...p, items: p.items.map((it, idx) => idx === i ? { ...it, [field]: value } : it) }));

  const validate = () => {
    const e = {};
    if (!formData.supplier_id) e.supplier_id = 'Supplier required';
    if (!formData.order_date) e.order_date = 'Order date required';
    if (!formData.items.length) e.items = 'At least one item required';
    formData.items.forEach((it, i) => {
      if (!it.product_id) e[`item_${i}_product`] = `Item ${i+1}: product required`;
      if (!it.quantity || parseInt(it.quantity) < 1) e[`item_${i}_qty`] = `Item ${i+1}: valid qty required`;
      if (!it.unit_price || parseFloat(it.unit_price) < 0) e[`item_${i}_price`] = `Item ${i+1}: valid price required`;
    });
    setFormErrors(e);
    return !Object.keys(e).length;
  };

  const reset = () => { setFormData({ supplier_id: '', order_date: new Date().toISOString().split('T')[0], expected_delivery_date: '', items: [{ product_id: '', quantity: 1, unit_price: '' }] }); setFormErrors({}); };
  const openCreate = () => { reset(); setViewMode(false); setSelectedPO(null); setShowModal(true); };
  const openView = async (po) => { try { const r = await api.get(`/purchase-orders/${po.po_id}`); setSelectedPO(r.data.data); setViewMode(true); setShowModal(true); } catch {} };
  const close = () => { setShowModal(false); reset(); setSelectedPO(null); };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.post('/purchase-orders', { supplier_id: parseInt(formData.supplier_id), order_date: formData.order_date, expected_delivery_date: formData.expected_delivery_date || null, items: formData.items.map(it => ({ product_id: parseInt(it.product_id), quantity: parseInt(it.quantity), unit_price: parseFloat(it.unit_price) })) });
      toast.success('PO created'); close(); fetchPOs();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const updateStatus = async (id, status) => {
    try { await api.put(`/purchase-orders/${id}/status`, { status }); toast.success(`PO ${status}`); fetchPOs(); } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const del = async (id) => { if (!confirm('Delete this PO?')) return; try { await api.delete(`/purchase-orders/${id}`); toast.success('Deleted'); fetchPOs(); } catch (err) { toast.error(err.response?.data?.message || 'Failed'); } };

  const statusBadge = s => ({ Pending: 'badge-warning', Approved: 'badge-info', Received: 'badge-success', Cancelled: 'badge-danger' })[s] || 'badge-gray';

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title flex items-center gap-2"><ShoppingCart className="w-6 h-6 text-primary-600" />Purchase Orders</h1><p className="page-subtitle">Manage purchase orders and procurement</p></div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" />Create PO</button>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="p-4 border-b border-dark-100">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" /><input type="text" placeholder="Search POs..." value={filters.search} onChange={e=>handleFilterChange('search',e.target.value)} className="input pl-10" /></div>
              <select value={filters.status} onChange={e=>handleFilterChange('status',e.target.value)} className="input w-auto"><option value="">All Status</option><option value="Pending">Pending</option><option value="Approved">Approved</option><option value="Received">Received</option><option value="Cancelled">Cancelled</option></select>
              <select value={filters.supplier_id} onChange={e=>handleFilterChange('supplier_id',e.target.value)} className="input w-auto min-w-[180px]"><option value="">All Suppliers</option>{suppliers.map(s=><option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>)}</select>
            </div>
          </div>

          <div className="table-container">
            <table className="table"><thead><tr><th>PO ID</th><th>Supplier</th><th>Order Date</th><th>Expected</th><th>Items</th><th>Amount</th><th>Status</th><th className="w-48">Actions</th></tr></thead><tbody>
              {loading ? <tr><td colSpan={8} className="text-center py-8"><Loader2 className="w-6 h-6 text-primary-600 animate-spin mx-auto" /></td></tr>
              : pos.length===0 ? <tr><td colSpan={8} className="text-center py-8 text-dark-500">No POs</td></tr>
              : pos.map(po=><tr key={po.po_id}>
                <td className="font-mono font-medium">PO-{String(po.po_id).padStart(4,'0')}</td>
                <td>{po.supplier_name}</td>
                <td>{new Date(po.order_date).toLocaleDateString()}</td>
                <td>{po.expected_delivery_date?new Date(po.expected_delivery_date).toLocaleDateString():'-'}</td>
                <td><span className="badge badge-info">{po.item_count} items</span></td>
                <td className="font-medium">${Number(po.total_amount).toLocaleString()}</td>
                <td><span className={`badge ${statusBadge(po.status)}`}>{po.status}</span></td>
                <td><div className="flex items-center gap-1">
                  <button onClick={()=>openView(po)} className="p-2 text-dark-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg" title="View"><Eye className="w-4 h-4" /></button>
                  <button onClick={()=>openView(po)} className="p-2 text-dark-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg" title="Edit"><Edit className="w-4 h-4" /></button>
                  {po.status==='Pending' && <button onClick={()=>updateStatus(po.po_id,'Approved')} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Approve"><CheckCircle className="w-4 h-4" /></button>}
                  {po.status==='Approved' && <button onClick={()=>updateStatus(po.po_id,'Received')} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Receive"><Truck className="w-4 h-4" /></button>}
                  <button onClick={()=>del(po.po_id)} className="p-2 text-dark-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div></td>
              </tr>)}
            </tbody></table>
          </div>

          {totalPages>1 && <div className="card-footer flex items-center justify-between"><p className="text-sm text-dark-500">Showing {((filters.page-1)*filters.limit)+1} to {Math.min(filters.page*filters.limit,totalItems)} of {totalItems}</p><div className="flex gap-2"><button onClick={()=>handlePageChange(filters.page-1)} disabled={filters.page===1||loading} className="btn-outline p-2"><ChevronLeft className="w-4 h-4" /></button><span className="px-3 text-sm text-dark-600">Page {filters.page} of {totalPages}</span><button onClick={()=>handlePageChange(filters.page+1)} disabled={filters.page===totalPages||loading} className="btn-outline p-2"><ChevronRight className="w-4 h-4" /></button></div></div>}
        </div>
      </div>

      {showModal && <div className="modal-overlay" onClick={close} role="dialog" aria-modal="true">
        <div className="modal max-w-3xl" onClick={e=>e.stopPropagation()}>
          <div className="modal-header"><h2 className="modal-title">{viewMode?'View PO':selectedPO?'Edit PO':'Create Purchase Order'}</h2><button onClick={close} className="p-1 text-dark-400 hover:text-dark-600 rounded-lg"><X className="w-5 h-5" /></button></div>
          {viewMode && selectedPO && <div className="modal-body space-y-4">
            <div className="grid md:grid-cols-2 gap-4"><div><p className="text-sm text-dark-500">PO ID</p><p className="font-medium">PO-{String(selectedPO.purchase_order.po_id).padStart(4,'0')}</p></div><div><p className="text-sm text-dark-500">Supplier</p><p className="font-medium">{selectedPO.purchase_order.supplier_name}</p></div><div><p className="text-sm text-dark-500">Order Date</p><p>{new Date(selectedPO.purchase_order.order_date).toLocaleDateString()}</p></div><div><p className="text-sm text-dark-500">Expected Delivery</p><p>{selectedPO.purchase_order.expected_delivery_date?new Date(selectedPO.purchase_order.expected_delivery_date).toLocaleDateString():'-'}</p></div><div><p className="text-sm text-dark-500">Status</p><p><span className={`badge ${statusBadge(selectedPO.purchase_order.status)}`}>{selectedPO.purchase_order.status}</span></p></div><div><p className="text-sm text-dark-500">Total Amount</p><p className="font-medium text-lg">${Number(selectedPO.purchase_order.total_amount).toLocaleString()}</p></div></div>
            <h3 className="font-semibold">Items</h3>
            <div className="table-container"><table className="table"><thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead><tbody>{selectedPO.items.map(it=><tr key={it.poi_id}><td>{it.product_name} ({it.sku})</td><td>{it.quantity}</td><td>${Number(it.unit_price).toFixed(2)}</td><td className="font-medium">${Number(it.subtotal).toFixed(2)}</td></tr>)}</tbody></table></div>
            <div className="modal-footer"><button onClick={close} className="btn-secondary">Close</button></div>
          </div>}
          {!viewMode && <form onSubmit={submit} className="modal-body space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div><label className="label">Supplier *</label><select value={formData.supplier_id} onChange={e=>setFormData(p=>({...p,supplier_id:e.target.value}))} className={`input ${formErrors.supplier_id?'input-error':''}`}><option value="">Select Supplier</option>{suppliers.map(s=><option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>)}</select>{formErrors.supplier_id&&<p className="mt-1 text-sm text-red-500">{formErrors.supplier_id}</p>}</div>
              <div><label className="label">Order Date *</label><input type="date" value={formData.order_date} onChange={e=>setFormData(p=>({...p,order_date:e.target.value}))} className={`input ${formErrors.order_date?'input-error':''}`} /></div>
              <div><label className="label">Expected Delivery</label><input type="date" value={formData.expected_delivery_date} onChange={e=>setFormData(p=>({...p,expected_delivery_date:e.target.value}))} className="input" /></div>
            </div>
            <h3 className="font-semibold">Items</h3>
            {formData.items.map((item, i)=><div key={i} className="flex gap-2 p-3 bg-dark-50 rounded-lg">
              <select value={item.product_id} onChange={e=>updateItem(i,'product_id',e.target.value)} className={`input flex-1 ${formErrors[`item_${i}_product`]?'input-error':''}`}><option value="">Select Product</option>{products.map(p=><option key={p.product_id} value={p.product_id}>{p.product_name} (${p.unit_price})</option>)}</select>{formErrors[`item_${i}_product`]&&<p className="text-sm text-red-500">{formErrors[`item_${i}_product`]}</p>}
              <input type="number" min="1" value={item.quantity} onChange={e=>updateItem(i,'quantity',e.target.value)} className={`input w-24 ${formErrors[`item_${i}_qty`]?'input-error':''}`} placeholder="Qty" />{formErrors[`item_${i}_qty`]&&<p className="text-sm text-red-500">{formErrors[`item_${i}_qty`]}</p>}
              <input type="number" step="0.01" min="0" value={item.unit_price} onChange={e=>updateItem(i,'unit_price',e.target.value)} className={`input w-32 ${formErrors[`item_${i}_price`]?'input-error':''}`} placeholder="Price" />{formErrors[`item_${i}_price`]&&<p className="text-sm text-red-500">{formErrors[`item_${i}_price`]}</p>}
              <button type="button" onClick={()=>removeItem(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg self-end"><Trash2 className="w-5 h-5" /></button>
            </div>)}
            <button type="button" onClick={addItem} className="btn-outline"><Plus className="w-4 h-4" />Add Item</button>
            <div className="modal-footer"><button type="button" onClick={close} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary" disabled={submitting}>{submitting?'Creating...':'Create PO'}</button></div>
          </form>}
        </div>
      </div>}
    </div>
  );
}