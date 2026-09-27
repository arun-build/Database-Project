const { pool } = require('../config/database');
const queries = require('../queries');

const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category_id, supplier_id, status, sort_by = 'created_at', sort_order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE p.status != "Discontinued"';
    const params = [];

    if (search) {
      whereClause += ' AND (p.product_name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (category_id) {
      whereClause += ' AND p.category_id = ?';
      params.push(category_id);
    }

    if (supplier_id) {
      whereClause += ' AND p.supplier_id = ?';
      params.push(supplier_id);
    }

    if (status) {
      whereClause += ' AND p.status = ?';
      params.push(status);
    }

    const validSortColumns = ['product_id', 'sku', 'product_name', 'unit_price', 'selling_price', 'created_at', 'status'];
    const validSortOrders = ['ASC', 'DESC'];
    const sortBy = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortOrder = validSortOrders.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'DESC';

    const [products] = await pool.execute(
      `${queries.products.baseProductSelect}
       ${whereClause}
       ORDER BY p.${sortBy} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [total] = await pool.execute(
      `SELECT COUNT(*) as count FROM products p ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total[0].count,
          pages: Math.ceil(total[0].count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const [products] = await pool.execute(queries.products.findById, [id]);

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const [inventory] = await pool.execute(queries.inventory.findByProduct, [id]);
    const [transactions] = await pool.execute(queries.stockTransactions.findByProduct, [id]);

    res.json({
      success: true,
      data: {
        product: products[0],
        inventory,
        transactions: transactions.slice(0, 20)
      }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product'
    });
  }
};

const createProduct = async (req, res) => {
  try {
    const { sku, product_name, description, category_id, supplier_id, unit_price, selling_price, reorder_level, unit_type, status = 'Active' } = req.body;

    const [existing] = await pool.execute(queries.products.findBySku, [sku]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists'
      });
    }

    const [result] = await pool.execute(
      queries.products.create,
      [sku, product_name, description, category_id, supplier_id, unit_price, selling_price, reorder_level, unit_type, status]
    );

    const [newProduct] = await pool.execute(queries.products.findById, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product: newProduct[0] }
    });
  } catch (error) {
    console.error('Create product error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create product'
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { sku, product_name, description, category_id, supplier_id, unit_price, selling_price, reorder_level, unit_type, status } = req.body;

    const [existing] = await pool.execute(queries.products.findBySku, [sku]);
    if (existing.length > 0 && existing[0].product_id != id) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists'
      });
    }

    const [result] = await pool.execute(
      queries.products.update,
      [product_name, description, category_id, supplier_id, unit_price, selling_price, reorder_level, unit_type, status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const [updated] = await pool.execute(queries.products.findById, [id]);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product: updated[0] }
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product'
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const [inventoryCheck] = await pool.execute(queries.products.checkExistingStock, [id]);
    if (inventoryCheck[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete product with existing stock. Set status to Discontinued instead.'
      });
    }

    const [result] = await pool.execute(queries.products.delete, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product'
    });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};