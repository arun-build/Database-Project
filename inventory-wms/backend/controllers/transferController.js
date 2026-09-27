const { pool } = require('../config/database');
const queries = require('../queries');

const getStockTransfers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, source_warehouse_id, destination_warehouse_id, sort_by = 'transfer_date', sort_order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (p.product_name LIKE ? OR p.sku LIKE ? OR sw.warehouse_name LIKE ? OR dw.warehouse_name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (req.user.role_name === 'Staff' && req.user.warehouse_id) {
      whereClause += ' AND (st.source_warehouse_id = ? OR st.destination_warehouse_id = ?)';
      params.push(req.user.warehouse_id, req.user.warehouse_id);
    } else {
      if (source_warehouse_id) {
        whereClause += ' AND st.source_warehouse_id = ?';
        params.push(source_warehouse_id);
      }
      if (destination_warehouse_id) {
        whereClause += ' AND st.destination_warehouse_id = ?';
        params.push(destination_warehouse_id);
      }
    }

    if (status) {
      whereClause += ' AND st.status = ?';
      params.push(status);
    }

    const validSortColumns = ['transfer_id', 'product_name', 'quantity', 'status', 'transfer_date', 'completed_date'];
    const validSortOrders = ['ASC', 'DESC'];
    const sortBy = validSortColumns.includes(sort_by) ? sort_by : 'transfer_date';
    const sortOrder = validSortOrders.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'DESC';

    const orderByMap = {
      'transfer_id': 'st.transfer_id',
      'product_name': 'p.product_name',
      'quantity': 'st.quantity',
      'status': 'st.status',
      'transfer_date': 'st.transfer_date',
      'completed_date': 'st.completed_date'
    };

    const [transfers] = await pool.execute(
      `${queries.transfers.baseTransferSelect}
       ${whereClause}
       ORDER BY ${orderByMap[sortBy]} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [total] = await pool.execute(
      `SELECT COUNT(*) as count 
       FROM stock_transfers st 
       JOIN products p ON st.product_id = p.product_id 
       JOIN warehouses sw ON st.source_warehouse_id = sw.warehouse_id
       JOIN warehouses dw ON st.destination_warehouse_id = dw.warehouse_id
       ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        transfers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total[0].count,
          pages: Math.ceil(total[0].count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get stock transfers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock transfers'
    });
  }
};

const getStockTransferById = async (req, res) => {
  try {
    const { id } = req.params;

    const [transfers] = await pool.execute(queries.transfers.findById, [id]);

    if (transfers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found'
      });
    }

    res.json({
      success: true,
      data: { transfer: transfers[0] }
    });
  } catch (error) {
    console.error('Get stock transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock transfer'
    });
  }
};

const createStockTransfer = async (req, res) => {
  try {
    const { product_id, source_warehouse_id, destination_warehouse_id, quantity, remarks } = req.body;

    if (source_warehouse_id === destination_warehouse_id) {
      return res.status(400).json({
        success: false,
        message: 'Source and destination warehouses must be different'
      });
    }

    if (req.user.role_name === 'Staff' && req.user.warehouse_id && req.user.warehouse_id !== parseInt(source_warehouse_id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only request transfers from your assigned warehouse'
      });
    }

    const [product] = await pool.execute(
      'SELECT product_id FROM products WHERE product_id = ? AND status = "Active"',
      [product_id]
    );
    if (product.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const [sourceWarehouse] = await pool.execute(
      'SELECT warehouse_id FROM warehouses WHERE warehouse_id = ? AND status = "Active"',
      [source_warehouse_id]
    );
    if (sourceWarehouse.length === 0) {
      return res.status(404).json({ success: false, message: 'Source warehouse not found' });
    }

    const [destWarehouse] = await pool.execute(
      'SELECT warehouse_id FROM warehouses WHERE warehouse_id = ? AND status = "Active"',
      [destination_warehouse_id]
    );
    if (destWarehouse.length === 0) {
      return res.status(404).json({ success: false, message: 'Destination warehouse not found' });
    }

    const [inventory] = await pool.execute(
      'SELECT quantity_available FROM inventory WHERE product_id = ? AND warehouse_id = ?',
      [product_id, source_warehouse_id]
    );
    if (inventory.length === 0 || inventory[0].quantity_available < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock in source warehouse'
      });
    }

    const [result] = await pool.execute(
      queries.transfers.create,
      [product_id, source_warehouse_id, destination_warehouse_id, quantity, req.user.user_id, remarks || '']
    );

    const [newTransfer] = await pool.execute(queries.transfers.findById, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Transfer request created successfully',
      data: { transfer: newTransfer[0] }
    });
  } catch (error) {
    console.error('Create stock transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create stock transfer'
    });
  }
};

const approveStockTransfer = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    const [transfers] = await connection.execute(
      'SELECT status FROM stock_transfers WHERE transfer_id = ?',
      [id]
    );

    if (transfers.length === 0) {
      return res.status(404).json({ success: false, message: 'Transfer not found' });
    }

    if (transfers[0].status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Only pending transfers can be approved' });
    }

    if (req.user.role_name === 'Staff') {
      return res.status(403).json({ success: false, message: 'Only managers and admins can approve transfers' });
    }

    await connection.execute(
      queries.transfers.callApproveTransfer,
      [id, req.user.user_id]
    );

    const [output] = await connection.execute(queries.transfers.getProcedureOutput);

    if (!output[0].success) {
      return res.status(400).json({
        success: false,
        message: output[0].message
      });
    }

    res.json({
      success: true,
      message: 'Transfer approved successfully'
    });
  } catch (error) {
    console.error('Approve stock transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve transfer'
    });
  } finally {
    connection.release();
  }
};

const completeStockTransfer = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    const [transfers] = await connection.execute(
      'SELECT status FROM stock_transfers WHERE transfer_id = ?',
      [id]
    );

    if (transfers.length === 0) {
      return res.status(404).json({ success: false, message: 'Transfer not found' });
    }

    if (transfers[0].status !== 'Approved') {
      return res.status(400).json({ success: false, message: 'Only approved transfers can be completed' });
    }

    if (req.user.role_name === 'Staff') {
      return res.status(403).json({ success: false, message: 'Only managers and admins can complete transfers' });
    }

    await connection.execute(queries.transfers.callCompleteTransfer, [id]);

    const [output] = await connection.execute(queries.transfers.getProcedureOutput);

    if (!output[0].success) {
      return res.status(400).json({
        success: false,
        message: output[0].message
      });
    }

    res.json({
      success: true,
      message: 'Transfer completed successfully'
    });
  } catch (error) {
    console.error('Complete stock transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete transfer'
    });
  } finally {
    connection.release();
  }
};

const cancelStockTransfer = async (req, res) => {
  try {
    const { id } = req.params;

    const [transfers] = await pool.execute(
      'SELECT status, requested_by FROM stock_transfers WHERE transfer_id = ?',
      [id]
    );

    if (transfers.length === 0) {
      return res.status(404).json({ success: false, message: 'Transfer not found' });
    }

    if (transfers[0].status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Only pending transfers can be cancelled' });
    }

    if (req.user.role_name === 'Staff' && req.user.user_id !== transfers[0].requested_by) {
      return res.status(403).json({ success: false, message: 'You can only cancel your own transfer requests' });
    }

    await pool.execute(
      'UPDATE stock_transfers SET status = "Cancelled", updated_at = CURRENT_TIMESTAMP WHERE transfer_id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Transfer cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel stock transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel transfer'
    });
  }
};

module.exports = {
  getStockTransfers,
  getStockTransferById,
  createStockTransfer,
  approveStockTransfer,
  completeStockTransfer,
  cancelStockTransfer
};