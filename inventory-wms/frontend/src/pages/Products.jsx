import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Package,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    category_id: '',
    supplier_id: '',
    status: '',
  });
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [formData, setFormData] = useState({
    sku: '',
    product_name: '',
    description: '',
    category_id: '',
    supplier_id: '',
    unit_price: '',
    selling_price: '',
    reorder_level: '10',
    unit_type: 'PCS',
    status: 'Active',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await api.get(`/products?${params.toString()}`);
      setProducts(response.data.data.products);
      setTotalPages(response.data.data.pagination.pages);
      setTotalItems(response.data.data.pagination.total);
    } catch (error) {
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories?limit=100');
      setCategories(response.data.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers?limit=100');
      setSuppliers(response.data.data.suppliers);
    } catch (error) {
      console.error('Failed to fetch suppliers');
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchSuppliers();
  }, [fetchProducts]);

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
    if (!formData.sku.trim()) errors.sku = 'SKU is required';
    if (!formData.product_name.trim()) errors.product_name = 'Product name is required';
    if (!formData.category_id) errors.category_id = 'Category is required';
    if (!formData.supplier_id) errors.supplier_id = 'Supplier is required';
    if (!formData.unit_price || parseFloat(formData.unit_price) < 0) errors.unit_price = 'Valid unit price required';
    if (!formData.selling_price || parseFloat(formData.selling_price) < 0) errors.selling_price = 'Valid selling price required';
    if (!formData.reorder_level || parseInt(formData.reorder_level) < 0) errors.reorder_level = 'Valid reorder level required';
    if (!formData.unit_type.trim()) errors.unit_type = 'Unit type is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      sku: '',
      product_name: '',
      description: '',
      category_id: '',
      supplier_id: '',
      unit_price: '',
      selling_price: '',
      reorder_level: '10',
      unit_type: 'PCS',
      status: 'Active',
    });
    setFormErrors({});
    setEditingProduct(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      product_name: product.product_name,
      description: product.description || '',
      category_id: String(product.category_id),
      supplier_id: String(product.supplier_id),
      unit_price: String(product.unit_price),
      selling_price: String(product.selling_price),
      reorder_level: String(product.reorder_level),
      unit_type: product.unit_type,
      status: product.status,
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
        category_id: parseInt(formData.category_id),
        supplier_id: parseInt(formData.supplier_id),
        unit_price: parseFloat(formData.unit_price),
        selling_price: parseFloat(formData.selling_price),
        reorder_level: parseInt(formData.reorder_level),
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.product_id}`, data);
        toast.success('Product updated successfully');
      } else {
        await api.post('/products', data);
        toast.success('Product created successfully');
      }
      closeModal();
      fetchProducts();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to save product';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;

    try {
      await api.delete(`/products/${productId}`);
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete product';
      toast.error(message);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      Active: 'badge-success',
      Inactive: 'badge-gray',
      Discontinued: 'badge-danger',
    };
    return badges[status] || 'badge-gray';
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Package className="w-6 h-6 text-primary-600" />
            Products
          </h1>
          <p className="page-subtitle">Manage your product catalog</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Product
        </button>
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
              <div className="flex gap-2">
                <select
                  value={filters.category_id}
                  onChange={(e) => handleFilterChange('category_id', e.target.value)}
                  className="input w-auto"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.category_id} value={cat.category_id}>{cat.category_name}</option>
                  ))}
                </select>
                <select
                  value={filters.supplier_id}
                  onChange={(e) => handleFilterChange('supplier_id', e.target.value)}
                  className="input w-auto"
                >
                  <option value="">All Suppliers</option>
                  {suppliers.map(sup => (
                    <option key={sup.supplier_id} value={sup.supplier_id}>{sup.supplier_name}</option>
                  ))}
                </select>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="input w-auto"
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Discontinued">Discontinued</option>
                </select>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Supplier</th>
                  <th>Unit Price</th>
                  <th>Selling Price</th>
                  <th>Reorder Level</th>
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
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-dark-500">
                      No products found
                    </td>
                  </tr>
                ) : (
                  products.map(product => (
                    <tr key={product.product_id}>
                      <td className="font-mono font-medium">{product.sku}</td>
                      <td>
                        <Link to={`/products/${product.product_id}`} className="font-medium text-dark-900 hover:text-primary-600">
                          {product.product_name}
                        </Link>
                      </td>
                      <td>{product.category_name}</td>
                      <td>{product.supplier_name}</td>
                      <td>${parseFloat(product.unit_price).toFixed(2)}</td>
                      <td className="font-medium">${parseFloat(product.selling_price).toFixed(2)}</td>
                      <td>{product.reorder_level}</td>
                      <td><span className={`badge ${getStatusBadge(product.status)}`}>{product.status}</span></td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/products/${product.product_id}`}
                            className="p-2 text-dark-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-2 text-dark-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.product_id)}
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
                Showing {((filters.page - 1) * filters.limit) + 1} to {Math.min(filters.page * filters.limit, totalItems)} of {totalItems} products
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
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="modal-title" className="modal-title">{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={closeModal} className="p-1 text-dark-400 hover:text-dark-600 rounded-lg hover:bg-dark-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sku" className="label">SKU *</label>
                  <input
                    id="sku"
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    className={`input ${formErrors.sku ? 'input-error' : ''}`}
                    placeholder="ELEC-001"
                    disabled={editingProduct}
                  />
                  {formErrors.sku && <p className="mt-1 text-sm text-red-500">{formErrors.sku}</p>}
                </div>
                <div>
                  <label htmlFor="product_name" className="label">Product Name *</label>
                  <input
                    id="product_name"
                    type="text"
                    value={formData.product_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
                    className={`input ${formErrors.product_name ? 'input-error' : ''}`}
                    placeholder="Wireless Mouse"
                  />
                  {formErrors.product_name && <p className="mt-1 text-sm text-red-500">{formErrors.product_name}</p>}
                </div>
              </div>
              <div>
                <label htmlFor="description" className="label">Description</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="input min-h-[80px] resize-y"
                  placeholder="Product description..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category_id" className="label">Category *</label>
                  <select
                    id="category_id"
                    value={formData.category_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                    className={`input ${formErrors.category_id ? 'input-error' : ''}`}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.category_id} value={cat.category_id}>{cat.category_name}</option>
                    ))}
                  </select>
                  {formErrors.category_id && <p className="mt-1 text-sm text-red-500">{formErrors.category_id}</p>}
                </div>
                <div>
                  <label htmlFor="supplier_id" className="label">Supplier *</label>
                  <select
                    id="supplier_id"
                    value={formData.supplier_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier_id: e.target.value }))}
                    className={`input ${formErrors.supplier_id ? 'input-error' : ''}`}
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(sup => (
                      <option key={sup.supplier_id} value={sup.supplier_id}>{sup.supplier_name}</option>
                    ))}
                  </select>
                  {formErrors.supplier_id && <p className="mt-1 text-sm text-red-500">{formErrors.supplier_id}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="unit_price" className="label">Unit Price *</label>
                  <input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unit_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_price: e.target.value }))}
                    className={`input ${formErrors.unit_price ? 'input-error' : ''}`}
                    placeholder="12.50"
                  />
                  {formErrors.unit_price && <p className="mt-1 text-sm text-red-500">{formErrors.unit_price}</p>}
                </div>
                <div>
                  <label htmlFor="selling_price" className="label">Selling Price *</label>
                  <input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.selling_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, selling_price: e.target.value }))}
                    className={`input ${formErrors.selling_price ? 'input-error' : ''}`}
                    placeholder="24.99"
                  />
                  {formErrors.selling_price && <p className="mt-1 text-sm text-red-500">{formErrors.selling_price}</p>}
                </div>
                <div>
                  <label htmlFor="reorder_level" className="label">Reorder Level *</label>
                  <input
                    id="reorder_level"
                    type="number"
                    min="0"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData(prev => ({ ...prev, reorder_level: e.target.value }))}
                    className={`input ${formErrors.reorder_level ? 'input-error' : ''}`}
                    placeholder="10"
                  />
                  {formErrors.reorder_level && <p className="mt-1 text-sm text-red-500">{formErrors.reorder_level}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="unit_type" className="label">Unit Type *</label>
                  <input
                    id="unit_type"
                    type="text"
                    value={formData.unit_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_type: e.target.value }))}
                    className={`input ${formErrors.unit_type ? 'input-error' : ''}`}
                    placeholder="PCS"
                  />
                  {formErrors.unit_type && <p className="mt-1 text-sm text-red-500">{formErrors.unit_type}</p>}
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
                    <option value="Discontinued">Discontinued</option>
                  </select>
                </div>
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
                  ) : editingProduct ? (
                    'Update Product'
                  ) : (
                    'Create Product'
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