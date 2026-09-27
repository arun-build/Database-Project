const { pool } = require('../config/database');
const queries = require('../queries');

const getWarehouses = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, sort_by = 'warehouse_name', sort_order = 'ASC' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [];

    if (search) {
      whereClause = 'WHERE (w.warehouse_name LIKE ? OR w.location LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (status) {
      whereClause = whereClause ? `${whereClause} AND w.status = ?` : 'WHERE w.status = ?';
      params.push(status);
    }

    const validSortColumns = ['warehouse_id', 'warehouse_name', 'location', 'capacity', 'status', 'created_at'];
    const validSortOrders = ['ASC', 'DESC'];
    const sortBy = validSortColumns.includes(sort_by) ? sort_by : 'warehouse_name';
    const sortOrder = validSortOrders.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'ASC';

    const [warehouses] = await pool.execute(
      `${queries.warehouses.baseWarehouseSelect}
       ${whereClause}
       ORDER BY w.${sortBy} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [total] = await pool.execute(
      `SELECT COUNT(*) as count FROM warehouses w ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        warehouses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total[0].count,
          pages: Math.ceil(total[0].count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get warehouses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch warehouses'
    });
  }
};

const getWarehouseById = async (req, res) => {
  try {
    const { id } = req.params;

    const [warehouses] = await pool.execute(queries.warehouses.findById, [id]);

    if (warehouses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    res.json({
      success: true,
      data: { warehouse: warehouses[0] }
    });
  } catch (error) {
    console.error('Get warehouse error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch warehouse'
    });
  }
};

const getWarehouseInventory = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute('CALL GetWarehouseInventory(?)', [id]);
    const inventory = result[0] || [];

    res.json({
      success: true,
      data: { inventory }
    });
  } catch (error) {
    console.error('Get warehouse inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch warehouse inventory'
    });
  }
};

const createWarehouse = async (req, res) => {
  try {
    const { warehouse_name, location, capacity, manager_id, contact_number, status = 'Active' } = req.body;

    const [result] = await pool.execute(
      queries.warehouses.create,
      [warehouse_name, location, capacity, manager_id || null, contact_number || null, status]
    );

    const [newWarehouse] = await pool.execute(queries.warehouses.findById, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Warehouse created successfully',
      data: { warehouse: newWarehouse[0] }
    });
  } catch (error) {
    console.error('Create warehouse error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create warehouse'
    });
  }
};

const updateWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const { warehouse_name, location, capacity, manager_id, contact_number, status } = req.body;

    const [result] = await pool.execute(
      queries.warehouses.update,
      [warehouse_name, location, capacity, manager_id || null, contact_number || null, status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    const [updated] = await pool.execute(queries.warehouses.findById, [id]);

    res.json({
      success: true,
      message: 'Warehouse updated successfully',
      data: { warehouse: updated[0] }
    });
  } catch (error) {
    console.error('Update warehouse error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update warehouse'
    });
  }
};

const deleteWarehouse = async (req, res) => {
  try {
    const { id } = req.params;

    const [stockCheck] = await pool.execute(queries.warehouses.checkStock, [id]);
    if (stockCheck[0].total_stock > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate warehouse with existing stock. Please transfer or remove all stock first.'
      });
    }

    const [result] = await pool.execute(queries.warehouses.delete, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    res.json({
      success: true,
      message: 'Warehouse deactivated successfully'
    });
  } catch (error) {
    console.error('Delete warehouse error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete warehouse'
    });
  }
};

const getManagers = async (req, res) => {
  try {
    const [managers] = await pool.execute(queries.warehouses.getAvailableManagers);
    res.json({
      success: true,
      data: { managers }
    });
  } catch (error) {
    console.error('Get managers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch managers'
    });
  }
};

module.exports = {
  getWarehouses,
  getWarehouseById,
  getWarehouseInventory,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getManagers
};