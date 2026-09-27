const { pool } = require('../config/database');
const queries = require('../queries');

const getInventory = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, warehouse_id, category_id, status, sort_by = 'product_name', sort_order = 'ASC' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE p.status = "Active" AND w.status = "Active"';
    const params = [];

    if (req.user.role_name === 'Staff' && req.user.warehouse_id) {
      whereClause += ' AND i.warehouse_id = ?';
      params.push(req.user.warehouse_id);
    } else if (warehouse_id) {
      whereClause += ' AND i.warehouse_id = ?';
      params.push(warehouse_id);
    }

    if (search) {
      whereClause += ' AND (p.product_name LIKE ? OR p.sku LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (category_id) {
      whereClause += ' AND p.category_id = ?';
      params.push(category_id);
    }

    if (status) {
      if (status === 'In Stock') {
        whereClause += ' AND i.quantity_available > i.reorder_level';
      } else if (status === 'Low Stock') {
        whereClause += ' AND i.quantity_available <= i.reorder_level AND i.quantity_available > 0';
      } else if (status === 'Out of Stock') {
        whereClause += ' AND i.quantity_available = 0';
      }
    }

    const validSortColumns = ['product_name', 'sku', 'warehouse_name', 'quantity_available', 'reorder_level', 'last_updated'];
    const validSortOrders = ['ASC', 'DESC'];
    const sortBy = validSortColumns.includes(sort_by) ? sort_by : 'product_name';
    const sortOrder = validSortOrders.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'ASC';

    const orderByMap = {
      'product_name': 'p.product_name',
      'sku': 'p.sku',
      'warehouse_name': 'w.warehouse_name',
      'quantity_available': 'i.quantity_available',
      'reorder_level': 'i.reorder_level',
      'last_updated': 'i.last_updated'
    };

    const [inventory] = await pool.execute(
      `${queries.inventory.baseInventorySelect}
       ${whereClause}
       ORDER BY ${orderByMap[sortBy]} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [total] = await pool.execute(
      `SELECT COUNT(*) as count
       FROM inventory i
       JOIN products p ON i.product_id = p.product_id
       JOIN warehouses w ON i.warehouse_id = w.warehouse_id
       ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        inventory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total[0].count,
          pages: Math.ceil(total[0].count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory'
    });
  }
};

const getInventoryByWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, search, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE i.warehouse_id = ? AND p.status = "Active"';
    const params = [id];

    if (search) {
      whereClause += ' AND (p.product_name LIKE ? OR p.sku LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (status) {
      if (status === 'In Stock') {
        whereClause += ' AND i.quantity_available > i.reorder_level';
      } else if (status === 'Low Stock') {
        whereClause += ' AND i.quantity_available <= i.reorder_level AND i.quantity_available > 0';
      } else if (status === 'Out of Stock') {
        whereClause += ' AND i.quantity_available = 0';
      }
    }

    const [inventory] = await pool.execute(
      `SELECT i.*, p.sku, p.product_name, p.unit_price, p.selling_price, c.category_name,
        CASE 
          WHEN i.quantity_available = 0 THEN 'Out of Stock'
          WHEN i.quantity_available <= i.reorder_level THEN 'Low Stock'
          ELSE 'In Stock'
        END as stock_status
       FROM inventory i
       JOIN products p ON i.product_id = p.product_id
       JOIN categories c ON p.category_id = c.category_id
       ${whereClause}
       ORDER BY p.product_name
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [total] = await pool.execute(
      `SELECT COUNT(*) as count FROM inventory i JOIN products p ON i.product_id = p.product_id ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        inventory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total[0].count,
          pages: Math.ceil(total[0].count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get warehouse inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch warehouse inventory'
    });
  }
};

const stockIn = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { product_id, warehouse_id, quantity, reference_type = 'MANUAL', reference_id, remarks } = req.body;

    if (req.user.role_name === 'Staff' && req.user.warehouse_id && req.user.warehouse_id !== parseInt(warehouse_id)) {
      connection.release();
      return res.status(403).json({
        success: false,
        message: 'You can only add stock to your assigned warehouse'
      });
    }

    await connection.execute(
      queries.inventory.callStockIn,
      [product_id, warehouse_id, quantity, req.user.user_id, reference_type, reference_id || null, remarks || '']
    );

    const [output] = await connection.execute(queries.inventory.getProcedureOutput);

    if (!output[0].success) {
      return res.status(400).json({
        success: false,
        message: output[0].message
      });
    }

    res.json({
      success: true,
      message: 'Stock added successfully'
    });
  } catch (error) {
    console.error('Stock in error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add stock'
    });
  } finally {
    connection.release();
  }
};

const stockOut = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { product_id, warehouse_id, quantity, reference_type = 'MANUAL', reference_id, remarks } = req.body;

    if (req.user.role_name === 'Staff' && req.user.warehouse_id && req.user.warehouse_id !== parseInt(warehouse_id)) {
      connection.release();
      return res.status(403).json({
        success: false,
        message: 'You can only remove stock from your assigned warehouse'
      });
    }

    await connection.execute(
      queries.inventory.callStockOut,
      [product_id, warehouse_id, quantity, req.user.user_id, reference_type, reference_id || null, remarks || '']
    );

    const [output] = await connection.execute(queries.inventory.getProcedureOutput);

    if (!output[0].success) {
      return res.status(400).json({
        success: false,
        message: output[0].message
      });
    }

    res.json({
      success: true,
      message: 'Stock removed successfully'
    });
  } catch (error) {
    console.error('Stock out error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove stock'
    });
  } finally {
    connection.release();
  }
};

const getStockTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, product_id, warehouse_id, transaction_type, start_date, end_date, sort_by = 'transaction_date', sort_order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (req.user.role_name === 'Staff' && req.user.warehouse_id) {
      whereClause += ' AND st.warehouse_id = ?';
      params.push(req.user.warehouse_id);
    } else if (warehouse_id) {
      whereClause += ' AND st.warehouse_id = ?';
      params.push(warehouse_id);
    }

    if (product_id) {
      whereClause += ' AND st.product_id = ?';
      params.push(product_id);
    }

    if (transaction_type) {
      whereClause += ' AND st.transaction_type = ?';
      params.push(transaction_type);
    }

    if (start_date) {
      whereClause += ' AND DATE(st.transaction_date) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ' AND DATE(st.transaction_date) <= ?';
      params.push(end_date);
    }

    const validSortColumns = ['transaction_date', 'quantity', 'product_name', 'warehouse_name'];
    const validSortOrders = ['ASC', 'DESC'];
    const sortBy = validSortColumns.includes(sort_by) ? sort_by : 'transaction_date';
    const sortOrder = validSortOrders.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'DESC';

    const orderByMap = {
      'transaction_date': 'st.transaction_date',
      'quantity': 'st.quantity',
      'product_name': 'p.product_name',
      'warehouse_name': 'w.warehouse_name'
    };

    const [transactions] = await pool.execute(
      `${queries.stockTransactions.baseTransactionSelect}
       ${whereClause}
       ORDER BY ${orderByMap[sortBy]} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [total] = await pool.execute(
      `SELECT COUNT(*) as count
       FROM stock_transactions st
       JOIN products p ON st.product_id = p.product_id
       JOIN warehouses w ON st.warehouse_id = w.warehouse_id
       ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total[0].count,
          pages: Math.ceil(total[0].count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get stock transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock transactions'
    });
  }
};

const getLowStockAlerts = async (req, res) => {
  try {
    const { warehouse_id } = req.query;

    let whereClause = '';
    const params = [];

    if (req.user.role_name === 'Staff' && req.user.warehouse_id) {
      whereClause = 'WHERE warehouse_id = ?';
      params.push(req.user.warehouse_id);
    } else if (warehouse_id) {
      whereClause = 'WHERE warehouse_id = ?';
      params.push(warehouse_id);
    }

    const [alerts] = await pool.execute(
      `SELECT * FROM low_stock_view ${whereClause} ORDER BY stock_deficit ASC, product_name`,
      params
    );

    res.json({
      success: true,
      data: { alerts }
    });
  } catch (error) {
    console.error('Get low stock alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock alerts'
    });
  }
};

module.exports = {
  getInventory,
  getInventoryByWarehouse,
  stockIn,
  stockOut,
  getStockTransactions,
  getLowStockAlerts
};