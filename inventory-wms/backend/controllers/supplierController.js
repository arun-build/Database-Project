const { pool } = require('../config/database');
const queries = require('../queries');

const getSuppliers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, sort_by = 'supplier_name', sort_order = 'ASC' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [];

    if (search) {
      whereClause = 'WHERE (s.supplier_name LIKE ? OR s.contact_person LIKE ? OR s.email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (status) {
      whereClause = whereClause ? `${whereClause} AND s.status = ?` : 'WHERE s.status = ?';
      params.push(status);
    }

    const validSortColumns = ['supplier_id', 'supplier_name', 'contact_person', 'status', 'created_at'];
    const validSortOrders = ['ASC', 'DESC'];
    const sortBy = validSortColumns.includes(sort_by) ? sort_by : 'supplier_name';
    const sortOrder = validSortOrders.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'ASC';

    const [suppliers] = await pool.execute(
      `${queries.suppliers.baseSupplierSelect}
       ${whereClause}
       ORDER BY s.${sortBy} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [total] = await pool.execute(
      `SELECT COUNT(*) as count FROM suppliers s ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        suppliers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total[0].count,
          pages: Math.ceil(total[0].count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch suppliers'
    });
  }
};

const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;

    const [suppliers] = await pool.execute(queries.suppliers.findById, [id]);

    if (suppliers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    const [products] = await pool.execute(
      'SELECT product_id, sku, product_name, unit_price, status FROM products WHERE supplier_id = ? AND status != "Discontinued"',
      [id]
    );

    const [orders] = await pool.execute(
      'SELECT po_id, po_number, order_date, total_amount, status FROM purchase_orders WHERE supplier_id = ? ORDER BY order_date DESC LIMIT 10',
      [id]
    );

    res.json({
      success: true,
      data: {
        supplier: suppliers[0],
        products,
        recent_orders: orders
      }
    });
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch supplier'
    });
  }
};

const createSupplier = async (req, res) => {
  try {
    const { supplier_name, contact_person, email, phone, address, gst_number, status = 'Active' } = req.body;

    const [result] = await pool.execute(
      queries.suppliers.create,
      [supplier_name, contact_person || null, email || null, phone || null, address || null, gst_number || null, status]
    );

    const [newSupplier] = await pool.execute(queries.suppliers.findById, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: { supplier: newSupplier[0] }
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create supplier'
    });
  }
};

const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { supplier_name, contact_person, email, phone, address, gst_number, status } = req.body;

    const [result] = await pool.execute(
      queries.suppliers.update,
      [supplier_name, contact_person || null, email || null, phone || null, address || null, gst_number || null, status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    const [updated] = await pool.execute(queries.suppliers.findById, [id]);

    res.json({
      success: true,
      message: 'Supplier updated successfully',
      data: { supplier: updated[0] }
    });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update supplier'
    });
  }
};

const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const [productCheck] = await pool.execute(queries.suppliers.checkProducts, [id]);
    if (productCheck[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate supplier with associated active products. Reassign products first.'
      });
    }

    const [result] = await pool.execute(queries.suppliers.delete, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      message: 'Supplier deactivated successfully'
    });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete supplier'
    });
  }
};

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier
};