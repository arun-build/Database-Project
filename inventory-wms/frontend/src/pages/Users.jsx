import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users as UsersIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Shield,
  UserCheck,
  UserX,
} from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [filters, setFilters] = useState({ page: 1, limit: 10, search: '', role_id: '', is_active: '' });
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [roles, setRoles] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role_id: '',
    warehouse_id: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v !== '' && v !== undefined && params.append(k, v));
      const res = await api.get(`/users?${params.toString()}`);
      setUsers(res.data.data.users);
      setTotalPages(res.data.data.pagination.pages);
      setTotalItems(res.data.data.pagination.total);
    } catch (e) { toast.error('Failed to fetch users'); }
    finally { setLoading(false); }
  }, [filters]);

  const fetchRoles = async () => {
    try { const r = await api.get('/users/roles'); setRoles(r.data.data.roles); } catch {}
  };

  const fetchWarehouses = async () => {
    try { const r = await api.get('/warehouses?limit=100&status=Active'); setWarehouses(r.data.data.warehouses); } catch {}
  };

  useEffect(() => { fetchUsers(); fetchRoles(); fetchWarehouses(); }, [fetchUsers]);

  const handleFilterChange = (k, v) => setFilters(p => ({ ...p, [k]: v, page: 1 }));
  const handlePageChange = (p) => p >= 1 && p <= totalPages && setFilters(p => ({ ...p, page: p }));

  const validate = () => {
    const e = {};
    if (!formData.full_name.trim()) e.full_name = 'Full name required';
    else if (formData.full_name.length < 2) e.full_name = 'Name must be at least 2 characters';
    if (!formData.email) e.email = 'Email required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Invalid email format';
    if (!editingUser) {
      if (!formData.password) e.password = 'Password required';
      else if (formData.password.length < 6) e.password = 'Password must be at least 6 characters';
      else if (!/\d/.test(formData.password)) e.password = 'Password must contain a number';
      if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
    }
    if (!formData.role_id) e.role_id = 'Role required';
    setFormErrors(e);
    return !Object.keys(e).length;
  };

  const reset = () => {
    setFormData({ full_name: '', email: '', password: '', confirmPassword: '', role_id: '', warehouse_id: '', is_active: true });
    setFormErrors({});
    setEditingUser(null);
  };

  const openCreate = () => { reset(); setShowModal(true); };
  const openEdit = (user) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email,
      password: '',
      confirmPassword: '',
      role_id: String(user.role_id),
      warehouse_id: String(user.warehouse_id || ''),
      is_active: user.is_active,
    });
    setFormErrors({});
    setShowModal(true);
  };
  const close = () => { setShowModal(false); reset(); };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const data = {
        full_name: formData.full_name,
        email: formData.email,
        role_id: parseInt(formData.role_id),
        warehouse_id: formData.warehouse_id ? parseInt(formData.warehouse_id) : null,
        is_active: formData.is_active,
      };
      if (!editingUser) data.password = formData.password;

      editingUser
        ? await api.put(`/users/${editingUser.user_id}`, data)
        : await api.post('/users', data);

      toast.success(editingUser ? 'User updated' : 'User created');
      close(); fetchUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSubmitting(false); }
  };

  const toggleStatus = async (user) => {
    try {
      await api.put(`/users/${user.user_id}`, { ...user, is_active: !user.is_active });
      toast.success(`User ${!user.is_active ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch (err) { toast.error('Failed to update status'); }
  };

  const del = async (id) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try { await api.delete(`/users/${id}`); toast.success('User deleted'); fetchUsers(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  };

  const roleBadge = (name) => ({ Admin: 'badge-primary', 'Warehouse Manager': 'badge-info', Staff: 'badge-gray' })[name] || 'badge-gray';
  const statusBadge = (active) => active ? 'badge-success' : 'badge-danger';

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><UsersIcon className="w-6 h-6 text-primary-600" />User Management</h1>
          <p className="page-subtitle">Manage system users and permissions</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" />Add User</button>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="p-4 border-b border-dark-100">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" /><input type="text" placeholder="Search users..." value={filters.search} onChange={e=>handleFilterChange('search',e.target.value)} className="input pl-10" /></div>
              <select value={filters.role_id} onChange={e=>handleFilterChange('role_id',e.target.value)} className="input w-auto"><option value="">All Roles</option>{roles.map(r=><option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}</select>
              <select value={filters.is_active} onChange={e=>handleFilterChange('is_active',e.target.value)} className="input w-auto"><option value="">All Status</option><option value="true">Active</option><option value="false">Inactive</option></select>
            </div>
          </div>

          <div className="table-container">
            <table className="table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Warehouse</th><th>Status</th><th>Created</th><th className="w-32">Actions</th></tr></thead><tbody>
              {loading ? <tr><td colSpan={7} className="text-center py-8"><Loader2 className="w-6 h-6 text-primary-600 animate-spin mx-auto" /></td></tr>
              : users.length===0 ? <tr><td colSpan={7} className="text-center py-8 text-dark-500">No users found</td></tr>
              : users.map(u=><tr key={u.user_id}>
                <td className="font-medium">{u.full_name}</td>
                <td>{u.email}</td>
                <td><span className={`badge ${roleBadge(u.role_name)}`}>{u.role_name}</span></td>
                <td>{u.warehouse_name || <span className="text-dark-400">Unassigned</span>}</td>
                <td><span className={`badge ${statusBadge(u.is_active)}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                <td className="text-dark-500">{new Date(u.created_at).toLocaleDateString()}</td>
                <td><div className="flex items-center gap-1">
                  <button onClick={()=>openEdit(u)} className="p-2 text-dark-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg" title="Edit"><Edit className="w-4 h-4" /></button>
                  <button onClick={()=>toggleStatus(u)} className={`p-2 ${u.is_active ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'} rounded-lg`} title={u.is_active ? 'Deactivate' : 'Activate'}>{u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}</button>
                  <button onClick={()=>del(u.user_id)} className="p-2 text-dark-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div></td>
              </tr>)}
            </tbody></table>
          </div>

          {totalPages>1 && <div className="card-footer flex items-center justify-between"><p className="text-sm text-dark-500">Showing {((filters.page-1)*filters.limit)+1} to {Math.min(filters.page*filters.limit,totalItems)} of {totalItems}</p><div className="flex gap-2"><button onClick={()=>handlePageChange(filters.page-1)} disabled={filters.page===1||loading} className="btn-outline p-2"><ChevronLeft className="w-4 h-4" /></button><span className="px-3 text-sm text-dark-600">Page {filters.page} of {totalPages}</span><button onClick={()=>handlePageChange(filters.page+1)} disabled={filters.page===totalPages||loading} className="btn-outline p-2"><ChevronRight className="w-4 h-4" /></button></div></div>}
        </div>
      </div>

      {showModal && <div className="modal-overlay" onClick={close} role="dialog" aria-modal="true">
        <div className="modal max-w-md" onClick={e=>e.stopPropagation()}>
          <div className="modal-header"><h2 className="modal-title">{editingUser?'Edit User':'Add User'}</h2><button onClick={close} className="p-1 text-dark-400 hover:text-dark-600 rounded-lg"><X className="w-5 h-5" /></button></div>
          <form onSubmit={submit} className="modal-body space-y-4">
            <div><label className="label">Full Name *</label><input value={formData.full_name} onChange={e=>setFormData(p=>({...p,full_name:e.target.value}))} className={`input ${formErrors.full_name?'input-error':''}`} placeholder="John Doe" />{formErrors.full_name&&<p className="mt-1 text-sm text-red-500">{formErrors.full_name}</p>}</div>
            <div><label className="label">Email *</label><input type="email" value={formData.email} onChange={e=>setFormData(p=>({...p,email:e.target.value}))} className={`input ${formErrors.email?'input-error':''}`} placeholder="john@company.com" />{formErrors.email&&<p className="mt-1 text-sm text-red-500">{formErrors.email}</p>}</div>
            {!editingUser && <>
              <div><label className="label">Password *</label><input type="password" value={formData.password} onChange={e=>setFormData(p=>({...p,password:e.target.value}))} className={`input ${formErrors.password?'input-error':''}`} placeholder="••••••••" />{formErrors.password&&<p className="mt-1 text-sm text-red-500">{formErrors.password}</p>}</div>
              <div><label className="label">Confirm Password *</label><input type="password" value={formData.confirmPassword} onChange={e=>setFormData(p=>({...p,confirmPassword:e.target.value}))} className={`input ${formErrors.confirmPassword?'input-error':''}`} placeholder="••••••••" />{formErrors.confirmPassword&&<p className="mt-1 text-sm text-red-500">{formErrors.confirmPassword}</p>}</div>
            </>}
            <div><label className="label">Role *</label><select value={formData.role_id} onChange={e=>setFormData(p=>({...p,role_id:e.target.value}))} className={`input ${formErrors.role_id?'input-error':''}`}><option value="">Select Role</option>{roles.map(r=><option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}</select>{formErrors.role_id&&<p className="mt-1 text-sm text-red-500">{formErrors.role_id}</p>}</div>
            <div><label className="label">Assigned Warehouse</label><select value={formData.warehouse_id} onChange={e=>setFormData(p=>({...p,warehouse_id:e.target.value}))} className="input"><option value="">None (All Warehouses)</option>{warehouses.map(w=><option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}</option>)}</select></div>
            <div className="flex items-center gap-2"><input type="checkbox" id="is_active" checked={formData.is_active} onChange={e=>setFormData(p=>({...p,is_active:e.target.checked}))} className="w-4 h-4 text-primary-600 border-dark-300 rounded" /><label htmlFor="is_active" className="text-sm text-dark-700">Active Account</label></div>
            <div className="modal-footer"><button type="button" onClick={close} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary" disabled={submitting}>{submitting?'Saving...':editingUser?'Update User':'Create User'}</button></div>
          </form>
        </div>
      </div>}
    </div>
  );
}